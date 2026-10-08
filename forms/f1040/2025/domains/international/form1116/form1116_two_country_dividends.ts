import { inputSchema as dividendInputSchema } from "../../../../nodes/inputs/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  twoCountryInterestPdfReviewSchema,
} from "../../../../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;
type Column = {
  country: string;
  gross: number;
  tax: number;
  allocatedDeduction: number;
};
const otherBoxes = [
  "box1b",
  "box2a",
  "box2b",
  "box2c",
  "box2d",
  "box2e",
  "box2f",
  "box3",
  "box4",
  "box5",
  "box6",
  "box9",
  "box10",
  "box12",
  "box13",
  "box16",
  "foreign_source_qualified_dividends_usd",
] as const;
const otherIncome = [
  "line1a_wages",
  "line1b_household_wages",
  "line1c_unreported_tips",
  "line1d_medicaid_waiver",
  "line1e_taxable_dep_care",
  "line1f_taxable_adoption_benefits",
  "line1g_wages_8919",
  "line1h_other_earned",
  "line1i_combat_pay",
  "line1z_total_wages",
  "line2a_tax_exempt",
  "line2b_taxable_interest",
  "line3a_qualified_dividends",
  "line4a_ira_gross",
  "line4b_ira_taxable",
  "line5a_pension_gross",
  "line5b_pension_taxable",
  "line6a_ss_gross",
  "line6b_ss_taxable",
  "line7_capital_gain",
  "line7a_cap_gain_distrib",
  "line8_additional_income",
] as const;
const zero = (value: unknown) =>
  value === undefined || value === null || value === 0;
const ratio = (a: number, b: number) => Math.round(a / b * 100_000) / 100_000;

