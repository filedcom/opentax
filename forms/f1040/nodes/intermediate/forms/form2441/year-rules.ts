import { FilingStatus } from "../../../types.ts";

/** IRC §§21 and 129; TY2026 changes from P.L. 119-21 §§70404-70405.
 * Sources: 2026 draft Form 2441 lines 3, 21, 27; IRS Pub. 505 (2026),
 * "Changes to the child and dependent care credit"; 26 USC §21(a)(2).
 */
export function form2441Rules(year: number) {
  if (year === 2025) {
    return {
      expenseCapOne: 3_000,
      expenseCapTwoPlus: 6_000,
      employerExclusion: 5_000,
      employerExclusionMfs: 2_500,
    } as const;
  }
  if (year === 2026) {
    return {
      expenseCapOne: 3_000,
      expenseCapTwoPlus: 6_000,
      employerExclusion: 7_500,
      employerExclusionMfs: 3_750,
    } as const;
  }
  throw new Error(`No Form 2441 rules for year ${year}`);
}

export function form2441CreditRate(
  year: number,
  agi: number,
  status: FilingStatus,
): number {
  if (year === 2025) {
    const reduction = Math.ceil(Math.max(0, agi - 15_000) / 2_000);
    return Math.max(20, 35 - reduction) / 100;
  }
  if (year === 2026) {
    const firstReduction = Math.ceil(Math.max(0, agi - 15_000) / 2_000);
    const firstStage = Math.max(35, 50 - firstReduction);
    const secondThreshold = status === FilingStatus.MFJ ? 150_000 : 75_000;
    const secondStep = status === FilingStatus.MFJ ? 4_000 : 2_000;
    const secondReduction = Math.ceil(
      Math.max(0, agi - secondThreshold) / secondStep,
    );
    return Math.max(20, firstStage - secondReduction) / 100;
  }
  throw new Error(`No Form 2441 credit rate for year ${year}`);
}
