import { type ScheduleCItem, wagesLessEmploymentCredits } from "./model.ts";

/** Bounded unmodified-box wage method with all payroll in the retained W-2 set. */
export function reviewedWotcQbiWages(
  item: ScheduleCItem,
  reduction: number,
): number {
  const review = item.qbi_wotc_filing_review;
  if (!review || reduction <= 0) {
    throw new Error(
      "Form 8995-A WOTC needs a reviewed employer W-2 wage source",
    );
  }
  const records = review.employee_w2_records;
  const unique = (key: "employee_reference" | "source_document_reference") =>
    new Set(records.map((record) => record[key])).size === records.length;
  const box1 = records.reduce((sum, record) => sum + record.box1_wages, 0);
  const box5 = records.reduce((sum, record) => sum + record.box5_wages, 0);
  const wages = Math.min(box1, box5) - reduction;
  if (
    !unique("employee_reference") || !unique("source_document_reference") ||
    box1 !== item.line_26_wages || box5 !== item.line_26_wages ||
    (item.line_26_other_employment_credits ?? 0) !== 0 ||
    wages !== wagesLessEmploymentCredits(item, reduction) ||
    wages !== item.qbi_w2_wages || (item.qbi_unadjusted_basis ?? 0) !== 0 ||
    item.line_g_material_participation !== true ||
    item.qbi_specified_service === true ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    item.proprietor_recipient === "S" || item.statutory_employee === true ||
    item.line_32_at_risk === "b" || item.at_risk_simplified !== undefined ||
    (item.line_30_home_office ?? 0) !== 0 ||
    item.home_office_method !== undefined
  ) {
    throw new Error(
      "Form 8995-A WOTC wage, owner, and QBI review must match its Schedule C payroll",
    );
  }
  return wages;
}
