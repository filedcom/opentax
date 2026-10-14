import type { Form8912BondType } from "./calculation.ts";

export interface Form8912AllowanceBond {
  readonly bondType: Form8912BondType;
  readonly issueDate: string;
  readonly acquisitionDate: string;
  readonly maturityDate: string;
  readonly dispositionDate?: string;
  readonly dispositionKind?: "sale" | "redemption" | "other";
}

export interface Form8912AllowanceRow {
  readonly allowanceDates: readonly string[];
  readonly interestPaymentDate?: string;
}

const QUARTER_DATES = [
  "2025-03-15",
  "2025-06-15",
  "2025-09-15",
  "2025-12-15",
] as const;
const DAY_MS = 86_400_000;

function day(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function oldQzabAllowanceDate(issueDate: string): string {
  const month = Number(issueDate.slice(5, 7));
  const date = Number(issueDate.slice(8, 10));
  return new Date(Date.UTC(2025, month - 1, date) - DAY_MS)
    .toISOString().slice(0, 10);
}

function maturityQuarterPercentage(maturityDate: string): number {
  const next = QUARTER_DATES.find((date) => date > maturityDate) ??
    "2026-03-15";
  const previous = QUARTER_DATES.findLast((date) => date < maturityDate) ??
    "2024-12-15";
  const elapsed = (day(maturityDate) - day(previous)) / DAY_MS;
  const quarter = (day(next) - day(previous)) / DAY_MS;
  return Math.round((elapsed / quarter) * 25) / 100;
}

/** Derive Form 8912 Part IV column (e) from credit allowance dates held. */
export function form8912AllowancePercentage(
  bond: Form8912AllowanceBond,
  row: Form8912AllowanceRow,
): number {
  if (bond.acquisitionDate < bond.issueDate) {
    throw new Error("Form 8912 acquisition date precedes bond issuance");
  }
  if (bond.acquisitionDate > bond.maturityDate) {
    throw new Error("Form 8912 acquisition date follows bond maturity");
  }
  if (
    bond.dispositionDate &&
    (bond.dispositionDate < bond.acquisitionDate ||
      bond.dispositionDate > bond.maturityDate)
  ) {
    throw new Error("Form 8912 disposition date is outside the holding period");
  }
  if (row.allowanceDates.length === 0) {
    throw new Error("Form 8912 needs at least one credit allowance date");
  }
  const seen = new Set<string>();
  let percentage = 0;
  for (const date of row.allowanceDates) {
    if (seen.has(date)) {
      throw new Error("Form 8912 credit allowance date appears twice");
    }
    seen.add(date);
    if (
      !date.startsWith("2025-") ||
      date < bond.acquisitionDate ||
      date > bond.maturityDate ||
      (bond.dispositionDate !== undefined && date > bond.dispositionDate)
    ) {
      throw new Error(
        "Form 8912 credit allowance date is outside the 2025 holding period",
      );
    }
    if (bond.bondType === "BAB") {
      if (row.interestPaymentDate !== date || row.allowanceDates.length !== 1) {
        throw new Error(
          "Form 8912 BAB allowance date must equal its interest payment date",
        );
      }
      percentage = 1;
      continue;
    }
    if (bond.bondType === "QZAB" && bond.issueDate < "2008-10-04") {
      if (
        date !== oldQzabAllowanceDate(bond.issueDate) ||
        row.allowanceDates.length !== 1
      ) {
        throw new Error("Form 8912 old QZAB needs its annual allowance date");
      }
      percentage = 1;
      continue;
    }
    if (QUARTER_DATES.some((quarterDate) => quarterDate === date)) {
      percentage += 0.25;
    } else if (
      date === bond.maturityDate ||
      (bond.dispositionKind === "redemption" && date === bond.dispositionDate)
    ) {
      percentage += maturityQuarterPercentage(date);
    } else {
      throw new Error(
        "Form 8912 non-quarter allowance date needs bond maturity",
      );
    }
  }
  if (percentage > 1.25) {
    throw new Error("Form 8912 allowance percentage exceeds 125%");
  }
  return percentage;
}
