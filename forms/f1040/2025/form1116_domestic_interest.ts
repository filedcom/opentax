import { inputSchema as f1099intInputSchema } from "../nodes/inputs/f1099int/index.ts";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  singleSourcePdfReviewSchema,
} from "../nodes/intermediate/forms/form_1116/index.ts";

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

/** One foreign box-1/6 payer and one distinct U.S.-source box-1 bank payer. */
export function reconcileForm1116DomesticInterest(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
):
  | { worldwideGross: number; allocatedDeduction: number; twoPayer: true }
  | undefined {
  const source = f1099intInputSchema.safeParse(pending.f1099int);
  const rows = source.success ? source.data.f1099ints : [];
  const review = singleSourcePdfReviewSchema.safeParse(
    fields.single_source_pdf_review,
  );
  const foreignRows = rows.filter((row) => (row.box6 ?? 0) > 0);
  const domesticRows = rows.filter((row) =>
    (row.box1 ?? 0) > 0 && (row.box6 ?? 0) === 0
  );
  const needsJoin = review.success &&
      review.data.domestic_interest_source_document_reference !== undefined ||
    (rows.length === 2 && foreignRows.length === 1 &&
      domesticRows.length === 1);
  if (!needsJoin) return undefined;
  const rawSummaries = fields.category_summaries;
  const parsedSummary = Array.isArray(rawSummaries) &&
      rawSummaries.length === 1
    ? categorySummarySchema.safeParse(rawSummaries[0])
    : undefined;
  const summary = parsedSummary?.success ? parsedSummary.data : undefined;
  const item = summary?.items.length === 1 ? summary.items[0] : undefined;
  const foreign = foreignRows[0];
  const domestic = domesticRows[0];
  const allRefs = (fields.foreign_preferential_income_review as
    | { source_document_references?: unknown }
    | undefined)?.source_document_references;
  const deduction = fields.standard_or_itemized_deduction;
  const return1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  if (
    !review.success || !summary || !item || !foreign || !domestic ||
    rows.length !== 2 || foreignRows.length !== 1 ||
    domesticRows.length !== 1 || foreign === domestic ||
    summary.category !== IncomeCategory.Passive ||
    item.income_category !== IncomeCategory.Passive ||
    item.tax_kind !== ForeignTaxKind.Interest ||
    item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
    item.tax_reported_on_1099 !== true ||
    item.tax_paid_or_accrued_date !== undefined ||
    review.data.domestic_treasury_source_document_reference !== undefined ||
    !domestic.source_document_reference ||
    domestic.source_document_reference !==
      review.data.domestic_interest_source_document_reference ||
    review.data.source_document_reference !==
      foreign.foreign_tax_source_document_reference ||
    domestic.source_document_reference ===
      foreign.foreign_tax_source_document_reference ||
    !Array.isArray(allRefs) || allRefs.length !== 2 ||
    !allRefs.includes(domestic.source_document_reference) ||
    !allRefs.includes(foreign.foreign_tax_source_document_reference) ||
    domestic.payer_name === foreign.payer_name ||
    rows.some((row) =>
      !Number.isSafeInteger(row.box1) || (row.box1 ?? 0) <= 0 ||
      unrelatedBoxes.some((key) => (row[key] ?? 0) !== 0) ||
      row.seller_financed === true ||
      row.elect_bond_premium_amortization === true
    ) ||
    (domestic.box6 ?? 0) !== 0 || domestic.box7 !== undefined ||
    domestic.box14 !== undefined || domestic.box15 !== undefined ||
    domestic.box16 !== undefined ||
    domestic.foreign_source_interest_usd !== undefined ||
    domestic.foreign_tax_irs_country_code !== undefined ||
    domestic.foreign_tax_source_document_reference !== undefined ||
    foreign.foreign_source_interest_usd !== foreign.box1 ||
    !Number.isSafeInteger(foreign.box6) || (foreign.box6 ?? 0) <= 0 ||
    foreign.box1 !== item.foreign_gross_income ||
    foreign.box6 !== item.foreign_tax_paid ||
    foreign.foreign_tax_irs_country_code !== item.irs_country_code ||
    foreign.foreign_tax_source_document_reference !==
      item.foreign_income_source_document_reference ||
    item.foreign_tax_currency !== undefined ||
    item.schedule_k3_line12_reduction !== undefined ||
    item.partnership_k3_passive_interest !== undefined ||
    item.s_corp_k3_passive_interest !== undefined ||
    (item.directly_allocable_deductions ?? 0) !== 0 ||
    (item.apportioned_deductions ?? 0) !== 0 ||
    (item.excluded_income ?? 0) !== 0 ||
    typeof deduction !== "number" || !Number.isSafeInteger(deduction) ||
    deduction < 0
  ) {
    throw new Error(
      "Form 1116 domestic-interest route needs one foreign box-1/6 payer and one distinct reviewed U.S. box-1 payer",
    );
  }
  const foreignGross = foreign.box1!;
  const worldwideGross = foreignGross + domestic.box1!;
  const ratio = Math.round(foreignGross / worldwideGross * 100_000) / 100_000;
  const allocatedDeduction = Math.round(deduction * ratio);
  if (
    foreignGross <= allocatedDeduction ||
    fields.worldwide_gross_income !== worldwideGross ||
    fields.general_deductions !== deduction ||
    fields.total_income !== worldwideGross - deduction ||
    fields.foreign_income !== foreignGross ||
    fields.foreign_tax_paid !== foreign.box6 ||
    summary.foreignGrossIncome !== foreignGross ||
    summary.includedForeignIncome !== foreignGross ||
    summary.foreignTaxPaid !== foreign.box6 ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    summary.automaticallyApportionedDeductions !== allocatedDeduction ||
    summary.foreignTaxableIncome !== foreignGross - allocatedDeduction ||
    return1040?.line2b_taxable_interest !== worldwideGross ||
    return1040?.line9_total_income !== worldwideGross ||
    return1040?.line11_agi !== worldwideGross ||
    return1040?.line12a_standard_deduction !== deduction ||
    return1040?.line15_taxable_income !== worldwideGross - deduction ||
    return1040?.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3?.line1_foreign_tax_credit !== summary.allowedCredit
  ) {
    throw new Error(
      "Form 1116 domestic-interest worldwide gross, deduction, credit, and finalized return do not reconcile",
    );
  }
  return { worldwideGross, allocatedDeduction, twoPayer: true };
}
