/**
 * MeF Business Rules — Predicate DSL
 *
 * Composable pure functions that build RuleCheck predicates.
 * Each returns (ctx: ReturnContext) => boolean where true = rule passes.
 */

import type { ReturnContext, RuleCheck } from "./types.ts";
import { zipMatchesState } from "./zip-codes.ts";
import { rulePrefixForDocumentTag } from "./emitted-documents.ts";

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
const YES = new Set(["yes", "true", "1", "x"]);
const NO = new Set(["no", "false", "0"]);

/** String equality; "Yes"/"No" also match the XML booleans true/false. */
export const eqStr = (xml: string, expected: string): RuleCheck =>
  (ctx) => {
    const actual = String(ctx.field(xml) ?? "");
    if (actual === expected) return true;
    const want = expected.toLowerCase(), got = actual.toLowerCase();
    if (want === "yes") return YES.has(got);
    if (want === "no") return NO.has(got);
    return false;
  };

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

// ─── EIN Validation ─────────────────────────────────────

// IRS Publication 1586 Table 1 — valid EIN assignment group prefixes
const VALID_EIN_PREFIXES = new Set([
  "01","02","03","04","05","06","10","11","12","13","14","15","16",
  "20","21","22","23","24","25","26","27","30","31","32","33","34",
  "35","36","37","38","39","40","41","42","43","44","45","46","47",
  "48","50","51","52","53","54","55","56","57","58","59","60","61",
  "62","63","64","65","66","67","68","71","72","73","74","75","76",
  "77","80","81","82","83","84","85","86","87","88","90","91","92",
  "93","94","95","98","99",
]);

/** An Assurance Testing System return (Pub 1436), not a production filing. */
export const isAtsTest: RuleCheck = (ctx) =>
  ctx.field("ats_test_submission") === true;

/** EIN is 9 numeric digits with a valid IRS-assigned prefix (Pub 1586). */
export const validEIN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (!v) return true; // absent — nothing to validate
    if (v.length !== 9) return false;
    // ATS scenario packets issue their test EINs in the 00 prefix.
    if (isAtsTest(ctx) && v.startsWith("00")) return true;
    return VALID_EIN_PREFIXES.has(v.substring(0, 2));
  };

/** The 4th and 5th SSN digits equal `digits`; Pub 1436 ATS test SSNs use "00". */
export const ssnMiddleDigitsEq = (xml: string, digits: string): RuleCheck =>
  (ctx) =>
    String(ctx.field(xml) ?? "").replace(/\D/g, "").substring(3, 5) ===
      digits;

// ─── SSN / TIN Validation ───────────────────────────────

/** SSN/ITIN is in valid range (9 digits, not all zeros/nines). */
export const validSSN = (xml: string): RuleCheck =>
  (ctx) => {
    const v = String(ctx.field(xml) ?? "").replace(/\D/g, "");
    if (v.length !== 9) return false;
    if (v === "000000000" || v === "999999999") return false;
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

/** Target = min(a * rate, cap), within whole-dollar rounding: a form line that says "do not enter more than". */
export const eqCappedProduct = (
  target: string,
  a: string,
  rate: number,
  cap: number,
): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - Math.min(ctx.num(a) * rate, cap)) <= 0.5;

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

/** Field value is between lo and hi (inclusive). Absent field = 0. */
export const betweenNum = (xml: string, lo: number, hi: number): RuleCheck =>
  (ctx) => {
    const v = ctx.num(xml);
    return v >= lo && v <= hi;
  };

/** Difference of two fields must not exceed n. ctx.num(a) - ctx.num(b) <= n (penny tolerance). */
export const diffLteNum = (a: string, b: string, n: number): RuleCheck =>
  (ctx) => ctx.num(a) - ctx.num(b) <= n + 0.01;

/** Field a must not be greater than pct * field b. notGtPctOfField("Payment","Owed",2.0) = Payment <= 2.0 * Owed. */
export const notGtPctOfField = (a: string, b: string, pct: number): RuleCheck =>
  (ctx) => ctx.num(a) <= ctx.num(b) * pct + 0.01;

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

