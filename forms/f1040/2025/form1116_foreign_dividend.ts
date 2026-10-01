import { inputSchema as dividendInputSchema } from "../nodes/inputs/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  singleSourcePdfReviewSchema,
} from "../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;

const otherDividendBoxes = [
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

export function reconcileForm1116ForeignDividend(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): boolean {
  const summaries = fields.category_summaries;
  const parsed = Array.isArray(summaries) && summaries.length === 1
    ? categorySummarySchema.safeParse(summaries[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const hasDividend = summary?.items.some((item) =>
    item.tax_kind === ForeignTaxKind.Dividends
  );
  if (!hasDividend) return false;
  const item = summary?.items[0];
  const source = dividendInputSchema.safeParse(pending.f1099div);
  const rows = source.success ? source.data.f1099divs : [];
  const row = rows[0];
  const review = singleSourcePdfReviewSchema.safeParse(
    fields.single_source_pdf_review,
  );
  const holding = row?.foreign_tax_holding_review;
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const ref = row?.source_document_reference;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const deduction = fields.standard_or_itemized_deduction;
  if (
    !summary || summary.category !== IncomeCategory.Passive ||
    summary.items.length !== 1 || rows.length !== 1 || !row ||
    !review.success ||
    !ref || review.data.source_document_reference !== ref ||
    review.data.domestic_treasury_source_document_reference !== undefined ||
    JSON.stringify(preferential?.source_document_references) !==
      JSON.stringify([ref]) ||
    row.isNominee || row.nominee_distribution !== undefined || row.box11 ||
    otherDividendBoxes.some((box) => (row[box] ?? 0) !== 0) ||
    !Number.isSafeInteger(row.box1a) || row.box1a <= 0 ||
    row.foreign_source_dividends_usd !== row.box1a ||
    !Number.isSafeInteger(row.box7) || (row.box7 ?? 0) <= 0 ||
    !row.foreign_tax_irs_country_code ||
    row.box8 !== undefined && !row.box8.trim() ||
    !holding || !row.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window < 16 ||
    holding.qualifying_held_days_in_31_day_window > row.holdingPeriodDays ||
    holding.qualifying_held_days_in_31_day_window +
          holding.diminished_risk_days_excluded > 31 ||
    Number.isNaN(Date.parse(`${holding.ex_dividend_date}T00:00:00Z`)) ||
    new Date(`${holding.ex_dividend_date}T00:00:00Z`).toISOString().slice(
        0,
        10,
      ) !==
      holding.ex_dividend_date ||
    item?.tax_kind !== ForeignTaxKind.Dividends ||
    item.foreign_income_source_document_reference !== ref ||
    item.foreign_gross_income !== row.box1a ||
    item.foreign_tax_paid !== row.box7 ||
    item.irs_country_code !== row.foreign_tax_irs_country_code ||
    item.income_category !== IncomeCategory.Passive ||
    item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
    item.tax_reported_on_1099 !== true ||
    item.tax_paid_or_accrued_date !== undefined ||
    item.foreign_tax_currency !== undefined ||
    (item.directly_allocable_deductions ?? 0) !== 0 ||
    (item.apportioned_deductions ?? 0) !== 0 ||
    (item.excluded_income ?? 0) !== 0 ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0 || row.box1a <= deduction ||
    fields.worldwide_gross_income !== row.box1a ||
    fields.general_deductions !== deduction ||
    fields.total_income !== row.box1a - deduction ||
    fields.foreign_income !== row.box1a ||
    fields.foreign_tax_paid !== row.box7 ||
    summary.foreignGrossIncome !== row.box1a ||
    summary.includedForeignIncome !== row.box1a ||
    summary.foreignTaxPaid !== row.box7 ||
    summary.automaticallyApportionedDeductions !== deduction ||
    summary.foreignTaxableIncome !== row.box1a - deduction ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    !f1040 || !schedule3 ||
    f1040.line3b_ordinary_dividends !== row.box1a ||
    (f1040.line3a_qualified_dividends ?? 0) !== 0 ||
    (f1040.line2b_taxable_interest ?? 0) !== 0 ||
    f1040.line9_total_income !== row.box1a ||
    f1040.line11_agi !== row.box1a ||
    f1040.line12a_standard_deduction !== deduction ||
    f1040.line15_taxable_income !== row.box1a - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit ||
    pending.f1099int !== undefined
  ) {
    throw new Error(
      "Form 1116 dividend credit needs one reviewed ordinary 1099-DIV and matching finalized return",
    );
  }
  return true;
}
