import { FilingStatus } from "../../../types.ts";
import {
  QDCGT_TWENTY_FLOOR_2025,
  QDCGT_ZERO_CEILING_2025,
} from "../../../config/2025.ts";
import { qualifiedDividendTax2025 } from "../../worksheets/tax_table_2025.ts";
import { scheduleDTax } from "../../worksheets/income_tax_calculation/preferential_tax.ts";

type CommonLine4Facts = {
  filingStatus: FilingStatus;
  scheduleJLine3: number;
  electedFarmNetCapitalGain: number;
  electedFarmUnrecaptured1250Gain: number;
};

export type ScheduleJPreferentialLine4Facts = CommonLine4Facts & (
  | {
    worksheet: "qualified_dividends";
    qualifiedDividends: number;
    netCapitalGain: number;
    form4952Line4g: number;
    unrecaptured1250Gain: number;
    rate28Gain: number;
  }
  | {
    worksheet: "schedule_d";
    qualifiedDividends: number;
    scheduleDLine15: number;
    scheduleDLine16: number;
    scheduleDLine18: number;
    scheduleDLine19: number;
    form4952Line4g: number;
    form4952Line4e: number;
  }
);

function wholeDollar(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Schedule J line 4 ${name} must be a nonnegative whole-dollar amount`);
  }
}

/**
 * Figure 2025 Schedule J line 4 when line 3 contains qualified dividends or
 * capital gain. The caller selects the worksheet required by the filed 2025
 * return and passes its sourced amounts. Form 2555 requires the separate
 * Foreign Earned Income Tax Worksheet and is outside this function.
 *
 * This handles current-year preferential income only when Schedule J lines
 * 2b and 2c are zero. The line 4 instructions do not specify how elected
 * current-year gain is reallocated within either worksheet.
 *
 * Sources: https://www.irs.gov/instructions/i1040sj,
 * https://www.irs.gov/instructions/i1040gi, and
 * https://www.irs.gov/instructions/i1040sd.
 */
export function calculateScheduleJPreferentialLine4(
  facts: ScheduleJPreferentialLine4Facts,
): number {
  if (!QDCGT_ZERO_CEILING_2025[facts.filingStatus]) {
    throw new Error("Schedule J line 4 filing status is unavailable");
  }
  for (const [name, value] of Object.entries(facts)) {
    if (typeof value === "number" && name !== "scheduleDLine15" && name !== "scheduleDLine16") {
      wholeDollar(value, name);
    }
  }
  if (facts.electedFarmUnrecaptured1250Gain > facts.electedFarmNetCapitalGain) {
    throw new Error("Schedule J line 2c exceeds line 2b");
  }
  if (facts.electedFarmNetCapitalGain > 0) {
    throw new Error("Schedule J line 4 needs an explicit current-year elected-gain worksheet rule");
  }
  if (facts.worksheet === "qualified_dividends") {
    if (facts.form4952Line4g !== 0 ||
        facts.unrecaptured1250Gain !== 0 || facts.rate28Gain !== 0) {
      throw new Error(
        "Schedule J line 4 qualified-dividend worksheet cannot omit Form 4952 or special-rate gain calculations",
      );
    }
    return qualifiedDividendTax2025(
      facts.scheduleJLine3,
      facts.qualifiedDividends,
      facts.netCapitalGain,
      facts.filingStatus,
    );
  }
  if (facts.worksheet !== "schedule_d") {
    throw new Error("Schedule J line 4 worksheet is unavailable");
  }
  if (!Number.isSafeInteger(facts.scheduleDLine15) ||
      !Number.isSafeInteger(facts.scheduleDLine16)) {
    throw new Error("Schedule D lines 15 and 16 must be whole-dollar amounts");
  }
  const netCapitalGain = Math.max(0, Math.min(facts.scheduleDLine15, facts.scheduleDLine16));
  if (facts.form4952Line4e > facts.form4952Line4g) {
    throw new Error("Form 4952 line 4e exceeds line 4g");
  }
  return scheduleDTax({
    taxableIncome: facts.scheduleJLine3,
    filingStatus: facts.filingStatus,
    qualifiedDividends: facts.qualifiedDividends,
    netCapitalGain,
    unrecaptured1250Gain: facts.scheduleDLine19,
    rate28Gain: facts.scheduleDLine18,
    form4952Election: facts.form4952Line4g,
    electedCapitalGain: facts.form4952Line4e,
    zeroCeiling: QDCGT_ZERO_CEILING_2025,
    twentyFloor: QDCGT_TWENTY_FLOOR_2025,
  });
}