/** Year of a date field equals a constant year (e.g. 2017). */
export const dateYearEqConst = (dateXml: string, year: number): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(dateXml) ?? "");
    if (!d) return true;
    return extractYear(d) === year;
  };

/** Target = numerator / denominator (small tolerance). Passes when denominator is zero. */
export const eqDiv = (target: string, numerator: string, denominator: string): RuleCheck =>
  (ctx) => {
    const d = ctx.num(denominator);
    if (d === 0) return true;
    return Math.abs(ctx.num(target) - ctx.num(numerator) / d) < 0.001;
  };

/** Target = a × rate within whole-dollar rounding. */
export const eqRoundedProduct = (target: string, a: string, rate: number): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - ctx.num(a) * rate) < 1;

/** The number of values a field has equals n (absent counts as zero). */
export const countEq = (xml: string, n: number): RuleCheck =>
  (ctx) => ctx.fieldArray(xml).length === n;

/** Target equals the number of values a field has. */
export const eqCount = (target: string, counted: string): RuleCheck =>
  (ctx) => ctx.num(target) === ctx.fieldArray(counted).length;

/** Target equals how many of the named checkboxes are checked. */
export const eqCheckedCount = (target: string, ...boxes: string[]): RuleCheck =>
  (ctx) => ctx.num(target) === boxes.filter((box) => ctx.hasValue(box)).length;

/** Target = field a × field b within whole-dollar rounding. */
export const eqRoundedFieldProduct = (target: string, a: string, b: string): RuleCheck =>
  (ctx) => Math.abs(ctx.num(target) - ctx.num(a) * ctx.num(b)) < 1;

/** Form 8962 line 5: income ÷ poverty line × 100 with the fraction dropped; above 400 enter 401. */
export const eqPovertyPct = (target: string, income: string, poverty: string): RuleCheck =>
  (ctx) => {
    const line4 = ctx.num(poverty);
    if (line4 === 0) return true;
    const pct = Math.floor(ctx.num(income) / line4 * 100);
    return ctx.num(target) === (pct > 400 ? 401 : pct);
  };

/** The number of values a field has equals the sum of other fields. */
export const eqCountSum = (counted: string, ...addends: string[]): RuleCheck =>
  (ctx) => ctx.fieldArray(counted).length === addends.reduce((s, f) => s + ctx.num(f), 0);

/** Target equals the sum of every value of each addend (repeated groups included). */
export const eqSumOfAll = (target: string, ...addends: string[]): RuleCheck =>
  (ctx) => {
    const sum = addends.flatMap((f) => ctx.fieldArray(f))
      .reduce<number>((s, v) => s + (Number(v) || 0), 0);
    return Math.abs(ctx.num(target) - sum) < 0.01;
  };

/** Target must not exceed the sum of (count of each field's values × its weight). */
export const notGtWeightedCount = (
  target: string,
  ...weights: readonly (readonly [string, number])[]
): RuleCheck =>
  (ctx) =>
    ctx.num(target) <=
      weights.reduce((s, [field, w]) => s + ctx.fieldArray(field).length * w, 0);

// ─── Cross-Instance Combinators ─────────────────────────

/**
 * Every element of an array-valued field must satisfy the item predicate.
 * Passes vacuously on absent or empty fields.
 */
export const forEach = (xml: string, itemPred: (v: unknown) => boolean): RuleCheck =>
  (ctx) => ctx.fieldArray(xml).every(itemPred);

/**
 * Every element of an array-valued field must satisfy the item predicate.
 * Alias for forEach — use when emphasizing "for every instance of this field".
 */
export const everyItem = (xml: string, itemPred: (v: unknown) => boolean): RuleCheck =>
  (ctx) => ctx.fieldArray(xml).every(itemPred);

/**
 * Target field must equal the sum of all elements in the source array field.
 * Treats absent/non-numeric elements as 0. Penny tolerance (< 0.01).
 */
