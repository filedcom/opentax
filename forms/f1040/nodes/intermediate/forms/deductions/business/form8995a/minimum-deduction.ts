import type { F1040Config } from "../../../../../config/index.ts";

type Line40Facts = {
  readonly qbi?: number;
  readonly sstb_qbi?: number;
  readonly schedule_c_qbi_businesses?: ReadonlyArray<{
    readonly qbi: number;
    readonly source_schedule_c: {
      readonly line_g_material_participation?: boolean;
    };
  }>;
};

/**
 * Draft 2026 Form 8995-A lines 39-41; IRC §199A(i) (P.L. 119-21 §70105):
 * $400 when aggregate QBI from trades or businesses in which the taxpayer
 * materially participates (§469(h)) is at least $1,000. Returns line 40 only
 * when it exceeds line 39; zero config amounts (TY2025) never apply it.
 */
export function minimumDeductionLine40(
  input: Line40Facts,
  line39: number,
  cfg: Pick<F1040Config, "qbiMinimumDeduction" | "qbiMinimumDeductionQbiFloor">,
): number | undefined {
  const minimum = cfg.qbiMinimumDeduction;
  if (minimum <= 0 || line39 >= minimum) return undefined;
  const reportedQbi = Math.max(0, input.qbi ?? 0) +
    Math.max(0, input.sstb_qbi ?? 0);
  if (reportedQbi < cfg.qbiMinimumDeductionQbiFloor) return undefined;
  const businesses = input.schedule_c_qbi_businesses;
  if (!businesses || (input.sstb_qbi ?? 0) !== 0) {
    throw new Error(
      "Form 8995-A line 40 minimum deduction needs the QBI and material participation of each business",
    );
  }
  const activeQbi = businesses
    .filter((business) =>
      business.source_schedule_c.line_g_material_participation === true
    )
    .reduce((sum, business) => sum + business.qbi, 0);
  return activeQbi >= cfg.qbiMinimumDeductionQbiFloor ? minimum : undefined;
}
