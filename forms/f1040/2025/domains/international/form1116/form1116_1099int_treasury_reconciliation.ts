import { inputSchema as f1099intInputSchema } from "../../../../nodes/inputs/f1099int/index.ts";
import {
  categorySummarySchema,
  IncomeCategory,
  singleSourcePdfReviewSchema,
} from "../../../../nodes/intermediate/forms/form_1116/index.ts";

type Pending = Readonly<Record<string, Record<string, unknown>>>;

const otherMonetaryBoxes = [
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

export function reconcileForm1116TreasuryInterest(
  fields: Readonly<Record<string, unknown>>,
  pending: Pending,
):
  | { worldwideGross: number; allocatedDeduction: number; twoPayer: boolean }
  | undefined {
  if (fields.two_country_treasury_pdf_review !== undefined) return undefined;
  const sourceReview = singleSourcePdfReviewSchema.safeParse(
    fields.single_source_pdf_review,
  );
  if (
    sourceReview.success &&
    sourceReview.data.domestic_interest_source_document_reference !== undefined
  ) return undefined;
  const parsedSource = f1099intInputSchema.safeParse(pending.f1099int);
  const rows = parsedSource.success ? parsedSource.data.f1099ints : [];
  const rawSummaries = fields.category_summaries;
  const parsedSummary = Array.isArray(rawSummaries) && rawSummaries.length === 1
    ? categorySummarySchema.safeParse(rawSummaries[0])
    : undefined;
  const summary = parsedSummary?.success ? parsedSummary.data : undefined;
  const item = summary?.items.length === 1 ? summary.items[0] : undefined;
  const needsTreasuryJoin = rows.some((row) => (row.box3 ?? 0) > 0) &&
      rows.some((row) => (row.box6 ?? 0) > 0) ||
    (fields.single_source_pdf_review !== undefined &&
      item?.tax_reported_on_1099 === true &&
      typeof fields.worldwide_gross_income === "number" &&
      fields.worldwide_gross_income > item.foreign_gross_income);
  if (!needsTreasuryJoin) return undefined;
  const foreignRows = rows.filter((row) => (row.box6 ?? 0) > 0);
  const treasuryRows = rows.filter((row) => (row.box3 ?? 0) > 0);
  const row = foreignRows[0];
  const treasuryRow = treasuryRows[0];
  const twoPayer = rows.length === 2 && row !== treasuryRow;
  const review = singleSourcePdfReviewSchema.safeParse(
    fields.single_source_pdf_review,
  );
  const reviewedDomesticReference = review.success
    ? review.data.domestic_treasury_source_document_reference
    : undefined;
  const reviewedForeignReference = review.success
    ? review.data.source_document_reference
    : undefined;
  const allSourceReferences = (
    fields.foreign_preferential_income_review as
      | { source_document_references?: unknown }
      | undefined
  )?.source_document_references;
  const standardDeduction = fields.standard_or_itemized_deduction;
  const returnFields = pending.f1040;
  const schedule3 = pending.schedule3;
  if (
    !row || !treasuryRow || foreignRows.length !== 1 ||
    treasuryRows.length !== 1 || !item || !summary ||
    (rows.length !== 1 && !twoPayer) ||
    (twoPayer && !review.success) ||
    summary.category !== IncomeCategory.Passive ||
    item.tax_reported_on_1099 !== true ||
    typeof standardDeduction !== "number" ||
    !Number.isSafeInteger(standardDeduction) || standardDeduction < 0 ||
    typeof row.box1 !== "number" || !Number.isSafeInteger(row.box1) ||
    row.box1 <= 0 ||
    typeof treasuryRow.box3 !== "number" ||
    !Number.isSafeInteger(treasuryRow.box3) || treasuryRow.box3 <= 0 ||
    typeof row.box6 !== "number" || !Number.isSafeInteger(row.box6) ||
    row.box6 <= 0 ||
    rows.some((source) =>
      otherMonetaryBoxes.some((key) => (source[key] ?? 0) !== 0) ||
      source.seller_financed === true ||
      source.elect_bond_premium_amortization === true
    ) ||
    (twoPayer && (
      (row.box3 ?? 0) !== 0 || (treasuryRow.box1 ?? 0) !== 0 ||
      (treasuryRow.box6 ?? 0) !== 0 ||
      treasuryRow.box7 !== undefined ||
      treasuryRow.box14 !== undefined ||
      treasuryRow.box15 !== undefined ||
      treasuryRow.box16 !== undefined ||
      treasuryRow.foreign_source_interest_usd !== undefined ||
      treasuryRow.foreign_tax_irs_country_code !== undefined ||
      treasuryRow.foreign_tax_source_document_reference !== undefined ||
      !treasuryRow.source_document_reference ||
      treasuryRow.source_document_reference ===
        row.foreign_tax_source_document_reference ||
      treasuryRow.source_document_reference !==
        reviewedDomesticReference ||
      reviewedForeignReference !== row.foreign_tax_source_document_reference ||
      !Array.isArray(allSourceReferences) ||
      allSourceReferences.length !== 2 ||
      !allSourceReferences.includes(
        row.foreign_tax_source_document_reference,
      ) ||
      !allSourceReferences.includes(treasuryRow.source_document_reference) ||
      treasuryRow.payer_name === row.payer_name
    )) ||
    (!twoPayer && reviewedDomesticReference !== undefined) ||
    row.foreign_source_interest_usd !== row.box1 ||
    row.box1 !== item.foreign_gross_income ||
    row.box6 !== item.foreign_tax_paid ||
    row.foreign_tax_irs_country_code !== item.irs_country_code ||
    row.foreign_tax_source_document_reference !==
      item.foreign_income_source_document_reference
  ) {
    throw new Error(
      "Form 1116 Treasury-interest route needs one reviewed foreign 1099-INT box 1/6 payer and the same or one separately reviewed domestic box 3 payer",
    );
  }
  const foreignInterest = row.box1!;
  const treasuryInterest = treasuryRow.box3!;
  const worldwideGross = foreignInterest + treasuryInterest;
  const ratio = Math.round(foreignInterest / worldwideGross * 100_000) /
    100_000;
  const allocatedDeduction = Math.round(standardDeduction * ratio);
  const foreignTaxable = foreignInterest - allocatedDeduction;
  if (
    foreignTaxable <= 0 ||
    fields.worldwide_gross_income !== worldwideGross ||
    fields.general_deductions !== standardDeduction ||
    fields.total_income !== worldwideGross - standardDeduction ||
    summary.foreignGrossIncome !== row.box1 ||
    summary.includedForeignIncome !== row.box1 ||
    summary.foreignTaxPaid !== row.box6 ||
    summary.automaticallyApportionedDeductions !== allocatedDeduction ||
    summary.foreignTaxableIncome !== foreignTaxable ||
    returnFields?.line2b_taxable_interest !== worldwideGross ||
    returnFields?.line9_total_income !== worldwideGross ||
    returnFields?.line11_agi !== worldwideGross ||
    returnFields?.line12a_standard_deduction !== standardDeduction ||
    returnFields?.line15_taxable_income !==
      worldwideGross - standardDeduction ||
    returnFields?.line16_income_tax !== fields.us_tax_before_credits ||
    schedule3?.line1_foreign_tax_credit !== summary.allowedCredit
  ) {
    throw new Error(
      "Form 1116 Treasury-interest deduction, limitation, and finalized return do not reconcile to 1099-INT boxes 1 and 3",
    );
  }
  return { worldwideGross, allocatedDeduction, twoPayer };
}