export const sumOfAll = (target: string, source: string): RuleCheck =>
  (ctx) => {
    const items = ctx.fieldArray(source);
    const sum = items.reduce<number>(
      (s, v) => s + (typeof v === "number" ? v : Number(v) || 0),
      0,
    );
    return Math.abs(ctx.num(target) - sum) < 0.01;
  };

/**
 * All elements of an array-valued field must be unique (after stripping non-digit chars).
 * Passes vacuously on empty or single-element arrays.
 */
export const allDistinct = (xml: string): RuleCheck =>
  (ctx) => {
    const items = ctx
      .fieldArray(xml)
      .map((v) => String(v ?? "").replace(/\D/g, ""))
      .filter(Boolean);
    return new Set(items).size === items.length;
  };

// ─── Groups, Amounts and Attachments ───────────────────

/** An amount computed from the return. */
export type Amount = (ctx: ReturnContext) => number;

/**
 * Every emitted instance of `group` satisfies `check`, which reads the group's
 * elements and `locals` from that instance. Passes when the group is absent.
 */
export const eachGroup = (
  group: string,
  check: RuleCheck,
  ...locals: string[]
): RuleCheck =>
  (ctx) => (ctx.groupInstances?.(group, locals) ?? []).every(check);

/**
 * Evaluate `check` against the rule's own document, so an element it lacks is
 * never taken from an unrelated document that happens to share the name.
 */
export const inOwnDocument = (check: RuleCheck): RuleCheck =>
  (ctx) => check(ctx.ownDocumentOnly?.() ?? ctx);

/** How many emitted instances of `group` satisfy `check`. */
export const groupCount = (
  group: string,
  check: RuleCheck = () => true,
  ...locals: string[]
): Amount =>
  (ctx) => (ctx.groupInstances?.(group, locals) ?? []).filter(check).length;

/** One field's value. */
export const amount = (xml: string): Amount => (ctx) => ctx.num(xml);

/** Constant amount. */
export const constant = (n: number): Amount => () => n;

/** Sum of every value of each field, repeated documents and groups included. */
export const total = (...xml: string[]): Amount =>
  (ctx) =>
    xml.flatMap((f) => ctx.fieldArray(f))
      .reduce<number>((s, v) => s + (Number(v) || 0), 0);

/** Sum of `value` over the instances of `group` that satisfy `when`. */
export const groupTotal = (
  group: string,
  value: Amount,
  when: RuleCheck = () => true,
  ...locals: string[]
): Amount =>
  (ctx) =>
    (ctx.groupInstances?.(group, locals) ?? []).filter(when)
      .reduce((s, g) => s + value(g), 0);

/** Sum of amounts. */
export const plus = (...amounts: Amount[]): Amount =>
  (ctx) => amounts.reduce((s, a) => s + a(ctx), 0);

/** a − b. */
export const minus = (a: Amount, b: Amount): Amount => (ctx) => a(ctx) - b(ctx);

/** |a − b| ≤ tolerance. */
export const amountEq = (a: Amount, b: Amount, tolerance = 0.01): RuleCheck =>
  (ctx) => Math.abs(a(ctx) - b(ctx)) <= tolerance;

/** a ≤ b + tolerance. */
export const amountLte = (a: Amount, b: Amount, tolerance = 0): RuleCheck =>
  (ctx) => a(ctx) <= b(ctx) + tolerance;

/** a < b. */
export const amountLt = (a: Amount, b: Amount): RuleCheck =>
  (ctx) => a(ctx) < b(ctx);

/** Field value is one of the given strings. */
export const strIn = (xml: string, ...values: string[]): RuleCheck =>
  (ctx) => values.includes(String(ctx.field(xml) ?? ""));

/** Every value of the field matches the pattern. */
export const allMatch = (xml: string, pattern: RegExp): RuleCheck =>
  (ctx) => ctx.fieldArray(xml).every((v) => pattern.test(String(v)));

/** Field has a value whose length is at least n. */
export const strLenAtLeast = (xml: string, n: number): RuleCheck =>
  (ctx) => String(ctx.field(xml) ?? "").length >= n;

