/**
 * Unit tests for predicates.ts — new predicates added in phase 12-01.
 */

import { assertEquals } from "@std/assert";
import { createReturnContext } from "./context.ts";
import { betweenNum, diffLteNum, notGtPctOfField, validEIN } from "./predicates.ts";

/** Build a ReturnContext with the given flat fields under "f1040". */
function ctx(fields: Record<string, unknown>) {
  return createReturnContext(
    { f1040: fields },
    { primarySSN: "123456789", filingStatus: 1 },
    new Map(),
  );
}

// ─── validEIN ───────────────────────────────────────────

Deno.test("validEIN: passes for '12-3456789' (valid prefix 12)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "12-3456789" })), true);
});

Deno.test("validEIN: passes for '271234567' (valid prefix 27)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "271234567" })), true);
});

Deno.test("validEIN: fails for '001234567' (invalid prefix 00)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "001234567" })), false);
});

Deno.test("validEIN: fails for '071234567' (invalid prefix 07)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "071234567" })), false);
});

Deno.test("validEIN: fails for '12345' (too short)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "12345" })), false);
});

Deno.test("validEIN: passes if field is absent (safe default)", () => {
  assertEquals(validEIN("EIN")(ctx({})), true);
});

Deno.test("validEIN: fails for '123' (non-9-digit)", () => {
  assertEquals(validEIN("EIN")(ctx({ EIN: "123" })), false);
});

// ─── betweenNum ─────────────────────────────────────────

Deno.test("betweenNum: passes for 250 in [100, 500]", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 250 })), true);
});

Deno.test("betweenNum: passes for 100 (inclusive lo)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 100 })), true);
});

Deno.test("betweenNum: passes for 500 (inclusive hi)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 500 })), true);
});

Deno.test("betweenNum: fails for 50 (below lo)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 50 })), false);
});

Deno.test("betweenNum: fails for 501 (above hi)", () => {
  assertEquals(betweenNum("Amt", 100, 500)(ctx({ Amt: 501 })), false);
});

Deno.test("betweenNum: passes for 35000 in [25000, 50000] (F9465-044 scenario)", () => {
  assertEquals(betweenNum("Amt", 25000, 50000)(ctx({ Amt: 35000 })), true);
});

// ─── diffLteNum ─────────────────────────────────────────

Deno.test("diffLteNum: passes when A=200, B=150 (diff=50 <= 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 200, B: 150 })), true);
});

Deno.test("diffLteNum: passes when A=200, B=100 (diff=100 <= 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 200, B: 100 })), true);
});

Deno.test("diffLteNum: fails when A=300, B=100 (diff=200 > 100)", () => {
  assertEquals(diffLteNum("A", "B", 100)(ctx({ A: 300, B: 100 })), false);
});

Deno.test("diffLteNum: passes for MFJ QBI threshold scenario (AGI=683900, Ded=300000, n=383900)", () => {
  assertEquals(
    diffLteNum("AGI", "Ded", 383900)(ctx({ AGI: 683900, Ded: 300000 })),
    true,
  );
});

Deno.test("diffLteNum: passes when B >= A (negative diff)", () => {
  assertEquals(diffLteNum("A", "B", 0)(ctx({ A: 100, B: 200 })), true);
});

// ─── notGtPctOfField ────────────────────────────────────

Deno.test("notGtPctOfField: passes when Payment=100, Owed=60 (100 <= 2.0 * 60 = 120)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 100, Owed: 60 })),
    true,
  );
});

Deno.test("notGtPctOfField: fails when Payment=200, Owed=60 (200 > 2.0 * 60 = 120)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 200, Owed: 60 })),
    false,
  );
});

Deno.test("notGtPctOfField: passes when Owed=0 and Payment=0", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 0, Owed: 0 })),
    true,
  );
});

Deno.test("notGtPctOfField: fails when Owed=0 and Payment=1 (1 > 0)", () => {
  assertEquals(
    notGtPctOfField("Payment", "Owed", 2.0)(ctx({ Payment: 1, Owed: 0 })),
    false,
  );
});
