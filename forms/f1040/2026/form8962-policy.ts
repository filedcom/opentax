import type { Form8962AnnualPolicy } from "../nodes/intermediate/forms/credits/health/form8962/annual-policy.ts";

/** Rev. Proc. 2025-25 §3.01; four-decimal figures use integer line 5.
 * Reconcile interpolation to the final 2026 instructions before filing.
 */
export const form8962Policy2026: Form8962AnnualPolicy = {
  taxYear: 2026,
  qsehraAffordability: 0.0996,
  federalPovertyLevel(householdSize, region) {
    // 2025 HHS guidelines, 90 FR 5917-5918, used for 2026 coverage.
    const [base, increment] = {
      contiguous: [15_650, 5_500],
      alaska: [19_550, 6_880],
      hawaii: [17_990, 6_330],
    }[region];
    return base + (householdSize - 1) * increment;
  },
  applicableContributionPct(incomeAsFplPct) {
    if (incomeAsFplPct > 400) return Infinity;
    const line5 = Math.floor(incomeAsFplPct);
    if (line5 < 133) return 0.0210;
    for (
      const [start, end, initial, final] of [
        [133, 150, 314, 419],
        [150, 200, 419, 660],
        [200, 250, 660, 844],
        [250, 300, 844, 996],
      ]
    ) {
      if (line5 < end) {
        return Math.round(
          initial + (line5 - start) * (final - initial) /
              (end - start),
        ) / 10_000;
      }
    }
    return 0.0996;
  },
  // Beginning in 2026 all excess APTC is repaid; draft lines 28/29 reserved.
  repaymentCap: () => null,
};
