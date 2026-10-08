import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as dividendSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  twoCountryMixedPdfReviewSchema,
} from "../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;
const interestOther = [
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
const dividendOther = [
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
const ratio = (a: number, b: number) => Math.round(a / b * 100_000) / 100_000;

/** One issued foreign interest statement and one issued ordinary-dividend statement in distinct countries. */
export function reconcileForm1116TwoCountryMixed(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): {
  a: {
    country: string;
    gross: number;
    tax: number;
    allocatedDeduction: number;
  };
  b: {
    country: string;
    gross: number;
    tax: number;
    allocatedDeduction: number;
  };
  foreignGross: number;
  foreignTax: number;
  allocatedDeduction: number;
} | undefined {
  if (fields.three_country_mixed_pdf_review !== undefined) return undefined;
  const parsed = Array.isArray(fields.category_summaries) &&
      fields.category_summaries.length === 1
    ? categorySummarySchema.safeParse(fields.category_summaries[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const interestSource = interestSchema.safeParse(pending.f1099int);
  const dividendSource = dividendSchema.safeParse(pending.f1099div);
  const interestRows = interestSource.success
    ? interestSource.data.f1099ints
    : [];
  const dividendRows = dividendSource.success
    ? dividendSource.data.f1099divs
    : [];
  if (
    fields.two_country_mixed_pdf_review === undefined &&
    !(summary?.items.some((item) =>
      item.tax_kind === ForeignTaxKind.Interest
    ) &&
      summary.items.some((item) =>
        item.tax_kind === ForeignTaxKind.Dividends
      ) &&
      interestRows.length === 1 && dividendRows.length === 1 &&
      interestRows[0].foreign_tax_irs_country_code !==
        dividendRows[0].foreign_tax_irs_country_code)
  ) return undefined;
  const review = twoCountryMixedPdfReviewSchema.safeParse(
    fields.two_country_mixed_pdf_review,
  );
  const interest = interestRows[0];
  const dividend = dividendRows[0];
  const foreignGross = (interest?.box1 ?? 0) + (dividend?.box1a ?? 0);
  const foreignTax = (interest?.box6 ?? 0) + (dividend?.box7 ?? 0);
  const deduction = fields.standard_or_itemized_deduction;
  const allocatedA = typeof deduction === "number" && foreignGross > 0
    ? Math.round(deduction * ratio(interest?.box1 ?? 0, foreignGross))
    : NaN;
  const allocatedB = typeof deduction === "number" && foreignGross > 0
    ? Math.round(deduction * ratio(dividend?.box1a ?? 0, foreignGross))
    : NaN;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const refs = (fields.foreign_preferential_income_review as {
    source_document_references?: unknown;
  } | undefined)?.source_document_references;
  const holding = dividend?.foreign_tax_holding_review;
  const itemMatches = (
    kind: ForeignTaxKind,
    ref: string,
    gross: number,
    tax: number,
    country: string,
  ) => {
    const matches = summary?.items.filter((item) =>
      item.tax_kind === kind &&
      item.foreign_income_source_document_reference === ref
    ) ?? [];
    const item = matches[0];
    return matches.length === 1 && !!item &&
      item.income_category === IncomeCategory.Passive &&
      item.foreign_gross_income === gross && item.foreign_tax_paid === tax &&
      item.irs_country_code === country &&
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
    summary.items.length !== 2 ||
    !review.success || !interest || !dividend || interestRows.length !== 1 ||
    dividendRows.length !== 1 ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    fields.two_country_interest_pdf_review !== undefined ||
    fields.mixed_interest_dividend_pdf_review !== undefined ||
    !interest.foreign_tax_source_document_reference ||
    !dividend.source_document_reference ||
    interest.foreign_tax_source_document_reference ===
      dividend.source_document_reference ||
    review.data.column_a_interest_source_document_reference !==
      interest.foreign_tax_source_document_reference ||
    review.data.column_b_dividend_source_document_reference !==
      dividend.source_document_reference ||
    review.data.column_a_interest_irs_country_code !==
      interest.foreign_tax_irs_country_code ||
    review.data.column_b_dividend_irs_country_code !==
      dividend.foreign_tax_irs_country_code ||
    !interest.foreign_tax_irs_country_code ||
    !dividend.foreign_tax_irs_country_code ||
    interest.foreign_tax_irs_country_code !== "CA" ||
    interest.box7 !== "Canada" ||
    dividend.foreign_tax_irs_country_code !== "FR" ||
    dividend.box8 !== "France" ||
    !Array.isArray(refs) || refs.length !== 2 ||
    JSON.stringify([...refs].sort()) !==
      JSON.stringify(
        [
          interest.foreign_tax_source_document_reference,
          dividend.source_document_reference,
        ].sort(),
      ) ||
    !interest.payer_name || !dividend.payerName ||
    interest.payer_name === dividend.payerName ||
    !Number.isSafeInteger(interest.box1) || (interest.box1 ?? 0) <= 0 ||
    !Number.isSafeInteger(interest.box6) || (interest.box6 ?? 0) <= 0 ||
    interest.foreign_source_interest_usd !== interest.box1 ||
    interestOther.some((key) => (interest[key] ?? 0) !== 0) ||
    interest.seller_financed === true ||
    interest.elect_bond_premium_amortization === true ||
    dividend.isNominee || dividend.box11 ||
    dividend.nominee_distribution !== undefined ||
    dividendOther.some((key) => (dividend[key] ?? 0) !== 0) ||
    !Number.isSafeInteger(dividend.box1a) || dividend.box1a <= 0 ||
    !Number.isSafeInteger(dividend.box7) || (dividend.box7 ?? 0) <= 0 ||
    dividend.foreign_source_dividends_usd !== dividend.box1a ||
    !holding || !dividend.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window < 16 ||
    holding.qualifying_held_days_in_31_day_window >
      dividend.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window +
          holding.diminished_risk_days_excluded > 31 ||
    Number.isNaN(Date.parse(`${holding.ex_dividend_date}T00:00:00Z`)) ||
    !itemMatches(
      ForeignTaxKind.Interest,
      interest.foreign_tax_source_document_reference,
      interest.box1!,
      interest.box6!,
      interest.foreign_tax_irs_country_code,
    ) ||
    !itemMatches(
      ForeignTaxKind.Dividends,
      dividend.source_document_reference,
      dividend.box1a,
      dividend.box7!,
      dividend.foreign_tax_irs_country_code,
    ) ||
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
    !f1040 || !schedule3 || f1040.line2b_taxable_interest !== interest.box1 ||
    f1040.line3b_ordinary_dividends !== dividend.box1a ||
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
      "Form 1116 two-country mixed credit needs separate reviewed interest/dividend sources and the finalized return",
    );
  }
  return {
    a: {
      country: interest.foreign_tax_irs_country_code,
      gross: interest.box1!,
      tax: interest.box6!,
      allocatedDeduction: allocatedA,
    },
    b: {
      country: dividend.foreign_tax_irs_country_code,
      gross: dividend.box1a,
      tax: dividend.box7!,
      allocatedDeduction: allocatedB,
    },
    foreignGross,
    foreignTax,
    allocatedDeduction: allocatedA + allocatedB,
  };
}
