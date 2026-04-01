/**
 * MeF Business Rules — Predicate DSL
 *
 * Composable pure functions that build RuleCheck predicates.
 * Each returns (ctx: ReturnContext) => boolean where true = rule passes.
 */

import type { RuleCheck } from "./types.ts";

// ─── Field Value Checks ─────────────────────────────────

/** Field has any value (not undefined/null/empty). */
export const hasValue = (xml: string): RuleCheck =>
  (ctx) => ctx.hasValue(xml);

/** Field has a non-zero numeric value. */
export const hasNonZero = (xml: string): RuleCheck =>
  (ctx) => ctx.hasNonZero(xml);

/** Field value > n. */
export const gt = (xml: string, n: number): RuleCheck =>
  (ctx) => ctx.num(xml) > n;

/** Field value >= n. */
export const gte = (xml: string, n: number): RuleCheck =>
  (ctx) => ctx.num(xml) >= n;

/** Field value < n. */
export const lt = (xml: string, n: number): RuleCheck =>
  (ctx) => ctx.num(xml) < n;

/** Field value === n. */
export const eqNum = (xml: string, n: number): RuleCheck =>
  (ctx) => ctx.num(xml) === n;

/** Field value equals zero (or is absent). */
export const isZero = (xml: string): RuleCheck =>
  (ctx) => ctx.num(xml) === 0;

/** Two fields have equal numeric values. */
export const eqField = (a: string, b: string): RuleCheck =>
  (ctx) => ctx.num(a) === ctx.num(b);

/** Field a must not be greater than field b. */
export const notGtField = (a: string, b: string): RuleCheck =>
  (ctx) => ctx.num(a) <= ctx.num(b);

/** Field a must not be greater than constant n. */
export const notGtNum = (a: string, n: number): RuleCheck =>
  (ctx) => ctx.num(a) <= n;

/** Target field equals sum of addend fields. */
export const eqSum = (target: string, ...addends: string[]): RuleCheck =>
  (ctx) => {
    const expected = addends.reduce((s, f) => s + ctx.num(f), 0);
    return Math.abs(ctx.num(target) - expected) < 0.01; // penny tolerance
  };

/** Field string value equals expected string. */
export const eqStr = (xml: string, expected: string): RuleCheck =>
  (ctx) => String(ctx.field(xml) ?? "") === expected;

/** Field value does not have a value (must be absent). */
export const noValue = (xml: string): RuleCheck =>
  (ctx) => !ctx.hasValue(xml);

// ─── Header SSN Matching ────────────────────────────────

/** Field must equal PrimarySSN or SpouseSSN in the Return Header. */
export const matchesHeaderSSN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (!v) return true; // absent — nothing to validate
    const primary = ctx.primarySSN().replace(/\D/g, "");
    const spouse = (ctx.spouseSSN() ?? "").replace(/\D/g, "");
    return v === primary || (spouse !== "" && v === spouse);
  };

/** Field must NOT equal PrimarySSN or SpouseSSN (for EIN/TIN fields). */
export const notMatchesHeaderSSN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (!v) return true; // absent — nothing to validate
    const primary = ctx.primarySSN().replace(/\D/g, "");
    const spouse = (ctx.spouseSSN() ?? "").replace(/\D/g, "");
    return v !== primary && (spouse === "" || v !== spouse);
  };

/** Field is an ITIN (Individual Taxpayer Identification Number: 9XX-{70-88,90-92,94-99}-XXXX). */
export const isITIN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (v.length !== 9 || !v.startsWith("9")) return false;
    const d45 = Number(v.substring(3, 5));
    return (d45 >= 70 && d45 <= 88) || (d45 >= 90 && d45 <= 92) || (d45 >= 94 && d45 <= 99);
  };

// ─── SSN / TIN Validation ───────────────────────────────

/** SSN/ITIN is in valid range (9 digits, not all zeros/nines). */
export const validSSN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (v.length !== 9) return false;
    if (v === "000000000" || v === "999999999") return false;
    if (v.startsWith("9") && !v.startsWith("9")) return true; // ITIN starts with 9
    return true;
  };

