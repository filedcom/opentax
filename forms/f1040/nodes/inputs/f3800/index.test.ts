import { assertEquals, assertThrows } from "@std/assert";
import { f3800 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f3800.compute({ taxYear: 2025 }, { f3800s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: { nodeType: string }) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f3800.inputSchema: empty array fails (min 1)", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: valid minimal item (empty object) passes", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f3800.inputSchema: negative total_gbc fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ total_gbc: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative work_opportunity_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ work_opportunity_credit: -50 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative research_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ research_credit: -200 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative carryforward_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ carryforward_credit: -10 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative carryback_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ carryback_credit: -10 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: valid full item passes", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{
      total_gbc: 5000,
      work_opportunity_credit: 1000,
      research_credit: 2000,
      carryforward_credit: 500,
      carryback_credit: 300,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing — Component Credits
// =============================================================================

Deno.test("f3800.compute: total_gbc routes to schedule3.line6z_general_business_credit", () => {
  const result = compute([minimalItem({ total_gbc: 3000 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3000);
});

Deno.test("f3800.compute: work_opportunity_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ work_opportunity_credit: 1500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1500);
});

Deno.test("f3800.compute: research_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ research_credit: 4000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 4000);
});

Deno.test("f3800.compute: disabled_access_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ disabled_access_credit: 500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 500);
});

Deno.test("f3800.compute: employer_pension_startup_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ employer_pension_startup_credit: 750 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 750);
});

Deno.test("f3800.compute: employer_childcare_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ employer_childcare_credit: 600 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 600);
});

Deno.test("f3800.compute: small_employer_health_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ small_employer_health_credit: 2500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2500);
});

Deno.test("f3800.compute: new_markets_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ new_markets_credit: 10000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 10000);
});

Deno.test("f3800.compute: energy_efficient_home_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ energy_efficient_home_credit: 1000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1000);
});

Deno.test("f3800.compute: advanced_manufacturing_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ advanced_manufacturing_credit: 3500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3500);
});

Deno.test("f3800.compute: carryforward_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ carryforward_credit: 800 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 800);
});

Deno.test("f3800.compute: carryback_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ carryback_credit: 400 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 400);
});

Deno.test("f3800.compute: empty item — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3800.compute: all zero fields — no output", () => {
  const result = compute([minimalItem({ total_gbc: 0, research_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. total_gbc Override Logic
// =============================================================================

Deno.test("f3800.compute: total_gbc overrides sum of components", () => {
  // total_gbc = 5000, components sum = 1000+2000 = 3000, but total_gbc wins
  const result = compute([minimalItem({
    total_gbc: 5000,
    work_opportunity_credit: 1000,
    research_credit: 2000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5000);
});

Deno.test("f3800.compute: carryforward added to total_gbc override", () => {
  // total_gbc = 5000, carryforward = 1000; result = 6000
  const result = compute([minimalItem({
    total_gbc: 5000,
    carryforward_credit: 1000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 6000);
});

Deno.test("f3800.compute: carryback added to total_gbc override", () => {
  // total_gbc = 3000, carryback = 500; result = 3500
  const result = compute([minimalItem({
    total_gbc: 3000,
    carryback_credit: 500,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3500);
});

Deno.test("f3800.compute: total_gbc zero with non-zero carryforward — routes carryforward only", () => {
  const result = compute([minimalItem({
    total_gbc: 0,
    carryforward_credit: 1200,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1200);
});

// =============================================================================
// 4. Aggregation — Component Credits Summed
// =============================================================================

Deno.test("f3800.compute: multiple component credits summed", () => {
  const result = compute([minimalItem({
    work_opportunity_credit: 1000,
    research_credit: 2000,
    disabled_access_credit: 500,
    employer_pension_startup_credit: 750,
    carryforward_credit: 250,
  })]);
  // 1000 + 2000 + 500 + 750 + 250 = 4500
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 4500);
});

Deno.test("f3800.compute: all component credits plus carryovers summed", () => {
  const result = compute([minimalItem({
    work_opportunity_credit: 1000,
    research_credit: 1000,
    disabled_access_credit: 1000,
    employer_pension_startup_credit: 1000,
    employer_childcare_credit: 1000,
    small_employer_health_credit: 1000,
    new_markets_credit: 1000,
    energy_efficient_home_credit: 1000,
    advanced_manufacturing_credit: 1000,
    carryforward_credit: 500,
    carryback_credit: 500,
  })]);
  // 9 × 1000 + 500 + 500 = 10000
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 10000);
});

// =============================================================================
// 5. Aggregation — Multiple Items (Multiple Form 3800 Entries)
// =============================================================================

Deno.test("f3800.compute: multiple items summed across entries", () => {
  const result = compute([
    minimalItem({ work_opportunity_credit: 2000 }),
    minimalItem({ research_credit: 3000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5000);
});

Deno.test("f3800.compute: one empty item plus one with credit — only credit counts", () => {
  const result = compute([
    minimalItem(),
    minimalItem({ small_employer_health_credit: 1800 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1800);
});

Deno.test("f3800.compute: multiple items produce exactly one schedule3 output", () => {
  const result = compute([
    minimalItem({ work_opportunity_credit: 1000 }),
    minimalItem({ research_credit: 2000 }),
    minimalItem({ carryforward_credit: 500 }),
  ]);
  const schedule3Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule3");
  assertEquals(schedule3Outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3500);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f3800.compute: throws on negative total_gbc", () => {
  assertThrows(() => compute([minimalItem({ total_gbc: -1000 })]), Error);
});

Deno.test("f3800.compute: throws on negative work_opportunity_credit", () => {
  assertThrows(() => compute([minimalItem({ work_opportunity_credit: -500 })]), Error);
});

Deno.test("f3800.compute: throws on negative carryforward_credit", () => {
  assertThrows(() => compute([minimalItem({ carryforward_credit: -100 })]), Error);
});

Deno.test("f3800.compute: zero values do not throw", () => {
  const result = compute([minimalItem({ total_gbc: 0, research_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f3800.compute: carryforward and carryback only (no current-year) — routes correctly", () => {
  const result = compute([minimalItem({ carryforward_credit: 1500, carryback_credit: 300 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1800);
});

Deno.test("f3800.compute: single item zero with carryforward zero — no output", () => {
  const result = compute([minimalItem({ carryforward_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f3800.compute: smoke test — mixed override and carryovers across multiple items", () => {
  const result = compute([
    minimalItem({
      // First 3800 entry: pre-computed total from GBC screen
      total_gbc: 8000,
      carryforward_credit: 2000,
    }),
    minimalItem({
      // Second 3800 entry (GBC attachment): individual components
      work_opportunity_credit: 1500,
      research_credit: 3500,
      disabled_access_credit: 500,
      small_employer_health_credit: 2000,
      carryback_credit: 1000,
    }),
  ]);

  // Item 1: total_gbc override = 8000, + carryforward 2000 = 10000
  // Item 2: 1500 + 3500 + 500 + 2000 = 7500, + carryback 1000 = 8500
  // Grand total = 18500
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 18500);
  // Only one schedule3 output
  assertEquals(result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule3").length, 1);
});
