import type { F1040Config } from "../../../../../config/index.ts";
import type { Form8995AInput } from "./index.ts";
import { qbiPhaseInRange, qbiThreshold } from "./thresholds.ts";

type Line40Facts = {
  readonly qbi?: number;
  readonly sstb_qbi?: number;
  readonly filing_status?: Form8995AInput["filing_status"];
  readonly taxable_income?: number;
  readonly single_sstb_schedule_c_source?: Form8995AInput["single_sstb_schedule_c_source"];
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
  cfg: F1040Config,
): number | undefined {
  const minimum = cfg.qbiMinimumDeduction;
  if (minimum <= 0 || line39 >= minimum) return undefined;
  const reportedQbi = Math.max(0, input.qbi ?? 0) +
    Math.max(0, input.sstb_qbi ?? 0);
  if (reportedQbi < cfg.qbiMinimumDeductionQbiFloor) return undefined;
  // IRC §199A(d)(3): only the applicable percentage of an SSTB remains a
  // qualified trade or business in the phase-in range. The active-QBI floor
  // in §199A(i) therefore uses that eligible QBI, not the pre-phaseout profit.
  // Above the SSTB endpoint, eligible QBI is zero and the minimum cannot
  // restore an otherwise excluded physician business.
  if ((input.sstb_qbi ?? 0) > 0) {
    const source = input.single_sstb_schedule_c_source;
    if (!source || input.filing_status === undefined ||
      input.taxable_income === undefined ||
      source.business.source_schedule_c.qbi_specified_service !== true ||
      source.business.qbi - source.se_tax_deduction -
        (source.retirement_plan_deduction ?? 0) !== input.sstb_qbi) {
      throw new Error(
        "Form 8995-A minimum deduction needs its reconciled SSTB owner and qualified business income source",
      );
    }
    const applicable = Math.max(0, Math.min(1,
      (qbiThreshold(input.filing_status, cfg) +
        qbiPhaseInRange(input.filing_status, cfg) - input.taxable_income) /
        qbiPhaseInRange(input.filing_status, cfg),
    ));
    const eligibleActiveQbi =
      source.business.source_schedule_c.line_g_material_participation === true
        ? Math.round(input.sstb_qbi * applicable)
        : 0;
    return eligibleActiveQbi >= cfg.qbiMinimumDeductionQbiFloor
      ? minimum
      : undefined;
  }
  const businesses = input.schedule_c_qbi_businesses;
  if (!businesses) {
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