const descriptions = (ctx: ReturnContext, document: string): string[] =>
  ctx.fieldArray(`${document}/Desc`).map((v) => String(v).trim().toUpperCase());

/** A binary attachment's Description begins with one of `prefixes` (case-insensitive). */
export const attachmentDescStartsWith = (...prefixes: string[]): RuleCheck =>
  (ctx) =>
    descriptions(ctx, "BinaryAttachment").some((d) =>
      prefixes.some((p) => d.startsWith(p.toUpperCase()))
    );

/** A binary attachment's Description is one of `descs` (case-insensitive). */
export const attachmentDescIs = (...descs: string[]): RuleCheck =>
  (ctx) =>
    descriptions(ctx, "BinaryAttachment").some((d) =>
      descs.some((desc) => d === desc.toUpperCase())
    );

/** A [GeneralDependencySmall] statement's Description begins with `prefix`. */
export const generalDependencyDescStartsWith = (prefix: string): RuleCheck =>
  (ctx) =>
    descriptions(ctx, "GeneralDependencySmall").some((d) =>
      d.startsWith(prefix.toUpperCase())
    );

/** Number of binary attachments whose Description is `desc` (case-insensitive). */
export const attachmentCount = (desc: string): Amount =>
  (ctx) =>
    descriptions(ctx, "BinaryAttachment")
      .filter((d) => d === desc.toUpperCase()).length;

/** Number of emitted copies of a form. */
export const formCountOf = (formId: string): Amount =>
  (ctx) => ctx.formCount(formId);

/** The smallest of the amounts. */
export const lesser = (...amounts: Amount[]): Amount =>
  (ctx) => Math.min(...amounts.map((a) => a(ctx)));

/** Sum of `value` over each emitted document with the rule prefix. */
export const documentTotal = (prefix: string, value: Amount): Amount =>
  (ctx) =>
    (ctx.emittedDocuments?.(prefix) ?? []).reduce((s, d) => s + value(d), 0);

/** Number of binary attachments whose Description begins with one of `prefixes`. */
export const attachmentCountStartingWith = (...prefixes: string[]): Amount =>
  (ctx) =>
    descriptions(ctx, "BinaryAttachment").filter((d) =>
      prefixes.some((p) => d.startsWith(p.toUpperCase()))
    ).length;

const digits = (v: unknown): string => String(v ?? "").replace(/\D/g, "");

/** No value of the fields is the PrimarySSN or SpouseSSN in the Return Header. */
export const noneMatchHeaderSSN = (...xml: string[]): RuleCheck =>
  (ctx) => {
    const filers = [ctx.primarySSN(), ctx.spouseSSN()].map(digits)
      .filter(Boolean);
    return xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => !filers.includes(digits(v)));
  };

/** Some value of the fields is the given filer's SSN from the Return Header. */
export const someMatchesFilerSSN = (
  filer: "primary" | "spouse",
  ...xml: string[]
): RuleCheck =>
  (ctx) => {
    const ssn = digits(filer === "primary" ? ctx.primarySSN() : ctx.spouseSSN());
    return ssn !== "" &&
      xml.flatMap((f) => ctx.fieldArray(f)).some((v) => digits(v) === ssn);
  };

/** Every value of `xml` is a value of one of the `allowed` fields, or a filer SSN when `filers`. */
export const everyTinAmong = (
  xml: readonly string[],
  allowed: readonly string[],
  filers = false,
): RuleCheck =>
  (ctx) => {
    const known = new Set([
      ...allowed.flatMap((f) => ctx.fieldArray(f)).map(digits),
      ...(filers ? [ctx.primarySSN(), ctx.spouseSSN()].map(digits) : []),
    ]);
    return xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => known.has(digits(v)));
  };

/** No value of `xml` is a value of one of the `forbidden` fields. */
export const noTinAmong = (
  xml: readonly string[],
  forbidden: readonly string[],
): RuleCheck =>
  (ctx) => {
    const taken = new Set(forbidden.flatMap((f) => ctx.fieldArray(f)).map(digits));
    return xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => !taken.has(digits(v)));
  };

