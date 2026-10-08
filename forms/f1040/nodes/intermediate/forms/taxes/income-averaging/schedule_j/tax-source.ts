import { z } from "zod";
import { FilingStatus } from "../../../../../types.ts";
import { preferentialTax } from "../../../../worksheets/taxes/calculation/income_tax_calculation/preferential_tax.ts";
import {
  QDCGT_TWENTY_FLOOR_2025,
  QDCGT_ZERO_CEILING_2025,
} from "../../../../../config/2025.ts";
import { calculateScheduleJBaseYearPreferentialTax } from "./preferential_tax.ts";
const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const scheduleJTaxSourceSchema = z.object({
  qualified_dividends: amount,
  net_capital_gain: amount,
  unrecaptured_1250_gain: amount,
  rate_28_gain: amount,
  form4952_line4g: amount,
  form4952_line4e: amount,
  source_reference: z.string().trim().min(1),
}).strict().refine(
  (s) =>
    s.form4952_line4e <= Math.min(s.form4952_line4g, s.net_capital_gain) &&
    s.form4952_line4g - s.form4952_line4e <= s.qualified_dividends,
  {
    message:
      "Schedule J investment-income elections exceed filed source amounts",
  },
);
export type ScheduleJTaxSource = z.infer<typeof scheduleJTaxSourceSchema>;
export function scheduleJCurrentYearTax(
  income: number,
  status: FilingStatus,
  source: ScheduleJTaxSource,
): number {
  const s = scheduleJTaxSourceSchema.parse(source);
  return preferentialTax({
    taxableIncome: income,
    filingStatus: status,
    qualifiedDividends: s.qualified_dividends,
    netCapitalGain: s.net_capital_gain,
    unrecaptured1250Gain: s.unrecaptured_1250_gain,
    rate28Gain: s.rate_28_gain,
    form4952Election: s.form4952_line4g,
    electedCapitalGain: s.form4952_line4e,
    zeroCeiling: QDCGT_ZERO_CEILING_2025,
    twentyFloor: QDCGT_TWENTY_FLOOR_2025,
  });
}
export function scheduleJBaseYearSourceTax(
  year: 2022 | 2023 | 2024,
  income: number,
  status: FilingStatus,
  source: ScheduleJTaxSource,
): number {
  const s = scheduleJTaxSourceSchema.parse(source);
  return calculateScheduleJBaseYearPreferentialTax(
    s.unrecaptured_1250_gain || s.rate_28_gain
      ? {
        year,
        filingStatus: status,
        taxableIncomeWithAllocation: income,
        filedForm2555: false,
        method: "schedule_d",
        qualifiedDividends: s.qualified_dividends,
        scheduleDLine15: s.net_capital_gain,
        scheduleDLine16: s.net_capital_gain,
        scheduleDLine18: s.rate_28_gain,
        scheduleDLine19: s.unrecaptured_1250_gain,
        form4952Line4g: s.form4952_line4g,
        form4952Line4e: s.form4952_line4e,
        allocatedElectedNetCapitalGain: 0,
        allocatedElectedUnrecaptured1250Gain: 0,
      }
      : {
        year,
        filingStatus: status,
        taxableIncomeWithAllocation: income,
        filedForm2555: false,
        method: "qualified_dividends",
        qualifiedDividends: s.qualified_dividends,
        netCapitalGain: s.net_capital_gain,
        form4952Line4g: s.form4952_line4g,
        electedFarmNetCapitalGain: 0,
      },
  );
}
