/**
 * Expected TY2026 Form 8962 FPL inputs: 2025 HHS poverty guidelines.
 * This follows the prior-year convention stated in the TY2025 Form 8962
 * instructions; confirm against TY2026 instructions when issued. Amount
 * source: 2025 HHS Poverty Guidelines, pinned in the corpus manifest.
 */
export const FPL_2026 = {
  contiguous: { base: 15_650, increment: 5_500 },
  alaska: { base: 19_550, increment: 6_880 },
  hawaii: { base: 17_990, increment: 6_330 },
} as const;
