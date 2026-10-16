import { test } from "bun:test";
/**
 * Unit tests for predicates.ts — new predicates added in phase 12-01.
 */

import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import { allDistinct, betweenNum, diffLteNum, everyItem, forEach, notGtPctOfField, sumOfAll, validEIN } from "./predicates.ts";

/** Build a ReturnContext with the given flat fields under "f1040". */
function ctx(fields: Record<string, unknown>) {
  return createReturnContext(
    { f1040: fields },
    { primarySSN: "123456789", filingStatus: 1 },
    new Map(),
  );
}

// ─── validEIN ───────────────────────────────────────────

test("validEIN: passes for '12-3456789' (valid prefix 12)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "12-3456789" })), true);
});

test("validEIN: passes for '271234567' (valid prefix 27)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "271234567" })), true);
});

test("validEIN: fails for '001234567' (invalid prefix 00)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "001234567" })), false);
});

test("validEIN: fails for '071234567' (invalid prefix 07)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "071234567" })), false);
});

test("validEIN: fails for '12345' (too short)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "12345" })), false);
});

test("validEIN: passes if field is absent (safe default)", () => {
  assertEquals(validEIN("EIN")(ctx({})), true);
});

test("validEIN: fails for '123' (non-9-digit)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "123" })), false);
});

// ─── betweenNum ─────────────────────────────────────────

test("betweenNum: passes for 250 in [100, 500]", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 250 })), true);
});

test("betweenNum: passes for 100 (inclusive lo)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 100 })), true);
});

test("betweenNum: passes for 500 (inclusive hi)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 500 })), true);
});

test("betweenNum: fails for 50 (below lo)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 50 })), false);
});

test("betweenNum: fails for 501 (above hi)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 501 })), false);
});

test("betweenNum: passes for 35000 in [25000, 50000] (F9465-044 scenario)", () => {
  assertEquals(betweenNum("Amt", 25000, 50000)(ctx({ Amt: 35000 })), true);
});

// ─── diffLteNum ─────────────────────────────────────────

test("diffLteNum: passes when A=200, B=150 (diff=50 <= 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 200, B: 150 })), true);
});

test("diffLteNum: passes when A=200, B=100 (diff=100 <= 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 200, B: 100 })), true);
});

test("diffLteNum: fails when A=300, B=100 (diff=200 > 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 300, B: 100 })), false);
});

test("diffLteNum: passes for MFJ QBI threshold scenario (AGI=683900, Ded=300000, n=383900)", () => {
  assertEquals(
    diffLteNum("AGI", "Ded", 383900)(ctx({ AGI: 683900, Ded: 300000 })),
    true,
  );
});

test("diffLteNum: passes when B >= A (negative diff)", () => {
  assertEquals(diffLteNum("A", "B", 0)(ctx({ A: 100, B: 200 })), true);
});

// ─── notGtPctOfField ────────────────────────────────────

test("notGtPctOfField: passes when Payment=100, Owed=60 (100 <= 2.0 * 60 = 120)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 100, Owed: 60 })),
    true,
  );
});

test("notGtPctOfField: fails when Payment=200, Owed=60 (200 > 2.0 * 60 = 120)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 200, Owed: 60 })),
    false,
  );
});

test("notGtPctOfField: passes when Owed=0 and Payment=0", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 0, Owed: 0 })),
    true,
  );
});

test("notGtPctOfField: fails when Owed=0 and Payment=1 (1 > 0)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 1, Owed: 0 })),
    false,
  );
});

// ─── forEach ────────────────────────────────────────────

test("forEach: passes when all array items satisfy predicate (valid EIN prefixes)", () => {
  const isValidPrefix = (v: unknown): boolean => {
    const s = String(v ?? "").replace(/\D/g, "");
    return s.length === 9 && ["12", "27"].includes(s.substring(0, 2));
  };
  assertEquals(forEach("EIN", isValidPrefix)(ctx({ EIN: ["123456789", "271234567"] })), true);
});

test("forEach: fails when any item fails the predicate", () => {
  const isValidPrefix = (v: unknown): boolean => {
    const s = String(v ?? "").replace(/\D/g, "");
    return s.length === 9 && ["12", "27"].includes(s.substring(0, 2));
  };
  assertEquals(forEach("EIN", isValidPrefix)(ctx({ EIN: ["123456789", "001234567"] })), false);
});

test("forEach: passes when field is a single value (not array)", () => {
  const isNonEmpty = (v: unknown): boolean => String(v ?? "").length > 0;
  assertEquals(forEach("EIN", isNonEmpty)(ctx({ EIN: "123456789" })), true);
});

test("forEach: passes when field is absent (vacuous truth)", () => {
  const alwaysFalse = (_v: unknown): boolean => false;
  assertEquals(forEach("EIN", alwaysFalse)(ctx({})), true);
});

test("forEach: passes empty array (vacuous truth)", () => {
  const alwaysFalse = (_v: unknown): boolean => false;
  assertEquals(forEach("EIN", alwaysFalse)(ctx({ EIN: [] })), true);
});

// ─── everyItem ──────────────────────────────────────────

test("everyItem: passes when all items satisfy predicate", () => {
  const isNonEmpty = (v: unknown): boolean => String(v ?? "").length > 0;
  assertEquals(everyItem("SSN", isNonEmpty)(ctx({ SSN: ["123456789", "987654321"] })), true);
});

test("everyItem: fails when any item fails predicate", () => {
  const isNonEmpty = (v: unknown): boolean => String(v ?? "").length > 0;
  assertEquals(everyItem("SSN", isNonEmpty)(ctx({ SSN: ["123456789", ""] })), false);
});

test("everyItem: passes when field is absent (vacuous truth)", () => {
  const alwaysFalse = (_v: unknown): boolean => false;
  assertEquals(everyItem("SSN", alwaysFalse)(ctx({})), true);
});

// ─── sumOfAll ───────────────────────────────────────────

test("sumOfAll: passes when target equals sum of array elements", () => {
  assertEquals(sumOfAll("total_wages", "wages")(ctx({ wages: [50000, 30000], total_wages: 80000 })), true);
});

test("sumOfAll: fails when target does not equal sum of array elements", () => {
  assertEquals(sumOfAll("total_wages", "wages")(ctx({ wages: [50000, 30000], total_wages: 75000 })), false);
});

test("sumOfAll: passes when source is absent (sum=0) and target=0", () => {
  assertEquals(sumOfAll("total_wages", "wages")(ctx({ total_wages: 0 })), true);
});

test("sumOfAll: passes when source is a single (non-array) value", () => {
  assertEquals(sumOfAll("total_wages", "wages")(ctx({ wages: 50000, total_wages: 50000 })), true);
});

// ─── allDistinct ────────────────────────────────────────

test("allDistinct: passes when all array values are unique", () => {
  assertEquals(allDistinct("SSN")(ctx({ SSN: ["123456789", "987654321"] })), true);
});

test("allDistinct: fails when duplicates exist", () => {
  assertEquals(allDistinct("SSN")(ctx({ SSN: ["123456789", "123456789"] })), false);
});

test("allDistinct: passes on single value (not array)", () => {
  assertEquals(allDistinct("SSN")(ctx({ SSN: "123456789" })), true);
});

test("allDistinct: passes on empty/absent field", () => {
  assertEquals(allDistinct("SSN")(ctx({})), true);
});
