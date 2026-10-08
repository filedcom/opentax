import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { baseYearSourceSchema } from "./base_years.ts";
import { schedule_j_calculation } from "../../../../intermediate/forms/taxes/income-averaging/schedule_j/index.ts";
import { income_tax_calculation } from "../../../../intermediate/worksheets/taxes/calculation/income_tax_calculation/index.ts";

import { ordinaryYearFactsSchema } from "../../../../intermediate/forms/taxes/income-averaging/schedule_j/calculation.ts";
import { scheduleJTaxSourceSchema } from "../../../../intermediate/forms/taxes/income-averaging/schedule_j/tax-source.ts";

// This is an election and filed-base-year source, never an asserted tax.
export const publicInputSchema = z.object({
  elected_farm_income: z.number().int().positive(),
  elected_farm_income_net_capital_gain: z.literal(0),
  base_year_source: baseYearSourceSchema,
  tax_treatment: z.object({
    year2025: ordinaryYearFactsSchema,
    year2022: ordinaryYearFactsSchema,
    year2023: ordinaryYearFactsSchema,
    year2024: ordinaryYearFactsSchema,
  }).strict(),
  nonfarm_wage_source: z.object({
    document_id: z.string().trim().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    bytes_base64: z.string().trim().min(1),
  }).strict().optional(),
}).strict();

// Derived only by the source-return prepass; public entry rejects this field.
export const inputSchema = publicInputSchema.extend({
  _derived_source: z.object({
    current_year_tax_source: scheduleJTaxSourceSchema,
    nonfarm_investment_income: z.number().finite(),
    nonfarm_wage_income: z.number().int().nonnegative().optional(),
    itemized_investment_interest_source: z.literal(true).optional(),
  }).strict().optional(),
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
          ...(input._derived_source ?? {}),
        }),
        this.outputNodes.output(income_tax_calculation, {
          schedule_j_election_requested: true,
          ...(input._derived_source
            ? {
              schedule_j_current_tax_source:
                input._derived_source.current_year_tax_source,
            }
            : {}),
        }),
      ],
    };
  }
}

export const schedule_j = new ScheduleJNode();
