import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule_d_final } from "../../aggregation/schedule_d_final/index.ts";
import { agi_final } from "../../aggregation/agi_final/index.ts";
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

export const priorYear8582SourceSchema = z.object({
  tax_year: z.literal(2024),
  activity_id: z.string().trim().min(1).max(64),
  filed_part_vii_column_c: z.number().int().positive(),
  source_document_reference: z.string().trim().min(1),
  filed_part_ix_rows: z.array(
    z.object({
      reporting_form: z.enum([
        "schedule_e",
        "form4797_part1",
        "form4797_part2",
      ]),
      filed_unallowed_loss: z.number().int().positive(),
    }).strict(),
  ).min(2).max(3).optional(),
  filed_part_viii_row: z.object({
    reporting_form: z.enum(["form4797_part1", "form4797_part2"]),
    filed_unallowed_loss: z.number().int().positive(),
  }).strict().optional(),
}).strict();

export const firstYearActivitySourceSchema = z.object({
  activity_id: z.string().trim().min(1).max(64),
  activity_name: z.string().trim().min(1),
  activity_acquired_on: z.string().date(),
  acquisition_document_reference: z.string().trim().min(1),
  not_grouped_with_prior_activity: z.literal(true),
}).strict();

export const inputSchema = z.object({
  // Activity rows retained for Part IV/V and loss-allocation worksheets in MeF.
  activities: z.array(z.object({
    activity_id: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1),
    activity_type: z.enum(["A", "B"]),
    property_type: z.number().int().min(1).max(8),
    reporting_form: z.enum(["schedule_e", "form4835"]).optional(),
    current_net: z.number(),
    prior_unallowed_operating: z.number().nonnegative(),
    prior_year_8582_source: priorYear8582SourceSchema.optional(),
    first_year_activity_source: firstYearActivitySourceSchema.optional(),
    prior_active_participation: z.boolean().optional(),
    prior_unallowed_4797_part1: z.number().nonnegative(),
    prior_unallowed_4797_part2: z.number().nonnegative(),
  })).optional(),
  // Positive, activity-linked Form 4797 gains. Keep Parts I and II separate
  // for Part IX same-part offsets and final reporting character.
  current_4797_sale_gains: z.array(z.object({
    activity_id: z.string().trim().min(1).max(64),
    activity_name: z.string().trim().min(1),
    part: z.enum(["I", "II"]),
    gain: z.number().int().positive(),
    // A prior operating PAL may coexist only with the narrow retained-activity
    // sale below. Absence is not proof that the entire interest was retained.
    entire_activity_interest_disposed: z.boolean().optional(),
  })).optional(),
  // Form 4797 reports this source fact before Form 8582 runs.
  has_current_4797_transaction: z.boolean().optional(),
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
  // IRC §469(i)(5)(B): MFS special allowance applies only when spouses lived
  // apart at all times during the tax year. Missing proof stays ineligible.
  mfs_lived_apart_all_year: z.boolean().optional(),
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
  readonly mfsLivedApartAllYear?: boolean;
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

// Form 8582 Part IX keeps losses on Form 4797 Parts I and II separate from
// Schedule E/Form 4835 losses. The caller must supply each form/part's actual
// current gain from its originating return, not infer it from the activity net.
export type PartIXLossLine = {
  readonly reportingForm: string;
  readonly lossIncludingPrior: number;
  readonly currentSamePartGain: number;
};

export type PartIXAllocatedLine = PartIXLossLine & {
  readonly netLoss: number;
  readonly suspended: number;
  readonly allowed: number;
};

export function allocatePartIXLosses(
  lines: readonly PartIXLossLine[],
  suspendedForActivity: number,
): PartIXAllocatedLine[] {
  if (
    lines.length === 0 ||
    lines.some((line) =>
      line.reportingForm.length === 0 ||
      !Number.isSafeInteger(line.lossIncludingPrior) ||
      line.lossIncludingPrior < 0 ||
      !Number.isSafeInteger(line.currentSamePartGain) ||
      line.currentSamePartGain < 0
    )
  ) {
    throw new Error(
      "Form 8582 Part IX needs source-backed whole-dollar form/part lines",
    );
  }
  const netLosses = lines.map((line) =>
    Math.max(0, line.lossIncludingPrior - line.currentSamePartGain)
  );
  // Part IX column (d) allocates only the activity's Part VII suspended loss.
  // Keep whole-dollar column (d) amounts reconciled to the Part VII total.
  const suspended = allocateRentalLosses(netLosses, suspendedForActivity);
  return lines.map((line, index) => ({
    ...line,
    netLoss: netLosses[index],
    suspended: suspended[index],
    allowed: line.lossIncludingPrior - suspended[index],
  }));
}

export function allocatePassiveActivityLosses(
  activities: readonly {
    currentNet: number;
    currentIncome?: number;
    currentLoss?: number;
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
  const grossLosses = activities.map((
    { currentNet, currentLoss, priorUnallowed },
  ) => (currentLoss ?? Math.max(0, -currentNet)) + priorUnallowed);
  const ownIncome = activities.map(({ currentNet, currentIncome }) =>
    currentIncome ?? Math.max(0, currentNet)
  );
  if (
    activities.some((
      { currentNet, currentIncome, currentLoss, priorUnallowed },
    ) =>
      !Number.isSafeInteger(currentNet) ||
      (currentIncome !== undefined &&
        (!Number.isSafeInteger(currentIncome) || currentIncome < 0)) ||
      (currentLoss !== undefined &&
        (!Number.isSafeInteger(currentLoss) || currentLoss < 0)) ||
      (currentIncome !== undefined && currentLoss !== undefined &&
        currentIncome - currentLoss !== currentNet) ||
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
          (activity.currentLoss ?? Math.max(0, -activity.currentNet)) +
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
  return (input.current_income ?? 0) +
    (input.current_4797_sale_gains ?? []).reduce(
      (sum, sale) => sum + sale.gain,
      0,
    );
}

function totalPassiveLoss(input: Form8582Input): number {
  return (input.current_loss ?? 0) + (input.prior_unallowed ?? 0);
}

export function assertPriorYear8582Evidence(input: Form8582Input): void {
  const sales = input.current_4797_sale_gains ?? [];
  const activities = input.activities ?? [];
  const retainedOperatingSale = activities.length === 1 &&
    (activities[0].activity_type === "B" ||
      (activities[0].activity_type === "A" &&
        activities[0].property_type !== 6 &&
        activities[0].current_net < 0 &&
        activities[0].prior_active_participation === true &&
        input.active_participation === true &&
        input.has_active_rental === true &&
        input.modified_agi !== undefined &&
        input.filing_status !== undefined &&
        (sales[0]?.gain ?? 0) <
          -activities[0].current_net +
            activities[0].prior_unallowed_operating)) &&
    activities[0].reporting_form === "schedule_e" &&
    activities[0].prior_unallowed_operating > 0 &&
    activities[0].prior_unallowed_4797_part1 === 0 &&
    activities[0].prior_unallowed_4797_part2 === 0 &&
    sales.length === 1 &&
    sales[0].activity_id === activities[0].activity_id &&
    sales[0].part === "II" &&
    sales[0].entire_activity_interest_disposed === false;
  const entireOverallGainSale = activities.length === 1 &&
    (activities[0].activity_type === "B" ||
      (activities[0].activity_type === "A" &&
        activities[0].property_type !== 6 &&
        activities[0].prior_active_participation === true &&
        input.active_participation === true &&
        input.has_active_rental === true)) &&
    activities[0].reporting_form === "schedule_e" &&
    activities[0].current_net < 0 &&
    activities[0].prior_unallowed_operating > 0 &&
    activities[0].prior_unallowed_4797_part1 === 0 &&
    activities[0].prior_unallowed_4797_part2 === 0 &&
    activities[0].prior_year_8582_source?.activity_id ===
      activities[0].activity_id &&
    activities[0].prior_year_8582_source.filed_part_vii_column_c ===
      activities[0].prior_unallowed_operating &&
    activities[0].prior_year_8582_source.filed_part_ix_rows === undefined &&
    activities[0].prior_year_8582_source.filed_part_viii_row === undefined &&
    sales.length === 1 &&
    sales[0].activity_id === activities[0].activity_id &&
    sales[0].activity_name === activities[0].name &&
    sales[0].part === "II" &&
    sales[0].entire_activity_interest_disposed === true &&
    sales[0].gain >
      -activities[0].current_net + activities[0].prior_unallowed_operating;
  if (
    (input.prior_unallowed ?? 0) > 0 &&
    (input.activities === undefined || input.activities.length === 0)
  ) {
    throw new Error(
      "Form 8582 prior loss needs activity rows and filed 2024 Part VII evidence",
    );
  }
  if (
    input.has_current_4797_transaction === true &&
    (input.prior_unallowed ?? 0) > 0 &&
    !retainedOperatingSale && !entireOverallGainSale
  ) {
    throw new Error(
      "Form 8582 prior loss with current Form 4797 transaction needs disposition review",
    );
  }
  if (
    (input.activities ?? []).some((activity) => {
      const prior = activity.prior_unallowed_operating +
        activity.prior_unallowed_4797_part1 +
        activity.prior_unallowed_4797_part2;
      const source = activity.prior_year_8582_source;
      const prior4797 = activity.prior_unallowed_4797_part1 > 0 ||
        activity.prior_unallowed_4797_part2 > 0;
      const expectedRows = [
        ["schedule_e", activity.prior_unallowed_operating],
        ["form4797_part1", activity.prior_unallowed_4797_part1],
        ["form4797_part2", activity.prior_unallowed_4797_part2],
      ] as const;
      const filedRows = source?.filed_part_ix_rows ?? [];
      const filedPartVIII = source?.filed_part_viii_row;
      const validPartIX = !prior4797 ||
        (activity.activity_type === "B" &&
          activity.reporting_form === "schedule_e" &&
          sales.length === 0 &&
          input.has_current_4797_transaction !== true &&
          filedPartVIII === undefined &&
          filedRows.length ===
            expectedRows.filter(([, amount]) => amount > 0).length &&
          new Set(filedRows.map((row) => row.reporting_form)).size ===
            filedRows.length &&
          expectedRows.every(([form, amount]) =>
            amount === 0
              ? !filedRows.some((row) => row.reporting_form === form)
              : filedRows.some((row) =>
                row.reporting_form === form &&
                row.filed_unallowed_loss === amount
              )
          ));
      const solePartI = activity.prior_unallowed_4797_part1 > 0 &&
        activity.prior_unallowed_4797_part2 === 0;
      const solePartII = activity.prior_unallowed_4797_part2 > 0 &&
        activity.prior_unallowed_4797_part1 === 0;
      const validPartVIII = prior4797 &&
        (solePartI || solePartII) &&
        activity.prior_unallowed_operating === 0 &&
        activity.current_net >= 0 &&
        activity.activity_type === "B" &&
        activity.reporting_form === "schedule_e" &&
        sales.length === 0 &&
        input.has_current_4797_transaction !== true &&
        filedRows.length === 0 &&
        filedPartVIII?.reporting_form ===
          (solePartI ? "form4797_part1" : "form4797_part2") &&
        filedPartVIII?.filed_unallowed_loss === prior;
      return !(validPartIX || validPartVIII) ||
        (!prior4797 && (filedRows.length > 0 || filedPartVIII !== undefined)) ||
        (prior > 0 &&
          (source?.activity_id !== activity.activity_id ||
            source.filed_part_vii_column_c !== prior)) ||
        (prior === 0 && source !== undefined) ||
        (prior > 0 && !retainedOperatingSale && !entireOverallGainSale &&
          sales.some((sale) => sale.activity_id === activity.activity_id));
    })
  ) {
    throw new Error(
      "Form 8582 prior loss needs matching filed 2024 Part VII evidence; prior Form 4797 character and current sale dispositions need separate review",
    );
  }
}

function assertActivityTotals(input: Form8582Input): void {
  if (input.activities === undefined) {
    if ((input.current_4797_sale_gains?.length ?? 0) > 0) {
      throw new Error(
        "Form 8582 current Form 4797 gains need linked activity rows",
      );
    }
    return;
  }

  const activities = input.activities;
  // Part IV/V and the later loss-allocation worksheets are per activity.
  const activityIds = activities.map((activity) => activity.activity_id);
  if (new Set(activityIds).size !== activityIds.length) {
    throw new Error(
      "Form 8582 needs distinct durable activity IDs to reconcile each loss and gain",
    );
  }
  const sales = input.current_4797_sale_gains ?? [];
  if (
    sales.length > 0 &&
    (input.has_current_4797_transaction !== true ||
      sales.some((sale) =>
        activities.filter((activity) =>
          activity.activity_id === sale.activity_id &&
          activity.name === sale.activity_name
        ).length !== 1
      ))
  ) {
    throw new Error(
      "Form 8582 current Form 4797 gains need one linked passive activity",
    );
  }
  const sum = (select: (activity: typeof activities[number]) => number) =>
    activities.reduce((total, activity) => total + select(activity), 0);
  const currentIncome = sum((activity) => Math.max(0, activity.current_net));
  const currentLoss = sum((activity) => Math.max(0, -activity.current_net));
  const priorLoss = sum((activity) =>
    activity.prior_unallowed_operating +
    activity.prior_unallowed_4797_part1 +
    activity.prior_unallowed_4797_part2
  );
  const rentalIncome = sum((activity) =>
    activity.activity_type === "A" ? Math.max(0, activity.current_net) : 0
  );
  const rentalLoss = sum((activity) =>
    activity.activity_type === "A" ? Math.max(0, -activity.current_net) : 0
  );
  const eligibleRentalPrior = sum((activity) =>
    activity.activity_type === "A" &&
      activity.prior_active_participation === true
      ? activity.prior_unallowed_operating +
        activity.prior_unallowed_4797_part1 +
        activity.prior_unallowed_4797_part2
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
      !Number.isSafeInteger(activity.prior_unallowed_4797_part1) ||
      !Number.isSafeInteger(activity.prior_unallowed_4797_part2) ||
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

export type OtherPassivePrior4797Allocation = {
  readonly allowedOperating: number;
  readonly allowedPartI: number;
  readonly allowedPartII: number;
  readonly allowedTotal: number;
  readonly suspendedTotal: number;
  readonly byActivity: readonly {
    readonly activityId: string;
    readonly name: string;
    readonly grossOperating: number;
    readonly grossPartI: number;
    readonly grossPartII: number;
    readonly currentPartIGain: number;
    readonly currentPartIIGain: number;
    readonly suspended: number;
    readonly partIX: readonly PartIXAllocatedLine[];
  }[];
};

/** Prior Form 4797 PALs with activity-linked current gains and Part IX character. */
export function allocateOtherPassivePrior4797(
  input: Form8582Input,
): OtherPassivePrior4797Allocation {
  assertActivityTotals(input);
  const activities = input.activities ?? [];
  if (
    activities.length === 0 ||
    !activities.some((activity) =>
      activity.prior_unallowed_4797_part1 > 0 ||
      activity.prior_unallowed_4797_part2 > 0
    ) ||
    new Set(activities.map((activity) => activity.activity_id)).size !==
      activities.length ||
    activities.some((activity) =>
      activity.activity_type !== "B" && activity.activity_type !== "A"
    ) ||
    activities.some((activity) => activity.reporting_form === undefined) ||
    (activities.some((activity) => activity.activity_type === "A") &&
      (activities.length !== 1 ||
        activities[0].prior_active_participation !== true ||
        input.modified_agi === undefined ||
        input.filing_status === FilingStatus.MFS ||
        (input.current_4797_sale_gains?.length ?? 0) === 0)) ||
    (input.has_current_4797_transaction === true &&
      (input.current_4797_sale_gains?.length ?? 0) === 0)
  ) {
    throw new Error(
      "Form 8582 prior Form 4797 loss route needs identified activities and sourced current Form 4797 gains",
    );
  }
  const gainsFor = (activityId: string, part: "I" | "II") =>
    (input.current_4797_sale_gains ?? [])
      .filter((sale) => sale.activity_id === activityId && sale.part === part)
      .reduce((sum, sale) => sum + sale.gain, 0);
  const limit = passiveLossLimit(passiveActivity(input));
  const allocation = allocatePassiveActivityLosses(
    activities.map((activity) => ({
      currentNet: activity.current_net + gainsFor(activity.activity_id, "I") +
        gainsFor(activity.activity_id, "II"),
      currentIncome: Math.max(0, activity.current_net) +
        gainsFor(activity.activity_id, "I") +
        gainsFor(activity.activity_id, "II"),
      currentLoss: Math.max(0, -activity.current_net),
      priorUnallowed: activity.prior_unallowed_operating +
        activity.prior_unallowed_4797_part1 +
        activity.prior_unallowed_4797_part2,
      specialEligible: activity.activity_type === "A",
      priorSpecialEligible: activity.prior_active_participation === true,
    })),
    limit.allowed,
  );
  const byActivity = activities.map((activity, index) => {
    const grossOperating = Math.max(0, -activity.current_net) +
      activity.prior_unallowed_operating;
    const grossPartI = activity.prior_unallowed_4797_part1;
    const grossPartII = activity.prior_unallowed_4797_part2;
    const currentPartIGain = gainsFor(activity.activity_id, "I");
    const currentPartIIGain = gainsFor(activity.activity_id, "II");
    const lines: PartIXLossLine[] = [
      ...(grossOperating > 0
        ? [{
          reportingForm: activity.reporting_form === "form4835"
            ? "4835, line 34c"
            : "Sch E, line 22",
          lossIncludingPrior: grossOperating,
          currentSamePartGain: Math.max(0, activity.current_net),
        }]
        : []),
      ...(grossPartI > 0
        ? [{
          reportingForm: "Form 4797, Part I",
          lossIncludingPrior: grossPartI,
          currentSamePartGain: currentPartIGain,
        }]
        : []),
      ...(grossPartII > 0
        ? [{
          reportingForm: "Form 4797, Part II",
          lossIncludingPrior: grossPartII,
          currentSamePartGain: currentPartIIGain,
        }]
        : []),
    ];
    if (lines.length === 0 && allocation.suspended[index] !== 0) {
      throw new Error("Form 8582 gain-only activity cannot suspend a loss");
    }
    const partIX = lines.length > 0
      ? allocatePartIXLosses(lines, allocation.suspended[index])
      : [];
    return {
      activityId: activity.activity_id,
      name: activity.name,
      grossOperating,
      grossPartI,
      grossPartII,
      currentPartIGain,
      currentPartIIGain,
      suspended: allocation.suspended[index],
      partIX,
    };
  });
  const allowedByForm = (form: string) =>
    byActivity.reduce(
      (sum, activity) =>
        sum +
        activity.partIX.filter((line) => line.reportingForm === form).reduce(
          (lineSum, line) => lineSum + line.allowed,
          0,
        ),
      0,
    );
  const allowedOperating = allowedByForm("Sch E, line 22") +
    allowedByForm("4835, line 34c");
  const allowedPartI = allowedByForm("Form 4797, Part I");
  const allowedPartII = allowedByForm("Form 4797, Part II");
  if (
    allowedOperating + allowedPartI + allowedPartII !== limit.allowed ||
    byActivity.reduce((sum, activity) => sum + activity.suspended, 0) !==
      limit.suspended
  ) {
    throw new Error("Form 8582 Part IX loss origins do not reconcile");
  }
  return {
    allowedOperating,
    allowedPartI,
    allowedPartII,
    allowedTotal: limit.allowed,
    suspendedTotal: limit.suspended,
    byActivity,
  };
}

// MFS filer who lived with spouse any time during the year cannot use Part II
function isMfsIneligible(activity: PassiveActivity): boolean {
  return activity.filingStatus === FilingStatus.MFS &&
    activity.mfsLivedApartAllYear !== true;
}

function allowanceThresholds(activity: PassiveActivity): {
  lower: number;
  upper: number;
  max: number;
} {
  if (activity.filingStatus === FilingStatus.MFS) {
    // Reached only for an MFS filer verified as living apart all year.
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
  if (!activity.activeParticipation || rentalNetLoss === 0) return 0;

  // MFS filers who lived with spouse at any time are ineligible (§469(i)(5)(A))
  // Missing or nonqualifying lived-apart proof remains ineligible.
  if (isMfsIneligible(activity)) return 0;

  // Missing modified AGI cannot establish whether any allowance is available.
  const magi = activity.modifiedAgi;
  if (magi === undefined) {
    throw new Error(
      "Form 8582 active rental loss needs modified AGI for the special allowance",
    );
  }

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
  const activeNames = new Set(
    (input.activities ?? [])
      .filter((activity) => activity.activity_type === "A")
      .map((activity) => activity.activity_id),
  );
  const activeSaleIncome = (input.current_4797_sale_gains ?? [])
    .filter((sale) => activeNames.has(sale.activity_id))
    .reduce((sum, sale) => sum + sale.gain, 0);
  return {
    currentIncome: totalPassiveIncome(input),
    currentLoss: input.current_loss ?? 0,
    priorUnallowed: input.prior_unallowed ?? 0,
    rentalLoss: (input.rental_current_loss ?? 0) +
      (input.rental_prior_eligible_loss ?? 0),
    rentalIncome: (input.rental_current_income ?? 0) + activeSaleIncome,
    // Part II needs both an active rental activity and actual participation
    activeParticipation: (input.has_active_rental ?? false) &&
      (input.active_participation ?? false),
    modifiedAgi: input.modified_agi,
    filingStatus: input.filing_status,
    mfsLivedApartAllYear: input.mfs_lived_apart_all_year,
  };
}

function schedule1Output(allowedLoss: number): NodeOutput[] {
  if (allowedLoss <= 0) return [];
  return [output(schedule1, { line5_schedule_e: -allowedLoss })];
}

function activityCarryforwards(
  activities: NonNullable<Form8582Input["activities"]>,
  suspended: readonly number[],
): Record<string, number> {
  if (
    activities.length !== suspended.length ||
    suspended.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    throw new Error("Form 8582 activity carryforwards do not reconcile");
  }
  return Object.fromEntries(
    activities.flatMap((activity, index) =>
      suspended[index] > 0
        ? [[`suspended_pal_8582:${activity.activity_id}`, suspended[index]]]
        : []
    ),
  );
}

/** Preserve Part VIII or IX reporting character in the numeric year-end workpaper. */
export function characterCarryforwards(
  allocation: OtherPassivePrior4797Allocation,
): Record<string, number> {
  const character = {
    "Sch E, line 22": "schedule_e",
    "4835, line 34c": "form4835",
    "Form 4797, Part I": "form4797_part1",
    "Form 4797, Part II": "form4797_part2",
  } as const;
  const rows = allocation.byActivity.flatMap((activity) =>
    activity.partIX.filter((line) => line.suspended > 0).map((line) => {
      const form = character[line.reportingForm as keyof typeof character];
      if (form === undefined) {
        throw new Error(
          "Form 8582 character carryforward has unknown reporting form",
        );
      }
      const part = activity.partIX.length === 1 ? "partviii" : "partix";
      return [
        `suspended_pal_8582_${part}:${
          encodeURIComponent(activity.activityId)
        }:${form}`,
        line.suspended,
      ] as const;
    })
  );
  if (
    new Set(rows.map(([key]) => key)).size !== rows.length ||
    rows.reduce((sum, [, amount]) => sum + amount, 0) !==
      allocation.suspendedTotal
  ) {
    throw new Error("Form 8582 character carryforwards do not reconcile");
  }
  return Object.fromEntries(rows);
}

function allocatedSuspensions(
  input: Form8582Input,
  allowed: number,
): readonly number[] {
  const activities = input.activities ?? [];
  const sales = input.current_4797_sale_gains ?? [];
  const gainsFor = (activityId: string) =>
    sales.filter((sale) => sale.activity_id === activityId).reduce(
      (sum, sale) => sum + sale.gain,
      0,
    );
  return allocatePassiveActivityLosses(
    activities.map((activity) => {
      const gain = gainsFor(activity.activity_id);
      return {
        currentNet: activity.current_net + gain,
        currentIncome: Math.max(0, activity.current_net) + gain,
        currentLoss: Math.max(0, -activity.current_net),
        priorUnallowed: activity.prior_unallowed_operating +
          activity.prior_unallowed_4797_part1 +
          activity.prior_unallowed_4797_part2,
        specialEligible: activity.activity_type === "A",
        priorSpecialEligible: activity.prior_active_participation === true,
      };
    }),
    allowed,
  ).suspended;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8582Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    schedule_d_final,
    agi_final,
  ]);

  compute(_ctx: NodeContext, rawInput: Form8582Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    assertPriorYear8582Evidence(input);
    assertActivityTotals(input);

    const hasPrior4797 =
      input.activities?.some((activity) =>
        activity.prior_unallowed_4797_part1 > 0 ||
        activity.prior_unallowed_4797_part2 > 0
      ) ?? false;
    if (hasPrior4797) {
      const allocation = allocateOtherPassivePrior4797(input);
      const line4 = allocation.allowedPartI + allocation.allowedPartII;
      const mixedCurrentSale = (input.current_4797_sale_gains?.length ?? 0) > 0;
      const activeRentalSale = input.activities?.some((activity) =>
        activity.activity_type === "A"
      ) ?? false;
      if (activeRentalSale) {
        const grossPartI = (input.current_4797_sale_gains ?? [])
          .filter((sale) => sale.part === "I")
          .reduce((sum, sale) => sum + sale.gain, 0);
        const grossPartII = (input.current_4797_sale_gains ?? [])
          .filter((sale) => sale.part === "II")
          .reduce((sum, sale) => sum + sale.gain, 0);
        const ordinaryPartILoss = Math.min(
          0,
          grossPartI - allocation.allowedPartI,
        );
        const line4 = grossPartII - allocation.allowedPartII +
          ordinaryPartILoss;
        return {
          outputs: [
            output(schedule_d_final, {
              capital_reduction: Math.min(grossPartI, allocation.allowedPartI),
            }),
            output(agi_final, {
              allowed_part_i: allocation.allowedPartI,
              allowed_part_ii: allocation.allowedPartII,
              allowed_total: allocation.allowedTotal,
              part_i_ordinary_loss: ordinaryPartILoss,
            }),
            ...(line4 !== 0 ||
                allocation.allowedOperating > 0
              ? [output(schedule1, {
                line4_other_gains: line4,
                ...(allocation.allowedOperating > 0
                  ? { line5_schedule_e: -allocation.allowedOperating }
                  : {}),
              })]
              : []),
          ],
          ...(allocation.suspendedTotal > 0
            ? {
              carryforwards: {
                suspended_pal_8582: allocation.suspendedTotal,
                ...activityCarryforwards(
                  input.activities ?? [],
                  allocation.byActivity.map((activity) => activity.suspended),
                ),
                ...characterCarryforwards(allocation),
              },
            }
            : {}),
        };
      }
      return {
        outputs: (mixedCurrentSale ? allocation.allowedOperating : line4 +
            allocation.allowedOperating) > 0
          ? [output(schedule1, {
            line5_schedule_e: -allocation.allowedOperating,
            ...(!mixedCurrentSale && line4 > 0
              ? { line4_other_gains: -line4 }
              : {}),
          })]
          : [],
        ...(allocation.suspendedTotal > 0
          ? {
            carryforwards: {
              suspended_pal_8582: allocation.suspendedTotal,
              ...activityCarryforwards(
                input.activities ?? [],
                allocation.byActivity.map((activity) => activity.suspended),
              ),
              ...characterCarryforwards(allocation),
            },
          }
          : {}),
      };
    }

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
        ? {
          carryforwards: {
            suspended_pal_8582: suspended,
            ...(input.activities
              ? activityCarryforwards(
                input.activities,
                allocatedSuspensions(input, allowed),
              )
              : {}),
          },
        }
        : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582 = new Form8582Node();
