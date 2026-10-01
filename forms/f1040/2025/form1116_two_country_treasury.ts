import { inputSchema as interestInputSchema } from "../nodes/inputs/f1099int/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  twoCountryTreasuryPdfReviewSchema,
} from "../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;
type CountryColumn = {
  country: string;
  sourceReference: string;
  gross: number;
  tax: number;
  allocatedDeduction: number;
};
const unrelatedBoxes = [
  "box2",
  "box4",
  "box5",
  "box8",
  "box9",
  "box10",
  "box11",
  "box12",
  "box13",
  "box17",
  "nominee_interest",
  "accrued_interest_paid",
  "non_taxable_oid_adjustment",
] as const;
const otherReturnIncomeLines = [
  "line1a_wages",
  "line1b_household_wages",
  "line1c_unreported_tips",
  "line1d_medicaid_waiver",
  "line1e_taxable_dep_care",
  "line1f_taxable_adoption_benefits",
  "line1g_wages_8919",
  "line1h_other_earned",
  "line1z_total_wages",
  "line2a_tax_exempt",
  "line3a_qualified_dividends",
  "line3b_ordinary_dividends",
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
function zero(value: unknown): boolean {
  return value === undefined || value === null || value === 0;
}
function ratio(numerator: number, denominator: number): number {
  return Math.round(
    Math.min(1, Math.max(0, numerator / denominator)) * 100_000,
  ) /
    100_000;
}

export function reconcileForm1116TwoCountryTreasury(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): {
  a: CountryColumn;
  b: CountryColumn;
  foreignGross: number;
  worldwideGross: number;
  foreignTax: number;
  allocatedDeduction: number;
} | undefined {
  const raw = fields.category_summaries;
  const parsed = Array.isArray(raw) && raw.length === 1
    ? categorySummarySchema.safeParse(raw[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const source = interestInputSchema.safeParse(pending.f1099int);
  const rows = source.success ? source.data.f1099ints : [];
  const foreignRows = rows.filter((row) => (row.box6 ?? 0) > 0);
  const treasuryRows = rows.filter((row) => (row.box3 ?? 0) > 0);
  const hasThreeSources = rows.length === 3 && foreignRows.length === 2 &&
    treasuryRows.length === 1 &&
    new Set(foreignRows.map((row) => row.foreign_tax_irs_country_code)).size ===
      2;
  if (
    !hasThreeSources && fields.two_country_treasury_pdf_review === undefined
  ) {
    return undefined;
  }
  const review = twoCountryTreasuryPdfReviewSchema.safeParse(
    fields.two_country_treasury_pdf_review,
  );
  const a = foreignRows.find((row) =>
    row.foreign_tax_source_document_reference ===
      (review.success
        ? review.data.column_a_source_document_reference
        : undefined)
  );
  const b = foreignRows.find((row) =>
    row.foreign_tax_source_document_reference ===
      (review.success
        ? review.data.column_b_source_document_reference
        : undefined)
  );
  const treasury = treasuryRows[0];
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const reviewedRefs = preferential?.source_document_references;
  const foreignGross = foreignRows.reduce(
    (sum, row) => sum + (row.box1 ?? 0),
    0,
  );
  const foreignTax = foreignRows.reduce((sum, row) => sum + (row.box6 ?? 0), 0);
  const worldwideGross = foreignGross + (treasury?.box3 ?? 0);
  const deduction = fields.standard_or_itemized_deduction;
  const allocatedA = typeof deduction === "number" && worldwideGross > 0 && a
    ? Math.round(deduction * ratio(a.box1 ?? 0, worldwideGross))
    : NaN;
  const allocatedB = typeof deduction === "number" && worldwideGross > 0 && b
    ? Math.round(deduction * ratio(b.box1 ?? 0, worldwideGross))
    : NaN;
  const allocatedDeduction = allocatedA + allocatedB;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const itemMatches = (row: NonNullable<typeof a>): boolean => {
    const matches =
      summary?.items.filter((item) =>
        item.foreign_income_source_document_reference ===
          row.foreign_tax_source_document_reference
      ) ?? [];
    const item = matches[0];
    return matches.length === 1 && !!item &&
      item.income_category === IncomeCategory.Passive &&
      item.tax_kind === ForeignTaxKind.Interest &&
      item.foreign_gross_income === row.box1 &&
      item.foreign_tax_paid === row.box6 &&
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
    summary.items.length !== 2 || !review.success ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    fields.mixed_interest_dividend_pdf_review !== undefined ||
    fields.two_country_interest_pdf_review !== undefined ||
    rows.length !== 3 || foreignRows.length !== 2 ||
    treasuryRows.length !== 1 || !a || !b || a === b || !treasury ||
    review.data.column_a_irs_country_code !== a.foreign_tax_irs_country_code ||
    review.data.column_b_irs_country_code !== b.foreign_tax_irs_country_code ||
    !a.foreign_tax_irs_country_code || !b.foreign_tax_irs_country_code ||
    a.foreign_tax_irs_country_code === b.foreign_tax_irs_country_code ||
    !a.foreign_tax_source_document_reference ||
    !b.foreign_tax_source_document_reference ||
    !treasury.source_document_reference ||
    review.data.domestic_treasury_source_document_reference !==
      treasury.source_document_reference ||
    new Set(rows.map((row) => row.payer_name)).size !== 3 ||
    rows.some((row) => !row.payer_name) ||
    !Array.isArray(reviewedRefs) || reviewedRefs.length !== 3 ||
    JSON.stringify([...reviewedRefs].sort()) !== JSON.stringify([
        a.foreign_tax_source_document_reference,
        b.foreign_tax_source_document_reference,
        treasury.source_document_reference,
      ].sort()) ||
    foreignRows.some((row) =>
      !Number.isSafeInteger(row.box1) || (row.box1 ?? 0) <= 0 ||
      !Number.isSafeInteger(row.box6) || (row.box6 ?? 0) <= 0 ||
      (row.box3 ?? 0) !== 0 ||
      row.foreign_source_interest_usd !== row.box1 ||
      unrelatedBoxes.some((key) => (row[key] ?? 0) !== 0) ||
      row.seller_financed === true ||
      row.elect_bond_premium_amortization === true ||
      !itemMatches(row)
    ) ||
    !Number.isSafeInteger(treasury.box3) || (treasury.box3 ?? 0) <= 0 ||
    (treasury.box1 ?? 0) !== 0 || (treasury.box6 ?? 0) !== 0 ||
    treasury.box7 !== undefined || treasury.box14 !== undefined ||
    treasury.box15 !== undefined || treasury.box16 !== undefined ||
    treasury.foreign_source_interest_usd !== undefined ||
    treasury.foreign_tax_irs_country_code !== undefined ||
    treasury.foreign_tax_source_document_reference !== undefined ||
    unrelatedBoxes.some((key) => (treasury[key] ?? 0) !== 0) ||
    treasury.seller_financed === true ||
    treasury.elect_bond_premium_amortization === true ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0 || foreignGross <= allocatedDeduction ||
    !Number.isSafeInteger(allocatedA) || !Number.isSafeInteger(allocatedB) ||
    fields.worldwide_gross_income !== worldwideGross ||
    fields.general_deductions !== deduction ||
    fields.total_income !== worldwideGross - deduction ||
    fields.foreign_income !== foreignGross ||
    fields.foreign_tax_paid !== foreignTax ||
    (fields.other_deductions ?? 0) !== 0 ||
    summary.foreignGrossIncome !== foreignGross ||
    summary.includedForeignIncome !== foreignGross ||
    summary.foreignTaxPaid !== foreignTax ||
    summary.automaticallyApportionedDeductions !== allocatedDeduction ||
    summary.foreignTaxableIncome !== foreignGross - allocatedDeduction ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    !f1040 || !schedule3 ||
    f1040.line2b_taxable_interest !== worldwideGross ||
    otherReturnIncomeLines.some((key) => !zero(f1040[key])) ||
    f1040.line9_total_income !== worldwideGross ||
    !zero(f1040.line10_adjustments) ||
    f1040.line11_agi !== worldwideGross ||
    f1040.line12a_standard_deduction !== deduction ||
    !zero(f1040.line12e_itemized_deductions) ||
    f1040.line14_deductions_qbi_total !== deduction ||
    !zero(f1040.line13b_additional_deductions) ||
    f1040.line15_taxable_income !== worldwideGross - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit ||
    pending.f1099div !== undefined || pending.f1099oid !== undefined ||
    pending.schedule1a?.senior_zero_exclusions_review === true
  ) {
    throw new Error(
      "Form 1116 two-country Treasury route needs two foreign 1099-INT payers, one domestic box-3 payer, and the finalized return",
    );
  }
  return {
    a: {
      country: a.foreign_tax_irs_country_code!,
      sourceReference: a.foreign_tax_source_document_reference!,
      gross: a.box1!,
      tax: a.box6!,
      allocatedDeduction: allocatedA,
    },
    b: {
      country: b.foreign_tax_irs_country_code!,
      sourceReference: b.foreign_tax_source_document_reference!,
      gross: b.box1!,
      tax: b.box6!,
      allocatedDeduction: allocatedB,
    },
    foreignGross,
    worldwideGross,
    foreignTax,
    allocatedDeduction,
  };
}
