import { FilingStatus } from "../../types.ts";
import {
  type Bracket,
  BRACKETS_HOH_2025,
  BRACKETS_MFJ_2025,
  BRACKETS_MFS_2025,
  BRACKETS_SINGLE_2025,
  QDCGT_TWENTY_FLOOR_2025,
  QDCGT_ZERO_CEILING_2025,
} from "../../config/2025.ts";
import { taxFromBrackets } from "./tax_brackets.ts";

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
  const midpoint = wholeDollarIncome < 5
    ? 2.5
    : wholeDollarIncome < 15
    ? 10
    : wholeDollarIncome < 25
    ? 20
    : wholeDollarIncome < 3_000
    ? Math.floor(wholeDollarIncome / 25) * 25 + 12.5
    : Math.floor(wholeDollarIncome / 50) * 50 + 25;
  const bracket = [...bracketsForTableStatus(status)].reverse().find((entry) =>
    midpoint > entry.over
  );
  if (!bracket) return 0;
  // Midpoints are exact half-dollars. Compute in integer cents so a value
  // ending in exactly 50 cents rounds up consistently with the printed table.
  const ratePercent = Math.round(bracket.rate * 100);
  const taxCents = Math.round(bracket.base * 100) +
    (midpoint * 2 - bracket.over * 2) * ratePercent / 2;
  return Math.floor((taxCents + 50) / 100);
}

function bracketsForTableStatus(status: FilingStatus): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return BRACKETS_MFJ_2025;
  }
  if (status === FilingStatus.MFS) return BRACKETS_MFS_2025;
  if (status === FilingStatus.HOH) return BRACKETS_HOH_2025;
  if (status === FilingStatus.Single) return BRACKETS_SINGLE_2025;
  throw new Error("Unsupported filing status for the 2025 Tax Table");
}

/** Tax Table below $100,000; Tax Computation Worksheet rates at or above. */
export function ordinaryTax2025(income: number, status: FilingStatus): number {
  if (!Number.isFinite(income) || income < 0) {
    throw new Error("The 2025 ordinary tax amount must be nonnegative");
  }
  const wholeDollarIncome = Math.round(income);
  return wholeDollarIncome < 100_000
    ? taxTable2025(wholeDollarIncome, status)
    : Math.round(taxFromBrackets(
      wholeDollarIncome,
      bracketsForTableStatus(status),
    ));
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
  const line1 = Math.round(taxableIncome);
  const line4 = Math.round(qualifiedDividends) + Math.round(netCapitalGain);
  const line5 = Math.max(0, line1 - line4);
  const line7 = Math.min(line1, QDCGT_ZERO_CEILING_2025[status]);
  const line8 = Math.min(line5, line7);
  const line9 = line7 - line8;
  const line10 = Math.min(line1, line4);
  const line12 = Math.max(0, line10 - line9);
  const line14 = Math.min(line1, QDCGT_TWENTY_FLOOR_2025[status]);
  const line16 = Math.max(0, line14 - (line5 + line9));
  const line17 = Math.min(line12, line16);
  const line18 = line17 * 0.15;
  const line20 = Math.max(0, line10 - (line9 + line17));
  const line21 = line20 * 0.20;
  const line22 = ordinaryTax2025(line5, status);
  const line23 = line18 + line21 + line22;
  const line24 = ordinaryTax2025(line1, status);
  return Math.round(Math.min(line23, line24));
}