/** Two fields must not have the same SSN value. */
export const ssnNotEqual = (a: string, b: string): RuleCheck =>
  (ctx) => {
    const va = String(ctx.field(a) ?? "").replace(/\D/g, "");
    const vb = String(ctx.field(b) ?? "").replace(/\D/g, "");
    if (!va || !vb) return true; // if either is absent, no conflict
    return va !== vb;
  };

// ─── Form / Document Presence ───────────────────────────

/** Form must be present in the return. */
export const formPresent = (id: string): RuleCheck =>
  (ctx) => ctx.hasForm(id);

/** Form must NOT be present. */
export const formAbsent = (id: string): RuleCheck =>
  (ctx) => !ctx.hasForm(id);

/** No more than n instances of a form. */
export const formCountAtMost = (id: string, n: number): RuleCheck =>
  (ctx) => ctx.formCount(id) <= n;

// ─── Filing Status ──────────────────────────────────────

/** Filing status is one of the given codes. */
export const filingStatusIs = (...codes: number[]): RuleCheck =>
  (ctx) => codes.includes(ctx.filingStatus());

/** Filing status is NOT one of the given codes. */
export const filingStatusNot = (...codes: number[]): RuleCheck =>
  (ctx) => !codes.includes(ctx.filingStatus());

// ─── String Content Checks ──────────────────────────────

/** Field string value contains the given substring. */
export const contains = (xml: string, substr: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "");
    if (!v) return true; // absent — nothing to validate
    return v.includes(substr);
  };

/** Count of a character in the field does not exceed max. */
export const charCountAtMost = (xml: string, char: string, max: number): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "");
    let count = 0;
    for (const c of v) { if (c === char) count++; }
    return count <= max;
  };

/** Character following the first occurrence of searchChar must be alphabetic. */
export const charAfterIsAlpha = (xml: string, searchChar: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "");
    const idx = v.indexOf(searchChar);
    if (idx === -1 || idx >= v.length - 1) return true; // no match or at end
    return /[a-zA-Z]/.test(v[idx + 1]);
  };

// ─── Banking Validation ────────────────────────────────

/** Routing Transit Number conforms to banking industry checksum algorithm. */
export const validRTN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (!v) return true; // absent — nothing to validate
    if (v.length !== 9) return false;
    const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    const sum = v.split("").reduce((s, d, i) => s + Number(d) * w[i], 0);
    return sum > 0 && sum % 10 === 0;
  };

// ─── Arithmetic ─────────────────────────────────────────

/** Target = a - b (penny tolerance). If absent, passes. */
export const eqDiff = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - (ctx.num(a) - ctx.num(b))) < 0.01;

/** Target = max(0, a - b) — subtraction floored at zero (penny tolerance). */
export const eqDiffFloorZero = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - Math.max(0, ctx.num(a) - ctx.num(b))) < 0.01;

/** Target = a * rate (penny tolerance). */
export const eqProduct = (target: string, a: string, rate: number): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - ctx.num(a) * rate) < 0.01;

/** Target = min(a, b) (penny tolerance). */
export const eqMin = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - Math.min(ctx.num(a), ctx.num(b))) < 0.01;

/** Target = max(a, b) (penny tolerance). */
export const eqMax = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - Math.max(ctx.num(a), ctx.num(b))) < 0.01;

/** Field a >= sum of fields (i.e. not less than the sum). Penny tolerance. */
export const notLtSum = (a: string, ...addends: string[]): RuleCheck =>
  (ctx) => {
    const sum = addends.reduce((s, f) => s + ctx.num(f), 0);
    return ctx.num(a) >= sum - 0.01;
  };

/** Field a is strictly less than field b. */
export const ltField = (a: string, b: string): RuleCheck =>
  (ctx) => ctx.num(a) < ctx.num(b);

/** Sum of two fields is greater than n. */
export const sumGtNum = (a: string, b: string, n: number): RuleCheck =>
  (ctx) => ctx.num(a) + ctx.num(b) > n;

/** Target = min(field, n) (penny tolerance). */
export const eqMinNum = (target: string, field: string, n: number): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - Math.min(ctx.num(field), n)) < 0.01;

/** String field has exactly the given length. */
export const strLenEq = (xml: string, len: number): RuleCheck =>
  (ctx) => {
    const v = ctx.field(xml);
    return typeof v === "string" && v.length === len;
  };

// ─── Date / Year Checks ────────────────────────────────

