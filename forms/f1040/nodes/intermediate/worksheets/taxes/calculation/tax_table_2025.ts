import { FilingStatus } from "../../../../types.ts";
import {
  BRACKETS_HOH_2025,
  BRACKETS_MFJ_2025,
  BRACKETS_MFS_2025,
  BRACKETS_SINGLE_2025,
  QDCGT_TWENTY_FLOOR_2025,
  QDCGT_ZERO_CEILING_2025,
} from "../../../../config/2025.ts";
import {
  type IncomeWorksheetConfig,
  ordinaryTaxWithConfig,
  qualifiedDividendTaxWithConfig,
  taxTableWithConfig,
} from "./tax_worksheets.ts";

export const incomeWorksheet2025: IncomeWorksheetConfig = {
  bracketsMfj: BRACKETS_MFJ_2025,
  bracketsSingle: BRACKETS_SINGLE_2025,
  bracketsHoh: BRACKETS_HOH_2025,
  bracketsMfs: BRACKETS_MFS_2025,
  qdcgtZeroCeiling: QDCGT_ZERO_CEILING_2025,
  qdcgtTwentyFloor: QDCGT_TWENTY_FLOOR_2025,
  scheduleDLine19Limit: {
    [FilingStatus.Single]: 197300,
    [FilingStatus.MFJ]: 394600,
    [FilingStatus.MFS]: 197300,
    [FilingStatus.HOH]: 197300,
    [FilingStatus.QSS]: 394600,
  },
};

/**
 * TY2025 Form 1040 Tax Table, for taxable income below $100,000.
 * Source: https://www.irs.gov/publications/p1040 (2025 Tax Table).
 *
 * The published intervals are [0,5), [5,15), [15,25), $25-wide through
 * $3,000, then $50-wide through $100,000. Each printed cell is the tax at the
 * interval midpoint, rounded to the nearest whole dollar. We independently
 * compared this derivation with all 2,062 published rows x four filing-status
 * columns (8,248 cells) from the IRS HTML table; there were zero mismatches.
 * Qualifying surviving spouse uses the married-filing-jointly column.
 */
export function taxTable2025(income: number, status: FilingStatus): number {
  if (!Number.isFinite(income) || income < 0 || income >= 100_000) {
    throw new Error(
      "The 2025 Tax Table requires income from $0 to under $100,000",
    );
  }
  const wholeDollarIncome = Math.round(income);
  if (wholeDollarIncome >= 100_000) {
    throw new Error("The 2025 Tax Table stops below $100,000");
  }
  return taxTableWithConfig(wholeDollarIncome, status, incomeWorksheet2025);
}

/** Tax Table below $100,000; Tax Computation Worksheet rates at or above. */
export function ordinaryTax2025(income: number, status: FilingStatus): number {
  if (!Number.isFinite(income) || income < 0) {
    throw new Error("The 2025 ordinary tax amount must be nonnegative");
  }
  return ordinaryTaxWithConfig(income, status, incomeWorksheet2025);
}

/**
 * TY2025 Qualified Dividends and Capital Gain Tax Worksheet, shared by
 * Form 1040 line 16 and Form 8615 lines 9, 15, and 17.
 * Lines 22 and 24 use the exact Tax Table below $100,000, even when the
 * worksheet's line 1 itself is $100,000 or more. The caller supplies the
 * applicable filing status, including Form 8615's parent/child distinction.
 * Source: https://www.irs.gov/instructions/i1040gi (worksheet lines 1-25).
 */
export function qualifiedDividendTax2025(
  taxableIncome: number,
  qualifiedDividends: number,
  netCapitalGain: number,
  status: FilingStatus,
): number {
  if (
    !Number.isFinite(taxableIncome) || !Number.isFinite(qualifiedDividends) ||
    !Number.isFinite(netCapitalGain) || taxableIncome < 0 ||
    qualifiedDividends < 0 || netCapitalGain < 0
  ) {
    throw new Error(
      "The 2025 qualified-dividend worksheet needs nonnegative amounts",
    );
  }
  return qualifiedDividendTaxWithConfig(
    taxableIncome,
    qualifiedDividends,
    netCapitalGain,
    status,
    incomeWorksheet2025,
  );
}
