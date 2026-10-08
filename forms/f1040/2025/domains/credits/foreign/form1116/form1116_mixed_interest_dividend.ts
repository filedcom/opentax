import { inputSchema as interestInputSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as dividendInputSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  mixedInterestDividendPdfReviewSchema,
} from "../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;

const unrelatedInterestBoxes = [
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
const unrelatedDividendBoxes = [
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

export function reconcileForm1116MixedInterestDividend(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): {
  foreignGross: number;
  foreignTax: number;
  interestTax: number;
  dividendTax: number;
} | undefined {
  if (
    fields.two_country_mixed_pdf_review !== undefined ||
    fields.three_country_mixed_pdf_review !== undefined
  ) return undefined;
  const raw = fields.category_summaries;
  const parsed = Array.isArray(raw) && raw.length === 1
    ? categorySummarySchema.safeParse(raw[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const hasMixedItems =
    summary?.items.some((item) => item.tax_kind === ForeignTaxKind.Dividends) &&
    summary.items.some((item) => item.tax_kind === ForeignTaxKind.Interest);
  const interestSource = interestInputSchema.safeParse(pending.f1099int);
  const dividendSource = dividendInputSchema.safeParse(pending.f1099div);
  const hasMixedSources = interestSource.success && dividendSource.success &&
    interestSource.data.f1099ints.some((row) => (row.box6 ?? 0) > 0) &&
    dividendSource.data.f1099divs.some((row) => (row.box7 ?? 0) > 0);
  if (
    !hasMixedItems && !hasMixedSources &&
    fields.mixed_interest_dividend_pdf_review === undefined
  ) {
    return undefined;
  }
  const review = mixedInterestDividendPdfReviewSchema.safeParse(
    fields.mixed_interest_dividend_pdf_review,
  );
  const interestRows = interestSource.success
    ? interestSource.data.f1099ints
    : [];
  const dividendRows = dividendSource.success
    ? dividendSource.data.f1099divs
    : [];
  const interest = interestRows[0];
  const dividend = dividendRows[0];
  const interestItem = summary?.items.find((item) =>
    item.tax_kind === ForeignTaxKind.Interest
  );
  const dividendItem = summary?.items.find((item) =>
    item.tax_kind === ForeignTaxKind.Dividends
  );
  const holding = dividend?.foreign_tax_holding_review;
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const refs = preferential?.source_document_references;
  const interestRef = interest?.foreign_tax_source_document_reference;
  const dividendRef = dividend?.source_document_reference;
  const country = interest?.foreign_tax_irs_country_code;
  const foreignGross = (interest?.box1 ?? 0) + (dividend?.box1a ?? 0);
  const interestTax = interest?.box6 ?? 0;
  const dividendTax = dividend?.box7 ?? 0;
  const foreignTax = interestTax + dividendTax;
  const deduction = fields.standard_or_itemized_deduction;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const itemMatches = (
    item: typeof interestItem,
    kind: ForeignTaxKind,
    ref: string,
    income: number,
    tax: number,
  ): boolean =>
    !!item &&
    item.tax_kind === kind &&
    item.income_category === IncomeCategory.Passive &&
    item.foreign_income_source_document_reference === ref &&
    item.foreign_gross_income === income &&
    item.foreign_tax_paid === tax &&
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
  if (
    !summary || summary.category !== IncomeCategory.Passive ||
    summary.items.length !== 2 || !review.success ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    interestRows.length !== 1 || dividendRows.length !== 1 ||
    !interest || !dividend || !interestRef || !dividendRef ||
    interestRef === dividendRef ||
    review.data.interest_source_document_reference !== interestRef ||
    review.data.dividend_source_document_reference !== dividendRef ||
    !Array.isArray(refs) || refs.length !== 2 ||
    JSON.stringify([...refs].sort()) !==
      JSON.stringify([interestRef, dividendRef].sort()) ||
    !country || dividend.foreign_tax_irs_country_code !== country ||
    !interest.payer_name || !dividend.payerName ||
    interest.payer_name === dividend.payerName ||
    !Number.isSafeInteger(interest.box1) || (interest.box1 ?? 0) <= 0 ||
    !Number.isSafeInteger(interest.box6) || interestTax <= 0 ||
    interest.foreign_source_interest_usd !== interest.box1 ||
    unrelatedInterestBoxes.some((box) => (interest[box] ?? 0) !== 0) ||
    interest.seller_financed === true ||
    interest.elect_bond_premium_amortization === true ||
    dividend.isNominee || dividend.nominee_distribution !== undefined ||
    dividend.box11 ||
    unrelatedDividendBoxes.some((box) => (dividend[box] ?? 0) !== 0) ||
    !Number.isSafeInteger(dividend.box1a) || dividend.box1a <= 0 ||
    !Number.isSafeInteger(dividend.box7) || dividendTax <= 0 ||
    dividend.foreign_source_dividends_usd !== dividend.box1a ||
    dividend.box8 !== undefined && !dividend.box8.trim() ||
    !holding || !dividend.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window < 16 ||
    holding.qualifying_held_days_in_31_day_window >
      dividend.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window +
          holding.diminished_risk_days_excluded > 31 ||
    Number.isNaN(Date.parse(`${holding.ex_dividend_date}T00:00:00Z`)) ||
    new Date(`${holding.ex_dividend_date}T00:00:00Z`).toISOString().slice(
        0,
        10,
      ) !==
      holding.ex_dividend_date ||
    !itemMatches(
      interestItem,
      ForeignTaxKind.Interest,
      interestRef,
      interest.box1!,
      interestTax,
    ) ||
    !itemMatches(
      dividendItem,
      ForeignTaxKind.Dividends,
      dividendRef,
      dividend.box1a,
      dividendTax,
    ) ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0 || foreignGross <= deduction ||
    fields.worldwide_gross_income !== foreignGross ||
    fields.general_deductions !== deduction ||
    fields.total_income !== foreignGross - deduction ||
    fields.foreign_income !== foreignGross ||
    fields.foreign_tax_paid !== foreignTax ||
    summary.foreignGrossIncome !== foreignGross ||
    summary.includedForeignIncome !== foreignGross ||
    summary.foreignTaxPaid !== foreignTax ||
    summary.automaticallyApportionedDeductions !== deduction ||
    summary.foreignTaxableIncome !== foreignGross - deduction ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    !f1040 || !schedule3 ||
    f1040.line2b_taxable_interest !== interest.box1 ||
    f1040.line3b_ordinary_dividends !== dividend.box1a ||
    (f1040.line3a_qualified_dividends ?? 0) !== 0 ||
    f1040.line9_total_income !== foreignGross ||
    f1040.line11_agi !== foreignGross ||
    f1040.line12a_standard_deduction !== deduction ||
    f1040.line15_taxable_income !== foreignGross - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit
  ) {
    throw new Error(
      "Form 1116 mixed interest/dividend credit needs two reviewed same-country 1099 sources and the finalized return",
    );
  }
  return { foreignGross, foreignTax, interestTax, dividendTax };
}
