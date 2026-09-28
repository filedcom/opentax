import { z } from "zod";
import {
  calculateScheduleFAtRiskNet,
  inputSchema as scheduleFSchema,
  wotcReductionsByFarm,
} from "../nodes/intermediate/forms/schedule_f/index.ts";

// This deliberately proves only the Schedule F and attributable Schedule SE
// deduction route. Other farming/fishing wages, dispositions, pass-throughs,
// and business deductions must be sourced before broad Schedule J filing.
export const farmOnlyElectionSourceSchema = z.object({
  schedule_f: scheduleFSchema,
  schedule1: z.object({
    line6_schedule_f: z.number().finite(),
    line15_se_deduction: z.number().finite().nonnegative(),
    line3_schedule_c: z.number().finite().optional(),
    line4_other_gains: z.number().finite().optional(),
    line5_schedule_e: z.number().finite().optional(),
    line17_se_health_insurance: z.number().finite().optional(),
    line16_sep_simple: z.number().finite().optional(),
  }).passthrough(),
  form1040: z.object({
    line8_additional_income: z.number().finite(),
    line9_total_income: z.number().finite(),
    line10_adjustments: z.number().finite().nonnegative(),
    line11_agi: z.number().finite(),
    line13_qbi_deduction: z.number().finite().nonnegative().optional(),
    line15_taxable_income: z.number().finite().nonnegative(),
    line1z_total_wages: z.number().finite().optional(),
    line2b_taxable_interest: z.number().finite().optional(),
    line3b_ordinary_dividends: z.number().finite().optional(),
    line4b_ira_taxable: z.number().finite().optional(),
    line5b_pension_taxable: z.number().finite().optional(),
    line6b_ss_taxable: z.number().finite().optional(),
    line7_capital_gain: z.number().finite().optional(),
  }).passthrough(),
  elected_farm_income: z.number().int().positive(),
}).strict();

export type FarmOnlyElectionSource = z.infer<
  typeof farmOnlyElectionSourceSchema
>;

function farmNetProfit(source: FarmOnlyElectionSource["schedule_f"]): number {
  if (source.schedule_fs.length === 0) {
    throw new Error("Schedule J farm-only election needs a Schedule F activity");
  }
  const reductions = wotcReductionsByFarm(source);
  return source.schedule_fs.reduce((total, farm) =>
    total + calculateScheduleFAtRiskNet(
      farm,
      reductions.get(farm.farm_id ?? "") ?? 0,
    ).atRiskNet, 0);
}

/** Reconcile a bounded Schedule F-only election to the finalized return. */
export function reconcileScheduleJFarmOnlyElection(
  raw: FarmOnlyElectionSource,
): { elected_farm_income: number; taxable_farm_income: number } {
  const source = farmOnlyElectionSourceSchema.parse(raw);
  const profit = farmNetProfit(source.schedule_f);
  const schedule1 = source.schedule1;
  const form1040 = source.form1040;
  if (
    profit <= 0 ||
    schedule1.line6_schedule_f !== profit ||
    [
      schedule1.line3_schedule_c,
      schedule1.line4_other_gains,
      schedule1.line5_schedule_e,
      schedule1.line17_se_health_insurance,
      schedule1.line16_sep_simple,
    ].some((value) => (value ?? 0) !== 0) ||
    [
      form1040.line1z_total_wages,
      form1040.line2b_taxable_interest,
      form1040.line3b_ordinary_dividends,
      form1040.line4b_ira_taxable,
      form1040.line5b_pension_taxable,
      form1040.line6b_ss_taxable,
      form1040.line7_capital_gain,
      form1040.line13_qbi_deduction,
    ].some((value) => (value ?? 0) !== 0) ||
    form1040.line8_additional_income !== profit ||
    form1040.line9_total_income !== profit ||
    form1040.line10_adjustments !== schedule1.line15_se_deduction ||
    form1040.line11_agi !== profit - schedule1.line15_se_deduction
  ) {
    throw new Error(
      "Schedule J farm-only election does not reconcile to Schedule F, Schedule 1, and Form 1040",
    );
  }
  const taxableFarmIncome = profit - schedule1.line15_se_deduction;
  if (
    taxableFarmIncome <= 0 ||
    source.elected_farm_income > taxableFarmIncome ||
    source.elected_farm_income > form1040.line15_taxable_income
  ) {
    throw new Error(
      "Schedule J elected farm income exceeds sourced farming or taxable income",
    );
  }
  return {
    elected_farm_income: source.elected_farm_income,
    taxable_farm_income: taxableFarmIncome,
  };
}
