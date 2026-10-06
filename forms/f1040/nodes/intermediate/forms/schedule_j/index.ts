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
  current_year_tax_source:
    scheduleJOrdinaryIncomeInputSchema.shape.current_year_tax_source,
  nonfarm_investment_income: finiteAmount.optional(),
  nonfarm_wage_income: dollar.optional(),
  elected_farm_income: dollar.positive(),
  elected_farm_income_net_capital_gain: z.literal(0),
  base_year_source: baseYearSourceSchema,
  tax_treatment: scheduleJOrdinaryIncomeInputSchema.shape.tax_treatment,
  farm_net_profit: finiteAmount.optional(),
  farm_activity_count: z.number().int().nonnegative().optional(),
  farm_positive_activity_count: z.number().int().nonnegative().optional(),
  farm_only_income_verified: z.boolean(),
  farm_only_unsupported_source_key: z.string().optional(),
  fishing_net_profit: finiteAmount.optional(),
  fishing_only_income_verified: z.boolean().optional(),
  fishing_only_unsupported_source_key: z.string().optional(),
  mixed_farm_fishing_income_verified: z.boolean().optional(),
  mixed_farm_fishing_unsupported_source_key: z.string().optional(),
  schedule_c_net_profit: finiteAmount.optional(),
  nonfarm_qef_ordinary: z.number().nonnegative().optional(),
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
  const fishing = source.fishing_net_profit !== undefined;
  const mixed = fishing && source.farm_net_profit !== undefined;
  // The preferential source prepass independently reconciles investment
  // income to the actual return. The ordinary path still uses the AGI source
  // classifier and cannot silently absorb an unrelated receipt.
  const reconciledOtherIncome = source.nonfarm_investment_income !== undefined;
  if (
    mixed && (
      (!source.mixed_farm_fishing_income_verified && !reconciledOtherIncome) ||
      (source.mixed_farm_fishing_unsupported_source_key !== undefined &&
        !reconciledOtherIncome) ||
      (source.farm_activity_count !== 1 &&
        source.farm_activity_count !== 2) ||
      (source.farm_activity_count === 2 &&
        source.farm_positive_activity_count !== 2) ||
      source.farm_net_profit! <= 0 ||
      !Number.isSafeInteger(source.farm_net_profit!) ||
      source.fishing_net_profit! <= 0 ||
      !Number.isSafeInteger(source.fishing_net_profit!) ||
      source.schedule_c_net_profit !== source.fishing_net_profit
    )
  ) {
    throw new Error(
      source.mixed_farm_fishing_unsupported_source_key
        ? `Schedule J mixed election cannot include ${source.mixed_farm_fishing_unsupported_source_key}`
        : "Schedule J mixed election needs one or two positive sourced farms and one positive sourced fishing business",
    );
  }
  if (
    fishing && !mixed && (
      (!source.fishing_only_income_verified && !reconciledOtherIncome) ||
      (source.fishing_only_unsupported_source_key !== undefined &&
        !reconciledOtherIncome)
    )
  ) {
    throw new Error(
      source.fishing_only_unsupported_source_key
        ? `Schedule J fishing-only election cannot include ${source.fishing_only_unsupported_source_key}`
        : "Schedule J fishing-only election needs a single sourced Schedule C activity",
    );
  }
  if (
    !fishing && !source.farm_only_income_verified &&
    source.nonfarm_investment_income === undefined
  ) {
    throw new Error(
      source.farm_only_unsupported_source_key
        ? `Schedule J Schedule F-only election cannot include ${source.farm_only_unsupported_source_key} until attributable farming or fishing income is reconciled`
        : "Schedule J requires a positive, independently computed Schedule F-only income source",
    );
  }
  const activityProfit = mixed
    ? source.farm_net_profit! + source.fishing_net_profit!
    : fishing
    ? source.fishing_net_profit!
    : source.farm_net_profit;
  if (
    activityProfit === undefined || activityProfit <= 0 ||
    !Number.isSafeInteger(activityProfit)
  ) {
    throw new Error(
      "Schedule J requires a positive, independently computed farm or fishing income source",
    );
  }
  if (
    fishing && !mixed && (
      source.farm_net_profit !== undefined ||
      source.schedule_c_net_profit !== activityProfit
    )
  ) {
    throw new Error(
      "Schedule J fishing activity must equal the sole Schedule C profit without Schedule F",
    );
  }
  if (
    !fishing && source.schedule_c_net_profit !== undefined &&
    source.schedule_c_net_profit !== 0
  ) {
    throw new Error("Schedule J Schedule C profit lacks fishing attribution");
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
      source.agi - (source.nonfarm_qef_ordinary ?? 0) -
        (source.nonfarm_investment_income ?? 0) -
        (source.nonfarm_wage_income ?? 0) -
        (activityProfit - source.se_tax_deduction),
    ) > 0.01
  ) {
    throw new Error(
      "Schedule J qualifying profit and SE deduction do not reconcile to AGI",
    );
  }
  const taxableFarmIncome = activityProfit -
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
      current_year_tax_source: input.current_year_tax_source,
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
