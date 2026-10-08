import { inputSchema as dividendInputSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  multiSourcePdfReviewSchema,
} from "../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";

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

/** Exactly two issued 1099-DIV sources in one passive-country PDF column. */
export function reconcileForm1116TwoForeignDividends(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): { foreignGross: number; foreignTax: number } | undefined {
  if (fields.two_dividend_pdf_review === undefined) return undefined;
  const review = multiSourcePdfReviewSchema.parse(
    fields.two_dividend_pdf_review,
  );
  const raw = fields.category_summaries;
  const parsed = Array.isArray(raw) && raw.length === 1
    ? categorySummarySchema.safeParse(raw[0])
    : undefined;
  const summary = parsed?.success ? parsed.data : undefined;
  const source = dividendInputSchema.safeParse(pending.f1099div);
  const rows = source.success ? source.data.f1099divs : [];
  const refs = rows.map((row) => row.source_document_reference);
  const country = rows[0]?.foreign_tax_irs_country_code;
  const foreignGross = rows.reduce((sum, row) => sum + row.box1a, 0);
  const foreignTax = rows.reduce((sum, row) => sum + (row.box7 ?? 0), 0);
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const reviewedRefs = preferential?.source_document_references;
  const deduction = fields.standard_or_itemized_deduction;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  if (
    !summary || summary.category !== IncomeCategory.Passive ||
    summary.items.length !== 2 || rows.length !== 2 || !country ||
    fields.single_source_pdf_review !== undefined ||
    fields.multi_source_pdf_review !== undefined ||
    fields.mixed_interest_dividend_pdf_review !== undefined ||
    fields.two_country_mixed_pdf_review !== undefined ||
    fields.three_country_mixed_pdf_review !== undefined ||
    refs.some((ref) => !ref) || new Set(refs).size !== 2 ||
    new Set(rows.map((row) => row.payerName)).size !== 2 ||
    JSON.stringify([...review.payer_source_document_references].sort()) !==
      JSON.stringify([...refs].sort()) ||
    !Array.isArray(reviewedRefs) ||
    JSON.stringify([...reviewedRefs].sort()) !==
      JSON.stringify([...refs].sort()) ||
    JSON.stringify(
        summary.items.map((item) =>
          item.foreign_income_source_document_reference
        ).sort(),
      ) !== JSON.stringify([...refs].sort()) ||
    rows.some((row) => {
      const holding = row.foreign_tax_holding_review;
      return row.foreign_tax_irs_country_code !== country ||
        !row.payerName || row.isNominee ||
        row.nominee_distribution !== undefined || row.box11 === true ||
        otherDividendBoxes.some((box) => (row[box] ?? 0) !== 0) ||
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
    summary.items.some((item) => {
      const row = rows.find((row) =>
        row.source_document_reference ===
          item.foreign_income_source_document_reference
      );
      return !row || item.tax_kind !== ForeignTaxKind.Dividends ||
        item.income_category !== IncomeCategory.Passive ||
        item.foreign_gross_income !== row.box1a ||
        item.foreign_tax_paid !== row.box7 ||
        item.irs_country_code !== country ||
        item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
        item.tax_reported_on_1099 !== true ||
        item.tax_paid_or_accrued_date !== undefined ||
        item.foreign_tax_currency !== undefined ||
        item.schedule_k3_line12_reduction !== undefined ||
        item.partnership_k3_passive_interest !== undefined ||
        item.s_corp_k3_passive_interest !== undefined ||
        (item.directly_allocable_deductions ?? 0) !== 0 ||
        (item.apportioned_deductions ?? 0) !== 0 ||
        (item.excluded_income ?? 0) !== 0;
    }) ||
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
    f1040.line3b_ordinary_dividends !== foreignGross ||
    (f1040.line3a_qualified_dividends ?? 0) !== 0 ||
    (f1040.line2b_taxable_interest ?? 0) !== 0 ||
    f1040.line9_total_income !== foreignGross ||
    f1040.line11_agi !== foreignGross ||
    f1040.line12a_standard_deduction !== deduction ||
    f1040.line15_taxable_income !== foreignGross - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit ||
    pending.f1099int !== undefined
  ) {
    throw new Error(
      "Form 1116 two-dividend credit needs two reviewed same-country ordinary 1099-DIV sources and matching return",
    );
  }
  return { foreignGross, foreignTax };
}
