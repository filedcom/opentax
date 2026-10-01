import { z } from "zod";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import type { MefBuildContext } from "../../../2025/mef/form-descriptor.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../schedule_a/index.ts";

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const usAddress = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(?:-?\d{4})?$/),
}).strict();
const pdfReview = z.object({
  source_document_reference: z.string().trim().min(1),
  file_name: z.string().trim().regex(/\.pdf$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^2025-\d{2}-\d{2}$|^2026-\d{2}-\d{2}$/),
}).strict();
const acceptedFilingReview = z.object({
  filed_return_copy: pdfReview,
  acceptance_notice: z.object({
    source_document_reference: z.string().trim().min(1),
    file_name: z.string().trim().regex(/\.xml$/i),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^2025-\d{2}-\d{2}$|^2026-\d{2}-\d{2}$/),
    submission_id: z.string().trim().min(1),
    accepted_status_reviewed: z.literal(true),
  }).strict(),
  filed_tax_year: z.literal(2024),
  filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  filed_return_reference: z.string().trim().min(1),
  filed_schedule_a_line12_noncash: amount.min(1),
  sole_2024_noncash_gift_confirmed: z.literal(true),
  prior_artwork_and_appraisal_in_filing_reviewed: z.literal(true),
}).strict();

export const form8283SectionBCarryoverSourceSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.literal(2024),
  property_kind: z.literal("purchased_artwork"),
  original_donation_date: z.string().regex(/^2024-\d{2}-\d{2}$/),
  donor_acquired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  donee_name: z.string().trim().min(1),
  filed_return_reference: z.string().trim().min(1),
  filed_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  original_fmv: amount.min(20_000),
  original_2024_deduction_claim: amount.min(20_000),
  adjusted_basis: amount,
  previously_deducted_through_2024: amount,
  completed_prior_form: pdfReview,
  required_qualified_appraisal: pdfReview,
  accepted_2024_filing: acceptedFilingReview,
  section_b_appraiser_and_donee_signatures_reviewed: z.literal(true),
  appraisal_was_attached_to_2024_return_reviewed: z.literal(true),
  prior_form_printed_facts: z.object({
    property_description: z.string().trim().min(1),
    physical_condition: z.string().trim().min(1),
    donor_acquisition_description: z.literal("Purchase"),
    appraiser: z.object({
      first_name: z.string().trim().min(1),
      last_name: z.string().trim().min(1),
      ein: z.string().regex(/^\d{9}$/).optional(),
      ssn: z.string().regex(/^\d{9}$/).optional(),
      us_address: usAddress,
      signed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      signature_on_prior_form_reviewed: z.literal(true),
    }).strict(),
    donee: z.object({
      organization_name: z.string().trim().min(1),
      ein: z.string().regex(/^\d{9}$/),
      us_address: usAddress,
      received_date: z.string().regex(/^2024-\d{2}-\d{2}$/),
      unrelated_use: z.boolean(),
      signature_on_prior_form_reviewed: z.literal(true),
    }).strict(),
    completed_form_fields_match_pdf_reviewed: z.literal(true),
    appraisal_property_and_value_match_pdf_reviewed: z.literal(true),
  }).strict(),
}).strict();

export function sectionBCarryoverAttachmentDescription(
  kind: "completed_prior_form" | "required_qualified_appraisal",
  fileName: string,
): string {
  return kind === "completed_prior_form"
    ? `Completed prior-year Form 8283 Section B: ${fileName}`
    : `Qualified Appraisal for prior-year Form 8283 Section B: ${fileName}`;
}

const carryoverSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.literal(2024),
  original_category: z.literal("capital_gain_30"),
  original_fmv: amount,
  adjusted_basis: amount,
  previously_deducted: amount,
  ordinary_carryover_rules_confirmed: z.literal(true),
}).strict();

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
}

const acknowledgementParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
});

function acceptedAcknowledgementMatches(
  bytes: Uint8Array,
  submissionId: string,
  taxpayerSsn: string,
): boolean {
  try {
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (XMLValidator.validate(xml) !== true) return false;
    const parsed = acknowledgementParser.parse(xml);
    const acknowledgement = parsed?.Acknowledgement;
    if (
      !acknowledgement || typeof acknowledgement !== "object" ||
      Array.isArray(acknowledgement)
    ) return false;
    const record = acknowledgement as Record<string, unknown>;
    return record.SubmissionId === submissionId &&
      record.TaxYr === "2024" &&
      record.ExtndGovernmentCd === "IRS" &&
      record.SubmissionTyp === "1040" &&
      record.AcceptanceStatusTxt === "Accepted" &&
      record.TIN === taxpayerSsn &&
      typeof record.EFIN === "string" && record.EFIN.length > 0 &&
      typeof record.StatusDt === "string" && validDate(record.StatusDt);
  } catch {
    return false;
  }
}

