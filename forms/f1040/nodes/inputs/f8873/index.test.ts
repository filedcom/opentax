import { assertEquals, assertThrows } from "@std/assert";
import { f8873 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    qualifying_foreign_trade_income: 0,
    extraterritorial_income_excluded: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8873.compute({ taxYear: 2025, formType: "f1040" }, { f8873s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8873.inputSchema: valid minimal item passes", () => {
  const parsed = f8873.inputSchema.safeParse({ f8873s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8873.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8873.inputSchema.safeParse({ f8873s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8873.inputSchema: negative extraterritorial_income_excluded fails", () => {
  const parsed = f8873.inputSchema.safeParse({
    f8873s: [minimalItem({ extraterritorial_income_excluded: -500 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("f8873.compute: exclusion > 0 routes to schedule1 as negative line8z_other", () => {
  const result = compute([minimalItem({ qualifying_foreign_trade_income: 100000, extraterritorial_income_excluded: 30000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -30000);
});

Deno.test("f8873.compute: exclusion = 0 — no output", () => {
  const result = compute([minimalItem({ qualifying_foreign_trade_income: 50000, extraterritorial_income_excluded: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8873.compute: both fields zero — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — multiple items
// =============================================================================

Deno.test("f8873.compute: multiple items — exclusions summed as negative", () => {
  const result = compute([
    minimalItem({ qualifying_foreign_trade_income: 100000, extraterritorial_income_excluded: 20000 }),
    minimalItem({ qualifying_foreign_trade_income: 50000, extraterritorial_income_excluded: 10000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -30000);
});

Deno.test("f8873.compute: one item with exclusion, one without — sum reflects only nonzero", () => {
  const result = compute([
    minimalItem({ qualifying_foreign_trade_income: 100000, extraterritorial_income_excluded: 25000 }),
    minimalItem({ qualifying_foreign_trade_income: 50000, extraterritorial_income_excluded: 0 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -25000);
});

Deno.test("f8873.compute: zero-exclusion items do not create additional outputs", () => {
  const result = compute([
    minimalItem({ extraterritorial_income_excluded: 10000 }),
    minimalItem({ extraterritorial_income_excluded: 0 }),
  ]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

Deno.test("f8873.compute: exclusion of 1 (minimum positive) — routes to schedule1", () => {
  const result = compute([minimalItem({ qualifying_foreign_trade_income: 10, extraterritorial_income_excluded: 1 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -1);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8873.compute: throws on negative extraterritorial_income_excluded", () => {
  assertThrows(
    () => compute([minimalItem({ qualifying_foreign_trade_income: 100000, extraterritorial_income_excluded: -5000 })]),
    Error,
  );
});

Deno.test("f8873.compute: throws on negative qualifying_foreign_trade_income", () => {
  assertThrows(
    () => compute([minimalItem({ qualifying_foreign_trade_income: -1000, extraterritorial_income_excluded: 0 })]),
    Error,
  );
});

// =============================================================================
// 6. Edge Cases
// =============================================================================

Deno.test("f8873.compute: exclusion only, no qualifying income — routes if excluded > 0", () => {
  const result = compute([minimalItem({ qualifying_foreign_trade_income: 0, extraterritorial_income_excluded: 5000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -5000);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("f8873.compute: smoke test — two exclusion items, summed correctly", () => {
  const result = compute([
    minimalItem({
      qualifying_foreign_trade_income: 500000,
      extraterritorial_income_excluded: 150000,
    }),
    minimalItem({
      qualifying_foreign_trade_income: 200000,
      extraterritorial_income_excluded: 60000,
    }),
  ]);
  // Total exclusion: 150000 + 60000 = 210000; routes as -210000
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -210000);
  assertEquals(result.outputs.length, 1);
});
