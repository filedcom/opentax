import { assertEquals, assertThrows } from "@std/assert";
import { f8283, FMVMethod } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";

function compute(input: Record<string, unknown>) {
  return f8283.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof f8283.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8283.inputSchema: empty input (no items) passes validation", () => {
  const parsed = f8283.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: empty arrays pass validation", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [],
    section_b_items: [],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: negative section A fmv fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: negative section B fmv fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_b_items: [{ fmv: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: negative cost_or_adjusted_basis fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ cost_or_adjusted_basis: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: valid FMVMethod passes", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv: 300, fmv_method: FMVMethod.ThriftShopValue }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: invalid FMVMethod fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv_method: "INVALID_METHOD" }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Section Routing
// =============================================================================

Deno.test("f8283.compute: section A item routes fmv to schedule_a line_12_noncash_contributions", () => {
  const result = compute({ section_a_items: [{ fmv: 300 }] });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 300);
});

Deno.test("f8283.compute: section B item routes fmv to schedule_a line_12_noncash_contributions", () => {
  const result = compute({ section_b_items: [{ fmv: 6000 }] });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 6000);
});

Deno.test("f8283.compute: zero fmv — no schedule_a output", () => {
  const result = compute({ section_a_items: [{ fmv: 0 }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: no items — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: empty arrays — no outputs", () => {
  const result = compute({ section_a_items: [], section_b_items: [] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Capital Gain Property Basis Limitation (Section B)
// =============================================================================

Deno.test("f8283.compute: section B capital gain property — limited to cost basis when lower", () => {
  const result = compute({
    section_b_items: [{
      fmv: 10000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 4000);
});

Deno.test("f8283.compute: section B capital gain property — uses fmv when fmv < basis", () => {
  const result = compute({
    section_b_items: [{
      fmv: 3000,
      cost_or_adjusted_basis: 5000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 3000);
});

Deno.test("f8283.compute: section B NOT capital gain property — uses full fmv", () => {
  const result = compute({
    section_b_items: [{
      fmv: 10000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: false,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 10000);
});

// =============================================================================
// 4. Aggregation
// =============================================================================

Deno.test("f8283.compute: multiple section A items — fmv summed", () => {
  const result = compute({
    section_a_items: [{ fmv: 200 }, { fmv: 350 }, { fmv: 150 }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 700);
});

Deno.test("f8283.compute: section A + section B items combined", () => {
  const result = compute({
    section_a_items: [{ fmv: 1000 }],
    section_b_items: [{ fmv: 6000 }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 7000);
});

Deno.test("f8283.compute: section B with capital gain basis limitation combined with section A", () => {
  const result = compute({
    section_a_items: [{ fmv: 500 }],
    section_b_items: [{ fmv: 8000, cost_or_adjusted_basis: 3000, is_capital_gain_property: true }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  // 500 + 3000 (limited basis) = 3500
  assertEquals(fields.line_12_noncash_contributions, 3500);
});

// =============================================================================
// 5. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("f8283.compute: only property description — no outputs", () => {
  const result = compute({ section_a_items: [{ property_description: "Used clothing" }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: only date fields — no outputs", () => {
  const result = compute({
    section_a_items: [{ date_acquired: "2020-01-15", date_contributed: "2025-03-10" }],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: vehicle flag only — no outputs without fmv", () => {
  const result = compute({ section_a_items: [{ is_vehicle: true }] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f8283.compute: throws on negative fmv in section A", () => {
  assertThrows(() => compute({ section_a_items: [{ fmv: -100 }] }), Error);
});

Deno.test("f8283.compute: throws on negative fmv in section B", () => {
  assertThrows(() => compute({ section_b_items: [{ fmv: -500 }] }), Error);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8283.compute: section B capital gain with no basis — uses full fmv", () => {
  const result = compute({
    section_b_items: [{ fmv: 5000, is_capital_gain_property: true }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 5000);
});

Deno.test("f8283.compute: fmv equals basis — uses fmv exactly", () => {
  const result = compute({
    section_b_items: [{ fmv: 4000, cost_or_adjusted_basis: 4000, is_capital_gain_property: true }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 4000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8283.compute: smoke test — section A and section B items combined", () => {
  const result = compute({
    section_a_items: [
      { property_description: "Used clothing", fmv: 250, fmv_method: FMVMethod.ThriftShopValue, date_contributed: "2025-11-15" },
      { property_description: "Books", fmv: 75, fmv_method: FMVMethod.CatalogValue },
    ],
    section_b_items: [
      {
        property_description: "Artwork",
        fmv: 12000,
        cost_or_adjusted_basis: 8000,
        is_capital_gain_property: true,
        appraiser_name: "John Smith",
      },
    ],
  });

  const fields = fieldsOf(result.outputs, schedule_a)!;
  // Section A: 250 + 75 = 325; Section B: limited to 8000
  assertEquals(fields.line_12_noncash_contributions, 8325);
});
