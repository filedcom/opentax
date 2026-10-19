// forms/f1040/nodes/config/index.ts
//
// CONFIG_BY_YEAR — year-keyed config for all config-injected f1040 nodes.
//
// To add a new tax year, export `config{year}: F1040Config` from ./{year}.ts
// and add it here. Nodes read CONFIG_BY_YEAR[ctx.taxYear].
import { config2025 } from "./2025.ts";
import { config2026 } from "./2026.ts";
import { FilingStatus } from "../types.ts";
export type { F1040Config } from "./types.ts";

export const CONFIG_BY_YEAR: Record<number, import("./types.ts").F1040Config> = {
  2025: config2025,
  2026: config2026,
};

export function configForYear(taxYear: number): import("./types.ts").F1040Config {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  return cfg;
}

/**
 * Single-dependent standard deduction and filing-threshold inputs (Pub. 501
 * Table 2; IRC §63(c)(5), §63(f)). A person is 65 on the day before the 65th
 * birthday, so "65 or older" means born before January 2 of year - 64.
 */
export function dependentFilingThresholds(taxYear: number) {
  const cfg = configForYear(taxYear);
  return {
    singleStandardDeduction: cfg.standardDeductionBase[FilingStatus.Single],
    jointStandardDeduction: cfg.standardDeductionBase[FilingStatus.MFJ],
    floor: cfg.dependentStandardDeductionFloor,
    earnedIncomeAddOn: cfg.dependentStandardDeductionEarnedIncomeAddOn,
    unmarriedAgeBlindAddition:
      cfg.standardDeductionAdditional[FilingStatus.Single],
    jointAgeBlindAddition: cfg.standardDeductionAdditional[FilingStatus.MFJ],
    age65BornBefore: `${taxYear - 64}-01-02`,
  };
}