/** Parse a date string (YYYY-MM-DD or MM/DD/YYYY) to ms since epoch, or null if unparseable. */
function parseDateMs(v: string): number | null {
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
  return null;
}

/** Extract 4-digit year from a date string (YYYY-MM-DD, MM/DD/YYYY, or just YYYY). */
function extractYear(v: string): number {
  const m = v.match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
}

/** Year of a date field must not be less than a numeric field (e.g. TaxYr). */
export const dateYearGte = (dateXml: string, yearXml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true; // absent — nothing to validate
    return extractYear(d) >= ctx.num(yearXml);
  };

/** Year of a date field must equal a numeric field (e.g. TaxYr). */
export const dateYearEq = (dateXml: string, yearXml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true;
    return extractYear(d) === ctx.num(yearXml);
  };

/** Year of a date field must equal a numeric field or that field + 1. */
export const dateYearEqOrNext = (dateXml: string, yearXml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true;
    const yr = extractYear(d);
    const taxYr = ctx.num(yearXml);
    return yr === taxYr || yr === taxYr + 1;
  };

/** Date field must be >= reference date field (both YYYY-MM-DD or MM/DD/YYYY). */
export const dateGteField = (dateXml: string, refXml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    const r = String(ctx.field(refXml) ?? "");
    if (!d || !r) return true;
    const dm = parseDateMs(d);
    const rm = parseDateMs(r);
    if (dm === null || rm === null) return true;
    return dm >= rm;
  };

/** Date field must be <= reference date field (both YYYY-MM-DD or MM/DD/YYYY). */
export const dateLteField = (dateXml: string, refXml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    const r = String(ctx.field(refXml) ?? "");
    if (!d || !r) return true;
    const dm = parseDateMs(d);
    const rm = parseDateMs(r);
    if (dm === null || rm === null) return true;
    return dm <= rm;
  };

/** Date field must have the given month and day (1-indexed). */
export const dateMonthDayEq = (dateXml: string, month: number, day: number): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true;
    const ms = parseDateMs(d);
    if (ms === null) return true;
    const dt = new Date(ms);
    return dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day;
  };

// ─── Combinators ────────────────────────────────────────

/** All checks must pass. */
export const all = (...checks: RuleCheck[]): RuleCheck =>
  (ctx) => checks.every((c) => c(ctx));

/** At least one check must pass. */
export const any = (...checks: RuleCheck[]): RuleCheck =>
  (ctx) => checks.some((c) => c(ctx));

/** Negate a check. */
export const not = (check: RuleCheck): RuleCheck =>
  (ctx) => !check(ctx);

/** If condition is true, then requirement must be true. Always passes if condition is false. */
export const ifThen = (condition: RuleCheck, requirement: RuleCheck): RuleCheck =>
  (ctx) => !condition(ctx) || requirement(ctx);

/** If condition is true, then requirement must be true — unless exception applies. */
export const ifThenUnless = (
  condition: RuleCheck,
  requirement: RuleCheck,
  exception: RuleCheck,
): RuleCheck =>
  (ctx) => !condition(ctx) || requirement(ctx) || exception(ctx);

/** Always passes — used for rules that can't be checked client-side. */
export const alwaysPass: RuleCheck = () => true;

/** Always fails — used for unconditional reject rules. */
export const alwaysFail: RuleCheck = () => false;

/** Target = field_a × field_b (penny tolerance). */
export const eqFieldProduct = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - ctx.num(a) * ctx.num(b)) < 0.01;

/** Field string has exactly n decimal places. */
export const decimalPlacesEq = (xml: string, n: number): RuleCheck =>
  (ctx) => {
    const v = ctx.field(xml);
    if (typeof v !== "string" && typeof v !== "number") return true;
    const s = String(v);
    const dot = s.indexOf(".");
    const actual = dot === -1 ? 0 : s.length - dot - 1;
    return actual === n;
  };

/** Date field must be >= a specific constant date (year, 1-indexed month, day). */
export const dateGteConst = (dateXml: string, year: number, month: number, day: number): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true;
    const dm = parseDateMs(d);
    if (dm === null) return true;
    const refMs = Date.UTC(year, month - 1, day);
    return dm >= refMs;
  };

// ─── Rule Builder Helper ────────────────────────────────

/** Convenience: build a RuleDef with less boilerplate. */
export { rule } from "./rule-builder.ts";