/** A document with this rule prefix (or supporting-statement tag) is emitted. */
export const documentPresent = (prefix: string): RuleCheck =>
  (ctx) => (ctx.emittedDocuments?.(prefix) ?? []).length > 0;

/** Some value occurs at least twice across the fields (TINs compared by digits). */
export const someRepeated = (...xml: string[]): RuleCheck =>
  (ctx) => {
    const values = xml.flatMap((f) => ctx.fieldArray(f)).map(digits)
      .filter(Boolean);
    return new Set(values).size < values.length;
  };

/** Four-digit year of a date or year field, or NaN when absent. */
export const yearOf = (xml: string): Amount =>
  (ctx) => {
    const m = String(ctx.field(xml) ?? "").match(/^(\d{4})/);
    return m ? Number(m[1]) : NaN;
  };

/**
 * Age at the end of 'TaxYr'. Someone born on January 1 reaches an age on
 * December 31 of the year before (Pub 596; Pub 501). NaN when absent.
 */
export const ageAtYearEnd = (birthDateXml: string): Amount =>
  (ctx) => {
    const d = String(ctx.field(birthDateXml) ?? "");
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return NaN;
    const age = ctx.num("TaxYr") - Number(m[1]);
    return m[2] === "01" && m[3] === "01" ? age + 1 : age;
  };

/** The amount is known (not NaN). */
export const known = (a: Amount): RuleCheck => (ctx) => !Number.isNaN(a(ctx));

/** For a US address, the ZIP code is valid for its state (IRS ZIP list, Pub 4164 §13.8). */
export const zipValidForState = (zipXml: string, stateXml: string): RuleCheck =>
  (ctx) => {
    const zip = String(ctx.field(zipXml) ?? "");
    const state = String(ctx.field(stateXml) ?? "");
    if (!zip || !state) return true;
    return zipMatchesState(zip, state);
  };

/** The emitted ReturnData holds as many documents as its 'documentCnt' declares. */
export const documentCntMatches: RuleCheck = (ctx) => {
  const count = ctx.emittedDocumentCount?.();
  return count?.declared === undefined || count.declared === count.actual;
};

/** An IRS-issued ITIN or ATIN: the SSA never issues an SSN beginning with 9. */
export const isItinOrAtin = (v: unknown): boolean => {
  const d = digits(v);
  return d.length === 9 && d.startsWith("9");
};

// ─── Forms and schedules: offline checks of e-File database rules ───

const PERSON_NAME_CONTROL = /^[A-Z][A-Z\- ]{0,3}$/;

/**
 * The name control has the IRS person format and, when the return names the
 * same TIN as a filer or a Form 1040 dependent, equals the name control given
 * there: the e-File database holds one name control per TIN.
 */
export const personNameControlAgrees = (
  nameControlXml: string,
  tinXml: string,
): RuleCheck =>
  (ctx) => {
    const nc = String(ctx.field(nameControlXml) ?? "");
    if (!nc) return true;
    if (!PERSON_NAME_CONTROL.test(nc)) return false;
    const tin = digits(ctx.field(tinXml));
    if (!tin) return true;
    const header = (leaf: string) => ctx.field(`ReturnHeader/${leaf}`);
    const known: (readonly [string, unknown])[] = [
      [digits(header("PrimarySSN")), header("PrimaryNameControlTxt")],
      [digits(header("SpouseSSN")), header("SpouseNameControlTxt")],
      ...(ctx.groupInstances?.("1040/DependentDetail") ?? []).map((d) =>
        [digits(d.field("DependentSSN")), d.field("DependentNameControlTxt")] as const
      ),
    ];
    return known.every(([ssn, other]) =>
      ssn !== tin || !other || String(other).trim() === nc.trim()
    );
  };

/** Every emitted document with the prefix satisfies `check`, read from that document only. */
export const everyDocument = (prefix: string, check: RuleCheck): RuleCheck =>
  (ctx) =>
    (ctx.emittedDocuments?.(prefix) ?? [])
      .every((d) => check(d.ownDocumentOnly?.() ?? d));

