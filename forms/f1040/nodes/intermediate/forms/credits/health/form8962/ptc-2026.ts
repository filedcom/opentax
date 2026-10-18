// TY2026 premium tax credit rules, which differ in law from TY2025:
// - The ARPA/IRA applicable percentages ended after 2025 (IRC §36B(b)(3)(A)(iii)),
//   so the indexed Applicable Percentage Table of Rev. Proc. 2025-25 §3.01
//   applies and household income over 400% FPL gets no credit (draft 2026
//   Form 8962 line 6, "Did you enter 401% on line 5?").
// - P.L. 119-21 §71305 removes the IRC §36B(f)(2)(B) repayment limitation
//   (draft 2026 Form 8962 line 27 goes to Schedule 2 line 1a; lines 28-29
//   are reserved).
// - P.L. 119-21 §71302 ends the IRC §36B(c)(1)(B) rule for lawfully present
//   individuals under 100% FPL who are Medicaid-ineligible due to status.
// - Rev. Proc. 2025-25 §3.02: 9.96% required contribution percentage.
// - 2025 HHS poverty guidelines (90 FR 5917) for Alaska and Hawaii.
// The 2026 Form 8962 instructions are not yet published, so Table 2's
// applicable figures are figured here from Rev. Proc. 2025-25 under Treas.
// Reg. §1.36B-3(g)(2) and unconfirmed against the IRS table.

// [lower bound %, initial basis points, final basis points], Rev. Proc. 2025-25 §3.01.
const APPLICABLE_PERCENTAGE_2026: ReadonlyArray<
  readonly [number, number, number]
> = [
  [0, 210, 210],
  [133, 314, 419],
  [150, 419, 660],
  [200, 660, 844],
  [250, 844, 996],
  [300, 996, 996],
];

/** Form 8962 line 7 for an integer line 5; Infinity when no credit is allowed. */
export function applicableFigure2026(line5: number): number {
  if (line5 > 400) return Infinity;
  const index = APPLICABLE_PERCENTAGE_2026.filter(([lower]) =>
    line5 >= lower
  ).length - 1;
  const [lower, initial, final] = APPLICABLE_PERCENTAGE_2026[index];
  if (initial === final) return initial / 10_000;
  const upper = APPLICABLE_PERCENTAGE_2026[index + 1][0];
  const bps = initial + (line5 - lower) * (final - initial) / (upper - lower);
  return Math.round(bps) / 10_000;
}

export const REGIONAL_FPL_2026 = {
  alaska: [19_550, 6_880],
  hawaii: [17_990, 6_330],
} as const;

export const REQUIRED_CONTRIBUTION_RATE_2026 = 0.0996;
