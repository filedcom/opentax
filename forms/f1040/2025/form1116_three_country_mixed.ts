import { inputSchema as interestSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as dividendSchema } from "../nodes/inputs/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  threeCountryMixedPdfReviewSchema,
} from "../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;
type CountryColumn = {
  country: string;
  gross: number;
  tax: number;
  allocatedDeduction: number;
};
const unrelatedInterest = [
  "box2",
  "box3",
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
const unrelatedDividend = [
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
const share = (amount: number, total: number) =>
  Math.round(amount / total * 100_000) / 100_000;

/** Two foreign interest copies and one ordinary foreign dividend copy in distinct countries. */
export function reconcileForm1116ThreeCountryMixed(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): {
  a: CountryColumn;
  b: CountryColumn;
  c: CountryColumn;
  foreignGross: number;
  foreignTax: number;
  allocatedDeduction: number;
} | undefined {
  if (fields.three_country_mixed_pdf_review === undefined) return undefined;
  const raw = fields.category_summaries;
  const parsed = Array.isArray(raw) && raw.length === 1
    ? categorySummarySchema.safeParse(raw[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const review = threeCountryMixedPdfReviewSchema.safeParse(
    fields.three_country_mixed_pdf_review,
  );
  const parsedInterest = interestSchema.safeParse(pending.f1099int);
  const interests = parsedInterest.success ? parsedInterest.data.f1099ints : [];
  const parsedDividend = dividendSchema.safeParse(pending.f1099div);
  const dividends = parsedDividend.success ? parsedDividend.data.f1099divs : [];
  const a = interests.find((row) =>
    row.foreign_tax_source_document_reference ===
      (review.success
        ? review.data.column_a_interest_source_document_reference
        : undefined)
  );
  const c = interests.find((row) =>
    row.foreign_tax_source_document_reference ===
      (review.success
        ? review.data.column_c_interest_source_document_reference
        : undefined)
  );
  const b = dividends.find((row) =>
    row.source_document_reference ===
      (review.success
        ? review.data.column_b_dividend_source_document_reference
        : undefined)
  );
  const foreignGross = (a?.box1 ?? 0) + (b?.box1a ?? 0) + (c?.box1 ?? 0);
  const foreignTax = (a?.box6 ?? 0) + (b?.box7 ?? 0) + (c?.box6 ?? 0);
  const deduction = fields.standard_or_itemized_deduction;
  const allocatedA = typeof deduction === "number" && foreignGross > 0
    ? Math.round(deduction * share(a?.box1 ?? 0, foreignGross))
    : NaN;
  const allocatedB = typeof deduction === "number" && foreignGross > 0
    ? Math.round(deduction * share(b?.box1a ?? 0, foreignGross))
    : NaN;
  const allocatedC = typeof deduction === "number" && foreignGross > 0
    ? Math.round(deduction * share(c?.box1 ?? 0, foreignGross))
    : NaN;
  const allocatedDeduction = allocatedA + allocatedB + allocatedC;
  const reviewedReferences = (fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined)?.source_document_references;
  const holding = b?.foreign_tax_holding_review;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const itemMatches = (
    kind: ForeignTaxKind,
    reference: string,
    gross: number,
    tax: number,
    country: string,
  ) => {
    const matches =
      summary?.items.filter((item) =>
        item.foreign_income_source_document_reference === reference
      ) ?? [];
    const item = matches[0];
    return matches.length === 1 && !!item &&
      item.income_category === IncomeCategory.Passive &&
      item.tax_kind === kind && item.foreign_gross_income === gross &&
      item.foreign_tax_paid === tax && item.irs_country_code === country &&
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
    summary.items.length !== 3 || !review.success ||
    interests.length !== 2 || dividends.length !== 1 || !a || !b || !c ||
    a === c ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    fields.mixed_interest_dividend_pdf_review !== undefined ||
    fields.two_country_interest_pdf_review !== undefined ||
    fields.three_country_interest_pdf_review !== undefined ||
    fields.two_country_mixed_pdf_review !== undefined ||
    fields.two_country_treasury_pdf_review !== undefined ||
    a.foreign_tax_irs_country_code !== "CA" || a.box7 !== "Canada" ||
    b.foreign_tax_irs_country_code !== "FR" || b.box8 !== "France" ||
    c.foreign_tax_irs_country_code !== "GM" || c.box7 !== "Germany" ||
    review.data.column_a_interest_irs_country_code !== "CA" ||
    review.data.column_b_dividend_irs_country_code !== "FR" ||
    review.data.column_c_interest_irs_country_code !== "GM" ||
    !a.foreign_tax_source_document_reference ||
    !b.source_document_reference ||
    !c.foreign_tax_source_document_reference ||
    new Set([
        a.foreign_tax_source_document_reference,
        b.source_document_reference,
        c.foreign_tax_source_document_reference,
      ]).size !== 3 ||
    !a.payer_name || !b.payerName || !c.payer_name ||
    new Set([a.payer_name, b.payerName, c.payer_name]).size !== 3 ||
    !Array.isArray(reviewedReferences) || reviewedReferences.length !== 3 ||
    JSON.stringify([...reviewedReferences].sort()) !== JSON.stringify([
        a.foreign_tax_source_document_reference,
        b.source_document_reference,
        c.foreign_tax_source_document_reference,
      ].sort()) ||
    [a, c].some((row) =>
      !Number.isSafeInteger(row.box1) || (row.box1 ?? 0) <= 0 ||
      !Number.isSafeInteger(row.box6) || (row.box6 ?? 0) <= 0 ||
      row.foreign_source_interest_usd !== row.box1 ||
      unrelatedInterest.some((key) => (row[key] ?? 0) !== 0) ||
      row.seller_financed === true ||
      row.elect_bond_premium_amortization === true
    ) ||
    b.isNominee || b.box11 || b.nominee_distribution !== undefined ||
    unrelatedDividend.some((key) => (b[key] ?? 0) !== 0) ||
    !Number.isSafeInteger(b.box1a) || b.box1a <= 0 ||
    !Number.isSafeInteger(b.box7) || (b.box7 ?? 0) <= 0 ||
    b.foreign_source_dividends_usd !== b.box1a ||
    !holding || !b.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window < 16 ||
    holding.qualifying_held_days_in_31_day_window > b.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window +
          holding.diminished_risk_days_excluded > 31 ||
    !holding.no_related_payment_obligation_confirmed ||
    !holding.ordinary_stock_holding_rule_confirmed ||
    Number.isNaN(Date.parse(`${holding.ex_dividend_date}T00:00:00Z`)) ||
    !itemMatches(
      ForeignTaxKind.Interest,
      a.foreign_tax_source_document_reference,
      a.box1!,
      a.box6!,
      "CA",
    ) ||
    !itemMatches(
      ForeignTaxKind.Dividends,
      b.source_document_reference,
      b.box1a,
      b.box7!,
      "FR",
    ) ||
    !itemMatches(
      ForeignTaxKind.Interest,
      c.foreign_tax_source_document_reference,
      c.box1!,
      c.box6!,
      "GM",
    ) ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0 || foreignGross <= deduction ||
    !Number.isSafeInteger(allocatedA) ||
    !Number.isSafeInteger(allocatedB) ||
    !Number.isSafeInteger(allocatedC) ||
    fields.worldwide_gross_income !== foreignGross ||
    fields.general_deductions !== deduction ||
    fields.total_income !== foreignGross - deduction ||
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
    f1040.line2b_taxable_interest !== a.box1! + c.box1! ||
    f1040.line3b_ordinary_dividends !== b.box1a ||
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
    pending.f1099oid !== undefined ||
    pending.schedule1a?.senior_zero_exclusions_review === true
  ) {
    throw new Error(
      "Form 1116 three-country mixed credit needs two reviewed interest copies, one reviewed dividend copy, and the finalized return",
    );
  }
  return {
    a: {
      country: "CA",
      gross: a.box1!,
      tax: a.box6!,
      allocatedDeduction: allocatedA,
    },
    b: {
      country: "FR",
      gross: b.box1a,
      tax: b.box7!,
      allocatedDeduction: allocatedB,
    },
    c: {
      country: "GM",
      gross: c.box1!,
      tax: c.box6!,
      allocatedDeduction: allocatedC,
    },
    foreignGross,
    foreignTax,
    allocatedDeduction,
  };
}
