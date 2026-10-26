import type { ScheduleCItem } from "./model.ts";

/** i8995: qualified retirement contributions attributable to a business reduce QBI. */
export function reviewedSstbRetirementDeduction(
  business: ScheduleCItem,
  computedRetirementDeduction: number,
): number {
  const review = business.qbi_sstb_filing_review;
  const retirement = review?.retirement_plan_deduction_review;
  if (!Number.isSafeInteger(computedRetirementDeduction) ||
    computedRetirementDeduction < 0) {
    throw new Error("SSTB retirement deduction needs computed whole-dollar contributions");
  }
  if (computedRetirementDeduction === 0) {
    if (!review?.no_adjustments_beyond_filed_half_se_tax_confirmed || retirement) {
      throw new Error("SSTB without retirement needs its half-SE-only adjustment review");
    }
    return 0;
  }
  if (!retirement || review?.no_adjustments_beyond_filed_half_se_tax_confirmed ||
    retirement.owner_ssn !== review?.owner_ssn ||
    retirement.business_reference !== business.business_reference ||
    retirement.deduction_amount !== computedRetirementDeduction ||
    business.qbi_no_other_adjustments_confirmed !== false) {
    throw new Error(
      "SSTB retirement review must identify its sole business owner and match the computed retirement deduction",
    );
  }
  return computedRetirementDeduction;
}
