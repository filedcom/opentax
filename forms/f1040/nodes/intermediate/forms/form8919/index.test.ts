import { assertEquals, assertThrows } from "@std/assert";
import { form8919, inputSchema, ReasonCode } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { schedule_se } from "../schedule_se/index.ts";

function compute(input: Record<string, unknown>) {
  return form8919.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Basic routing smoke test ─────────────────────────────────────────────────

Deno.test("smoke: valid input produces 3 outputs (f1040, schedule2, schedule_se)", () => {
  const result = compute({ wages: 50_000, reason_code: ReasonCode.C });
  assertEquals(result.outputs.length, 3);
});

// ─── Zero wages — no outputs ──────────────────────────────────────────────────

Deno.test("zero wages: no outputs emitted", () => {
  const result = compute({ wages: 0, reason_code: ReasonCode.A });
  assertEquals(result.outputs, []);
});

// ─── Wages route to f1040 line 1g ────────────────────────────────────────────

Deno.test("routing: wages flow to f1040 line1g_wages_8919", () => {
  const result = compute({ wages: 40_000, reason_code: ReasonCode.D });
  assertEquals(fieldsOf(result.outputs, f1040)!.line1g_wages_8919, 40_000);
});

// ─── SS tax below wage base ───────────────────────────────────────────────────

Deno.test("ss tax: wages below wage base → 6.2% SS + 1.45% Medicare", () => {
  // SS = 50000 × 0.062 = 3100; Medicare = 50000 × 0.0145 = 725; total = 3825
  const result = compute({ wages: 50_000, reason_code: ReasonCode.A });
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.line6_uncollected_8919, 3_825);
});

// ─── SS tax at wage base (exact) ──────────────────────────────────────────────

Deno.test("ss tax: wages equal SS_WAGE_BASE → full base taxed", () => {
  // $176,100 × 6.2% + $176,100 × 1.45%
  const result = compute({ wages: 176_100, reason_code: ReasonCode.A });
  const input = fieldsOf(result.outputs, schedule2)!;
  const expectedSS = 176_100 * 0.062;
  const expectedMed = 176_100 * 0.0145;
  assertEquals(input.line6_uncollected_8919, expectedSS + expectedMed);
});

// ─── SS tax above wage base (capped) ─────────────────────────────────────────

Deno.test("ss tax: wages above SS_WAGE_BASE → SS capped at wage base", () => {
  // Wages $200,000: SS capped at 176,100; Medicare on all 200,000
  const result = compute({ wages: 200_000, reason_code: ReasonCode.A });
  const input = fieldsOf(result.outputs, schedule2)!;
  const expectedSS = 176_100 * 0.062;
  const expectedMed = 200_000 * 0.0145;
  assertEquals(input.line6_uncollected_8919, expectedSS + expectedMed);
});

// ─── SS tax with prior_ss_wages offsetting wage base ─────────────────────────

Deno.test("ss tax: prior_ss_wages offsets SS wage base", () => {
  // prior_ss_wages = 150,000 → remaining base = 26,100
  // wages = 50,000 → SS on min(50000, 26100) = 26,100
  const result = compute({ wages: 50_000, reason_code: ReasonCode.A, prior_ss_wages: 150_000 });
  const input = fieldsOf(result.outputs, schedule2)!;
  const expectedSS = 26_100 * 0.062;
  const expectedMed = 50_000 * 0.0145;
  assertEquals(input.line6_uncollected_8919, expectedSS + expectedMed);
});

// ─── Medicare tax — no cap ────────────────────────────────────────────────────

Deno.test("medicare tax: no cap, applies to all wages", () => {
  // Wages well above SS wage base — Medicare still applies to full amount
  // SS capped at 176,100
  const result = compute({ wages: 250_000, reason_code: ReasonCode.A });
  const input = fieldsOf(result.outputs, schedule2)!;
  const expectedSS = 176_100 * 0.062;
  const expectedMed = 250_000 * 0.0145;
  assertEquals(input.line6_uncollected_8919, expectedSS + expectedMed);
});

// ─── Wages route to schedule_se ──────────────────────────────────────────────

Deno.test("routing: wages flow to schedule_se wages_8919", () => {
  const result = compute({ wages: 75_000, reason_code: ReasonCode.E });
  assertEquals(fieldsOf(result.outputs, schedule_se)!.wages_8919, 75_000);
});

// ─── Reason code validation ───────────────────────────────────────────────────

Deno.test("validation: invalid reason_code throws", () => {
  assertThrows(() => compute({ wages: 10_000, reason_code: "Z" }));
});

Deno.test("validation: missing wages throws", () => {
  assertThrows(() => compute({ reason_code: ReasonCode.A }));
});

Deno.test("validation: negative wages throws", () => {
  assertThrows(() => compute({ wages: -1, reason_code: ReasonCode.A }));
});

// ─── All valid reason codes accepted ─────────────────────────────────────────

Deno.test("validation: all reason codes A–H are accepted", () => {
  for (const code of Object.values(ReasonCode)) {
    const result = compute({ wages: 1_000, reason_code: code });
    assertEquals(result.outputs.length, 3);
  }
});

// ─── Prior SS wages exhausts wage base ───────────────────────────────────────

Deno.test("ss tax: prior_ss_wages >= wage base → no SS tax", () => {
  // prior wages already at or above cap → SS subject wages = 0
  // SS = 0; Medicare = 50000 × 0.0145 = 725
  const result = compute({ wages: 50_000, reason_code: ReasonCode.A, prior_ss_wages: 176_100 });
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.line6_uncollected_8919, 50_000 * 0.0145);
});
