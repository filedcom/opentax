import { FilingStatus } from "../../../../../types.ts";
import type { F1040Config } from "../../../../../config/index.ts";

export type FplRegion = "contiguous" | "alaska" | "hawaii";

/** Only annual rules needed by the reusable Form 8962 arithmetic. */
export interface Form8962AnnualPolicy {
  readonly taxYear: 2025 | 2026;
  readonly qsehraAffordability: number;
  federalPovertyLevel(householdSize: number, region: FplRegion): number;
  /** Infinity means household income exceeds the year's eligibility ceiling. */
  applicableContributionPct(incomeAsFplPct: number): number;
  repaymentCap(
    incomePct: number,
    status: FilingStatus | undefined,
  ): number | null;
}

/** Preserve the existing 2025 node's parameters and rounding exactly. */
export function form8962Policy2025(
  cfg: Pick<F1040Config, "fplBase" | "fplIncrement">,
): Form8962AnnualPolicy {
  return {
    taxYear: 2025,
    qsehraAffordability: 0.0902,
    federalPovertyLevel(householdSize, region) {
      const [base, increment] = region === "alaska"
        ? [18_810, 6_730]
        : region === "hawaii"
        ? [17_310, 6_190]
        : [cfg.fplBase, cfg.fplIncrement];
      return base + increment * (householdSize - 1);
    },
    applicableContributionPct(incomeAsFplPct) {
      const line5 = Math.floor(incomeAsFplPct);
      if (line5 <= 150) return 0;
      if (line5 <= 300) return ((line5 - 150) * 4) / 10_000;
      if (line5 < 400) {
        return Math.round(600 + (line5 - 300) * 2.5) / 10_000;
      }
      return 0.085;
    },
    repaymentCap(incomePct, status) {
      for (
        const [maxPct, single, other] of [
          [200, 375, 750],
          [300, 975, 1_950],
          [400, 1_625, 3_250],
        ]
      ) {
        if (incomePct < maxPct) {
          return status === FilingStatus.Single ? single : other;
        }
      }
      return null;
    },
  };
}
