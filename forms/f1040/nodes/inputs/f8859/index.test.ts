import { assertEquals, assertThrows } from "@std/assert";
import { f8859 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8859.compute({ taxYear: 2025 }, { f8859s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8859.inputSchema: valid minimal item passes", () => {
  const parsed = f8859.inputSchema.safeParse({ f8859s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8859.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8859.inputSchema.safeParse({ f8859s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8859.inputSchema: negative carryforward_amount fails", () => {
  const parsed = f8859.inputSchema.safeParse({
    f8859s: [{ carryforward_amount: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8859.inputSchema: valid item with carryforward passes", () => {
  const parsed = f8859.inputSchema.safeParse({
    f8859s: [{ carryforward_amount: 2500 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8859.inputSchema: zero carryforward passes", () => {
  const parsed = f8859.inputSchema.safeParse({
    f8859s: [{ carryforward_amount: 0 }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("f8859.compute: carryforward routes to schedule3", () => {
  const result = compute([minimalItem({ carryforward_amount: 2500 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
});

Deno.test("f8859.compute: carryforward amount routes to schedule3 line6z_general_business_credit", () => {
  const result = compute([minimalItem({ carryforward_amount: 2500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2500);
});

Deno.test("f8859.compute: zero carryforward — no output", () => {
  const result = compute([minimalItem({ carryforward_amount: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8859.compute: absent carryforward — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — Multiple Items
// =============================================================================

Deno.test("f8859.compute: multiple carryforward items summed to schedule3", () => {
  const result = compute([
    minimalItem({ carryforward_amount: 1000 }),
    minimalItem({ carryforward_amount: 1500 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2500);
});

Deno.test("f8859.compute: one zero + one nonzero — only nonzero credited", () => {
  const result = compute([
    minimalItem({ carryforward_amount: 0 }),
    minimalItem({ carryforward_amount: 800 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 800);
});

// =============================================================================
// 4. Output Count
// =============================================================================

Deno.test("f8859.compute: single output node when carryforward present", () => {
  const result = compute([minimalItem({ carryforward_amount: 5000 })]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8859.compute: throws on negative carryforward_amount", () => {
  assertThrows(() => compute([minimalItem({ carryforward_amount: -100 })]), Error);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8859.compute: smoke test — carryforward from prior year", () => {
  const result = compute([
    minimalItem({ carryforward_amount: 3000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3000);
  assertEquals(result.outputs.length, 1);
});
