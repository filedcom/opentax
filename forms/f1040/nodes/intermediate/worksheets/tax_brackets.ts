import { FilingStatus } from "../../types.ts";
import type { Bracket } from "../../config/2025.ts";

export function bracketsForStatus(
  status: FilingStatus,
  cfg: {
    bracketsMfj: ReadonlyArray<Bracket>;
    bracketsSingle: ReadonlyArray<Bracket>;
    bracketsHoh: ReadonlyArray<Bracket>;
    bracketsMfs: ReadonlyArray<Bracket>;
  },
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
