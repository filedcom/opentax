import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Constants — mathematical rates, unchanged across years ──────────────────

// IRC §469(i)(3)(B): 50% phase-out rate
const PHASE_OUT_RATE = 0.50;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Per-activity passthrough fields (merged by executor; stored for traceability)
  // schedule_c passive net profit/loss
  passive_schedule_c: z.number().optional(),
  // schedule_f passive net profit/loss
  passive_schedule_f: z.number().optional(),

  // Current-year net passive income (sum of activities with net > 0)
  current_income: z.number().nonnegative().optional(),

  // Current-year net passive loss (positive amount; sum of |net| for loss activities)
  current_loss: z.number().nonnegative().optional(),

  // Prior-year unallowed PAL carryforward (positive amount)
  prior_unallowed: z.number().nonnegative().optional(),

  // True if any rental real estate activity has active participation (activity_type="A")
  has_active_rental: z.boolean().optional(),

  // True if any other passive activity exists (activity_type="B")
  has_other_passive: z.boolean().optional(),

  // Modified AGI for Part II phase-out calculation (line 6)
  // Excludes passive losses, rental RE losses to real estate professionals,
  // taxable SS, IRA deductions, SE health insurance, student loan interest
  modified_agi: z.number().nonnegative().optional(),

  // Actively participated in the rental real estate activity
  // Required to claim Part II special allowance
  active_participation: z.boolean().optional(),

  // Filing status — MFS filers who lived with spouse are ineligible for Part II
  filing_status: filingStatusSchema.optional(),
});

type Form8582Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function totalPassiveIncome(input: Form8582Input): number {
  return input.current_income ?? 0;
}

function totalPassiveLoss(input: Form8582Input): number {
  return (input.current_loss ?? 0) + (input.prior_unallowed ?? 0);
}

// Overall passive activity loss (positive = net loss, negative = net gain)
function overallPal(input: Form8582Input): number {
  return totalPassiveLoss(input) - totalPassiveIncome(input);
}

// MFS filer who lived with spouse any time during the year cannot use Part II
function isMfsIneligible(input: Form8582Input): boolean {
  return input.filing_status === FilingStatus.MFS;
}

function schedule1Output(allowedLoss: number): NodeOutput[] {
  if (allowedLoss <= 0) return [];
  return [output(schedule1, { line17_schedule_e: -allowedLoss })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8582Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  // IRC §469(i)(2): maximum special allowance for rental real estate (TY2025)
  protected readonly rentalAllowanceMax = 25_000;

  // IRC §469(i)(3)(A): MAGI thresholds for phase-out (TY2025)
  protected readonly magiLowerThreshold = 100_000;
  protected readonly magiUpperThreshold = 150_000;

  // IRC §469(i)(5)(B): MFS (lived apart all year) reduced thresholds (TY2025)
  protected readonly mfsAllowanceMax = 12_500;
  protected readonly mfsMagiLower = 50_000;
  protected readonly mfsMagiUpper = 75_000;

  private allowanceThresholds(input: Form8582Input): {
    lower: number;
    upper: number;
    max: number;
  } {
    if (isMfsIneligible(input)) {
      // MFS lived apart uses halved thresholds per IRC §469(i)(5)(B)
      // Note: MFS who lived with spouse at ANY time gets $0 — that's handled
      // by isMfsIneligible check before calling this. If we reach here, MFS
      // already returned $0. This is only for documentation clarity.
      return { lower: this.mfsMagiLower, upper: this.mfsMagiUpper, max: this.mfsAllowanceMax };
    }
    return {
      lower: this.magiLowerThreshold,
      upper: this.magiUpperThreshold,
      max: this.rentalAllowanceMax,
    };
  }

  // IRC §469(i): compute the special $25k allowance for rental real estate
  // Returns $0 if conditions are not met.
  private specialAllowance(input: Form8582Input, rentalNetLoss: number): number {
    // Must have active rental real estate activity
    if (!input.has_active_rental) return 0;

    // Must have actively participated
    if (!input.active_participation) return 0;

    // MFS filers who lived with spouse at any time are ineligible (§469(i)(5)(A))
    // We treat filing_status=mfs as ineligible (conservative — actual determination
    // requires lived-apart determination which would require additional input).
    if (isMfsIneligible(input)) return 0;

    // Modified AGI must be provided to apply the phase-out
    const magi = input.modified_agi;
    if (magi === undefined) return 0;

    const { lower, upper, max } = this.allowanceThresholds(input);

    // MAGI at or above upper threshold → $0 allowance
    if (magi >= upper) return 0;

    // Cap at max allowance or the actual rental net loss (can't exceed the loss)
    const baseAllowance = Math.min(rentalNetLoss, max);

    // MAGI at or below lower threshold → full allowance
    if (magi <= lower) return baseAllowance;

    // Phase-out: reduce by 50% of excess MAGI over lower threshold
    const phaseOutReduction = PHASE_OUT_RATE * (magi - lower);
    const phasedAllowance = Math.max(0, max - phaseOutReduction);

    return Math.min(rentalNetLoss, phasedAllowance);
  }

  compute(_ctx: NodeContext, rawInput: Form8582Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const income = totalPassiveIncome(input);
    const loss = totalPassiveLoss(input);

    // No passive activity at all → nothing to do
    if (income === 0 && loss === 0) {
      return { outputs: [] };
    }

    const pal = overallPal(input);

    // No overall PAL (income >= total losses) → all losses already allowed upstream
    if (pal <= 0) {
      return { outputs: [] };
    }

    // We have an overall PAL. Determine how much is allowed.
    // Allowed = passive income + special rental allowance (Part II)
    const rentalNetLoss = loss; // simplified: treat all losses as potentially rental
    const allowance = this.specialAllowance(input, rentalNetLoss);
    const allowedLoss = Math.min(pal, income + allowance);

    return { outputs: schedule1Output(allowedLoss) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582 = new Form8582Node();