/** Bind the required prior Section B form and appraisal to one carried gift. */
export async function bindForm8283SectionBCarryoverSource(
  rawSource: unknown,
  rawCarryover: unknown,
  currentTaxpayerSsn: string,
  completedPriorFormBytes: Uint8Array,
  appraisalBytes: Uint8Array,
  filedReturnBytes: Uint8Array,
  acceptanceNoticeBytes: Uint8Array,
): Promise<void> {
  const source = form8283SectionBCarryoverSourceSchema.parse(rawSource);
  const carryover = carryoverSchema.parse(rawCarryover);
  const printed = source.prior_form_printed_facts;
  const accepted = source.accepted_2024_filing;
  const acquisitionAnniversary = new Date(
    `${source.donor_acquired_date}T00:00:00Z`,
  );
  acquisitionAnniversary.setUTCFullYear(
    acquisitionAnniversary.getUTCFullYear() + 1,
  );
  if (
    !validDate(source.original_donation_date) ||
    !validDate(source.donor_acquired_date) ||
    !validDate(source.completed_prior_form.reviewed_on) ||
    !validDate(source.required_qualified_appraisal.reviewed_on) ||
    !validDate(accepted.filed_return_copy.reviewed_on) ||
    !validDate(accepted.acceptance_notice.reviewed_on) ||
    !validDate(printed.appraiser.signed_date) ||
    !validDate(printed.donee.received_date) ||
    Date.parse(`${source.original_donation_date}T00:00:00Z`) <=
      acquisitionAnniversary.getTime() ||
    source.contribution_id !== carryover.contribution_id ||
    source.original_fmv !== carryover.original_fmv ||
    source.adjusted_basis !== carryover.adjusted_basis ||
    source.previously_deducted_through_2024 !==
      carryover.previously_deducted ||
    source.adjusted_basis > source.original_fmv ||
    source.original_2024_deduction_claim !== source.original_fmv ||
    source.previously_deducted_through_2024 >= source.original_fmv ||
    accepted.filed_taxpayer_ssn !== source.filed_taxpayer_ssn ||
    accepted.filed_return_reference !== source.filed_return_reference ||
    accepted.filed_schedule_a_line12_noncash !==
      source.previously_deducted_through_2024 ||
    source.filed_taxpayer_ssn !== currentTaxpayerSsn.replace(/\D/g, "") ||
    printed.donee.organization_name !== source.donee_name ||
    printed.donee.received_date !== source.original_donation_date ||
    Boolean(printed.appraiser.ein) === Boolean(printed.appraiser.ssn) ||
    source.completed_prior_form.source_document_reference ===
      source.required_qualified_appraisal.source_document_reference ||
    source.completed_prior_form.file_name ===
      source.required_qualified_appraisal.file_name ||
    source.completed_prior_form.sha256 ===
      source.required_qualified_appraisal.sha256 ||
    new Set([
        source.completed_prior_form.source_document_reference,
        source.required_qualified_appraisal.source_document_reference,
        accepted.filed_return_copy.source_document_reference,
        accepted.acceptance_notice.source_document_reference,
      ]).size !== 4 ||
    new Set([
        source.completed_prior_form.file_name,
        source.required_qualified_appraisal.file_name,
        accepted.filed_return_copy.file_name,
        accepted.acceptance_notice.file_name,
      ]).size !== 4 ||
    new Set([
        source.completed_prior_form.sha256,
        source.required_qualified_appraisal.sha256,
        accepted.filed_return_copy.sha256,
        accepted.acceptance_notice.sha256,
      ]).size !== 4
  ) {
    throw new Error(
      "Form 8283 Section B prior artwork, appraisal, taxpayer, and Schedule A carryover do not reconcile",
    );
  }
  for (
    const [review, bytes] of [
      [source.completed_prior_form, completedPriorFormBytes],
      [source.required_qualified_appraisal, appraisalBytes],
      [accepted.filed_return_copy, filedReturnBytes],
    ] as const
  ) {
    if (
      !(bytes instanceof Uint8Array) || bytes.length < 8 ||
      new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
      await sha256Hex(bytes) !== review.sha256
    ) {
      throw new Error(
        `Form 8283 Section B ${review.source_document_reference} bytes differ from reviewed PDF SHA-256`,
      );
    }
  }
  if (
    !(acceptanceNoticeBytes instanceof Uint8Array) ||
    acceptanceNoticeBytes.length < 8 ||
    await sha256Hex(acceptanceNoticeBytes) !==
      accepted.acceptance_notice.sha256 ||
    !acceptedAcknowledgementMatches(
      acceptanceNoticeBytes,
      accepted.acceptance_notice.submission_id,
      source.filed_taxpayer_ssn,
    )
  ) {
    throw new Error(
      "Form 8283 Section B needs exact reviewed IRS acknowledgment bytes with accepted 2024 Form 1040, submission ID, and taxpayer",
    );
  }
}

/** Join the prior Form 8283 and appraisal to distinct submitted MeF attachments.
 * The filed return and IRS acknowledgment remain internal source evidence. */
