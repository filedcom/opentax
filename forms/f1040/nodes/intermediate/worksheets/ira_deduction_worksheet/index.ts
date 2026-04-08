import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { form8606 } from "../../forms/form8606/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  IRA_CONTRIBUTION_LIMIT_2025,
  IRA_CONTRIBUTION_LIMIT_AGE50_2025,
  IRA_PHASEOUT_SINGLE_LOWER_2025,
  IRA_PHASEOUT_SINGLE_UPPER_2025,
  IRA_PHASEOUT_MFJ_LOWER_2025,
  IRA_PHASEOUT_MFJ_UPPER_2025,
  IRA_PHASEOUT_NONCOVERED_MFJ_LOWER_2025,
  IRA_PHASEOUT_NONCOVERED_MFJ_UPPER_2025,
  IRA_PHASEOUT_MFS_LOWER_2025,
  IRA_PHASEOUT_MFS_UPPER_2025,
} from "../../../config/2025.ts";

// ─── Constants — IRS procedure constants, unchanged across years ──────────────

// Rounding increment and minimum deduction (Pub 590-A Worksheet 1-2)
const PHASE_OUT_ROUND = 10;
const MINIMUM_DEDUCTION = 200;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  // Modified AGI for IRA deduction purposes (Pub 590-A Worksheet 1-1)
  magi: z.number().nonnegative(),
  // Traditional IRA contribution for the year (not Roth)
  ira_contribution: z.number().nonnegative(),
  // Whether the taxpayer is covered by an employer retirement plan (W-2 Box 13)
  active_participant: z.boolean(),
  // Alias for active_participant (from W-2 Box 13 routing)
  covered_by_retirement_plan: z.boolean().optional(),
  // Age 50 or older — enables $1,000 catch-up contribution
  age_50_or_older: z.boolean().optional(),
  // Whether the spouse is covered by an employer plan (MFJ only)
  spouse_active_participant: z.boolean().optional(),
});

type IraDeductionInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Maximum contribution limit based on age
function contributionLimit(
  input: IraDeductionInput,
  limit: number,
  limitAge50: number,
): number {
  return input.age_50_or_older === true ? limitAge50 : limit;
}

// Phase-out lower and upper bounds for this filer, or null if no phase-out applies.
// Returns null when fully deductible (no employer plan coverage applies).
function phaseOutRange(
  input: IraDeductionInput,
  phaseOutSingleLower: number,
  phaseOutSingleUpper: number,
  phaseOutMfjLower: number,
  phaseOutMfjUpper: number,
  phaseOutNonCoveredLower: number,
  phaseOutNonCoveredUpper: number,
  phaseOutMfsLower: number,
  phaseOutMfsUpper: number,
): [number, number] | null {
  const { filing_status, active_participant, spouse_active_participant } = input;

  if (filing_status === FilingStatus.MFS) {
    // MFS: narrow range if active participant; otherwise fully deductible
    // (non-covered MFS spouse rule doesn't apply — Pub 590-A)
    if (active_participant) return [phaseOutMfsLower, phaseOutMfsUpper];
    return null;
  }

  if (filing_status === FilingStatus.MFJ) {
    if (active_participant) return [phaseOutMfjLower, phaseOutMfjUpper];
    if (spouse_active_participant === true) {
      return [phaseOutNonCoveredLower, phaseOutNonCoveredUpper];
    }
    return null;
  }

  // Single / HOH / QSS
  if (active_participant) return [phaseOutSingleLower, phaseOutSingleUpper];
  return null;
}