/** How many emitted documents with the prefix satisfy `check`, read from that document only. */
export const documentCountWhere = (
  prefix: string,
  check: RuleCheck = () => true,
): Amount =>
  (ctx) =>
    (ctx.emittedDocuments?.(prefix) ?? [])
      .filter((d) => check(d.ownDocumentOnly?.() ?? d)).length;

/**
 * A schedule of another form is referenced from one and only one copy of
 * that form: each copy references at most one such schedule.
 */
export const scheduleReferencedOnce = (
  schedulePrefix: string,
  formPrefix: string,
): RuleCheck =>
  (ctx) => {
    const schedules = documentCountWhere(schedulePrefix)(ctx);
    return schedules === 0 ||
      schedules <= documentCountWhere(formPrefix)(ctx);
  };

/** The element references a document and one of the named statements is emitted. */
export const statementAttached = (
  element: string,
  ...statements: string[]
): RuleCheck =>
  all(
    hasValue(`${element}@referenceDocumentId`),
    any(...statements.map(documentPresent)),
  );

const VIN_VALUE: Readonly<Record<string, number>> = Object.fromEntries([
  ..."0123456789".split("").map((c, i) => [c, i]),
  ..."ABCDEFGH".split("").map((c, i) => [c, i + 1]),
  ..."JKLMN".split("").map((c, i) => [c, i + 1]),
  ["P", 7],
  ["R", 9],
  ..."STUVWXYZ".split("").map((c, i) => [c, i + 2]),
]);
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const VIN_YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

/**
 * A 17-character VIN for a vehicle made for sale in the US (49 CFR 565): no
 * I, O or Q, a valid position-9 check digit, and, when the model year field
 * has a value, the position-10 code for that model year. Pub 1436 ATS
 * packets use VINs that only need the 17-character format.
 */
export const validVin = (vinXml: string, modelYearXml?: string): RuleCheck =>
  (ctx) => {
    const vin = String(ctx.field(vinXml) ?? "");
    if (!vin) return true;
    if (isAtsTest(ctx)) return /^[A-Z0-9]{17}$/.test(vin);
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
    const sum = vin.split("").reduce(
      (s, c, i) => s + VIN_VALUE[c] * VIN_WEIGHTS[i],
      0,
    );
    const check = sum % 11 === 10 ? "X" : String(sum % 11);
    if (vin[8] !== check) return false;
    const year = modelYearXml ? Number(ctx.field(modelYearXml)) : NaN;
    if (!Number.isInteger(year) || year < 1980) return true;
    return vin[9] === VIN_YEAR_CODES[(year - 1980) % 30];
  };

// ─── Rule Builder Helper ────────────────────────────────

/** Convenience: build a RuleDef with less boilerplate. */
export { rule } from "./rule-builder.ts";

// ─── Identifiers, PINs and receipt (return assembly) ────
// Checks on what the return itself carries for rules the IRS settles against
// its e-File database: the database answer is not known offline, but a value
// that cannot be in it is.

const ITIN_GROUP = /^(5\d|6[0-5]|7\d|8[0-8]|9[0-2]|9[4-9])$/;
// SSA-voided numbers that were printed in advertising.
const VOIDED_SSNS = new Set(["078051120", "219099999"]);

/**
 * A TIN the SSA or IRS can issue. SSNs never have area 000, 666 or 9xx, group
 * 00 or serial 0000 (SSA POMS RM 10201.035); 9xx is an ITIN (group 50-65,
 * 70-88, 90-92, 94-99) or an ATIN (group 93). Pub 1436 ATS SSNs use group 00.
 */
export const isIssuableTin = (v: unknown, ats = false): boolean => {
  const d = digits(v);
  if (!/^\d{9}$/.test(d)) return false;
  const area = d.slice(0, 3), group = d.slice(3, 5), serial = d.slice(5);
  if (area.startsWith("9")) return ITIN_GROUP.test(group) || group === "93";
  if (area === "000" || area === "666" || serial === "0000") return false;
  if (VOIDED_SSNS.has(d)) return false;
  return group !== "00" || ats;
};

