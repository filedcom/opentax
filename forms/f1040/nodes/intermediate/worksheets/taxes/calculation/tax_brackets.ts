import { FilingStatus } from "../../../../types.ts";
import type { Bracket, IncomeTaxConfig } from "../../../../config/types.ts";

export function bracketsForStatus(
  status: FilingStatus,
  cfg: IncomeTaxConfig,
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return cfg.bracketsMfj;
  }
  if (status === FilingStatus.HOH) return cfg.bracketsHoh;
  if (status === FilingStatus.MFS) return cfg.bracketsMfs;
  return cfg.bracketsSingle;
}

export function taxFromBrackets(
  income: number,
  brackets: ReadonlyArray<Bracket>,
): number {
  if (income <= 0) return 0;
  const bracket = [...brackets].reverse().find((b) => income > b.over);
  if (!bracket) return 0;
  return bracket.base + (income - bracket.over) * bracket.rate;
}

/** Ordinary rate-schedule amount; does not substitute for a published Tax Table. */
export function rateScheduleTax(
  income: number,
  status: FilingStatus,
  cfg: IncomeTaxConfig,
): number {
  if (!Number.isFinite(income) || income < 0) {
    throw new Error("Ordinary taxable income must be finite and nonnegative");
  }
  if (!Object.values(FilingStatus).includes(status)) {
    throw new Error("Unsupported filing status for ordinary income tax");
  }
  return Math.round(
    taxFromBrackets(Math.round(income), bracketsForStatus(status, cfg)),
  );
}
