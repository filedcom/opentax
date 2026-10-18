/**
 * Moves a TY2025 sample return's dated facts to a later tax year, so a TY2026
 * run tests a TY2026 version of the same return rather than 2025 documents
 * filed late. Only dates and year fields move; amounts, identifiers and text
 * never do.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
/** A field whose value is a year: `tax_year`, `calendar_year`, `disallowed_year`. */
const YEAR_FIELD = /(^|_)year$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** February 29 moved to a common year becomes February 28, staying in its month. */
function shiftedDay(year: number, month: string, day: string): string {
  return month === "02" && day === "29" && !isLeapYear(year) ? "28" : day;
}

function shiftIsoDate(value: string, years: number): string | undefined {
  const match = ISO_DATE.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const year = Number(y) + years;
  return `${String(year).padStart(4, "0")}-${m}-${shiftedDay(year, m, d)}`;
}

function shiftUsDate(value: string, years: number): string | undefined {
  const match = US_DATE.exec(value);
  if (!match) return undefined;
  const [, m, d, y] = match;
  const year = Number(y) + years;
  return `${m}/${shiftedDay(year, m, d)}/${String(year).padStart(4, "0")}`;
}

function isYear(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR;
}

function shiftYearField(value: unknown, years: number): unknown {
  if (typeof value === "number" && isYear(value)) return value + years;
  if (typeof value === "string" && /^\d{4}$/.test(value) && isYear(Number(value))) {
    return String(Number(value) + years);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Document bytes and other non-plain values are carried over untouched. */
function shiftValue(value: unknown, key: string, years: number): unknown {
  if (Array.isArray(value)) return value.map((item) => shiftValue(item, key, years));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shiftValue(v, k, years)]),
    );
  }
  if (YEAR_FIELD.test(key)) return shiftYearField(value, years);
  if (typeof value === "string") {
    return shiftIsoDate(value, years) ?? shiftUsDate(value, years) ?? value;
  }
  return value;
}

/** Every date and year field in a sample's inputs, moved `years` later. */
export function shiftDatedFacts<T>(inputs: T, years: number): T {
  return years === 0 ? inputs : shiftValue(inputs, "", years) as T;
}