/** Every value of the fields is an issuable SSN, ITIN or ATIN. */
export const issuableTins = (...xml: string[]): RuleCheck =>
  (ctx) =>
    xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => isIssuableTin(v, isAtsTest(ctx)));

/** Every value is an IRS-issued six-digit Identity Protection PIN. */
export const validIpPins = (...xml: string[]): RuleCheck =>
  (ctx) =>
    xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => /^\d{6}$/.test(String(v)) && String(v) !== "000000");

/** Every value is a five-digit PIN (PINType) that is not all zeros. */
export const validFiveDigitPins = (...xml: string[]): RuleCheck =>
  (ctx) =>
    xml.flatMap((f) => ctx.fieldArray(f))
      .every((v) => /^\d{5}$/.test(String(v)) && String(v) !== "00000");

/** The return's creation date from 'ReturnTs'; it is never after receipt. */
const returnTsMs = (ctx: ReturnContext): number | null => {
  const ts = String(ctx.field("ReturnHeader/ReturnTs") ?? "");
  return parseDateMs(ts.slice(0, 10));
};

/** Year the return is processed: the year of 'ReturnTs'. NaN when absent. */
export const processingYear: Amount = yearOf("ReturnHeader/ReturnTs");

/** 'TaxYr' is before the year before processing: a prior-year return. */
export const priorYearReturn: RuleCheck = (ctx) =>
  ctx.num("TaxYr") < processingYear(ctx) - 1;

/** An amended or superseded return (Form 1040 checkbox or Form 1040-X). */
export const postOriginalReturn: RuleCheck = (ctx) =>
  ctx.hasValue("AmendedReturnInd") || ctx.hasValue("SupersededReturnInd") ||
  ctx.hasForm("form1040x");

/**
 * The date is before (`strict`) or on the day the return was created, so it is
 * before or on the IRS received date. Passes when either date is absent.
 */
export const dateBeforeReceipt = (xml: string, strict = false): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(xml) ?? "");
    const received = returnTsMs(ctx);
    if (!d || received === null) return true;
    const ms = parseDateMs(d);
    if (ms === null) return false;
    return strict ? ms < received : ms <= received;
  };

/**
 * A real calendar birth date no later than the end of 'TaxYr' and no more
 * than 125 years before it. Passes when absent.
 */
export const plausibleBirthDate = (xml: string): RuleCheck =>
  (ctx) => {
    const d = String(ctx.field(xml) ?? "");
    if (!d) return true;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, day));
    const real = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 &&
      dt.getUTCDate() === day;
    const taxYr = ctx.num("TaxYr");
    return real && y <= taxYr && y >= taxYr - 125;
  };

// ─── Document References, Document Counts and Dates ────

const prefixOfTag = (tag: string): string =>
  rulePrefixForDocumentTag(tag) ?? tag;

/**
 * Every emitted document tagged `childTag` is named, by its documentId, in the
 * 'referenceDocumentId' of exactly one emitted document tagged one of
 * `parentTags`. Passes when no such child is emitted.
 */
export const referencedByExactlyOne = (
  childTag: string,
  ...parentTags: string[]
): RuleCheck =>
  (ctx) => {
    const documents = ctx.documentReferences?.() ?? [];
    const parents = new Set(parentTags.map(prefixOfTag));
    const child = prefixOfTag(childTag);
    return documents.filter((d) => d.prefix === child).every(({ documentId }) =>
      documentId !== undefined &&
      documents.filter((p) =>
          parents.has(p.prefix) && p.references.includes(documentId)
        ).length === 1
    );
  };

/** Element `xml`'s 'referenceDocumentId' names an emitted document tagged one of `tags`. */
export const attachedAt = (xml: string, ...tags: string[]): RuleCheck =>
  (ctx) => {
    const prefixes = new Set(tags.map(prefixOfTag));
    const ids = new Set(
      (ctx.documentReferences?.() ?? [])
        .filter((d) => prefixes.has(d.prefix))
        .map((d) => d.documentId),
    );
    return ctx.fieldArray(`${xml}@referenceDocumentId`)
      .flatMap((v) => String(v).split(/\s+/))
      .some((id) => id !== "" && ids.has(id));
  };

