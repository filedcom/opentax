import {
  type F8283Input,
  inputSchema as form8283InputSchema,
  type SectionAItem,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  reviewForm8283CarryoverAttachment,
  scheduleACarryoverMatchSchema,
} from "./f8283_carryover_evidence.ts";

export type Form8283CarryoverReconciliation = Readonly<{
  evidence: NonNullable<F8283Input["carryover_evidence"]>[number];
  priorFormAttachmentId?: string;
}>;

export function carriedSectionAItem(
  evidence: Form8283CarryoverReconciliation["evidence"],
): SectionAItem {
  const reviewed = evidence.prior_form_8283;
  return {
    property_description: reviewed.property_description,
    donee_organization_name: reviewed.donee_name,
    donee_organization_us_address: reviewed.donee_us_address,
    date_acquired: reviewed.donor_acquired_date,
    date_contributed: reviewed.original_donation_date,
    donor_acquisition_description: reviewed.donor_acquisition_description,
    cost_or_adjusted_basis: reviewed.adjusted_basis,
    fmv: reviewed.original_fmv,
    deduction_claimed: reviewed.adjusted_basis,
    fmv_method: reviewed.fmv_method,
    fmv_method_description: reviewed.fmv_method_description,
    capital_gain_reduction_election_confirmed:
      reviewed.adjusted_basis < reviewed.original_fmv ? true : undefined,
  };
}

/** Recompute the return-wide election and require one distinct prior-year PDF
 * per carried gift in the linked MeF pass. */
export function reconcileForm8283Carryover(
  rawForm: F8283Input,
  context: MefBuildContext,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): readonly Form8283CarryoverReconciliation[] {
  const form = form8283InputSchema.parse(rawForm);
  const evidenceRows = form.carryover_evidence ?? [];
  const sourceScheduleA = context.pending?.schedule_a;
  const returnFields = context.pending?.f1040 as
    | Record<string, unknown>
    | undefined;
  if (
    evidenceRows.length === 0 ||
    (form.section_a_items ?? []).length > 0 ||
    (form.section_b_items ?? []).length > 0 ||
    !sourceScheduleA || typeof sourceScheduleA !== "object" ||
    !returnFields || !context.filer?.primarySSN ||
    context.pending?.f8283 === undefined ||
    JSON.stringify(form) !==
      JSON.stringify(form8283InputSchema.parse(context.pending.f8283))
  ) {
    throw new Error(
      "Form 8283 carryover needs sourced gifts, their complete Schedule A ledger, current Form 1040, and filer identity",
    );
  }
  const filer = context.filer;
  if (!filer) throw new Error("Form 8283 carryover needs filer identity");
  if (
    returnFields.line12a_standard_deduction !== undefined ||
    returnFields.line12e_itemized_deductions === undefined
  ) {
    throw new Error("Form 8283 carryover needs an itemized Form 1040");
  }
  const scheduleFields = sourceScheduleA as Record<string, unknown>;
  if (
    scheduleFields.capital_gain_election_finalized !== true ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.capital_gain_50_percent_election_confirmed !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !==
      evidenceRows.length ||
    typeof scheduleFields.line_13_contribution_carryover !== "number" ||
    scheduleFields.line_13_contribution_carryover <= 0
  ) {
    throw new Error(
      "Form 8283 carryover needs a finalized complete capital-gain election ledger and positive Schedule A line 13",
    );
  }
  const carryovers = scheduleFields.capital_gain_property_carryovers.map((
    row,
  ) => scheduleACarryoverMatchSchema.parse(row));
  const contributionIds = evidenceRows.map((row) => row.contribution_id);
  const fileNames = evidenceRows.map((row) =>
    row.prior_form_8283.attachment_file_name
  );
  const pdfHashes = evidenceRows.map((row) => row.prior_form_8283.pdf_sha256);
  const filedReturnReferences = evidenceRows.map((row) =>
    row.prior_form_8283.filed_return_reference
  );
  if (
    new Set(contributionIds).size !== evidenceRows.length ||
    new Set(fileNames).size !== evidenceRows.length ||
    new Set(pdfHashes).size !== evidenceRows.length ||
    new Set(filedReturnReferences).size !== 1 ||
    new Set(carryovers.map((row) => row.contribution_id)).size !==
      carryovers.length
  ) {
    throw new Error(
      "Form 8283 carried gifts need distinct IDs and distinct reviewed prior-year PDFs",
    );
  }
  const matched = evidenceRows.map((evidence) => {
    const carryover = carryovers.find((row) =>
      row.contribution_id === evidence.contribution_id
    );
    const previous = evidence.prior_form_8283;
    if (
      !carryover ||
      carryover.contribution_year !== evidence.contribution_year ||
      carryover.original_fmv !== previous.original_fmv ||
      carryover.adjusted_basis !== previous.adjusted_basis ||
      carryover.previously_deducted !==
        evidence.prior_deduction_workpaper
          .total_previously_deducted_through_2024 ||
      previous.filed_taxpayer_ssn !== filer.primarySSN ||
      previous.adjusted_basis <= carryover.previously_deducted ||
      previous.adjusted_basis <= 500
    ) {
      throw new Error(
        "Form 8283 carryover gift, taxpayer, or refigured Section A amount differs from the prior filed source",
      );
    }
    return { evidence, carryover };
  });
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  if (
    parsedScheduleA.agi !== returnFields.line11_agi ||
    (parsedScheduleA.noncash_contribution_items ?? []).length !== 0
  ) {
    throw new Error(
      "Form 8283 carryover AGI or current noncash gift inventory differs from the bounded source",
    );
  }
  const result = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = result.finalizations?.find((entry) =>
    entry.nodeType === "schedule_a"
  )?.fields;
  const itemized = result.outputs.find((entry) =>
    entry.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed || computed.capital_gain_election_finalized !== true ||
    typeof computed.line_13_contribution_carryover !== "number" ||
    computed.line_13_contribution_carryover <= 0 ||
    itemized !== returnFields.line12e_itemized_deductions ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover ||
    (filedScheduleA && (
      filedScheduleA.line_11_cash_contributions !==
        computed.line_11_cash_contributions ||
      filedScheduleA.line_12_noncash_contributions !==
        computed.line_12_noncash_contributions ||
      filedScheduleA.line_13_contribution_carryover !==
        computed.line_13_contribution_carryover
    ))
  ) {
    throw new Error(
      "Form 8283 carryover differs from recomputed Schedule A lines 11-13 or Form 1040 itemized total",
    );
  }
  const reconciled = matched.map(({ evidence, carryover }) => ({
    evidence,
    priorFormAttachmentId: context.documentIdsByPendingKey
      ? reviewForm8283CarryoverAttachment(
        evidence,
        carryover,
        context.filer!.primarySSN,
        context,
      ).attachmentDocumentId
      : undefined,
  }));
  const attachmentIds = reconciled.map((row) => row.priorFormAttachmentId)
    .filter((id): id is string => id !== undefined);
  if (new Set(attachmentIds).size !== attachmentIds.length) {
    throw new Error(
      "Form 8283 carried gifts need distinct prior-year binary documents",
    );
  }
  return reconciled;
}
