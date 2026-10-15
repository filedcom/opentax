import { FilingStatus } from "../../../../types.ts";
import type { IncomeTaxConfig } from "../../../../config/types.ts";
import { bracketsForStatus, rateScheduleTax } from "./tax_brackets.ts";

export type QualifiedDividendTaxConfig = IncomeTaxConfig & {
  qdcgtZeroCeiling: Record<FilingStatus, number>;
  qdcgtTwentyFloor: Record<FilingStatus, number>;
};

export type IncomeWorksheetConfig = QualifiedDividendTaxConfig & {
  scheduleDLine19Limit: Record<FilingStatus, number>;
};

/** Published Tax Table intervals, with year-owned brackets. Validate against each year's table. */
export function taxTableWithConfig(
  income: number,
  status: FilingStatus,
  cfg: IncomeTaxConfig,
): number {
  if (
    !Number.isFinite(income) || income < 0 || income >= 100_000 ||
    Math.round(income) >= 100_000
  ) throw new Error("Tax Table income must round to $0 through $99,999");
  if (!Object.values(FilingStatus).includes(status)) {
    throw new Error("Unsupported Tax Table filing status");
  }
  const whole = Math.round(income);
  const midpoint = whole < 5
    ? 2.5
    : whole < 15
    ? 10
    : whole < 25
    ? 20
    : whole < 3000
    ? Math.floor(whole / 25) * 25 + 12.5
    : Math.floor(whole / 50) * 50 + 25;
  const bracket = [...bracketsForStatus(status, cfg)].reverse().find((b) =>
    midpoint > b.over
  );
  if (!bracket) return 0;
  const ratePercent = Math.round(bracket.rate * 100);
  const taxCents = Math.round(bracket.base * 100) +
    (midpoint * 2 - bracket.over * 2) * ratePercent / 2;
  return Math.floor((taxCents + 50) / 100);
}

export function ordinaryTaxWithConfig(
  income: number,
  status: FilingStatus,
  cfg: IncomeTaxConfig,
): number {
  if (!Number.isFinite(income) || income < 0) {
    throw new Error("Ordinary taxable income must be finite and nonnegative");
  }
  const whole = Math.round(income);
  return whole < 100_000
    ? taxTableWithConfig(whole, status, cfg)
    : rateScheduleTax(whole, status, cfg);
}

/** Qualified Dividends and Capital Gain Tax Worksheet, lines 1–25. */
export function qualifiedDividendTaxWithConfig(
  taxableIncome: number,
  qualifiedDividends: number,
  netCapitalGain: number,
  status: FilingStatus,
  cfg: QualifiedDividendTaxConfig,
): number {
  if (
    [taxableIncome, qualifiedDividends, netCapitalGain].some((n) =>
      !Number.isFinite(n) || n < 0
    )
  ) {
    throw new Error(
      "Qualified-dividend worksheet needs finite nonnegative amounts",
    );
  }
  const line1 = Math.round(taxableIncome);
  const line4 = Math.round(qualifiedDividends) + Math.round(netCapitalGain);
  const line5 = Math.max(0, line1 - line4);
  const line7 = Math.min(line1, cfg.qdcgtZeroCeiling[status]);
  const line8 = Math.min(line5, line7);
  const line9 = line7 - line8;
  const line10 = Math.min(line1, line4);
  const line12 = Math.max(0, line10 - line9);
  const line14 = Math.min(line1, cfg.qdcgtTwentyFloor[status]);
  const line16 = Math.max(0, line14 - (line5 + line9));
  const line17 = Math.min(line12, line16);
  const line18 = line17 * 0.15;
  const line20 = Math.max(0, line10 - (line9 + line17));
  const line21 = line20 * 0.20;
  const line22 = ordinaryTaxWithConfig(line5, status, cfg);
  const line23 = line18 + line21 + line22;
  const line24 = ordinaryTaxWithConfig(line1, status, cfg);
  return Math.round(Math.min(line23, line24));
}
