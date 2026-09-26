import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form4952, calculateInvestmentInterest } from "../../intermediate/forms/form4952/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../types.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import type { F1040Config } from "../../config/index.ts";

// 60% AGI limit for cash charitable contributions to public charities (IRC §170(b)(1)(A))
const CASH_CONTRIBUTION_AGI_PCT = 0.60;

// 30% AGI limit for noncash capital gain property contributions (IRC §170(b)(1)(C))
const NONCASH_CAPITAL_GAIN_AGI_PCT = 0.30;

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
  agi: z.number().nonnegative().optional(),
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
  line_9_investment_interest: z.number().nonnegative().optional(),
  prior_year_investment_interest_carryforward: z.number().nonnegative().optional(),
  investment_interest_taxable_interest: amounts.optional(),
  investment_interest_ordinary_dividends: amounts.optional(),
  investment_interest_qualified_dividends: amounts.optional(),
  // Form 4952 lines 4d, 4e, 4g and 5; enter property-held-for-investment amounts.
  investment_net_gain: z.number().nonnegative().optional(),
  investment_net_capital_gain: z.number().nonnegative().optional(),
  reported_net_capital_gain: z.number().nonnegative().optional(),
  elected_qualified_dividends: z.number().nonnegative().optional(),
  elected_net_capital_gain: z.number().nonnegative().optional(),
  investment_expenses: z.number().nonnegative().optional(),
  // Taxpayer-chosen reasonable allocation for Form 8960 line 9b.
  niit_allocable_state_local_tax: z.number().nonnegative().optional(),
  // Line 11: Cash contributions to public charities — 60% AGI cap (IRC §170(b)(1)(A))
  line_11_cash_contributions: z.number().nonnegative().optional(),
  // Line 12: Noncash contributions — treated as capital gain property, 30% AGI cap
  // IRC §170(b)(1)(C) for appreciated capital gain property; 50% cap for other noncash.
  // This field represents the more restrictive capital gain property category.
  line_12_noncash_contributions: z.number().nonnegative().optional(),
  line_13_contribution_carryover: z.number().nonnegative().optional(),
  line_15_casualty_theft_loss: z.number().nonnegative().optional(),
  line_16_other_deductions: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
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
  return Math.max(0, (input.line_1_medical ?? 0) - agi * MEDICAL_AGI_FLOOR_PCT);
}

function effectiveSaltCap(input: ScheduleAInput, cfg: F1040Config): number {
  const isMfs = input.filing_status === FilingStatus.MFS;
  const baseCap = isMfs ? cfg.saltCap / 2 : cfg.saltCap;
  const floor = isMfs ? cfg.saltFloorMfs : cfg.saltFloor;
  const threshold = isMfs ? cfg.saltPhaseoutThresholdMfs : cfg.saltPhaseoutThreshold;
  const magi = input.agi ?? 0;
  if (magi <= threshold) return baseCap;
  const reduction = (magi - threshold) * cfg.saltPhaseoutRate;
  return Math.max(floor, baseCap - reduction);
}

function computeSALT(input: ScheduleAInput, cfg: F1040Config): number {
  // line_5a is either state income tax or sales tax (election) — never both (validated in schema)
  const line5a = (input.line_5a_state_income_tax ?? 0) + (input.line_5a_sales_tax ?? 0);
  const saltTotal = line5a +
    (input.line_5b_real_estate_tax ?? 0) +
    (input.line_5c_personal_property_tax ?? 0);
  return Math.min(saltTotal, effectiveSaltCap(input, cfg));
}

function computeInterestTotal(input: ScheduleAInput, allowedInvestmentInterest: number): number {
  return (input.line_8a_mortgage_interest_1098 ?? 0) +
    (input.line_8b_mortgage_interest_no_1098 ?? 0) +
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

function computeContributions(input: ScheduleAInput, agi: number): number {
  if (agi <= 0) {
    return (input.line_11_cash_contributions ?? 0) +
      (input.line_12_noncash_contributions ?? 0) +
      (input.line_13_contribution_carryover ?? 0);
  }
  // IRC §170(b)(1)(A): cash contributions to public charities capped at 60% of AGI
  const cashAllowed = Math.min(
    input.line_11_cash_contributions ?? 0,
    agi * CASH_CONTRIBUTION_AGI_PCT,
  );
  // IRC §170(b)(1)(C): noncash capital gain property contributions capped at 30% of AGI
  const noncashAllowed = Math.min(
    input.line_12_noncash_contributions ?? 0,
    agi * NONCASH_CAPITAL_GAIN_AGI_PCT,
  );
  // Carryover follows the original contribution type; apply overall 60% ceiling to total
  const carryover = input.line_13_contribution_carryover ?? 0;
  const combined = cashAllowed + noncashAllowed + carryover;
  return Math.min(combined, agi * CASH_CONTRIBUTION_AGI_PCT);
}

class ScheduleANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251, standard_deduction, form4952, income_tax_calculation]);

  compute(ctx: NodeContext, input: ScheduleAInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const agi = input.agi ?? 0;
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
      computeInterestTotal(input, allowed) +
      computeContributions(input, agi) +
      (input.line_15_casualty_theft_loss ?? 0) +
      (input.line_16_other_deductions ?? 0);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line12e_itemized_deductions: totalItemized }),
      ...(expense + priorYear > 0 ? [this.outputNodes.output(form4952, {
        investment_interest_expense: expense,
        net_investment_income: netIncome,
        investment_income: grossInvestmentIncome,
        prior_year_carryforward: priorYear,
        gross_investment_income: sumAmounts(input.investment_interest_taxable_interest) +
          sumAmounts(input.investment_interest_ordinary_dividends),
        qualified_dividends: sumAmounts(input.investment_interest_qualified_dividends),
        investment_net_gain: input.investment_net_gain ?? 0,
        investment_net_capital_gain: Math.min(input.investment_net_gain ?? 0, input.investment_net_capital_gain ?? 0),
        elected_qualified_dividends: input.elected_qualified_dividends ?? 0,
        elected_net_capital_gain: input.elected_net_capital_gain ?? 0,
        investment_expenses: input.investment_expenses ?? 0,
      })] : []),
      ...((input.elected_qualified_dividends ?? 0) + (input.elected_net_capital_gain ?? 0) > 0
        ? [this.outputNodes.output(income_tax_calculation, {
          form4952_elected_qualified_dividends: input.elected_qualified_dividends ?? 0,
          form4952_elected_net_capital_gain: input.elected_net_capital_gain ?? 0,
        })] : []),
      ...(expense + priorYear > 0 ? [{ nodeType: this.nodeType, fields: {
        line_9_investment_interest: allowed,
      } }] : []),
      // Feed standard_deduction node so it can compare standard vs itemized
      this.outputNodes.output(standard_deduction, {
        itemized_deductions: totalItemized,
        investment_interest_for_niit: allowed,
        niit_allocable_state_local_tax: niitTax,
      }),
      // AMT addback: taxes paid total (Line 7) flows to Form 6251 Line 2a
      ...(taxesTotal > 0 ? [this.outputNodes.output(form6251, { line2a_taxes_paid: taxesTotal })] : []),
    ];
    return { outputs };
  }
}

export const scheduleA = new ScheduleANode();
