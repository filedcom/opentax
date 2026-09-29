import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../types.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import type { F1040Config } from "../../config/index.ts";

// Publication 526 (2025), Worksheet 2, lines 4-10. These are source
// classifications, not the percentage of the final Schedule A deduction.
export const noncashContributionCategorySchema = z.enum([
  "noncash_50",
  "other_30",
  "capital_gain_30",
  "capital_gain_20",
]);
export type NoncashContributionCategory = z.infer<
  typeof noncashContributionCategorySchema
>;
const noncashContributionItemSchema = z.object({
  source: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  category: noncashContributionCategorySchema,
  // Item-level facts are required when the return elects the 50% limit for
  // capital-gain property; amount alone cannot prove the FMV reduction.
  contribution_id: z.string().trim().min(1).optional(),
  is_capital_gain_property: z.boolean().optional(),
  original_fmv: z.number().nonnegative().optional(),
  adjusted_basis: z.number().nonnegative().optional(),
  capital_gain_reduction_election_confirmed: z.literal(true).optional(),
});
const capitalGainCarryoverSchema = z.object({
  contribution_id: z.string().trim().min(1),
  contribution_year: z.number().int().min(2000).max(2024),
  original_category: z.literal("capital_gain_30"),
  original_fmv: z.number().nonnegative(),
  adjusted_basis: z.number().nonnegative(),
  previously_deducted: z.number().nonnegative(),
  // Pub. 526 names status changes, NOLs, standard-deduction years, and
  // surviving-spouse cases as requiring special carryover treatment.
  ordinary_carryover_rules_confirmed: z.literal(true),
});

// 7.5% AGI floor for medical deductions
const MEDICAL_AGI_FLOOR_PCT = 0.075;

