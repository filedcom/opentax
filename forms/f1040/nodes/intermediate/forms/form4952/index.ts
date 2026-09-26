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

function sum(value: number | number[] | undefined): number {
  return Array.isArray(value)
    ? value.reduce((total, n) => total + n, 0)
    : value ?? 0;
}

export const inputSchema = z.object({
  investment_interest_expense: z.number().nonnegative().optional(),
  prior_year_carryforward: z.number().nonnegative().optional(),
  other_investment_property_gross_income: z.number().nonnegative().optional(),
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
  source_1099_interest: accumulableAmount.optional(),
  source_1099_dividends: accumulableAmount.optional(),
  source_1099_qualified_dividends: accumulableAmount.optional(),
  source_1099_capital_gain_distributions: accumulableAmount.optional(),
  source_k1_interest: accumulableAmount.optional(),
  source_k1_dividends: accumulableAmount.optional(),
  source_k1_qualified_dividends: accumulableAmount.optional(),
  form8814_line9_qualified_dividends: z.number().nonnegative().optional(),
  form8814_line10_capital_gain: z.number().nonnegative().optional(),
  form8814_line12_investment_income: z.number().nonnegative().optional(),
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

export function calculateForm4952(input: Form4952Input): Form4952Lines {
  const line1 = input.investment_interest_expense ?? 0;
  const line2 = input.prior_year_carryforward ?? 0;
  const line3 = line1 + line2;
  const childDividends = input.form8814_line9_qualified_dividends ?? 0;
  const childGain = input.form8814_line10_capital_gain ?? 0;
  const line4a = (input.other_investment_property_gross_income ?? 0) +
    sum(input.source_1099_interest) + sum(input.source_1099_dividends) +
    sum(input.source_k1_interest) + sum(input.source_k1_dividends) +
    childDividends + (input.form8814_line12_investment_income ?? 0);
  const line4b = (input.other_investment_property_qualified_dividends ?? 0) +
    sum(input.source_1099_qualified_dividends) +
    sum(input.source_k1_qualified_dividends) + childDividends;
  if (line4b > line4a) {
    throw new Error("Form 4952 line 4b cannot exceed line 4a");
  }
  const line4c = line4a - line4b;
  const line4d = (input.other_investment_property_net_disposition_gain ?? 0) +
    sum(input.source_1099_capital_gain_distributions) + childGain;
  const line4e = Math.min(
    line4d,
    (input.other_investment_property_net_capital_gain ?? 0) +
      sum(input.source_1099_capital_gain_distributions) + childGain,
  );
  const line4f = line4d - line4e;
  const line4g = input.investment_income_election ?? 0;
  if (line4g > line4b + line4e) {
    throw new Error("Form 4952 line 4g exceeds eligible dividends and gain");
  }
  const electedCapitalGain = input.elected_capital_gain_portion ??
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
  const line5 = input.investment_expenses ?? 0;
  const line6 = Math.max(0, line4h - line5);
  const line7 = Math.max(0, line3 - line6);
  const line8 = Math.min(line3, line6);
  return {
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
  };
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
    if (lines.line3 === 0) return { outputs: [] };
    const outputs: NodeOutput[] = [
      { nodeType: this.nodeType, fields: lines },
    ];
    if (lines.line8 > 0) {
      outputs.push(
        output(scheduleA, { line_9_investment_interest: lines.line8 }),
      );
    }
    if (lines.line4g > 0) {
      outputs.push(output(income_tax_calculation, {
        form4952_election: lines.line4g,
        form4952_elected_capital_gain: input.elected_capital_gain_portion ??
          Math.min(lines.line4g, lines.line4e),
      }));
    }
    return {
      outputs,
      ...(lines.line7 > 0
        ? { carryforwards: { investment_interest_excess_4952: lines.line7 } }
        : {}),
    };
  }
}

export const form4952 = new Form4952Node();
