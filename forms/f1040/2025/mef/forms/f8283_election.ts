import {
  f8283,
  inputSchema as form8283InputSchema,
  type SectionAItem,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

function hasCompleteSectionAColumns(item: SectionAItem): boolean {
  const address = item.donee_organization_us_address;
  if (
    !item.donee_organization_name?.trim() || !address?.line1.trim() ||
    !address.city.trim() || !address.state.trim() || !address.zip.trim() ||
    !item.property_description?.trim() || !item.date_contributed ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) return false;
  if ((item.deduction_claimed ?? item.fmv ?? 0) <= 500) return true;
  return !!item.date_acquired &&
    !!item.donor_acquisition_description?.trim() &&
    item.cost_or_adjusted_basis !== undefined;
}

/** Reconcile one ordinary, unreduced Section A gift before printing its PDF. */
export function assertOrdinarySectionAReconciled(
  context: MefBuildContext | undefined,
): void {
  const pending = context?.pending;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  const scheduleFields = pending?.schedule_a as
    | Record<string, unknown>
    | undefined;
  if (
    !pending?.f8283 || !scheduleFields || !returnFields ||
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs a complete Schedule A source and itemized Form 1040",
    );
  }
  const form = form8283InputSchema.parse(pending.f8283);
  if (
    (form.section_a_items ?? []).length !== 1 ||
    (form.section_b_items ?? []).length !== 0 ||
    !hasCompleteSectionAColumns(form.section_a_items![0])
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs one fully sourced current-year gift",
    );
  }
  if (
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      "Form 8283 ordinary Section A needs a complete current-gift inventory and empty carryover ledger",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (
    JSON.stringify(expectedItems) !== JSON.stringify(actualItems) ||
    parsedScheduleA.agi !== returnFields.line11_agi
  ) {
    throw new Error(
      "Form 8283 ordinary Section A differs from Schedule A's gift inventory or Form 1040 AGI",
    );
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
    computed.line_11_cash_contributions !==
      scheduleFields.line_11_cash_contributions ||
    computed.line_12_noncash_contributions !==
      scheduleFields.line_12_noncash_contributions ||
    computed.line_13_contribution_carryover !==
      scheduleFields.line_13_contribution_carryover
  ) {
    throw new Error(
      "Form 8283 ordinary Section A differs from recomputed Schedule A or Form 1040 itemized deductions",
    );
  }
}

/** Prove the bounded current-year Section A election against the source graph. */
export function assertElectedSectionAReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  const pending = context?.pending;
  const source8283 = pending?.f8283;
  const sourceScheduleA = pending?.schedule_a;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !source8283 || !sourceScheduleA || !returnFields ||
    typeof sourceScheduleA !== "object"
  ) {
    throw new Error(
      "Form 8283 election needs filed Form 8283, complete Schedule A source, and itemized Form 1040",
    );
  }
  if (
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error("Form 8283 election needs an itemized Form 1040");
  }
  const form = form8283InputSchema.parse(source8283);
  if (
    (form.section_a_items ?? []).every((item) =>
      item.capital_gain_reduction_election_confirmed !== true
    ) || (form.section_b_items ?? []).length > 0
  ) {
    throw new Error(
      "Form 8283 election is bounded to current Section A gifts without Section B",
    );
  }
  if (
    (form.section_a_items ?? []).some((item) =>
      !hasCompleteSectionAColumns(item)
    )
  ) {
    throw new Error(
      "Form 8283 elected Section A needs complete donee, property, dates, basis, and valuation-method facts",
    );
  }
  const reductionCount =
    (form.section_a_items ?? []).filter((item) =>
      item.fmv !== undefined && item.deduction_claimed !== undefined &&
      Math.round((item.fmv - item.deduction_claimed) * 100) > 0
    ).length;
  const statementIds = context?.documentIdsByPendingKey
    ?.form8283_fmv_reduction_statement;
  if (
    context?.documentIdsByPendingKey &&
    (!statementIds || statementIds.length !== reductionCount ||
      statementIds.some((id) => !id.trim()) ||
      new Set(statementIds).size !== statementIds.length)
  ) {
    throw new Error(
      "Form 8283 elected Section A needs distinct native FMV-reduction statement IDs",
    );
  }
  const scheduleFields = sourceScheduleA as Record<string, unknown>;
  if (
    scheduleFields.capital_gain_election_finalized !== true ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      "Form 8283 election needs a finalized complete current-gift inventory and an empty prior-carryover ledger",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (JSON.stringify(expectedItems) !== JSON.stringify(actualItems)) {
    throw new Error(
      "Form 8283 current gifts differ from Schedule A's complete source inventory",
    );
  }
  if (parsedScheduleA.agi !== returnFields.line11_agi) {
    throw new Error("Schedule A election AGI differs from Form 1040 line 11");
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed || computed.capital_gain_election_finalized !== true ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
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
      "Form 8283 election differs from recomputed Schedule A lines 11–13 or Form 1040 itemized total",
    );
  }
}

