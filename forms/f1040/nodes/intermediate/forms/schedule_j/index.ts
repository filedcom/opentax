import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../../types.ts";
import { baseYearSourceSchema } from "../../../inputs/schedule_j/base_years.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import {
  calculateScheduleJOrdinaryIncome,
  scheduleJOrdinaryIncomeInputSchema,
} from "./calculation.ts";

const dollar = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const finiteAmount = z.number().finite();

const completeInputSchema = z.object({
  elected_farm_income: dollar.positive(),
  elected_farm_income_net_capital_gain: z.literal(0),
  base_year_source: baseYearSourceSchema,
  tax_treatment: scheduleJOrdinaryIncomeInputSchema.shape.tax_treatment,
  farm_net_profit: finiteAmount,
  farm_only_income_verified: z.boolean(),
  se_tax_deduction: finiteAmount,
  agi: finiteAmount,
  taxable_income_2025: finiteAmount,
  filing_status_2025: z.nativeEnum(FilingStatus),
  taking_standard_deduction: z.boolean(),
  qbi_deduction: finiteAmount,
  additional_deductions: finiteAmount,
  nol_deduction: finiteAmount,
}).strict();

// Other return nodes deposit source facts whether or not Schedule J was
// elected. A partial pending slot must be a normal no-election path; after an
// election arrives, every source field is required by completeInputSchema.
export const inputSchema = completeInputSchema.partial().strict();

type ScheduleJCalculationInput = z.infer<typeof completeInputSchema>;

function reconcileCurrentYear(source: ScheduleJCalculationInput): void {
  if (
    source.se_tax_deduction < 0 || source.taxable_income_2025 < 0 ||
    source.qbi_deduction < 0 || source.additional_deductions < 0 ||
    source.nol_deduction < 0
  ) {
    throw new Error(
      "Schedule J current-year deductions and taxable income cannot be negative",
    );
  }
  if (!source.farm_only_income_verified || source.farm_net_profit <= 0) {
    throw new Error(
      "Schedule J requires a positive, independently computed Schedule F-only income source",
    );
  }
  if (
    !source.taking_standard_deduction ||
    source.additional_deductions !== 0 || source.nol_deduction !== 0
  ) {
    throw new Error(
      "Schedule J farm-only route needs a standard deduction and no additional or NOL deductions",
    );
  }
  if (
    Math.abs(
      source.agi - (source.farm_net_profit - source.se_tax_deduction),
    ) > 0.01
  ) {
    throw new Error(
      "Schedule J farm profit and SE deduction do not reconcile to AGI",
    );
  }
  const taxableFarmIncome = source.farm_net_profit -
    source.se_tax_deduction - source.qbi_deduction;
  if (
    taxableFarmIncome <= 0 ||
    source.elected_farm_income > taxableFarmIncome ||
    source.elected_farm_income > Math.round(source.taxable_income_2025)
  ) {
    throw new Error(
      "Schedule J election exceeds sourced taxable farm income or Form 1040 line 15",
    );
  }
}

class ScheduleJCalculationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_j_calculation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([income_tax_calculation]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const partial = inputSchema.parse(rawInput);
    if (partial.elected_farm_income === undefined) {
      return { outputs: [] };
    }
    const input = completeInputSchema.parse(partial);
    reconcileCurrentYear(input);
    const lines = calculateScheduleJOrdinaryIncome({
      taxable_income_2025: Math.round(input.taxable_income_2025),
      filing_status_2025: input.filing_status_2025,
      elected_farm_income: input.elected_farm_income,
      elected_farm_income_net_capital_gain: 0,
      base_year_source: input.base_year_source,
      tax_treatment: input.tax_treatment,
    });
    return {
      outputs: [this.outputNodes.output(income_tax_calculation, {
        schedule_j_calculated_tax: lines.line23,
      })],
      finalizations: [{ nodeType: "schedule_j", fields: lines }],
    };
  }
}

export const schedule_j_calculation = new ScheduleJCalculationNode();
