import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form4952, calculateInvestmentInterest } from "../../intermediate/forms/form4952/index.ts";
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
});

// 7.5% AGI floor for medical deductions
const MEDICAL_AGI_FLOOR_PCT = 0.075;
const amounts = z.union([z.number().nonnegative(), z.array(z.number().nonnegative())]);

function sumAmounts(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  return Array.isArray(value) ? value.reduce((sum, amount) => sum + amount, 0) : value;
}

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
  // Source amounts must be classified before the filed Schedule A lines are set.
  cash_contributions_to_50_percent_organizations: z.number().nonnegative()
    .optional(),
  // Pub. 526 Worksheet 2 lines 5/7: cash to a second-category organization
  // or held for the use of any qualified organization.
  cash_contributions_other_30: z.number().nonnegative().optional(),
  qualified_conservation_contributions: z.number().nonnegative().optional(),
  noncash_contribution_items: z.array(noncashContributionItemSchema).optional(),
  // Filed values. Nonzero direct input is rejected; this node finalizes them.
  line_11_cash_contributions: z.number().nonnegative().optional(),
  line_12_noncash_contributions: z.number().nonnegative().optional(),
  line_13_contribution_carryover: z.number().nonnegative().optional(),
  line_15_casualty_theft_loss: z.number().nonnegative().optional(),
  line_16_other_deductions: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
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
    allowedInvestmentInterest;
}

function investmentIncome(input: ScheduleAInput): number {
  const qualified = sumAmounts(input.investment_interest_qualified_dividends);
  const ordinary = sumAmounts(input.investment_interest_ordinary_dividends);
  const netGain = input.investment_net_gain ?? 0;
  const netCapitalGain = Math.min(netGain, input.investment_net_capital_gain ?? 0);
  if ((input.investment_net_capital_gain ?? 0) > (input.reported_net_capital_gain ?? 0)) {
    throw new Error("Form 4952 elected net capital gain exceeds Schedule D net capital gain");
  }
  const electedDividends = input.elected_qualified_dividends ?? 0;
  const electedGain = input.elected_net_capital_gain ?? 0;
  if (electedDividends > qualified || electedGain > netCapitalGain) {
    throw new Error("Form 4952 line 4g election exceeds qualified dividends or eligible net capital gain");
  }
  return Math.max(0,
    sumAmounts(input.investment_interest_taxable_interest) + ordinary - qualified +
    netGain - netCapitalGain + electedDividends + electedGain);
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
      (input.noncash_contribution_items ?? []).some((item) => item.amount > 0);
    if (hasContributions && input.agi === undefined) {
      throw new Error("Schedule A charitable limits require computed AGI");
    }
    const contributions = computeContributions(input, agi, ctx.taxYear);
    const saltCapped = computeSALT(input, cfg);
    const taxesTotal = saltCapped + (input.line_6_other_taxes ?? 0);
    const expense = input.line_9_investment_interest ?? 0;
    const priorYear = input.prior_year_investment_interest_carryforward ?? 0;
    if ((input.elected_qualified_dividends ?? 0) + (input.elected_net_capital_gain ?? 0) > 0 &&
      expense + priorYear === 0) {
      throw new Error("Form 4952 income election requires investment interest expense or carryforward");
    }
    const grossInvestmentIncome = investmentIncome(input);
    const netIncome = Math.max(0, grossInvestmentIncome - (input.investment_expenses ?? 0));
    const { allowed } = calculateInvestmentInterest(expense, netIncome, priorYear);
    const niitTax = input.niit_allocable_state_local_tax ?? 0;
    const eligibleTax = input.line_5a_state_income_tax ?? 0;
    if (niitTax > Math.min(eligibleTax, saltCapped)) {
      throw new Error("Form 8960 line 9b allocation exceeds deductible eligible state and local taxes");
    }
    const totalItemized = computeMedicalDeduction(input, agi) +
      taxesTotal +
      computeInterestTotal(input) +
      contributions.cash + contributions.noncash +
      (input.line_15_casualty_theft_loss ?? 0) +
      (input.line_16_other_deductions ?? 0);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(standard_deduction, {
        itemized_deductions: totalItemized,
        itemized_taxes: taxesTotal,
      }),
    ];
    return {
      outputs,
      finalizations: [{
        nodeType: this.nodeType,
        fields: {
          line_11_cash_contributions: contributions.cash,
          line_12_noncash_contributions: contributions.noncash,
          line_13_contribution_carryover: 0,
          charitable_limits_finalized: true,
        },
      }],
      carryforwards: contributions.carryforwards,
    };
  }
}

export const scheduleA = new ScheduleANode();
