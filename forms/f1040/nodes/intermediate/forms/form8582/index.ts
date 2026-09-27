import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Constants — mathematical rates, unchanged across years ──────────────────

// IRC §469(i)(3)(B): 50% phase-out rate
const PHASE_OUT_RATE = 0.50;

// IRC §469(i)(2): maximum special allowance for rental real estate (TY2025)
const RENTAL_ALLOWANCE_MAX = 25_000;

// IRC §469(i)(3)(A): MAGI thresholds for phase-out (TY2025)
const MAGI_LOWER_THRESHOLD = 100_000;
const MAGI_UPPER_THRESHOLD = 150_000;

// IRC §469(i)(5)(B): MFS (lived apart all year) reduced thresholds (TY2025)
const MFS_ALLOWANCE_MAX = 12_500;
const MFS_MAGI_LOWER = 50_000;
const MFS_MAGI_UPPER = 75_000;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Activity rows retained for Part IV/V and loss-allocation worksheets in MeF.
  activities: z.array(z.object({
    name: z.string().min(1),
    activity_type: z.enum(["A", "B"]),
    property_type: z.number().int().min(1).max(8),
    current_net: z.number(),
    prior_unallowed_operating: z.number().nonnegative(),
    prior_active_participation: z.boolean().optional(),
    prior_unallowed_4797_part1: z.number().nonnegative(),
    prior_unallowed_4797_part2: z.number().nonnegative(),
  })).optional(),
  // Per-activity passthrough fields (merged by executor; stored for traceability)
  // schedule_c passive net profit/loss
  passive_schedule_c: z.number().optional(),
  // schedule_f passive net profit/loss
  passive_schedule_f: z.number().optional(),

  // Current-year net passive income (sum of activities with net > 0)
  current_income: z.number().nonnegative().optional(),
  // The portion of current passive income from actively participated rentals.
  rental_current_income: z.number().nonnegative().optional(),

  // Current-year net passive loss (positive amount; sum of |net| for loss activities)
  current_loss: z.number().nonnegative().optional(),

  // Current-year net passive loss from rental real estate activities only (positive amount).
  // Used for IRC §469(i) $25K special allowance — only rental losses qualify, not other
  // passive activity losses (e.g., limited partnership losses, passive Schedule C losses).
  // Must be <= current_loss. If omitted, defaults to zero (no rental-only carryforward).
  rental_current_loss: z.number().nonnegative().optional(),
  rental_prior_eligible_loss: z.number().nonnegative().optional(),

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

// The passive activity picture IRC §469 acts on, independent of which node holds it.
// agi_aggregator applies the same limit to reach AGI: Form 8582 needs modified AGI,
// so it runs after the aggregator that produces it and cannot feed AGI itself.
export type PassiveActivity = {
  readonly currentIncome: number;
  readonly currentLoss: number;
  readonly priorUnallowed: number;
  // Rental loss eligible for the §469(i) allowance, including qualifying prior
  // operating carryovers. Omitted means no proven rental portion.
  readonly rentalLoss: number;
  readonly rentalIncome: number;
  readonly activeParticipation: boolean;
  readonly modifiedAgi?: number;
  readonly filingStatus?: FilingStatus;
};

export type PassiveLossLimit = {
  // Loss deductible this year (Form 8582 line 11, total losses allowed)
  readonly allowed: number;
  // Loss carried to next year
  readonly suspended: number;
};

/** Allocate whole-dollar allowed losses proportionally, preserving the exact total. */
export function allocateRentalLosses(
  losses: readonly number[],
  allowed: number,
): number[] {
  const total = losses.reduce((sum, loss) => sum + loss, 0);
  if (
    losses.some((loss) => !Number.isSafeInteger(loss) || loss < 0) ||
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(allowed) || allowed < 0 || allowed > total
  ) {
    throw new Error(
      "Form 8582 rental allocation needs whole-dollar losses and an allowed total within them",
    );
  }
  if (total === 0) return losses.map(() => 0);
  const divisor = BigInt(total);
  const shares = losses.map((loss, index) => {
    const product = BigInt(loss) * BigInt(allowed);
    return {
      index,
      quotient: Number(product / divisor),
      remainder: product % divisor,
    };
  });
  const amounts = shares.map((share) => share.quotient);
  let remaining = allowed - amounts.reduce((sum, amount) => sum + amount, 0);
  const ranked = [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
      ? -1
      : 1
  );
  for (const share of ranked) {
    if (remaining === 0) break;
    amounts[share.index]++;
    remaining--;
  }
  return amounts;
}

