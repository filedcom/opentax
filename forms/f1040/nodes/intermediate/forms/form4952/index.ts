import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// The manual line 4 source facts exclude 1099s explicitly marked as investment
// property and amounts routed by Form 8814. Each source has its own field so
// the executor can accumulate multiple documents without replacing user facts.
const accumulableAmount = z.union([
  z.number().nonnegative(),
  z.array(z.number().nonnegative()),
]);

const amtRefigureSchema = z.object({
  prior_year_disallowed_interest: z.number().nonnegative(),
  interest_on_private_activity_bonds: z.number().nonnegative(),
  other_gross_income_adjustment: z.number(),
  qualified_dividends_adjustment: z.number(),
  net_disposition_gain_adjustment: z.number(),
  net_capital_gain_adjustment: z.number(),
  investment_expenses_adjustment: z.number(),
  elected_capital_gain_portion: z.number().nonnegative().optional(),
}).strict();

function sum(value: number | number[] | undefined): number {
  return Array.isArray(value)
    ? value.reduce((total, n) => total + n, 0)
    : value ?? 0;
}

export const inputSchema = z.object({
  investment_interest_expense: z.number().nonnegative().optional(),
  investment_interest_expense_excludes_sourced_k1: z.literal(true).optional(),
  investment_interest_expense_excludes_royalty_attributable_interest: z.literal(
    true,
  ).optional(),
  prior_year_carryforward: z.number().nonnegative().optional(),
  other_investment_property_gross_income: z.number().nonnegative().optional(),
  other_investment_property_gross_income_excludes_sourced_royalties: z.literal(
    true,
  ).optional(),
  other_investment_property_qualified_dividends: z.number().nonnegative()
    .optional(),
  other_investment_property_net_disposition_gain: z.number().nonnegative()
    .optional(),
  other_investment_property_net_capital_gain: z.number().nonnegative()
    .optional(),
  investment_income_election: z.number().nonnegative().optional(),
  // Dotted-line election beside line 4e. Without it, the IRS attributes line
  // 4g to eligible net capital gain first, then qualified dividends.
  elected_capital_gain_portion: z.number().nonnegative().optional(),
  investment_expenses: z.number().nonnegative().optional(),
  investment_expenses_exclude_sourced_k1: z.literal(true).optional(),
  source_1099_interest: accumulableAmount.optional(),
  source_1099_royalties: accumulableAmount.optional(),
  source_k1_royalties: accumulableAmount.optional(),
  source_1099_dividends: accumulableAmount.optional(),
  source_1099_qualified_dividends: accumulableAmount.optional(),
  source_1099_capital_gain_distributions: accumulableAmount.optional(),
  source_private_activity_bond_interest: accumulableAmount.optional(),
  source_k1_interest: accumulableAmount.optional(),
  source_k1_dividends: accumulableAmount.optional(),
  source_k1_qualified_dividends: accumulableAmount.optional(),
  source_k1_allowed_investment_expenses: accumulableAmount.optional(),
  source_k1_investment_interest: accumulableAmount.optional(),
  form8814_line9_qualified_dividends: z.number().nonnegative().optional(),
  form8814_line10_capital_gain: z.number().nonnegative().optional(),
  form8814_line12_investment_income: z.number().nonnegative().optional(),
  amt_refigure: amtRefigureSchema.optional(),
});

type Form4952Input = z.infer<typeof inputSchema>;

export interface Form4952Lines {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4a: number;
  readonly line4b: number;
  readonly line4c: number;
  readonly line4d: number;
  readonly line4e: number;
  readonly line4f: number;
  readonly line4g: number;
  readonly line4h: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
}

interface Form4952Totals {
  line1: number;
  line2: number;
  line4a: number;
  line4b: number;
  line4d: number;
  netCapitalGain: number;
  line4g: number;
  line5: number;
}