/** Reconcile one current-year Section B investment-land election. */
export function assertElectedSectionBReconciled(
  context: MefBuildContext | undefined,
  filedScheduleA?: Readonly<Record<string, unknown>>,
): void {
  const pending = context?.pending;
  const source8283 = pending?.f8283;
  const sourceScheduleA = pending?.schedule_a;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !source8283 || !sourceScheduleA || !returnFields ||
    typeof sourceScheduleA !== "object"
  ) {
    throw new Error(
      "Form 8283 Section B election needs filed Form 8283, complete Schedule A source, and itemized Form 1040",
    );
  }
  if (
    returnFields.line12e_itemized_deductions === undefined ||
    returnFields.line12a_standard_deduction !== undefined
  ) {
    throw new Error("Form 8283 Section B election needs an itemized Form 1040");
  }
  const form = form8283InputSchema.parse(source8283);
  if (
    (form.section_a_items ?? []).length !== 0 ||
    (form.section_b_items ?? []).length !== 1 ||
    form.section_b_items?.[0]?.capital_gain_reduction_election_confirmed !==
      true
  ) {
    throw new Error(
      "Form 8283 Section B election is bounded to one current-year investment-land gift",
    );
  }
  const scheduleFields = sourceScheduleA as Record<string, unknown>;
  if (
    scheduleFields.capital_gain_election_finalized !== true ||
    scheduleFields.charitable_limits_finalized !== true ||
    scheduleFields.current_noncash_gift_inventory_complete_confirmed !== true ||
    scheduleFields.other_prior_charitable_carryovers_absent_confirmed !==
      true ||
    !Array.isArray(scheduleFields.capital_gain_property_carryovers) ||
    scheduleFields.capital_gain_property_carryovers.length !== 0 ||
    scheduleFields.line_13_contribution_carryover !== 0
  ) {
    throw new Error(
      "Form 8283 Section B election needs a finalized complete current-gift inventory and an empty prior-carryover ledger",
    );
  }
  const {
    line_11_cash_contributions: _line11,
    line_12_noncash_contributions: _line12,
    line_13_contribution_carryover: _line13,
    charitable_limits_finalized: _limits,
    capital_gain_election_finalized: _election,
    ...source
  } = scheduleFields;
  const parsedScheduleA = scheduleAInputSchema.parse(source);
  const expectedItems = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs.flatMap((output) =>
    output.nodeType === "schedule_a"
      ? (output.fields.noncash_contribution_items as readonly unknown[] ?? [])
      : []
  );
  const actualItems = (parsedScheduleA.noncash_contribution_items ?? [])
    .filter((item) => item.contribution_id?.startsWith("f8283:"));
  if (JSON.stringify(expectedItems) !== JSON.stringify(actualItems)) {
    throw new Error(
      "Form 8283 Section B gift differs from Schedule A's complete source inventory",
    );
  }
  if (parsedScheduleA.agi !== returnFields.line11_agi) {
    throw new Error("Schedule A election AGI differs from Form 1040 line 11");
  }
  const recomputed = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    parsedScheduleA,
  );
  const computed = recomputed.finalizations?.find((output) =>
    output.nodeType === "schedule_a"
  )?.fields;
  const itemizedTotal = recomputed.outputs.find((output) =>
    output.nodeType === "standard_deduction"
  )?.fields.itemized_deductions;
  if (
    !computed || computed.capital_gain_election_finalized !== true ||
    itemizedTotal !== returnFields.line12e_itemized_deductions ||
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
      "Form 8283 Section B election differs from recomputed Schedule A lines 11–13 or Form 1040 itemized total",
    );
  }
}
