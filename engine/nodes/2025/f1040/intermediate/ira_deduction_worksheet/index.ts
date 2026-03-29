import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { FilingStatus } from "../../types.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────
// IRC §219(b)(5)(A); Rev Proc 2024-40 §3.19
const CONTRIBUTION_LIMIT = 7_000;
const CONTRIBUTION_LIMIT_AGE_50 = 8_000;

// Active participant phase-out: Single / HOH / QSS
// Rev Proc 2024-40
const PHASE_OUT_SINGLE_LOWER = 79_000;
const PHASE_OUT_SINGLE_UPPER = 89_000;

// Active participant phase-out: MFJ (covered taxpayer)
const PHASE_OUT_MFJ_LOWER = 126_000;
const PHASE_OUT_MFJ_UPPER = 146_000;

// Non-covered MFJ spouse phase-out: taxpayer not active, but spouse is
const PHASE_OUT_NON_COVERED_LOWER = 236_000;
const PHASE_OUT_NON_COVERED_UPPER = 246_000;

// MFS active participant phase-out (very narrow — Pub 590-A)
const PHASE_OUT_MFS_LOWER = 0;
const PHASE_OUT_MFS_UPPER = 10_000;

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
  // Age 50 or older — enables $1,000 catch-up contribution
  age_50_or_older: z.boolean().optional(),
  // Whether the spouse is covered by an employer plan (MFJ only)
  spouse_active_participant: z.boolean().optional(),
});

type IraDeductionInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Maximum contribution limit based on age
function contributionLimit(input: IraDeductionInput): number {
  return input.age_50_or_older === true ? CONTRIBUTION_LIMIT_AGE_50 : CONTRIBUTION_LIMIT;
}

// Phase-out lower and upper bounds for this filer, or null if no phase-out applies.
// Returns null when fully deductible (no employer plan coverage applies).
function phaseOutRange(input: IraDeductionInput): [number, number] | null {
  const { filing_status, active_participant, spouse_active_participant } = input;

  if (filing_status === FilingStatus.MFS) {
    // MFS: narrow $0–$10,000 range if active participant; otherwise fully deductible
    // (non-covered MFS spouse rule doesn't apply — Pub 590-A)
    if (active_participant) return [PHASE_OUT_MFS_LOWER, PHASE_OUT_MFS_UPPER];
    return null;
  }

  if (filing_status === FilingStatus.MFJ) {
    if (active_participant) return [PHASE_OUT_MFJ_LOWER, PHASE_OUT_MFJ_UPPER];
    if (spouse_active_participant === true) {
      return [PHASE_OUT_NON_COVERED_LOWER, PHASE_OUT_NON_COVERED_UPPER];
    }
    return null;
  }

  // Single / HOH / QSS
  if (active_participant) return [PHASE_OUT_SINGLE_LOWER, PHASE_OUT_SINGLE_UPPER];
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

// Computes the deductible IRA amount (zero if no output needed)
function deductibleAmount(input: IraDeductionInput): number {
  if (input.ira_contribution <= 0) return 0;

  const limit = contributionLimit(input);
  const capped = Math.min(input.ira_contribution, limit);
  const range = phaseOutRange(input);

  if (range === null) return capped; // fully deductible

  const [lower, upper] = range;
  const allowed = reducedLimit(limit, input.magi, lower, upper);

  return Math.min(capped, allowed);
}

// Builds schedule1 output, or empty array when nothing to report
function schedule1Output(deductible: number): NodeOutput[] {
  if (deductible <= 0) return [];
  return [{ nodeType: schedule1.nodeType, input: { line20_ira_deduction: deductible } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class IraDeductionWorksheetNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ira_deduction_worksheet";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(rawInput: IraDeductionInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const deductible = deductibleAmount(input);
    return { outputs: schedule1Output(deductible) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const ira_deduction_worksheet = new IraDeductionWorksheetNode();
