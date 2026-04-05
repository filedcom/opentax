import { assertEquals, assertThrows } from "@std/assert";
import { ltc_premium } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA } from "../schedule_a/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    age: 45,
    actual_premium_paid: 0,
    is_qualified_contract: true,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return ltc_premium.compute({ taxYear: 2025 }, { ltc_premiums: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Validation
// =============================================================================

Deno.test("ltc_premium.inputSchema: valid minimal item passes", () => {
  const parsed = ltc_premium.inputSchema.safeParse({
    ltc_premiums: [{ age: 45, actual_premium_paid: 500, is_qualified_contract: true }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("ltc_premium.inputSchema: empty array fails (min 1)", () => {
  const parsed = ltc_premium.inputSchema.safeParse({ ltc_premiums: [] });
  assertEquals(parsed.success, false);
});

Deno.test("ltc_premium.inputSchema: negative actual_premium_paid fails", () => {
  const parsed = ltc_premium.inputSchema.safeParse({
    ltc_premiums: [{ age: 45, actual_premium_paid: -100, is_qualified_contract: true }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ltc_premium.inputSchema: negative age fails", () => {
  const parsed = ltc_premium.inputSchema.safeParse({
    ltc_premiums: [{ age: -1, actual_premium_paid: 500, is_qualified_contract: true }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ltc_premium.inputSchema: age > 130 fails", () => {
  const parsed = ltc_premium.inputSchema.safeParse({
    ltc_premiums: [{ age: 131, actual_premium_paid: 500, is_qualified_contract: true }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Non-qualified contract — no output
// =============================================================================

Deno.test("ltc_premium.compute: non-qualified contract — no output", () => {
  const result = compute([minimalItem({ age: 55, actual_premium_paid: 2000, is_qualified_contract: false })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ltc_premium.compute: zero premium — no output", () => {
  const result = compute([minimalItem({ age: 55, actual_premium_paid: 0, is_qualified_contract: true })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Age-based limits — below / at / above each bracket
// =============================================================================

// Age ≤ 40: limit = $480
Deno.test("ltc_premium.compute: age 40 — premium below $480 limit", () => {
  const result = compute([minimalItem({ age: 40, actual_premium_paid: 300, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 300);
});

Deno.test("ltc_premium.compute: age 40 — premium equals $480 limit", () => {
  const result = compute([minimalItem({ age: 40, actual_premium_paid: 480, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 480);
});

Deno.test("ltc_premium.compute: age 40 — premium above $480 capped at $480", () => {
  const result = compute([minimalItem({ age: 40, actual_premium_paid: 800, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 480);
});

// Age 41–50: limit = $900
Deno.test("ltc_premium.compute: age 41 — uses $900 bracket", () => {
  const result = compute([minimalItem({ age: 41, actual_premium_paid: 1200, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 900);
});

Deno.test("ltc_premium.compute: age 50 — uses $900 bracket", () => {
  const result = compute([minimalItem({ age: 50, actual_premium_paid: 700, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 700);
});

// Age 51–60: limit = $1,800
Deno.test("ltc_premium.compute: age 51 — uses $1,800 bracket", () => {
  const result = compute([minimalItem({ age: 51, actual_premium_paid: 2500, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 1800);
});

Deno.test("ltc_premium.compute: age 60 — premium below $1,800 limit", () => {
  const result = compute([minimalItem({ age: 60, actual_premium_paid: 1500, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 1500);
});

// Age 61–70: limit = $4,770
Deno.test("ltc_premium.compute: age 61 — uses $4,770 bracket", () => {
  const result = compute([minimalItem({ age: 61, actual_premium_paid: 6000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 4770);
});

Deno.test("ltc_premium.compute: age 70 — uses $4,770 bracket", () => {
  const result = compute([minimalItem({ age: 70, actual_premium_paid: 4000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 4000);
});

// Age 71+: limit = $5,970
Deno.test("ltc_premium.compute: age 71 — uses $5,970 bracket", () => {
  const result = compute([minimalItem({ age: 71, actual_premium_paid: 8000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 5970);
});

Deno.test("ltc_premium.compute: age 80 — premium below $5,970 limit", () => {
  const result = compute([minimalItem({ age: 80, actual_premium_paid: 5000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 5000);
});

// =============================================================================
// 4. Aggregation — multiple persons
// =============================================================================

Deno.test("ltc_premium.compute: two persons — eligible amounts summed", () => {
  const result = compute([
    minimalItem({ age: 55, actual_premium_paid: 1800, is_qualified_contract: true }),  // eligible: 1800
    minimalItem({ age: 65, actual_premium_paid: 6000, is_qualified_contract: true }),  // eligible: 4770
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 6570);
});

Deno.test("ltc_premium.compute: mixed qualified/non-qualified — only qualified summed", () => {
  const result = compute([
    minimalItem({ age: 55, actual_premium_paid: 1800, is_qualified_contract: true }),   // eligible: 1800
    minimalItem({ age: 55, actual_premium_paid: 1500, is_qualified_contract: false }),  // excluded
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 1800);
});

Deno.test("ltc_premium.compute: single output even with multiple persons", () => {
  const result = compute([
    minimalItem({ age: 55, actual_premium_paid: 1000, is_qualified_contract: true }),
    minimalItem({ age: 65, actual_premium_paid: 3000, is_qualified_contract: true }),
  ]);
  const scheduleAOutputs = result.outputs.filter((o) => o.nodeType === "schedule_a");
  assertEquals(scheduleAOutputs.length, 1);
});

// =============================================================================
// 5. Output routing — routes to schedule_a
// =============================================================================

Deno.test("ltc_premium.compute: routes to schedule_a.line_1_medical", () => {
  const result = compute([minimalItem({ age: 55, actual_premium_paid: 1500, is_qualified_contract: true })]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 1500);
});

Deno.test("ltc_premium.compute: all non-qualified — no schedule_a output", () => {
  const result = compute([minimalItem({ age: 55, actual_premium_paid: 1500, is_qualified_contract: false })]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out, undefined);
});

// =============================================================================
// 6. Hard validation
// =============================================================================

Deno.test("ltc_premium.compute: throws on negative actual_premium_paid", () => {
  assertThrows(() => compute([minimalItem({ age: 55, actual_premium_paid: -500 })]), Error);
});

Deno.test("ltc_premium.compute: throws on negative age", () => {
  assertThrows(() => compute([minimalItem({ age: -1, actual_premium_paid: 500 })]), Error);
});

// =============================================================================
// 7. Edge cases
// =============================================================================

Deno.test("ltc_premium.compute: age exactly at bracket boundary 41 — uses 41-50 bracket", () => {
  const result = compute([minimalItem({ age: 41, actual_premium_paid: 2000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 900);
});

Deno.test("ltc_premium.compute: age exactly at bracket boundary 71 — uses 71+ bracket", () => {
  const result = compute([minimalItem({ age: 71, actual_premium_paid: 7000, is_qualified_contract: true })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 5970);
});

// =============================================================================
// 8. Smoke test
// =============================================================================

Deno.test("ltc_premium.compute: smoke test — taxpayer age 68 + spouse age 72", () => {
  const result = compute([
    minimalItem({ age: 68, actual_premium_paid: 5000, is_qualified_contract: true }),  // capped at 4770
    minimalItem({ age: 72, actual_premium_paid: 4500, is_qualified_contract: true }),  // capped at 5970 → 4500
  ]);
  // 4770 + 4500 = 9270
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_1_medical, 9270);
});
