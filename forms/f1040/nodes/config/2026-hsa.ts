/** Rev. Proc. 2025-19; IRC 223(b)(3); Notice 2026-5. Separate annual inputs
 * for shared HSA worksheets, not registration of a filing product. */
export const hsa2026 = {
  selfOnlyLimit: 4400,
  familyLimit: 8750,
  catchupLimit: 1000,
  minimumDeductible: { self_only: 1700, family: 3400 },
  maximumOutOfPocket: { self_only: 8500, family: 17000 },
  directPrimaryCareMonthlyFee: { single: 150, multiple: 300 },
} as const;
