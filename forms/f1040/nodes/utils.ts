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
