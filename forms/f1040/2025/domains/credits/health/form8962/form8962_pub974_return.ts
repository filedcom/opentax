import {
  inputSchema as form8962InputSchema,
} from "../../../../../nodes/intermediate/forms/credits/health/form8962/index.ts";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function number(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Publication 974 export amount is not numeric");
  }
  return value;
}

/** Verify the graph's Pub. 974 result against the finalized 2025 return. */
export function assertForm8962Pub974Return(
  fields: Record<string, unknown>,
  pending: Record<string, unknown> | undefined,
): void {
  if (fields.pub974_reconciliation === undefined) return;
  const source = form8962InputSchema.shape.pub974_reconciliation.parse(
    fields.pub974_reconciliation,
  );
  if (!source) throw new Error("Publication 974 export source is missing");
  const schedule1 = record(pending?.schedule1);
  const schedule2 = record(pending?.schedule2);
  const schedule3 = record(pending?.schedule3);
  const f1040 = record(pending?.f1040);
  if (!schedule1 || !f1040) {
    throw new Error(
      "Publication 974 export needs finalized Schedule 1 and Form 1040",
    );
  }
  const deduction = source.schedule1_line17_final_deduction;
  const expectedAgi = source.worksheet_x_source.form1040_line9_total_income -
    source.worksheet_x_source.schedule1_adjustments_except_line17 - deduction;
  const ptc = source.total_premium_tax_credit;
  const aptc = number(fields.total_advance_ptc);
  const netPtc = Math.max(0, ptc - aptc);
  const repayment = number(fields.excess_advance_premium);
  const expectedMagi = expectedAgi +
    source.worksheet_x_source.form1040_line2a_tax_exempt_interest +
    source.worksheet_x_source.form1040_nontaxable_social_security +
    source.worksheet_x_source.form2555_lines45_and_50;
  if (
    number(schedule1.line17_se_health_insurance) !== deduction ||
    (source.worksheet_w_line15_se_tax_deduction !== undefined &&
      number(schedule1.line15_se_deduction) !==
        source.worksheet_w_line15_se_tax_deduction) ||
    (source.worksheet_w_line16_retirement_deduction !== undefined &&
      number(schedule1.line16_sep_simple) !==
        source.worksheet_w_line16_retirement_deduction) ||
    number(schedule1.line26_total_adjustments) !==
      source.worksheet_x_source.schedule1_adjustments_except_line17 +
        deduction ||
    number(f1040.line9_total_income) !==
      source.worksheet_x_source.form1040_line9_total_income ||
    number(f1040.line2a_tax_exempt) !==
      source.worksheet_x_source.form1040_line2a_tax_exempt_interest ||
    Math.abs(number(f1040.line11_agi) - expectedAgi) >= 1 ||
    Math.abs(number(fields.taxpayer_modified_agi) - expectedMagi) >= 1 ||
    number(fields.dependents_modified_agi) !==
      source.dependents_modified_agi ||
    number(fields.total_premium_tax_credit) !== ptc ||
    (aptc > ptc && number(fields.repayment_limitation) !==
        source.worksheet_x_repayment_limit) ||
    number(fields.net_premium_tax_credit) !== netPtc ||
    number(schedule3?.line9_premium_tax_credit) !== netPtc ||
    number(schedule2?.line1a_excess_advance_premium) !== repayment ||
    (netPtc > 0 && number(f1040.line31_additional_payments) < netPtc) ||
    (repayment > 0 && number(f1040.line17_additional_taxes) < repayment)
  ) {
    throw new Error(
      "Publication 974 deduction/PTC differs from the finalized return",
    );
  }
}
