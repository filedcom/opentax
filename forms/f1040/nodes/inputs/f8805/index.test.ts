import { assertEquals, assertThrows } from "@std/assert";
import { f8805 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    partnership_name: "ABC Partners LP",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8805.compute({ taxYear: 2025 }, { f8805s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8805.inputSchema: valid minimal item passes", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{ partnership_name: "ABC Partners LP" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8805.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8805.inputSchema.safeParse({ f8805s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8805.inputSchema: missing partnership_name fails", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{ section_1446_tax_withheld: 5000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8805.inputSchema: negative section_1446_tax_withheld fails", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{ partnership_name: "XYZ LP", section_1446_tax_withheld: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8805.inputSchema: negative total_tax_withheld fails", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{ partnership_name: "XYZ LP", total_tax_withheld: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8805.inputSchema: negative ordinary_eic_allocable fails", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{ partnership_name: "XYZ LP", ordinary_eic_allocable: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8805.inputSchema: valid full item passes", () => {
  const parsed = f8805.inputSchema.safeParse({
    f8805s: [{
      partnership_name: "Global Partners LP",
      partnership_ein: "12-3456789",
      ordinary_eic_allocable: 100000,
      section_1446_tax_withheld: 37000,
      total_tax_withheld: 37000,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("f8805.compute: section_1446_tax_withheld present — routes to schedule3", () => {
  const result = compute([minimalItem({ section_1446_tax_withheld: 5000 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
});

Deno.test("f8805.compute: section_1446_tax_withheld routes correct amount to schedule3", () => {
  const result = compute([minimalItem({ section_1446_tax_withheld: 7400 })]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 7400);
});

Deno.test("f8805.compute: total_tax_withheld used when section_1446_tax_withheld absent", () => {
  const result = compute([minimalItem({ total_tax_withheld: 4000 })]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 4000);
});

Deno.test("f8805.compute: section_1446_tax_withheld takes precedence over total_tax_withheld", () => {
  const result = compute([minimalItem({ section_1446_tax_withheld: 3000, total_tax_withheld: 5000 })]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 3000);
});

Deno.test("f8805.compute: no withholding amounts — no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8805.compute: zero section_1446_tax_withheld — no outputs", () => {
  const result = compute([minimalItem({ section_1446_tax_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8805.compute: zero total_tax_withheld — no outputs", () => {
  const result = compute([minimalItem({ total_tax_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8805.compute: ordinary_eic_allocable only — no outputs (income info only)", () => {
  const result = compute([minimalItem({ ordinary_eic_allocable: 50000 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — Multiple Forms 8805
// =============================================================================

Deno.test("f8805.compute: multiple items — withholding summed to schedule3", () => {
  const result = compute([
    minimalItem({ section_1446_tax_withheld: 3000 }),
    minimalItem({ partnership_name: "DEF Partners", section_1446_tax_withheld: 2000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 5000);
});

Deno.test("f8805.compute: multiple items mixed — only one schedule3 output", () => {
  const result = compute([
    minimalItem({ section_1446_tax_withheld: 1000 }),
    minimalItem({ partnership_name: "DEF LP", section_1446_tax_withheld: 2000 }),
  ]);
  const schedule3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  assertEquals(schedule3Outputs.length, 1);
});

Deno.test("f8805.compute: one item with withholding, one without — only withheld amount routes", () => {
  const result = compute([
    minimalItem({ section_1446_tax_withheld: 5000 }),
    minimalItem({ partnership_name: "Zero LP" }), // no withholding
  ]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 5000);
});

Deno.test("f8805.compute: items use both section_1446 and total — sum uses section_1446 where available", () => {
  // Item 1: section_1446=3000 (takes precedence)
  // Item 2: total_tax_withheld=2000 (fallback, no section_1446)
  const result = compute([
    minimalItem({ section_1446_tax_withheld: 3000, total_tax_withheld: 9000 }),
    minimalItem({ partnership_name: "DEF LP", total_tax_withheld: 2000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 5000);
});

// =============================================================================
// 4. Hard Validation
// =============================================================================

Deno.test("f8805.compute: throws on negative section_1446_tax_withheld", () => {
  assertThrows(() => compute([minimalItem({ section_1446_tax_withheld: -500 })]), Error);
});

Deno.test("f8805.compute: throws on negative total_tax_withheld", () => {
  assertThrows(() => compute([minimalItem({ total_tax_withheld: -100 })]), Error);
});

// =============================================================================
// 5. Edge Cases
// =============================================================================

Deno.test("f8805.compute: partnership_ein optional — withholding still routes", () => {
  const result = compute([minimalItem({ section_1446_tax_withheld: 7000 })]);
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 7000);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8805.compute: smoke test — multiple partnerships, mixed withholding types", () => {
  const result = f8805.compute({ taxYear: 2025 }, {
    f8805s: [
      {
        partnership_name: "Global Commodities LP",
        partnership_ein: "12-3456789",
        ordinary_eic_allocable: 200000,
        section_1446_tax_withheld: 74000,
        total_tax_withheld: 74000,
      },
      {
        partnership_name: "Pacific Ventures LP",
        partnership_ein: "98-7654321",
        ordinary_eic_allocable: 50000,
        total_tax_withheld: 18500,
      },
      {
        partnership_name: "Atlantic Holdings LP",
        // no withholding amounts — should not contribute to credit
      },
    ],
  });
  // 74000 + 18500 = 92500
  const fields = fieldsOf(result.outputs, schedule3);
  assertEquals(fields?.line13_1446_withholding, 92500);
});