export const inputSchema = z.object({
  // MFS filers receive $20,000 SALT cap (half of $40,000) per OBBBA §70002
  filing_status: z.nativeEnum(FilingStatus).optional(),
  force_itemized: z.boolean().optional(),
  force_standard: z.boolean().optional(),
  line_1_medical: z.number().nonnegative().optional(),
  agi: z.number().optional(),
  // Line 5a: State and local income taxes — mutually exclusive with line_5a_sales_tax
  // per IRC §164(b)(5) election. Provide one or the other, never both.
  line_5a_state_income_tax: z.number().nonnegative().optional(),
  // Line 5a (alternative): General sales tax deduction in lieu of income taxes
  // IRC §164(b)(5)(A) — taxpayer elects sales tax OR income tax, not both.
  line_5a_sales_tax: z.number().nonnegative().optional(),
  line_5b_real_estate_tax: z.number().nonnegative().optional(),
  line_5c_personal_property_tax: z.number().nonnegative().optional(),
  line_6_other_taxes: z.number().nonnegative().optional(),
  line_8a_mortgage_interest_1098: z.number().nonnegative().optional(),
  line_8b_mortgage_interest_no_1098: z.number().nonnegative().optional(),
  line_8c_points_no_1098: z.number().nonnegative().optional(),
  form8396_interest_credit_reduction: z.number().int().nonnegative()
    .optional(),
  form8396_interest_reporting_line: z.enum(["8a", "8b"]).optional(),
  line_9_investment_interest: z.number().nonnegative().optional(),
  niit_allocable_state_local_tax: z.number().nonnegative().optional(),
  // Source amounts must be classified before the filed Schedule A lines are set.
  cash_contributions_to_50_percent_organizations: z.number().nonnegative()
    .optional(),
  // Pub. 526 Worksheet 2 lines 5/7: cash to a second-category organization
  // or held for the use of any qualified organization.
  cash_contributions_other_30: z.number().nonnegative().optional(),
  qualified_conservation_contributions: z.number().nonnegative().optional(),
  noncash_contribution_items: z.array(noncashContributionItemSchema).optional(),
  capital_gain_50_percent_election_confirmed: z.literal(true).optional(),
  current_noncash_gift_inventory_complete_confirmed: z.literal(true)
    .optional(),
  other_prior_charitable_carryovers_absent_confirmed: z.literal(true)
    .optional(),
  // Explicit [] is needed for an election: absence is not proof of no older
  // capital-gain property carryovers to 50%-limit organizations.
  capital_gain_property_carryovers: z.array(capitalGainCarryoverSchema)
    .optional(),
  // Filed values. Nonzero direct input is rejected; this node finalizes them.
  line_11_cash_contributions: z.number().nonnegative().optional(),
  line_12_noncash_contributions: z.number().nonnegative().optional(),
  line_13_contribution_carryover: z.number().nonnegative().optional(),
  line_15_casualty_theft_loss: z.number().nonnegative().optional(),
  line_16_other_deductions: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
  const gifts = data.noncash_contribution_items ?? [];
  const election = data.capital_gain_50_percent_election_confirmed === true ||
    gifts.some((item) =>
      item.capital_gain_reduction_election_confirmed === true ||
      (item.is_capital_gain_property === true &&
        item.category === "noncash_50")
    );
  if (!election && (data.capital_gain_property_carryovers?.length ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["capital_gain_property_carryovers"],
      message:
        "Prior capital-gain property carryovers need a return-wide election or the separate 30% carryover path",
    });
  }
  if (election) {
    if (data.current_noncash_gift_inventory_complete_confirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["current_noncash_gift_inventory_complete_confirmed"],
        message:
          "Capital-gain election requires a complete return-wide current noncash gift inventory",
      });
    }
    if (data.other_prior_charitable_carryovers_absent_confirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["other_prior_charitable_carryovers_absent_confirmed"],
        message:
          "Bounded capital-gain election requires source confirmation that no other prior charitable carryovers affect the limits",
      });
    }
    if (!data.capital_gain_property_carryovers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capital_gain_property_carryovers"],
        message:
          "Capital-gain 50% election requires an explicit prior-property carryover ledger, including an empty ledger when none exist",
      });
    }
    const ids = new Set<string>();
    for (const [index, item] of gifts.entries()) {
      if (!item.contribution_id || ids.has(item.contribution_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["noncash_contribution_items", index, "contribution_id"],
          message:
            "Capital-gain election needs a unique ID for every current noncash gift",
        });
      }
      if (item.contribution_id) ids.add(item.contribution_id);
      if (item.is_capital_gain_property === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "noncash_contribution_items",
            index,
            "is_capital_gain_property",
          ],
          message:
            "Capital-gain election needs property classification for every current noncash gift",
        });
      }
      if (
        item.category === "capital_gain_30" ||
        (item.category === "noncash_50" &&
          item.is_capital_gain_property === true)
      ) {
        const noAppreciation = item.original_fmv !== undefined &&
          item.original_fmv === item.adjusted_basis &&
          item.amount === item.adjusted_basis;
        if (
          (item.capital_gain_reduction_election_confirmed !== true &&
            !noAppreciation) ||
          item.category !== "noncash_50" ||
          item.original_fmv === undefined ||
          item.adjusted_basis === undefined ||
          item.original_fmv < item.adjusted_basis ||
          item.amount !== item.adjusted_basis
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["noncash_contribution_items", index],
            message:
              "Every current capital-gain gift to a 50%-limit organization must use reduced basis under the return-wide election",
          });
        }
      }
    }
    for (
      const [index, item] of (
        data.capital_gain_property_carryovers ?? []
      ).entries()
    ) {
      if (
        ids.has(item.contribution_id) ||
        item.adjusted_basis > item.original_fmv ||
        item.previously_deducted > item.original_fmv
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["capital_gain_property_carryovers", index],
          message:
            "Capital-gain carryover needs a distinct property ID and valid original FMV, basis, and prior deductions",
        });
      }
      ids.add(item.contribution_id);
    }
  }
  if ((data.qualified_conservation_contributions ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["qualified_conservation_contributions"],
      message:
        "Qualified conservation contributions need the separate 50% or 100% Worksheet 2 limits and substantiation route",
    });
  }
  for (
    const line of [
      "line_11_cash_contributions",
      "line_12_noncash_contributions",
      "line_13_contribution_carryover",
    ] as const
  ) {
    if ((data[line] ?? 0) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [line],
        message:
          "Unclassified charitable deduction cannot be filed directly; provide categorized current-year source contributions. Prior-year carryovers need their original category and substantiation route.",
      });
    }
  }
  // IRC §164(b)(5): Taxpayer may elect to deduct general sales taxes in lieu of
  // state and local income taxes. The election is mutually exclusive — you cannot
  // deduct both. Reject when both are provided with nonzero values.
  const hasSalesTax = (data.line_5a_sales_tax ?? 0) > 0;
  const hasIncomeTax = (data.line_5a_state_income_tax ?? 0) > 0;
  if (hasSalesTax && hasIncomeTax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["line_5a_sales_tax"],
      message:
        "IRC §164(b)(5) election: you may deduct either state/local income taxes (line_5a_state_income_tax) " +
        "or general sales taxes (line_5a_sales_tax), but not both. Remove one before proceeding.",
    });
  }
});

type ScheduleAInput = z.infer<typeof inputSchema>;

function computeMedicalDeduction(input: ScheduleAInput, agi: number): number {
  return Math.max(
    0,
    (input.line_1_medical ?? 0) - Math.max(0, agi) * MEDICAL_AGI_FLOOR_PCT,
  );
}