export function allocatePassiveActivityLosses(
  activities: readonly {
    currentNet: number;
    priorUnallowed: number;
    specialEligible: boolean;
    priorSpecialEligible: boolean;
  }[],
  allowedTotal: number,
): {
  allowed: number[];
  suspended: number[];
  overallLosses: number[];
  specialEligibleLosses: number[];
  specialByActivity: number[];
  postSpecialLosses: number[];
} {
  const grossLosses = activities.map(({ currentNet, priorUnallowed }) =>
    Math.max(0, -currentNet) + priorUnallowed
  );
  const ownIncome = activities.map(({ currentNet }) => Math.max(0, currentNet));
  if (
    activities.some(({ currentNet, priorUnallowed }) =>
      !Number.isSafeInteger(currentNet) ||
      !Number.isSafeInteger(priorUnallowed) || priorUnallowed < 0
    )
  ) {
    throw new Error("Form 8582 activity allocation needs whole-dollar amounts");
  }
  const overallLosses = grossLosses.map((loss, index) =>
    Math.max(0, loss - ownIncome[index])
  );
  const specialEligibleLosses = activities.map((activity, index) =>
    activity.specialEligible
      ? Math.min(
        overallLosses[index],
        Math.max(
          0,
          Math.max(0, -activity.currentNet) +
            (activity.priorSpecialEligible ? activity.priorUnallowed : 0) -
            ownIncome[index],
        ),
      )
      : 0
  );
  const totalIncome = ownIncome.reduce((sum, amount) => sum + amount, 0);
  const totalLoss = grossLosses.reduce((sum, amount) => sum + amount, 0);
  const specialAllowance = Math.max(0, allowedTotal - totalIncome);
  const specialByActivity = allocateRentalLosses(
    specialEligibleLosses,
    specialAllowance,
  );
  const postSpecialLosses = overallLosses.map((amount, index) =>
    amount - specialByActivity[index]
  );
  const suspended = allocateRentalLosses(
    postSpecialLosses,
    totalLoss - allowedTotal,
  );
  const allowed = grossLosses.map((amount, index) => amount - suspended[index]);
  if (allowed.reduce((sum, amount) => sum + amount, 0) !== allowedTotal) {
    throw new Error(
      "Form 8582 per-activity losses do not reconcile to allowed total",
    );
  }
  return {
    allowed,
    suspended,
    overallLosses,
    specialEligibleLosses,
    specialByActivity,
    postSpecialLosses,
  };
}

function totalPassiveIncome(input: Form8582Input): number {
  return input.current_income ?? 0;
}

function totalPassiveLoss(input: Form8582Input): number {
  return (input.current_loss ?? 0) + (input.prior_unallowed ?? 0);
}

function assertActivityTotals(input: Form8582Input): void {
  if (input.activities === undefined) return;

  // Form 4797 losses must be allocated separately in Form 8582 Part IX and
  // reported back on Form 4797. The current Schedule 1 route only handles
  // Schedule E/Form 4835 operating losses, so never combine the two origins.
  if (
    input.activities.some((activity) =>
      activity.prior_unallowed_4797_part1 > 0 ||
      activity.prior_unallowed_4797_part2 > 0
    )
  ) {
    throw new Error(
      "Form 8582 prior Form 4797 losses need Part IX allocation and Form 4797 reporting",
    );
  }

  const activities = input.activities;
  const sum = (select: (activity: typeof activities[number]) => number) =>
    activities.reduce((total, activity) => total + select(activity), 0);
  const currentIncome = sum((activity) => Math.max(0, activity.current_net));
  const currentLoss = sum((activity) => Math.max(0, -activity.current_net));
  const priorLoss = sum((activity) => activity.prior_unallowed_operating);
  const rentalIncome = sum((activity) =>
    activity.activity_type === "A" ? Math.max(0, activity.current_net) : 0
  );
  const rentalLoss = sum((activity) =>
    activity.activity_type === "A" ? Math.max(0, -activity.current_net) : 0
  );
  const eligibleRentalPrior = sum((activity) =>
    activity.activity_type === "A" &&
      activity.prior_active_participation === true
      ? activity.prior_unallowed_operating
      : 0
  );
  const hasActiveRental = activities.some((activity) =>
    activity.activity_type === "A"
  );
  const hasOtherPassive = activities.some((activity) =>
    activity.activity_type === "B" ||
    (activity.activity_type === "A" &&
      activity.prior_unallowed_operating > 0 &&
      activity.prior_active_participation === false)
  );
  if (
    activities.some((activity) =>
      !Number.isSafeInteger(activity.current_net) ||
      !Number.isSafeInteger(activity.prior_unallowed_operating) ||
      (activity.activity_type === "A" &&
        activity.prior_unallowed_operating > 0 &&
        activity.prior_active_participation === undefined)
    ) ||
    (input.current_income ?? 0) !== currentIncome ||
    (input.current_loss ?? 0) !== currentLoss ||
    (input.prior_unallowed ?? 0) !== priorLoss ||
    (input.rental_current_income ?? 0) !== rentalIncome ||
    (input.rental_current_loss ?? 0) !== rentalLoss ||
    (input.rental_prior_eligible_loss ?? 0) !== eligibleRentalPrior ||
    (input.has_active_rental ?? false) !== hasActiveRental ||
    (input.has_other_passive ?? false) !== hasOtherPassive
  ) {
    throw new Error(
      "Form 8582 activity amounts do not reconcile to passive-loss totals",
    );
  }
}

// MFS filer who lived with spouse any time during the year cannot use Part II
function isMfsIneligible(activity: PassiveActivity): boolean {
  return activity.filingStatus === FilingStatus.MFS;
}