export async function reviewForm8283SectionBCarryoverBundle(
  rawSource: unknown,
  rawCarryover: unknown,
  currentTaxpayerSsn: string,
  completedPriorFormBytes: Uint8Array,
  appraisalBytes: Uint8Array,
  filedReturnBytes: Uint8Array,
  acceptanceNoticeBytes: Uint8Array,
  context: MefBuildContext,
): Promise<
  Readonly<{
    contributionId: string;
    priorFormDocumentId: string;
    appraisalDocumentId: string;
  }>
> {
  await bindForm8283SectionBCarryoverSource(
    rawSource,
    rawCarryover,
    currentTaxpayerSsn,
    completedPriorFormBytes,
    appraisalBytes,
    filedReturnBytes,
    acceptanceNoticeBytes,
  );
  const source = form8283SectionBCarryoverSourceSchema.parse(rawSource);
  const entries = [
    ["completed_prior_form", source.completed_prior_form],
    ["required_qualified_appraisal", source.required_qualified_appraisal],
  ] as const;
  const documentIds = entries.map(([kind, review]) => {
    const fileName = review.file_name;
    const id = context.documentIdsByAttachmentFileName?.[fileName];
    if (
      !id || !id.trim() ||
      context.attachmentSha256ByFileName?.[fileName] !== review.sha256 ||
      context.attachmentDescriptionsByFileName?.[fileName] !==
        sectionBCarryoverAttachmentDescription(kind, fileName)
    ) {
      throw new Error(
        `Form 8283 Section B ${kind} must match reviewed bytes, description, and MeF document`,
      );
    }
    return id;
  });
  if (new Set(documentIds).size !== 2) {
    throw new Error(
      "Form 8283 Section B prior form and appraisal need distinct MeF documents",
    );
  }
  return {
    contributionId: source.contribution_id,
    priorFormDocumentId: documentIds[0],
    appraisalDocumentId: documentIds[1],
  };
}

/** Stage a complete current-year Schedule A and Form 1040 reconciliation.
 * Filing remains closed until accepted prior-return evidence can be verified. */
export function reviewForm8283SectionBCarryoverReturn(
  rawSource: unknown,
  rawCarryover: unknown,
  context: MefBuildContext,
): Readonly<{ contributionId: string; line13CarryoverDeduction: number }> {
  const source = form8283SectionBCarryoverSourceSchema.parse(rawSource);
  const carryover = carryoverSchema.parse(rawCarryover);
  const scheduleFields = context.pending?.schedule_a as
    | Record<string, unknown>
    | undefined;
  const returnFields = context.pending?.f1040 as
    | Record<string, unknown>
    | undefined;
  if (
    !scheduleFields || !returnFields ||
    context.filer?.primarySSN !== source.filed_taxpayer_ssn ||
    source.accepted_2024_filing.filed_taxpayer_ssn !==
      source.filed_taxpayer_ssn ||
    source.accepted_2024_filing.filed_return_reference !==
      source.filed_return_reference ||
    source.accepted_2024_filing.filed_schedule_a_line12_noncash !==
      source.previously_deducted_through_2024 ||
    carryover.contribution_id !== source.contribution_id ||
    carryover.contribution_year !== source.contribution_year ||
    carryover.original_fmv !== source.original_fmv ||
    carryover.adjusted_basis !== source.adjusted_basis ||
    carryover.previously_deducted !==
      source.previously_deducted_through_2024 ||
    scheduleFields.agi !== returnFields.line11_agi ||
    scheduleFields.capital_gain_50_percent_election_confirmed !== true ||
    scheduleFields.capital_gain_election_finalized !== true ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !==
      true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 1 ||
    (scheduleFields.noncash_contribution_items as unknown[] | undefined)
        ?.length !== 0 ||
    returnFields.line12a_standard_deduction !== undefined ||
    typeof returnFields.line12e_itemized_deductions !== "number"
  ) {
    throw new Error(
      "Form 8283 Section B current carryover needs one owned gift, finalized Schedule A, and itemized Form 1040",
    );
  }
  const row = carryoverSchema.parse(
    scheduleFields.capital_gain_property_carryovers[0],
  );
  if (
    row.contribution_id !== carryover.contribution_id ||
    row.contribution_year !== carryover.contribution_year ||
    row.original_category !== carryover.original_category ||
    row.original_fmv !== carryover.original_fmv ||
    row.adjusted_basis !== carryover.adjusted_basis ||
    row.previously_deducted !== carryover.previously_deducted
  ) {
    throw new Error(
      "Form 8283 Section B carryover ledger differs from prior source",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...sourceScheduleA
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(sourceScheduleA);
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
    !computed ||
    typeof computed.line_13_contribution_carryover !== "number" ||
    computed.line_13_contribution_carryover !==
      Math.max(
        0,
        source.adjusted_basis -
          source.previously_deducted_through_2024,
      ) ||
    computed.line_13_contribution_carryover <= 0 ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover ||
    itemized !== returnFields.line12e_itemized_deductions
  ) {
    throw new Error(
      "Form 8283 Section B Schedule A lines 11-13 or Form 1040 itemized total differ from source",
    );
  }
  return {
    contributionId: source.contribution_id,
    line13CarryoverDeduction: computed.line_13_contribution_carryover,
  };
}
