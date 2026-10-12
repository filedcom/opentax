import {
  computeNetProfit,
  type ScheduleCItem,
} from "../../../../../inputs/income/business/schedule_c/model.ts";
import { reviewedWotcQbiWages } from "../../../../../inputs/income/business/schedule_c/qbi-wotc.ts";

type Business = {
  business_reference?: string;
  qbi: number;
  w2_wages: number;
  wotc_wage_reduction?: number;
  source_schedule_c: ScheduleCItem;
};

/** Replay employer payroll before allocating SE deductions and current losses. */
export function reviewedLossWotcReductions(
  businesses: readonly Business[],
): ReadonlyMap<string, number> {
  const reductions = new Map<string, number>();
  for (const business of businesses) {
    const source = business.source_schedule_c;
    const review = source.qbi_wotc_filing_review;
    const reduction = business.wotc_wage_reduction;
    if (!review && reduction === undefined) continue;
    const others = businesses.filter((b) => b !== business)
      .map((b) => b.business_reference).sort();
    if (
      !review || !reduction || !business.business_reference ||
      review.no_aggregation_confirmed !== true ||
      review.no_other_business_or_aggregation_confirmed === true ||
      JSON.stringify(
          [...review.reviewed_other_business_references ?? []].sort(),
        ) !==
        JSON.stringify(others) ||
      reviewedWotcQbiWages(source, reduction) !== business.w2_wages ||
      computeNetProfit(source, reduction) !== business.qbi
    ) {
      throw Error(
        "QBI loss WOTC must reconcile complete employer payroll and other businesses",
      );
    }
    reductions.set(business.business_reference, reduction);
  }
  return reductions;
}