function sourceTotals(input: Form4952Input): Form4952Totals {
  if (
    (sum(input.source_1099_royalties) + sum(input.source_k1_royalties)) > 0 &&
    ((input.investment_interest_expense ?? 0) +
        sum(input.source_k1_investment_interest)) > 0 &&
    input.investment_interest_expense_excludes_royalty_attributable_interest !==
      true
  ) {
    throw new Error(
      "Form 4952 royalty source needs confirmation that line 1 interest excludes royalty-attributable interest routed to Schedule E",
    );
  }
  if (
    (input.other_investment_property_gross_income ?? 0) > 0 &&
    (sum(input.source_1099_royalties) + sum(input.source_k1_royalties)) > 0 &&
    input.other_investment_property_gross_income_excludes_sourced_royalties !==
      true
  ) {
    throw new Error(
      "Form 4952 manual investment property gross income must exclude sourced royalties",
    );
  }
  if (
    (input.investment_interest_expense ?? 0) > 0 &&
    sum(input.source_k1_investment_interest) > 0 &&
    input.investment_interest_expense_excludes_sourced_k1 !== true
  ) {
    throw new Error(
      "Form 4952 manual investment interest must exclude sourced K-1 code H amounts",
    );
  }
  if (
    (input.investment_expenses ?? 0) > 0 &&
    sum(input.source_k1_allowed_investment_expenses) > 0 &&
    input.investment_expenses_exclude_sourced_k1 !== true
  ) {
    throw new Error(
      "Form 4952 manual investment expenses must exclude sourced K-1 amounts",
    );
  }
  const childDividends = input.form8814_line9_qualified_dividends ?? 0;
  const childGain = input.form8814_line10_capital_gain ?? 0;
  return {
    line1: (input.investment_interest_expense ?? 0) +
      sum(input.source_k1_investment_interest),
    line2: input.prior_year_carryforward ?? 0,
    line4a: (input.other_investment_property_gross_income ?? 0) +
      sum(input.source_1099_interest) + sum(input.source_1099_royalties) +
      sum(input.source_k1_royalties) +
      sum(input.source_1099_dividends) +
      sum(input.source_k1_interest) + sum(input.source_k1_dividends) +
      childDividends + (input.form8814_line12_investment_income ?? 0),
    line4b: (input.other_investment_property_qualified_dividends ?? 0) +
      sum(input.source_1099_qualified_dividends) +
      sum(input.source_k1_qualified_dividends) + childDividends,
    line4d: (input.other_investment_property_net_disposition_gain ?? 0) +
      sum(input.source_1099_capital_gain_distributions) + childGain,
    netCapitalGain: (input.other_investment_property_net_capital_gain ?? 0) +
      sum(input.source_1099_capital_gain_distributions) + childGain,
    line4g: input.investment_income_election ?? 0,
    line5: (input.investment_expenses ?? 0) +
      sum(input.source_k1_allowed_investment_expenses),
  };
}

function calculateFromTotals(
  totals: Form4952Totals,
  electedCapitalGainPortion?: number,
): { lines: Form4952Lines; electedCapitalGain: number } {
  if (Object.values(totals).some((amount) => amount < 0)) {
    throw new Error("Form 4952 refigured source totals cannot be negative");
  }
  const { line1, line2, line4a, line4b, line4d, line4g, line5 } = totals;
  const line3 = line1 + line2;
  if (line4b > line4a) {
    throw new Error("Form 4952 line 4b cannot exceed line 4a");
  }
  const line4c = line4a - line4b;
  const line4e = Math.min(line4d, totals.netCapitalGain);
  const line4f = line4d - line4e;
  if (line4g > line4b + line4e) {
    throw new Error("Form 4952 line 4g exceeds eligible dividends and gain");
  }
  const electedCapitalGain = electedCapitalGainPortion ??
    Math.min(line4g, line4e);
  if (
    electedCapitalGain > Math.min(line4g, line4e) ||
    electedCapitalGain < Math.max(0, line4g - line4b)
  ) {
    throw new Error(
      "Form 4952 elected capital-gain portion must reconcile with line 4g, line 4e, and qualified dividends",
    );
  }
  const line4h = line4c + line4f + line4g;
  const line6 = Math.max(0, line4h - line5);
  const line7 = Math.max(0, line3 - line6);
  const line8 = Math.min(line3, line6);
  return {
    lines: {
      line1,
      line2,
      line3,
      line4a,
      line4b,
      line4c,
      line4d,
      line4e,
      line4f,
      line4g,
      line4h,
      line5,
      line6,
      line7,
      line8,
    },
    electedCapitalGain,
  };
}