function effectiveSaltCap(input: ScheduleAInput, cfg: F1040Config): number {
  const isMfs = input.filing_status === FilingStatus.MFS;
  const baseCap = isMfs ? cfg.saltCap / 2 : cfg.saltCap;
  const floor = isMfs ? cfg.saltFloorMfs : cfg.saltFloor;
  const threshold = isMfs
    ? cfg.saltPhaseoutThresholdMfs
    : cfg.saltPhaseoutThreshold;
  const magi = input.agi ?? 0;
  if (magi <= threshold) return baseCap;
  const reduction = (magi - threshold) * cfg.saltPhaseoutRate;
  return Math.max(floor, baseCap - reduction);
}

function computeSALT(input: ScheduleAInput, cfg: F1040Config): number {
  // line_5a is either state income tax or sales tax (election) — never both (validated in schema)
  const line5a = (input.line_5a_state_income_tax ?? 0) +
    (input.line_5a_sales_tax ?? 0);
  const saltTotal = line5a +
    (input.line_5b_real_estate_tax ?? 0) +
    (input.line_5c_personal_property_tax ?? 0);
  return Math.min(saltTotal, effectiveSaltCap(input, cfg));
}

function computeInterestTotal(input: ScheduleAInput): number {
  const mortgage = (input.line_8a_mortgage_interest_1098 ?? 0) +
    (input.line_8b_mortgage_interest_no_1098 ?? 0);
  return Math.max(
    0,
    mortgage -
      (input.form8396_interest_credit_reduction ?? 0),
  ) +
    (input.line_8c_points_no_1098 ?? 0) +
    (input.line_9_investment_interest ?? 0);
}

function computeContributions(
  input: ScheduleAInput,
  agi: number,
  taxYear: number,
) {
  const sourceCash = input.cash_contributions_to_50_percent_organizations ?? 0;
  const sourceCashOther30 = input.cash_contributions_other_30 ?? 0;
  const byCategory = {
    noncash_50: 0,
    other_30: 0,
    capital_gain_30: 0,
    capital_gain_20: 0,
  };
  for (const item of input.noncash_contribution_items ?? []) {
    byCategory[item.category] += item.amount;
  }
  const positiveAgi = Math.max(0, agi);
  const floorZero = (amount: number) => Math.max(0, amount);
  // Pub. 526 (2025), Worksheet 2, lines 13, 17, 24, 30, and 40.
  // In particular, line 21 reserves the *source* 50%-organization gifts,
  // rather than only their presently deductible amount.
  const cash = Math.min(sourceCash, positiveAgi * .6);
  const noncash50 = Math.min(
    byCategory.noncash_50,
    floorZero(positiveAgi * .5 - cash),
  );
  const sourceOther30 = sourceCashOther30 + byCategory.other_30;
  const other30 = Math.min(
    sourceOther30,
    floorZero(
      positiveAgi * .5 - byCategory.capital_gain_30 -
        byCategory.noncash_50 - sourceCash,
    ),
    positiveAgi * .3,
  );
  // Worksheet 2 does not assign a partly allowed combined line 24 amount
  // between cash (Schedule A line 11) and property (line 12). Do not invent
  // a filing split or a source-specific carryover in that case.
  if (
    sourceCashOther30 > 0 && byCategory.other_30 > 0 && other30 > 0 &&
    other30 < sourceOther30
  ) {
    throw new Error(
      "Partly limited mixed cash/noncash 30%-category gifts need an explicit Schedule A line-11/line-12 allocation",
    );
  }
  const cashOther30Allowed = sourceCashOther30 > 0 && byCategory.other_30 === 0
    ? other30
    : other30 === sourceOther30
    ? sourceCashOther30
    : 0;
  const noncashOther30Allowed = other30 - cashOther30Allowed;
  const capitalGain30 = Math.min(
    byCategory.capital_gain_30,
    floorZero(positiveAgi * .5 - byCategory.noncash_50 - sourceCash),
    positiveAgi * .3,
  );
  const capitalGain20 = Math.min(
    byCategory.capital_gain_20,
    floorZero(
      positiveAgi * .5 - cash - noncash50 - other30 - capitalGain30,
    ),
    floorZero(positiveAgi * .3 - other30),
    floorZero(positiveAgi * .3 - capitalGain30),
    positiveAgi * .2,
  );
  const carryforwards = {
    [`charitable_cash_60_${taxYear}`]: sourceCash - cash,
    [`charitable_noncash_50_${taxYear}`]: byCategory.noncash_50 - noncash50,
    [`charitable_cash_other_30_${taxYear}`]: sourceCashOther30 -
      cashOther30Allowed,
    [`charitable_noncash_other_30_${taxYear}`]: byCategory.other_30 -
      noncashOther30Allowed,
    [`charitable_capital_gain_30_${taxYear}`]: byCategory.capital_gain_30 -
      capitalGain30,
    [`charitable_capital_gain_20_${taxYear}`]: byCategory.capital_gain_20 -
      capitalGain20,
  };
  return {
    cash: cash + cashOther30Allowed,
    noncash: noncash50 + noncashOther30Allowed + capitalGain30 + capitalGain20,
    carryforwards,
  };
}