// Reduced contribution limit after phase-out, rounded per IRS rules.
// Implements Pub 590-A Worksheet 1-2:
//   - Compute ratio = (MAGI - lower) / (upper - lower), clamped [0, 1]
//   - Reduced = limit × (1 - ratio)
//   - Round UP to nearest $10
//   - If reduced > 0 but < $200, use $200
function reducedLimit(limit: number, magi: number, lower: number, upper: number): number {
  if (magi <= lower) return limit;
  if (magi >= upper) return 0;

  const ratio = (magi - lower) / (upper - lower);
  const raw = limit * (1 - ratio);

  // Round up to nearest $10
  const rounded = Math.ceil(raw / PHASE_OUT_ROUND) * PHASE_OUT_ROUND;

  // Apply $200 floor (if not zero)
  if (rounded > 0 && rounded < MINIMUM_DEDUCTION) return MINIMUM_DEDUCTION;
  return rounded;
}

// Builds schedule1 output, or empty array when nothing to report
function schedule1Output(deductible: number): NodeOutput[] {
  if (deductible <= 0) return [];
  return [output(schedule1, { line20_ira_deduction: deductible })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class IraDeductionWorksheetNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ira_deduction_worksheet";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator, form8606]);

  // IRC §219(b)(5)(A); Rev Proc 2024-40 §3.19 — TY2025 (see config/2025.ts)
  protected readonly contributionLimit = IRA_CONTRIBUTION_LIMIT_2025;
  protected readonly contributionLimitAge50 = IRA_CONTRIBUTION_LIMIT_AGE50_2025;

  // Active participant phase-out: Single / HOH / QSS — Rev Proc 2024-40
  protected readonly phaseOutSingleLower = IRA_PHASEOUT_SINGLE_LOWER_2025;
  protected readonly phaseOutSingleUpper = IRA_PHASEOUT_SINGLE_UPPER_2025;

  // Active participant phase-out: MFJ (covered taxpayer)
  protected readonly phaseOutMfjLower = IRA_PHASEOUT_MFJ_LOWER_2025;
  protected readonly phaseOutMfjUpper = IRA_PHASEOUT_MFJ_UPPER_2025;

  // Non-covered MFJ spouse phase-out: taxpayer not active, but spouse is
  protected readonly phaseOutNonCoveredLower = IRA_PHASEOUT_NONCOVERED_MFJ_LOWER_2025;
  protected readonly phaseOutNonCoveredUpper = IRA_PHASEOUT_NONCOVERED_MFJ_UPPER_2025;

  // MFS active participant phase-out (very narrow — Pub 590-A)
  protected readonly phaseOutMfsLower = IRA_PHASEOUT_MFS_LOWER_2025;
  protected readonly phaseOutMfsUpper = IRA_PHASEOUT_MFS_UPPER_2025;

  compute(_ctx: NodeContext, rawInput: IraDeductionInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (input.ira_contribution <= 0) return { outputs: schedule1Output(0) };

    const limit = contributionLimit(input, this.contributionLimit, this.contributionLimitAge50);
    const capped = Math.min(input.ira_contribution, limit);
    const range = phaseOutRange(
      input,
      this.phaseOutSingleLower,
      this.phaseOutSingleUpper,
      this.phaseOutMfjLower,
      this.phaseOutMfjUpper,
      this.phaseOutNonCoveredLower,
      this.phaseOutNonCoveredUpper,
      this.phaseOutMfsLower,
      this.phaseOutMfsUpper,
    );

    let deductible: number;
    if (range === null) {
      deductible = capped; // fully deductible
    } else {
      const [lower, upper] = range;
      const allowed = reducedLimit(limit, input.magi, lower, upper);
      deductible = Math.min(capped, allowed);
    }

    const outputs: NodeOutput[] = [...schedule1Output(deductible)];
    if (deductible > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, { line20_ira_deduction: deductible }));
    }

    // Non-deductible excess → Form 8606 for IRA basis tracking (IRC §408(o))
    const nonDeductible = capped - deductible;
    if (nonDeductible > 0) {
      outputs.push(this.outputNodes.output(form8606, { nondeductible_contributions: nonDeductible }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const ira_deduction_worksheet = new IraDeductionWorksheetNode();