/** Two identified ordinary 1099-DIV payers in different passive-country columns. */
export function reconcileForm1116TwoCountryDividends(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): {
  a: Column;
  b: Column;
  foreignGross: number;
  foreignTax: number;
  allocatedDeduction: number;
} | undefined {
  if (fields.two_country_dividend_pdf_review === undefined) return undefined;
  const review = twoCountryInterestPdfReviewSchema.parse(
    fields.two_country_dividend_pdf_review,
  );
  const raw = fields.category_summaries;
  const parsed = Array.isArray(raw) && raw.length === 1
    ? categorySummarySchema.safeParse(raw[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const source = dividendInputSchema.safeParse(pending.f1099div);
  const rows = source.success ? source.data.f1099divs : [];
  const a = rows.find((row) =>
    row.source_document_reference === review.column_a_source_document_reference
  );
  const b = rows.find((row) =>
    row.source_document_reference === review.column_b_source_document_reference
  );
  const foreignGross = rows.reduce((sum, row) => sum + row.box1a, 0);
  const foreignTax = rows.reduce((sum, row) => sum + (row.box7 ?? 0), 0);
  const deduction = fields.standard_or_itemized_deduction;
  const allocatedA = typeof deduction === "number" && foreignGross > 0 && a
    ? Math.round(deduction * ratio(a.box1a, foreignGross))
    : NaN;
  const allocatedB = typeof deduction === "number" && foreignGross > 0 && b
    ? Math.round(deduction * ratio(b.box1a, foreignGross))
    : NaN;
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const reviewedRefs = preferential?.source_document_references;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const itemMatches = (row: typeof a) => {
    const matches =
      summary?.items.filter((item) =>
        item.foreign_income_source_document_reference ===
          row?.source_document_reference
      ) ?? [];
    const item = matches[0];
    return !!row && matches.length === 1 && !!item &&
      item.tax_kind === ForeignTaxKind.Dividends &&
      item.income_category === IncomeCategory.Passive &&
      item.foreign_gross_income === row.box1a &&
      item.foreign_tax_paid === row.box7 &&
      item.irs_country_code === row.foreign_tax_irs_country_code &&
      item.tax_credit_method === ForeignTaxCreditMethod.Paid &&
      item.tax_reported_on_1099 === true &&
      item.tax_paid_or_accrued_date === undefined &&
      item.foreign_tax_currency === undefined &&
      item.schedule_k3_line12_reduction === undefined &&
      item.partnership_k3_passive_interest === undefined &&
      item.s_corp_k3_passive_interest === undefined &&
      (item.directly_allocable_deductions ?? 0) === 0 &&
      (item.apportioned_deductions ?? 0) === 0 &&
      (item.excluded_income ?? 0) === 0;
  };
  if (
    !summary || summary.category !== IncomeCategory.Passive ||
    summary.items.length !== 2 || rows.length !== 2 || !a || !b || a === b ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    fields.two_dividend_pdf_review !== undefined ||
    fields.mixed_interest_dividend_pdf_review !== undefined ||
    fields.two_country_mixed_pdf_review !== undefined ||
    fields.three_country_mixed_pdf_review !== undefined ||
    !a.source_document_reference || !b.source_document_reference ||
    a.payerName === b.payerName || !a.payerName || !b.payerName ||
    !a.foreign_tax_irs_country_code || !b.foreign_tax_irs_country_code ||
    a.foreign_tax_irs_country_code === b.foreign_tax_irs_country_code ||
    review.column_a_irs_country_code !== a.foreign_tax_irs_country_code ||
    review.column_b_irs_country_code !== b.foreign_tax_irs_country_code ||
    !Array.isArray(reviewedRefs) || reviewedRefs.length !== 2 ||
    JSON.stringify([...reviewedRefs].sort()) !==
      JSON.stringify([
        a.source_document_reference,
        b.source_document_reference,
      ].sort()) ||
    rows.some((row) => {
      const holding = row.foreign_tax_holding_review;
      return row.isNominee || row.nominee_distribution !== undefined ||
        row.box11 === true ||
        otherBoxes.some((box) => (row[box] ?? 0) !== 0) ||
        !Number.isSafeInteger(row.box1a) || row.box1a <= 0 ||
        row.foreign_source_dividends_usd !== row.box1a ||
        !Number.isSafeInteger(row.box7) || (row.box7 ?? 0) <= 0 ||
        row.box8 !== undefined && !row.box8.trim() ||
        !holding || !row.holdingPeriodDays ||
        holding.qualifying_held_days_in_31_day_window < 16 ||
        holding.qualifying_held_days_in_31_day_window >
          row.holdingPeriodDays ||
        holding.qualifying_held_days_in_31_day_window +
              holding.diminished_risk_days_excluded > 31 ||
        Number.isNaN(Date.parse(`${holding.ex_dividend_date}T00:00:00Z`)) ||
        new Date(`${holding.ex_dividend_date}T00:00:00Z`).toISOString().slice(
            0,
            10,
          ) !== holding.ex_dividend_date;
    }) ||
    !itemMatches(a) || !itemMatches(b) ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0 || foreignGross <= deduction ||
    !Number.isSafeInteger(allocatedA) || !Number.isSafeInteger(allocatedB) ||
    fields.worldwide_gross_income !== foreignGross ||
    fields.general_deductions !== deduction ||
    fields.total_income !== foreignGross - deduction ||
    fields.foreign_income !== foreignGross ||
    fields.foreign_tax_paid !== foreignTax ||
    (fields.other_deductions ?? 0) !== 0 ||
    summary.foreignGrossIncome !== foreignGross ||
    summary.includedForeignIncome !== foreignGross ||
    summary.foreignTaxPaid !== foreignTax ||
    summary.automaticallyApportionedDeductions !== allocatedA + allocatedB ||
    summary.foreignTaxableIncome !== foreignGross - allocatedA - allocatedB ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    !f1040 || !schedule3 ||
    f1040.line3b_ordinary_dividends !== foreignGross ||
    otherIncome.some((key) => !zero(f1040[key])) ||
    f1040.line9_total_income !== foreignGross ||
    !zero(f1040.line10_adjustments) ||
    f1040.line11_agi !== foreignGross ||
    f1040.line12a_standard_deduction !== deduction ||
    !zero(f1040.line12e_itemized_deductions) ||
    f1040.line14_deductions_qbi_total !== deduction ||
    !zero(f1040.line13b_additional_deductions) ||
    f1040.line15_taxable_income !== foreignGross - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit ||
    pending.f1099int !== undefined || pending.f1099oid !== undefined ||
    pending.schedule1a?.senior_zero_exclusions_review === true
  ) {
    throw new Error(
      "Form 1116 two-country dividend credit needs separate reviewed 1099-DIV sources and the finalized return",
    );
  }
  return {
    a: {
      country: a.foreign_tax_irs_country_code,
      gross: a.box1a,
      tax: a.box7!,
      allocatedDeduction: allocatedA,
    },
    b: {
      country: b.foreign_tax_irs_country_code,
      gross: b.box1a,
      tax: b.box7!,
      allocatedDeduction: allocatedB,
    },
    foreignGross,
    foreignTax,
    allocatedDeduction: allocatedA + allocatedB,
  };
}