function allowanceThresholds(activity: PassiveActivity): {
  lower: number;
  upper: number;
  max: number;
} {
  if (isMfsIneligible(activity)) {
    // MFS lived apart uses halved thresholds per IRC §469(i)(5)(B)
    // Note: MFS who lived with spouse at ANY time gets $0 — that's handled
    // by isMfsIneligible check before calling this. If we reach here, MFS
    // already returned $0. This is only for documentation clarity.
    return {
      lower: MFS_MAGI_LOWER,
      upper: MFS_MAGI_UPPER,
      max: MFS_ALLOWANCE_MAX,
    };
  }
  return {
    lower: MAGI_LOWER_THRESHOLD,
    upper: MAGI_UPPER_THRESHOLD,
    max: RENTAL_ALLOWANCE_MAX,
  };
}

// IRC §469(i): the special $25k allowance for rental real estate.
// Returns $0 if conditions are not met.
function specialAllowance(
  activity: PassiveActivity,
  rentalNetLoss: number,
): number {
  // Must be an active rental real estate activity the taxpayer participated in
  if (!activity.activeParticipation) return 0;

  // MFS filers who lived with spouse at any time are ineligible (§469(i)(5)(A))
  // We treat filing_status=mfs as ineligible (conservative — actual determination
  // requires lived-apart determination which would require additional input).
  if (isMfsIneligible(activity)) return 0;

  // Modified AGI must be provided to apply the phase-out
  const magi = activity.modifiedAgi;
  if (magi === undefined) return 0;

  const { lower, upper, max } = allowanceThresholds(activity);

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

// IRC §469(a): a passive loss is deductible only against passive income, plus the
// §469(i) special allowance. The rest is suspended, not deducted.
export function passiveLossLimit(activity: PassiveActivity): PassiveLossLimit {
  const income = activity.currentIncome;
  const loss = activity.currentLoss + activity.priorUnallowed;
  if (
    !Number.isFinite(income) || !Number.isFinite(loss) ||
    !Number.isFinite(activity.rentalLoss) ||
    !Number.isFinite(activity.rentalIncome) ||
    income < 0 || loss < 0 ||
    activity.rentalLoss < 0 || activity.rentalLoss > loss ||
    activity.rentalIncome < 0 || activity.rentalIncome > income
  ) {
    throw new Error(
      "Form 8582 rental and passive activity totals do not reconcile",
    );
  }
  if (loss <= 0) return { allowed: 0, suspended: 0 };

  // Passive income first releases an equal amount of loss. Schedule E has held
  // those losses back, so the allowed figure must include this amount even when
  // income equals or exceeds all losses.
  const allowedAgainstIncome = Math.min(loss, income);
  const remainingLoss = loss - allowedAgainstIncome;
  if (remainingLoss <= 0) return { allowed: loss, suspended: 0 };

  // Only rental real estate loss can use the additional §469(i) allowance.
  const rentalNetLoss = Math.min(
    remainingLoss,
    Math.max(0, activity.rentalLoss - activity.rentalIncome),
  );
  const allowance = specialAllowance(activity, rentalNetLoss);
  const allowed = allowedAgainstIncome + Math.min(remainingLoss, allowance);

  return { allowed, suspended: loss - allowed };
}

function passiveActivity(input: Form8582Input): PassiveActivity {
  return {
    currentIncome: totalPassiveIncome(input),
    currentLoss: input.current_loss ?? 0,
    priorUnallowed: input.prior_unallowed ?? 0,
    rentalLoss: (input.rental_current_loss ?? 0) +
      (input.rental_prior_eligible_loss ?? 0),
    rentalIncome: input.rental_current_income ?? 0,
    // Part II needs both an active rental activity and actual participation
    activeParticipation: (input.has_active_rental ?? false) &&
      (input.active_participation ?? false),
    modifiedAgi: input.modified_agi,
    filingStatus: input.filing_status,
  };
}

function schedule1Output(allowedLoss: number): NodeOutput[] {
  if (allowedLoss <= 0) return [];
  return [output(schedule1, { line5_schedule_e: -allowedLoss })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8582Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, rawInput: Form8582Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    assertActivityTotals(input);

    if (
      input.has_active_rental === true &&
      input.activities === undefined &&
      (input.current_loss ?? 0) > 0 &&
      input.rental_current_loss === undefined
    ) {
      throw new Error(
        "Form 8582 needs the rental portion of current passive losses",
      );
    }
    if (
      input.has_active_rental === true &&
      input.activities === undefined &&
      (input.current_income ?? 0) > 0 &&
      input.rental_current_income === undefined
    ) {
      throw new Error(
        "Form 8582 needs the rental portion of current passive income",
      );
    }

    // No passive activity at all → nothing to do
    if (totalPassiveIncome(input) === 0 && totalPassiveLoss(input) === 0) {
      return { outputs: [] };
    }

    const { allowed, suspended } = passiveLossLimit(passiveActivity(input));

    return {
      outputs: schedule1Output(allowed),
      ...(suspended > 0
        ? { carryforwards: { suspended_pal_8582: suspended } }
        : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582 = new Form8582Node();
