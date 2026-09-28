import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { baseYearSourceSchema } from "./base_years.ts";
import { schedule_j_calculation } from "../../intermediate/forms/schedule_j/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";

const ordinaryYearFactsSchema = z.object({
  has_qualified_dividends: z.literal(false),
  has_net_capital_gain: z.literal(false),
  has_unrecaptured_section1250_gain: z.literal(false),
  has_28_percent_rate_gain: z.literal(false),
  filed_form2555: z.literal(false),
}).strict();

// This is an election and filed-base-year source, never an asserted tax.
export const inputSchema = z.object({
  elected_farm_income: z.number().int().positive(),
  elected_farm_income_net_capital_gain: z.literal(0),
  base_year_source: baseYearSourceSchema,
  tax_treatment: z.object({
    year2025: ordinaryYearFactsSchema,
    year2022: ordinaryYearFactsSchema,
    year2023: ordinaryYearFactsSchema,
    year2024: ordinaryYearFactsSchema,
  }).strict(),
}).strict();

type ScheduleJInput = z.infer<typeof inputSchema>;

class ScheduleJNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_j";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_j_calculation,
    income_tax_calculation,
  ]);

  compute(_ctx: NodeContext, rawInput: ScheduleJInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    return {
      outputs: [
        this.outputNodes.output(schedule_j_calculation, {
          elected_farm_income: input.elected_farm_income,
          elected_farm_income_net_capital_gain: 0,
          base_year_source: input.base_year_source,
          tax_treatment: input.tax_treatment,
        }),
        this.outputNodes.output(income_tax_calculation, {
          schedule_j_election_requested: true,
        }),
      ],
    };
  }
}

export const schedule_j = new ScheduleJNode();
