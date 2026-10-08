import { itemSchema } from "../../../../../nodes/inputs/credits/individual/f8863/index.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";

/** Two independently sourced schools sharing one student's credit limit. */
export function twoSchoolEducationFixture(
  base: PdfReviewFixture,
  credit: "llc" | "aoc",
): PdfReviewFixture {
  const original = itemSchema.parse((base.inputs.f8863 as unknown[])[0]);
  const first = original.filing_details!.institutions[0];
  const second = {
    ...first,
    name: "Second College",
    ein: "98-7654321",
    us_address: {
      line1: "2 College Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  };
  const firstSource = original.education_expense_workpaper!;
  const secondSource = {
    ...firstSource,
    form1098t_box1_payments: 2_500,
    form1098t_box5_scholarships: 0,
    form1098t_document_id: "SECOND-SCHOOL-2025-1098T",
    payment_record_ids: ["SECOND-SCHOOL-2025-TUITION"],
    paid_tuition_required_fees: 2_500,
    paid_course_materials_to_institution: 0,
    institution_materials_requirement_record_id: undefined,
    institution_materials_payment_record_id: undefined,
    tax_free_assistance_applied_to_expenses: 0,
  };
  const student = {
    ...original,
    education_expense_workpaper: undefined,
    institution_expense_workpapers: [
      { institution_ein: first.ein!, workpaper: firstSource },
      { institution_ein: second.ein, workpaper: secondSource },
    ],
    filing_details: {
      ...original.filing_details!,
      institutions: [first, second],
    },
    llc_adjusted_expenses: 10_000,
  };

  const source = credit === "aoc"
    ? {
      ...student,
      credit_type: "aoc",
      llc_adjusted_expenses: undefined,
      aoc_adjusted_expenses: 10_000,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      taxpayer_under_24_no_refundable_aoc: false,
    }
    : student;
  return {
    ...base,
    id: `single-form8863-two-school-${credit}`,
    inputs: { ...base.inputs, f8863: [source] },
    reviewFocus: [
      "Both separately sourced school names, EINs and current/prior 1098-T answers print on Part III",
      credit === "aoc"
        ? "Two-school expenses use one 4,000 AOC cap, 1,500 nonrefundable and 1,000 refundable credit"
        : "Two-school adjusted expenses total 10,000 and yield 2,000 LLC credit",
      "Final Form 1040 tax, payments and refund agree with native XML",
    ],
  };
}
