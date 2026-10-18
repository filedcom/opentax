import { FilingStatus } from "../../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";
import {
  ordinaryTax2025,
  ordinaryTaxFromSchedule,
  PREFERENTIAL_RATE_SCHEDULE_2025,
  type PreferentialRateSchedule,
} from "./tax_table_2025.ts";
import { bracketsForStatus } from "./tax_brackets.ts";

function configFor(taxYear: number) {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  return cfg;
}

/**
 * Tax Table or Tax Computation Worksheet tax for one year. TY2025 uses the
 * published table; a later year derives the table cell from its rate schedule
 * until IRS publishes that year's table.
 */
export function ordinaryTaxForYear(
  income: number,
  status: FilingStatus,
  taxYear: number,
): number {
  if (taxYear === 2025) return ordinaryTax2025(income, status);
  return ordinaryTaxFromSchedule(
    income,
    bracketsForStatus(status, configFor(taxYear)),
  );
}

/** One year's 0%/15%/20% breakpoints with its ordinary-tax rule. */
export function preferentialRateSchedule(
  taxYear: number,
): PreferentialRateSchedule {
  if (taxYear === 2025) return PREFERENTIAL_RATE_SCHEDULE_2025;
  const cfg = configFor(taxYear);
  return {
    zeroCeiling: cfg.qdcgtZeroCeiling,
    twentyFloor: cfg.qdcgtTwentyFloor,
    ordinaryTax: (income, status) =>
      ordinaryTaxForYear(income, status, taxYear),
  };
}

/**
 * Schedule D Tax Worksheet line 19: the top of the 24% bracket. The 2025
 * Schedule D instructions print it as $197,300, or $394,600 joint, which are
 * the Rev. Proc. 2024-40 §3.01 24% bracket ceilings.
 */
export function rate24BracketCeiling(
  status: FilingStatus,
  taxYear: number,
): number {
  const bracket = bracketsForStatus(status, configFor(taxYear)).find((row) =>
    row.rate === 0.24
  );
  if (!bracket) throw new Error(`No 24% bracket for tax year ${taxYear}`);
  return bracket.upTo;
}
