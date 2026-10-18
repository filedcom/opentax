export function normalizeArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** An ISO date of any year; the tax year is checked in compute(). */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Throws unless every given ISO date falls in the return's tax year. */
export function assertDatesInTaxYear(
  taxYear: number,
  dates: ReadonlyArray<string | undefined>,
  message: string,
): void {
  const outside = dates.some((date) =>
    date !== undefined && !date.startsWith(`${taxYear}-`)
  );
  if (outside) {
    throw new Error(message);
  }
}

export function taxYearStart(taxYear: number): string {
  return `${taxYear}-01-01`;
}

export function taxYearEnd(taxYear: number): string {
  return `${taxYear}-12-31`;
}

/** Latest start date that leaves more than half the year's days through December 31. */
export function majorityOwnershipLatestStart(taxYear: number): string {
  const days = (Date.UTC(taxYear + 1, 0, 1) - Date.UTC(taxYear, 0, 1)) /
    86_400_000;
  const latest = Date.UTC(taxYear, 11, 31) - Math.floor(days / 2) * 86_400_000;
  return new Date(latest).toISOString().slice(0, 10);
}