/** Number of emitted documents with the rule prefix that satisfy `check`. */
export const documentCount = (
  prefix: string,
  check: RuleCheck = () => true,
): Amount =>
  (ctx) => (ctx.emittedDocuments?.(prefix) ?? []).filter(check).length;

/**
 * A date, or the date of a timestamp, as ms since epoch with its year moved
 * by `years`; NaN when absent or unparseable.
 */
export const dateOf = (xml: string, years = 0): Amount =>
  (ctx) => {
    const m = String(ctx.field(xml) ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m
      ? Date.UTC(Number(m[1]) + years, Number(m[2]) - 1, Number(m[3]))
      : NaN;
  };

/** Days from the `begin` date to the `end` date; NaN when either is absent. */
export const daysBetween = (end: string, begin: string): Amount =>
  (ctx) => (dateOf(end)(ctx) - dateOf(begin)(ctx)) / 86_400_000;

/**
 * The date is not after the date the IRS receives the submission. A return is
 * received no earlier than its Return Header 'ReturnTs', so the date must not
 * be after that day; with no 'ReturnTs' the receipt date cannot be bounded.
 */
export const dateNotAfterReceipt = (xml: string): RuleCheck =>
  (ctx) =>
    !ctx.hasValue(xml) ||
    dateOf(xml)(ctx) <= dateOf("ReturnHeader/ReturnTs")(ctx);

// ─── Submission Envelope (submission and transmission rules) ───

/**
 * Lower-case engine facts a transmission-time context carries beside the
 * return. A return-only context has none of them, so envelope rules then
 * check only what the return itself controls.
 */
export enum EnvelopeFact {
  /** The submission ZIP: manifest/manifest.xml, xml/submission.xml, attachment/*. */
  SubmissionZip = "submission_zip",
  /** The SendSubmissions attachment ZIP: one <SubmissionId>.zip per submission. */
  TransmissionZip = "transmission_zip",
  /** The Submission IDs listed in the SendSubmissions request. */
  TransmissionSubmissionIds = "transmission_submission_ids",
  /** UTC date (YYYY-MM-DD) the submission is transmitted: the earliest MeF can receive it. */
  ProcessingDate = "processing_date",
  MessageId = "message_id",
  TransmitterEtin = "transmitter_etin",
  /** StateSubmissionManifest XML of each state submission sent with this return. */
  StateManifests = "state_submission_manifests",
}

/** A byte-valued envelope fact, or undefined in a return-only context. */
export const factBytes = (
  ctx: ReturnContext,
  fact: EnvelopeFact,
): Uint8Array | undefined => {
  const v = ctx.field(fact);
  return v instanceof Uint8Array ? v : undefined;
};

/** A text-valued envelope fact, or undefined when absent or empty. */
export const factText = (
  ctx: ReturnContext,
  fact: EnvelopeFact,
): string | undefined => {
  const v = ctx.field(fact);
  return typeof v === "string" && v !== "" ? v : undefined;
};

/** Every text value of a list-valued envelope fact. */
export const factTexts = (
  ctx: ReturnContext,
  fact: EnvelopeFact,
): readonly string[] =>
  ctx.fieldArray(fact).filter((v): v is string => typeof v === "string");

/** Text of every `<tag>` element in an XML string, in document order. */
export const xmlTexts = (xml: string, tag: string): readonly string[] =>
  [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g"))]
    .map((m) => m[1].trim());

/** Days since 1970-01-01 of a YYYY-MM-DD date, or undefined. */
export const isoDay = (v: unknown): number | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ""));
  return m
    ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000
    : undefined;
};

/** efileTypes PersonNameControlType: a letter, then up to three letters, hyphens or spaces. */
export const isPersonNameControl = (v: unknown): boolean =>
  PERSON_NAME_CONTROL.test(String(v ?? ""));

/** A five-digit Electronic Transmitter Identification Number. */
export const isEtin = (v: unknown): boolean => /^\d{5}$/.test(String(v ?? ""));
