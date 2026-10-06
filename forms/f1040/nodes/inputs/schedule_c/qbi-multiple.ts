import { roundWholeDollars } from "../../../whole-dollars.ts";
import { computeNetProfit, type ScheduleCItem } from "./model.ts";

/** IRS whole-dollar losses round by absolute value, including exact half dollars. */
export function roundSignedQbiDollars(value: number): number {
  return roundWholeDollars(value);
}

/** Cent allocation: largest positive business absorbs the residual; order breaks ties. */
export function allocateSharedSeDeduction(
  profits: readonly number[],
  deduction: number,
): number[] {
  const positive = profits.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (
    !Number.isFinite(deduction) || deduction < 0 ||
    (positive === 0 && deduction !== 0)
  ) {
    throw new Error(
      "Shared QBI SE deduction needs positive profit and a nonnegative deduction",
    );
  }
  if (deduction === 0) return profits.map(() => 0);
  const largest = profits.indexOf(Math.max(...profits));
  const cents = profits.map((value) =>
    value > 0 ? Math.round(deduction * 100 * value / positive) : 0
  );
  cents[largest] += Math.round(deduction * 100) -
    cents.reduce((sum, value) => sum + value, 0);
  return cents.map((value) => value / 100);
}

export function reviewedMultipleScheduleCQbi(
  items: readonly ScheduleCItem[],
  deduction: number,
) {
  if (items.length < 1) {
    throw new Error("Multiple Schedule C QBI needs at least one source");
  }
  const profits = items.map((item) => computeNetProfit(item));
  const allocations = allocateSharedSeDeduction(profits, deduction);
  for (const [index, item] of items.entries()) {
    const review = item.qbi_se_tax_allocation_review;
    if (
      (items.length > 1 &&
        (!review || review.deduction_amount !== allocations[index])) ||
      (review !== undefined &&
        review.deduction_amount !== allocations[index]) ||
      item.qbi_no_other_adjustments_confirmed !== true ||
      item.proprietor_recipient === "S" || item.statutory_employee === true ||
      item.line_g_material_participation !== true ||
      item.line_32_at_risk === "b" ||
      item.at_risk_simplified !== undefined || item.qbi_wotc_filing_review ||
      (item.line_26_other_employment_credits ?? 0) !== 0 ||
      (item.line_30_home_office ?? 0) !== 0 ||
      item.home_office_method !== undefined
    ) {
      throw new Error(
        "Multiple Schedule C QBI needs matching reviewed shared SE allocations and unrestricted taxpayer business sources",
      );
    }
  }
  const qbi = profits.map((profit, index) => profit - allocations[index]);
  return {
    profits,
    allocations,
    qbi,
    filedQbi: qbi.map(roundSignedQbiDollars),
  };
}
