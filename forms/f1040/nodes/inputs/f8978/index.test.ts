import { assertEquals, assertThrows } from "@std/assert";
import { f8978 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function compute(input: Parameters<typeof f8978.compute>[1]) {
  return f8978.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8978.inputSchema: valid minimal input passes", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 50_000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8978.inputSchema: reviewed_tax_year required", () => {
  const parsed = f8978.inputSchema.safeParse({
    positive_adjustments_share: 50_000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8978.inputSchema: reviewed_tax_year below 2018 fails", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2017,
    positive_adjustments_share: 50_000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8978.inputSchema: negative positive_adjustments_share fails", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    positive_adjustments_share: -1000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8978.inputSchema: negative negative_adjustments_share fails", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    negative_adjustments_share: -500,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8978.inputSchema: partner_tax_rate must be between 0 and 1", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 50_000,
    partner_tax_rate: 1.5,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8978.inputSchema: partner_tax_rate of 0 passes", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 50_000,
    partner_tax_rate: 0,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8978.inputSchema: valid full input passes", () => {
  const parsed = f8978.inputSchema.safeParse({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 100_000,
    negative_adjustments_share: 10_000,
    partner_tax_rate: 0.35,
    intervening_year_adjustments: -2_000,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Calculation — Basic Tax
// =============================================================================

Deno.test("f8978.compute: basic additional tax = positive_adjustments × default rate (0.37)", () => {
  const result = compute({ reviewed_tax_year: 2022, positive_adjustments_share: 100_000 });
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 100,000 × 0.37 = 37,000
  assertEquals(fields.line17z_other_additional_taxes, 37_000);
});

Deno.test("f8978.compute: uses explicit partner_tax_rate when provided", () => {
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 100_000,
    partner_tax_rate: 0.24,
  });
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 100,000 × 0.24 = 24,000
  assertEquals(fields.line17z_other_additional_taxes, 24_000);
});

Deno.test("f8978.compute: negative_adjustments reduce tax", () => {
  // positive: 100,000 × 0.37 = 37,000
  // negative: 20,000 × 0.37 = 7,400
  // net: 37,000 - 7,400 = 29,600
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 100_000,
    negative_adjustments_share: 20_000,
    partner_tax_rate: 0.37,
  });
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 29_600);
});

Deno.test("f8978.compute: intervening_year_adjustments reduce total tax", () => {
  // positive: 100,000 × 0.37 = 37,000
  // intervening: -5,000
  // net: 37,000 - 5,000 = 32,000
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 100_000,
    partner_tax_rate: 0.37,
    intervening_year_adjustments: -5_000,
  });
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 32_000);
});

Deno.test("f8978.compute: intervening_year_adjustments can be positive (increase tax)", () => {
  // positive: 50,000 × 0.37 = 18,500
  // intervening: +2,000
  // net: 18,500 + 2,000 = 20,500
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 50_000,
    partner_tax_rate: 0.37,
    intervening_year_adjustments: 2_000,
  });
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 20_500);
});

// =============================================================================
// 3. Floors and Edge Cases
// =============================================================================

Deno.test("f8978.compute: negative adjustments exceed positive — floors at zero, no output", () => {
  // negative > positive → net would be negative → floor at 0
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 10_000,
    negative_adjustments_share: 50_000,
    partner_tax_rate: 0.37,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8978.compute: zero positive_adjustments — no output", () => {
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8978.compute: no adjustments at all — no output", () => {
  const result = compute({
    reviewed_tax_year: 2022,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8978.compute: intervening adjustments drive total negative — floors at zero, no output", () => {
  const result = compute({
    reviewed_tax_year: 2022,
    positive_adjustments_share: 10_000,
    partner_tax_rate: 0.37,
    intervening_year_adjustments: -100_000,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Output Routing
// =============================================================================

Deno.test("f8978.compute: routes to schedule2 line17z_other_additional_taxes", () => {
  const result = compute({ reviewed_tax_year: 2022, positive_adjustments_share: 50_000 });
  // 50,000 × 0.37 = 18,500
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 18_500);
});

Deno.test("f8978.compute: only one output", () => {
  const result = compute({ reviewed_tax_year: 2022, positive_adjustments_share: 50_000 });
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 5. Reviewed Year Validation
// =============================================================================

Deno.test("f8978.compute: throws if reviewed_tax_year < 2018", () => {
  assertThrows(() => compute({ reviewed_tax_year: 2015, positive_adjustments_share: 50_000 }), Error);
});

Deno.test("f8978.compute: reviewed_tax_year 2018 is valid", () => {
  const result = compute({ reviewed_tax_year: 2018, positive_adjustments_share: 50_000 });
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8978.compute: smoke test — full input with all fields", () => {
  const result = compute({
    reviewed_tax_year: 2021,
    positive_adjustments_share: 200_000,
    negative_adjustments_share: 30_000,
    partner_tax_rate: 0.35,
    intervening_year_adjustments: -5_000,
  });
  // positive_tax = 200,000 × 0.35 = 70,000
  // negative_effect = 30,000 × 0.35 = 10,500
  // net = 70,000 - 10,500 - 5,000 = 54,500
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 54_500);
});