export function calculateForm4952(input: Form4952Input): Form4952Lines {
  return calculateFromTotals(
    sourceTotals(input),
    input.elected_capital_gain_portion,
  ).lines;
}

export function calculateAmtForm4952(input: Form4952Input): {
  lines: Form4952Lines;
  electedCapitalGain: number;
} {
  const amt = input.amt_refigure;
  if (!amt) {
    throw new Error("Form 4952 needs explicit AMT refigure facts");
  }
  const regular = sourceTotals(input);
  const adjusted: Form4952Totals = {
    line1: regular.line1 + amt.interest_on_private_activity_bonds,
    line2: amt.prior_year_disallowed_interest,
    line4a: regular.line4a + sum(input.source_private_activity_bond_interest) +
      amt.other_gross_income_adjustment,
    line4b: regular.line4b + amt.qualified_dividends_adjustment,
    line4d: regular.line4d + amt.net_disposition_gain_adjustment,
    netCapitalGain: regular.netCapitalGain +
      amt.net_capital_gain_adjustment,
    line4g: 0,
    line5: regular.line5 + amt.investment_expenses_adjustment,
  };
  const beforeElection = calculateFromTotals(adjusted).lines;
  adjusted.line4g = Math.min(
    regular.line4g,
    beforeElection.line4b + beforeElection.line4e,
  );
  return calculateFromTotals(
    adjusted,
    amt.elected_capital_gain_portion,
  );
}

class Form4952Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4952";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA, income_tax_calculation]);

  compute(_ctx: NodeContext, rawInput: Form4952Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm4952(input);
    if (lines.line3 === 0 && lines.line4g > 0) {
      throw new Error(
        "Form 4952 cannot elect investment income without investment interest expense",
      );
    }
    if (lines.line3 === 0 && input.amt_refigure === undefined) {
      return { outputs: [] };
    }
    const amt = calculateAmtForm4952(input);
    const line2cDifference = lines.line8 - amt.lines.line8;
    const outputs: NodeOutput[] = lines.line3 > 0
      ? [{ nodeType: this.nodeType, fields: { ...lines } }]
      : [];
    if (lines.line8 > 0) {
      outputs.push(
        output(scheduleA, { line_9_investment_interest: lines.line8 }),
      );
    }
    if (lines.line4g > 0 || line2cDifference !== 0) {
      outputs.push(output(income_tax_calculation, {
        form4952_election: lines.line4g,
        form4952_elected_capital_gain: input.elected_capital_gain_portion ??
          Math.min(lines.line4g, lines.line4e),
        form4952_amt_election: amt.lines.line4g,
        form4952_amt_elected_capital_gain: amt.electedCapitalGain,
        ...(line2cDifference !== 0
          ? { form4952_amt_line2c_difference: line2cDifference }
          : {}),
      }));
    }
    return {
      outputs,
      ...(lines.line7 > 0 || amt.lines.line7 > 0
        ? {
          carryforwards: {
            ...(lines.line7 > 0
              ? { investment_interest_excess_4952: lines.line7 }
              : {}),
            ...(amt.lines.line7 > 0
              ? { amt_investment_interest_excess_4952: amt.lines.line7 }
              : {}),
          },
        }
        : {}),
    };
  }
}

export const form4952 = new Form4952Node();