function computeElectedCapitalGainCarryovers(
  input: ScheduleAInput,
  agi: number,
  taxYear: number,
  currentCash: number,
  currentNoncash: number,
) {
  const carryovers = input.capital_gain_property_carryovers ?? [];
  if (carryovers.length === 0) return { allowed: 0, remaining: {} };
  if (
    (input.cash_contributions_other_30 ?? 0) > 0 ||
    (input.noncash_contribution_items ?? []).some((item) =>
      item.category !== "noncash_50" && item.amount > 0
    )
  ) {
    throw new Error(
      "Elected capital-gain carryovers with other 20% or 30% contribution categories need a full carryover-limit reconciliation",
    );
  }
  const ordered = [...carryovers].sort((a, b) =>
    a.contribution_year - b.contribution_year ||
    a.contribution_id.localeCompare(b.contribution_id)
  );
  let available = Math.max(0, agi * .5 - currentCash - currentNoncash);
  let allowed = 0;
  const remaining: Record<string, number> = {};
  for (const item of ordered) {
    if (
      item.contribution_year < taxYear - 5 || item.contribution_year >= taxYear
    ) {
      throw new Error(
        "Capital-gain carryover contribution year exceeds the five-year carryover window",
      );
    }
    // Pub. 526: original FMV less long-term appreciation, then prior
    // deductions actually used. A negative refigured carryover is zero.
    const refigured = Math.max(
      0,
      item.adjusted_basis - item.previously_deducted,
    );
    const used = Math.min(refigured, available);
    available -= used;
    allowed += used;
    if (item.contribution_year > taxYear - 5) {
      remaining[
        `charitable_capital_gain_${item.contribution_year}_${item.contribution_id}`
      ] = refigured - used;
    }
  }
  return { allowed, remaining };
}

class ScheduleANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([standard_deduction]);

  compute(ctx: NodeContext, input: ScheduleAInput): NodeResult {
    inputSchema.parse(input);
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const agi = input.agi ?? 0;
    const hasContributions =
      (input.cash_contributions_to_50_percent_organizations ?? 0) > 0 ||
      (input.cash_contributions_other_30 ?? 0) > 0 ||
      (input.noncash_contribution_items ?? []).some((item) =>
        item.amount > 0
      ) ||
      (input.capital_gain_property_carryovers?.length ?? 0) > 0;
    if (hasContributions && input.agi === undefined) {
      throw new Error("Schedule A charitable limits require computed AGI");
    }
    const contributions = computeContributions(input, agi, ctx.taxYear);
    const election =
      input.capital_gain_50_percent_election_confirmed === true ||
      (input.noncash_contribution_items ?? []).some((item) =>
        item.capital_gain_reduction_election_confirmed === true ||
        (item.is_capital_gain_property === true &&
          item.category === "noncash_50")
      );
    const electedCarryovers = election
      ? computeElectedCapitalGainCarryovers(
        input,
        agi,
        ctx.taxYear,
        contributions.cash,
        contributions.noncash,
      )
      : { allowed: 0, remaining: {} };
    const saltCapped = computeSALT(input, cfg);
    const niitAllocatedTax = input.niit_allocable_state_local_tax ?? 0;
    if (
      niitAllocatedTax >
        Math.min(input.line_5a_state_income_tax ?? 0, saltCapped)
    ) {
      throw new Error(
        "Form 8960 state tax allocation exceeds deductible state income tax",
      );
    }
    const taxesTotal = saltCapped + (input.line_6_other_taxes ?? 0);
    const totalItemized = computeMedicalDeduction(input, agi) +
      taxesTotal +
      computeInterestTotal(input) +
      contributions.cash + contributions.noncash +
      electedCarryovers.allowed +
      (input.line_15_casualty_theft_loss ?? 0) +
      (input.line_16_other_deductions ?? 0);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(standard_deduction, {
        itemized_deductions: totalItemized,
        itemized_taxes: taxesTotal,
        itemized_investment_interest: input.line_9_investment_interest ?? 0,
        niit_allocable_state_local_tax: niitAllocatedTax,
      }),
    ];
    return {
      outputs,
      finalizations: [{
        nodeType: this.nodeType,
        fields: {
          line_11_cash_contributions: contributions.cash,
          line_12_noncash_contributions: contributions.noncash,
          line_13_contribution_carryover: electedCarryovers.allowed,
          charitable_limits_finalized: true,
          capital_gain_election_finalized: election,
        },
      }],
      carryforwards: {
        ...contributions.carryforwards,
        ...electedCarryovers.remaining,
      },
    };
  }
}

export const scheduleA = new ScheduleANode();
