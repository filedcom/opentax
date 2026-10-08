import { inputSchema as f1099intInputSchema } from "../../../../nodes/inputs/f1099int/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  multiSourcePdfReviewSchema,
} from "../../../../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;

const unrelatedBoxes = [
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

export function reconcileForm1116MultiForeignInterest(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
): { foreignGross: number; foreignTax: number; country: string } | undefined {
  if (fields.multi_source_pdf_review === undefined) return undefined;
  const review = multiSourcePdfReviewSchema.parse(
    fields.multi_source_pdf_review,
  );
  if (fields.single_source_pdf_review !== undefined) {
    throw new Error(
      "Form 1116 multiple foreign payers cannot use the single-source review",
    );
  }
  const sources = f1099intInputSchema.safeParse(pending.f1099int);
  const summaries = fields.category_summaries;
  const parsedSummary = Array.isArray(summaries) && summaries.length === 1
    ? categorySummarySchema.safeParse(summaries[0])
    : undefined;
  const summary = parsedSummary?.success ? parsedSummary.data : undefined;
  const rows = sources.success ? sources.data.f1099ints : [];
  const items = summary?.items ?? [];
  const refs = rows.map((row) => row.foreign_tax_source_document_reference);
  const reviewedRefs = review.payer_source_document_references;
  const preferential = fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined;
  const preferentialRefs = preferential?.source_document_references;
  const sameRefs = (candidate: unknown): boolean =>
    Array.isArray(candidate) && candidate.length === refs.length &&
    JSON.stringify([...candidate].sort()) === JSON.stringify([...refs].sort());
  const country = rows[0]?.foreign_tax_irs_country_code;
  const foreignGross = rows.reduce((sum, row) => sum + (row.box1 ?? 0), 0);
  const foreignTax = rows.reduce((sum, row) => sum + (row.box6 ?? 0), 0);
  const deduction = fields.standard_or_itemized_deduction;
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  if (
    !summary || summary.category !== IncomeCategory.Passive ||
    rows.length < 2 || items.length !== rows.length ||
    !country || new Set(refs).size !== refs.length ||
    refs.some((ref) => !ref) ||
    new Set(rows.map((row) => row.payer_name)).size !== rows.length ||
    !sameRefs(reviewedRefs) || !sameRefs(preferentialRefs) ||
    rows.some((row) =>
      row.foreign_tax_irs_country_code !== country ||
      !Number.isSafeInteger(row.box1) || (row.box1 ?? 0) <= 0 ||
      !Number.isSafeInteger(row.box6) || (row.box6 ?? 0) <= 0 ||
      row.foreign_source_interest_usd !== row.box1 ||
      unrelatedBoxes.some((key) => (row[key] ?? 0) !== 0) ||
      row.seller_financed === true ||
      row.elect_bond_premium_amortization === true
    ) ||
    items.some((item) => {
      const matches = rows.filter((row) =>
        row.foreign_tax_source_document_reference ===
          item.foreign_income_source_document_reference
      );
      const row = matches[0];
      return matches.length !== 1 || !row ||
        item.foreign_gross_income !== row.box1 ||
        item.foreign_tax_paid !== row.box6 ||
        item.irs_country_code !== country ||
        item.income_category !== IncomeCategory.Passive ||
        item.tax_kind !== ForeignTaxKind.Interest ||
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
    !Number.isSafeInteger(deduction) ||
    typeof deduction !== "number" || deduction < 0 ||
    foreignGross <= deduction ||
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
    f1040.line2b_taxable_interest !== foreignGross ||
    f1040.line9_total_income !== foreignGross ||
    f1040.line11_agi !== foreignGross ||
    f1040.line12a_standard_deduction !== deduction ||
    f1040.line15_taxable_income !== foreignGross - deduction ||
    f1040.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3.line1_foreign_tax_credit !== summary.allowedCredit
  ) {
    throw new Error(
      "Form 1116 multiple foreign-interest payers need one reviewed same-country 1099-INT inventory and finalized return",
    );
  }
  return { foreignGross, foreignTax, country };
}
