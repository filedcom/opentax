import { z } from "zod";
import {
  categorySummarySchema,
  form1116,
  inputSchema as form1116InputSchema,
  type RedeterminationDisclosure,
} from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import {
  buildScheduleCProjection,
  type ScheduleCFiledYearEvidence,
} from "./f1116_schedule_c.ts";
import { projectScheduleCPdfCandidate } from "../../../../../pdf/forms/credits/foreign/f1116/f1116_schedule_c_candidate.ts";

type CurrentReturnCandidate = Record<string, Record<string, unknown>>;

/** Check a narrow 2025 return candidate without lifting the live Schedule C gate. */
export function reconcileScheduleCCurrentYearCandidate(
  ledger: RedeterminationDisclosure,
  affectedYear: ScheduleCFiledYearEvidence,
  rawCurrentForm1116: unknown,
  currentReturn: CurrentReturnCandidate,
) {
  const nativeXmlCandidate = buildScheduleCProjection(ledger, affectedYear);
  const pdfFieldsCandidate = projectScheduleCPdfCandidate(ledger, affectedYear);
  const current = form1116InputSchema.parse(rawCurrentForm1116);
  const review = current.single_source_pdf_review;
  const item = current.foreign_tax_items?.[0];
  if (
    current.foreign_tax_redeterminations !== undefined ||
    current.foreign_tax_items?.length !== 1 ||
    !item || item.income_category !== ledger.income_category ||
    (current.prior_year_carryovers?.length ?? 0) !== 0 ||
    (current.carryover_reviews?.length ?? 0) !== 0 ||
    !review || !("no_foreign_tax_reduction_confirmed" in review) ||
    !review.no_prior_year_carryover_or_carryback_confirmed ||
    item.schedule_k3_line12_reduction !== undefined ||
    item.tax_paid_or_accrued_date?.startsWith("2025-") !== true ||
    (current.tentative_minimum_tax ?? 0) !== 0 ||
    (current.enhanced_senior_deduction ?? 0) !== 0 ||
    (current.known_foreign_qualified_dividends ?? 0) !== 0 ||
    current.regular_tax_preference_facts !== undefined ||
    current.worldwide_taxable_income === undefined ||
    current.worldwide_taxable_income <= 0 ||
    current.us_tax_before_credits === undefined ||
    current.us_tax_before_credits <= 0
  ) {
    throw new Error(
      "Form 1116 Schedule C current-year join needs one sourced 2025 category with no carryover or special adjustment",
    );
  }
  const calculated = form1116.compute(
    { taxYear: 2025, formType: "f1040" },
    current,
  ).outputs;
  const calculatedForm = calculated.find((row) => row.nodeType === "form_1116")
    ?.fields;
  const categories = z.array(categorySummarySchema).parse(
    calculatedForm?.category_summaries,
  );
  const category = categories[0];
  const calculatedCredit = calculated.find((row) =>
    row.nodeType === "schedule3"
  )
    ?.fields.line1_foreign_tax_credit;
  if (
    categories.length !== 1 || !category ||
    category.category !== ledger.income_category ||
    category.currentYearExcessTax !== 0 ||
    (category.priorYearCarryover ?? 0) !== 0 ||
    (category.usedPriorYearCarryover ?? 0) !== 0 ||
    category.allowedCredit <= 0 ||
    calculatedCredit !== category.allowedCredit ||
    calculated.some((row) => row.nodeType === "form1116_schedule_b")
  ) {
    throw new Error(
      "Form 1116 Schedule C current-year candidate has a Schedule B carryover or unmatched category credit",
    );
  }
  const form = currentReturn.form_1116;
  const finalCategories = z.array(categorySummarySchema).parse(
    form?.category_summaries,
  );
  const schedule3 = currentReturn.schedule3;
  const form1040 = currentReturn.f1040;
  const credit = category.allowedCredit;
  const line16 = current.us_tax_before_credits;
  const line22 = Math.max(0, line16 - credit);
  if (
    currentReturn.form1116_schedule_b !== undefined ||
    finalCategories.length !== 1 ||
    finalCategories[0].category !== category.category ||
    finalCategories[0].foreignTaxPaid !== category.foreignTaxPaid ||
    finalCategories[0].foreignTaxableIncome !== category.foreignTaxableIncome ||
    finalCategories[0].allowedCredit !== credit ||
    finalCategories[0].currentYearExcessTax !== 0 ||
    schedule3?.line1_foreign_tax_credit !== credit ||
    schedule3?.line1_total !== credit ||
    schedule3?.line8_total !== credit ||
    form1040?.line15_taxable_income !== current.worldwide_taxable_income ||
    form1040?.line16_income_tax !== line16 ||
    (form1040?.line17_additional_taxes ?? 0) !== 0 ||
    form1040?.line18_total_tax_before_credits !== line16 ||
    (form1040?.line19_child_tax_credit ?? 0) !== 0 ||
    form1040?.line20_nonrefundable_credits !== credit ||
    form1040?.line21_credits_total !== credit ||
    form1040?.line22_tax_after_credits !== line22 ||
    (form1040?.line23_other_taxes ?? 0) !== 0 ||
    form1040?.line24_total_tax !== line22 ||
    form1040?.form1116_line18_worldwide_taxable_income !==
      current.worldwide_taxable_income ||
    form1040?.form1116_line20_us_tax !== line16
  ) {
    throw new Error(
      "Form 1116 Schedule C current-year Form 1116, Schedule B, Schedule 3, or Form 1040 candidate does not reconcile",
    );
  }
  return {
    native_xml_candidate: nativeXmlCandidate,
    pdf_fields_candidate: pdfFieldsCandidate,
    current_year_credit: credit,
    schedule_b_required: false as const,
    export_ready: false as const,
  };
}
