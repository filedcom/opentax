import { FilingStatus } from "../../../types.ts";

// TY2025: Form 8962 Instructions, Tables 2 and 5.
// TY2026: Rev. Proc. 2025-25 §3.01–.02; Rev. Proc. 2025-32 §2.04;
// draft Form 8962 (2026), lines 6 and 27–29.

function supportedYear(year: number): void {
  if (year !== 2025 && year !== 2026) {
    throw new Error(`Form 8962 has no rules for tax year ${year}`);
  }
}

/** Form 8962 line 7; null means line 6 says the filer is ineligible for PTC. */
export function applicableFigure(
  line5Pct: number,
  taxYear: number,
): number | null {
  supportedYear(taxYear);
  if (!Number.isInteger(line5Pct) || line5Pct < 0) {
    throw new RangeError(
      "Form 8962 line 5 must be a nonnegative whole percent",
    );
  }
  if (taxYear === 2025) {
    if (line5Pct <= 150) return 0;
    if (line5Pct <= 300) return ((line5Pct - 150) * 4) / 10_000;
    if (line5Pct < 400) {
      return Math.round(600 + (line5Pct - 300) * 2.5) / 10_000;
    }
    return 0.085;
  }

  if (line5Pct > 400) return null;
  if (line5Pct < 133) return 0.0210;
  // Rev. Proc. 2025-25 §3.01 sets initial and final percentages for each
  // income interval. Interpolate and round to four decimals for the draft
  // Form 8962 integer line 5; reconcile with the final 2026 Table 2.
  const tiers = [
    { from: 133, to: 150, initial: 0.0314, final: 0.0419 },
    { from: 150, to: 200, initial: 0.0419, final: 0.0660 },
    { from: 200, to: 250, initial: 0.0660, final: 0.0844 },
    { from: 250, to: 300, initial: 0.0844, final: 0.0996 },
  ] as const;
  const tier = tiers.find(({ from, to }) => line5Pct >= from && line5Pct < to);
  if (!tier) return 0.0996;
  const figure = tier.initial + (line5Pct - tier.from) *
      (tier.final - tier.initial) / (tier.to - tier.from);
  return Math.round(figure * 10_000) / 10_000;
}

/** Null means full excess APTC is repaid. The limitation ends after TY2025. */
export function repaymentCap(
  incomePct: number,
  status: FilingStatus | undefined,
  taxYear: number,
): number | null {
  supportedYear(taxYear);
  if (taxYear === 2026) return null;
  const isSingle = status === FilingStatus.Single;
  for (
    const tier of [
      { maxPct: 200, singleCap: 375, otherCap: 750 },
      { maxPct: 300, singleCap: 975, otherCap: 1_950 },
      { maxPct: 400, singleCap: 1_625, otherCap: 3_250 },
    ]
  ) {
    if (incomePct < tier.maxPct) {
      return isSingle ? tier.singleCap : tier.otherCap;
    }
  }
  return null;
}

export function qsehraAffordabilityRate(taxYear: number): number {
  supportedYear(taxYear);
  return taxYear === 2026 ? 0.0996 : 0.0902;
}
