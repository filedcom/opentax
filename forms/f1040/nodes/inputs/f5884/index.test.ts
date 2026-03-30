import { assertEquals, assertThrows } from "@std/assert";
import { f5884, itemSchema, TargetGroup } from "./index.ts";
import type { z } from "zod";

type F5884Item = z.infer<typeof itemSchema>;

function minimalItem(overrides: Partial<F5884Item> = {}): F5884Item {
  return {
    target_group: TargetGroup.TanfRecipient,
    first_year_wages: 0,
    hours_worked: 0,
    ...overrides,
  };
}

function compute(items: F5884Item[]) {
  return f5884.compute({ f5884s: items });
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_empty_array", () => {
  assertThrows(() => f5884.compute({ f5884s: [] }), Error);
});

Deno.test("schema_rejects_negative_wages", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [{ target_group: TargetGroup.TanfRecipient, first_year_wages: -100, hours_worked: 400 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_item", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [{ target_group: TargetGroup.ExFelon, first_year_wages: 6000, hours_worked: 400 }],
  });
  assertEquals(result.success, true);
});

// ── Zero Output Cases ─────────────────────────────────────────────────────────

Deno.test("zero_wages_produces_no_output", () => {
  const result = compute([minimalItem({ first_year_wages: 0, hours_worked: 400 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("under_120_hours_produces_no_output", () => {
  const result = compute([minimalItem({ first_year_wages: 6000, hours_worked: 119 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("exactly_0_hours_produces_no_output", () => {
  const result = compute([minimalItem({ first_year_wages: 5000, hours_worked: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Standard Credit Rates ─────────────────────────────────────────────────────

Deno.test("120_to_399_hours_yields_25pct_rate", () => {
  // $6,000 × 25% = $1,500
  const result = compute([minimalItem({ first_year_wages: 6000, hours_worked: 200 })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1500);
});

Deno.test("400_plus_hours_yields_40pct_rate", () => {
  // $6,000 × 40% = $2,400
  const result = compute([minimalItem({ first_year_wages: 6000, hours_worked: 400 })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2400);
});

Deno.test("exactly_120_hours_yields_25pct_rate", () => {
  // $3,000 × 25% = $750
  const result = compute([minimalItem({ first_year_wages: 3000, hours_worked: 120 })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 750);
});

// ── Wage Cap ──────────────────────────────────────────────────────────────────

Deno.test("wages_capped_at_6000_for_standard_groups", () => {
  // $10,000 wages, 400+ hours → capped at $6,000 × 40% = $2,400
  const result = compute([minimalItem({ first_year_wages: 10000, hours_worked: 400 })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2400);
});

Deno.test("summer_youth_capped_at_3000", () => {
  // $5,000 wages, 400 hours, summer youth → capped at $3,000 × 40% = $1,200
  const result = compute([minimalItem({
    target_group: TargetGroup.SummerYouth,
    first_year_wages: 5000,
    hours_worked: 400,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1200);
});

// ── Long-Term Family Assistance (Group 9) ────────────────────────────────────

Deno.test("ltfa_uses_first_and_second_year_wages", () => {
  // First year: $10,000 × 40% = $4,000; Second year: $10,000 × 50% = $5,000 → total $9,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 10000,
    second_year_wages: 10000,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 9000);
});

Deno.test("ltfa_first_year_only_no_second_year", () => {
  // $8,000 × 40% = $3,200
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 8000,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3200);
});

Deno.test("ltfa_ignores_hours_worked", () => {
  // LTFA does not use hours_worked for rate determination
  const withHours = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 5000,
    hours_worked: 0,
  })]);
  const withoutHours = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 5000,
  })]);
  assertEquals(
    findSchedule3(withHours)?.fields.line6z_general_business_credit,
    findSchedule3(withoutHours)?.fields.line6z_general_business_credit,
  );
});

Deno.test("ltfa_wage_cap_10000_per_tier", () => {
  // $15,000 first-year → capped at $10,000 × 40% = $4,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 15000,
    second_year_wages: 15000,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 9000); // 4000 + 5000
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_employees_aggregate", () => {
  // Employee A: $6,000 × 40% = $2,400; Employee B: $4,000 × 40% = $1,600 → $4,000
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 400 }),
    minimalItem({ target_group: TargetGroup.ExFelon, first_year_wages: 4000, hours_worked: 400 }),
  ]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 4000);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute([minimalItem({ first_year_wages: 6000, hours_worked: 400 })]);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

// ── Veteran Subcategories ─────────────────────────────────────────────────────

Deno.test("disabled_veteran_cap_12000", () => {
  // $15,000 × 40% → capped at $12,000 × 40% = $4,800
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    first_year_wages: 15000,
    hours_worked: 400,
    is_disabled_veteran: true,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 4800);
});

Deno.test("disabled_veteran_long_term_cap_14000", () => {
  // $20,000 × 40% → capped at $14,000 × 40% = $5,600
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    first_year_wages: 20000,
    hours_worked: 400,
    is_disabled_veteran_long_term: true,
  })]);
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5600);
});
