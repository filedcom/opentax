import { assertEquals, assertThrows } from "@std/assert";
import { f8859 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8859.compute({ taxYear: 2025, formType: "f1040" }, { f8859s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

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

// =============================================================================
// 2. Source routing without prematurely claiming the credit
// =============================================================================

Deno.test("f8859.compute: carries source to Form 1040 finalization", () => {
  const result = compute([minimalItem({ carryforward_amount: 2500 })]);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.form8859_source_credit_pending,
    true,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form8859_source_carryforward,
    2500,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6h_dc_homebuyer_credit,
    undefined,
  );
});

Deno.test("f8859.compute: zero carryforward — no output", () => {
  const result = compute([minimalItem({ carryforward_amount: 0 })]);
  assertEquals(result.outputs, []);
});

Deno.test("f8859.compute: absent carryforward — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Aggregation — Multiple Items
// =============================================================================

Deno.test("f8859.compute: multiple carryforward items summed before limit", () => {
  const result = compute([
    minimalItem({ carryforward_amount: 1000 }),
    minimalItem({ carryforward_amount: 1500 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form8859_source_carryforward,
    2500,
  );
});

Deno.test("f8859.compute: one zero + one nonzero — only nonzero credited", () => {
  const result = compute([
    minimalItem({ carryforward_amount: 0 }),
    minimalItem({ carryforward_amount: 800 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form8859_source_carryforward,
    800,
  );
});

// =============================================================================
// 4. Hard Validation
// =============================================================================

Deno.test("f8859.compute: throws on negative carryforward_amount", () => {
  assertThrows(
    () => compute([minimalItem({ carryforward_amount: -100 })]),
    Error,
  );
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8859.compute: source needs final tax before Schedule 3 credit", () => {
  const result = compute([minimalItem({ carryforward_amount: 3000 })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form8859_source_carryforward,
    3000,
  );
  assertEquals(result.outputs.length, 2);
});
