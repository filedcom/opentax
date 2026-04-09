import { assertEquals, assertThrows } from "@std/assert";
import { f8912, BondType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    bond_type: BondType.CREB,
    face_amount: 0,
    credit_rate: 0,
    holding_period_days: 0,
    total_days_in_period: 365,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8912.compute({ taxYear: 2025, formType: "f1040" }, { f8912s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8912.inputSchema: valid minimal item passes", () => {
  const parsed = f8912.inputSchema.safeParse({
    f8912s: [{
      bond_type: BondType.CREB,
      face_amount: 10_000,
      credit_rate: 0.045,
      holding_period_days: 365,
      total_days_in_period: 365,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8912.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8912.inputSchema.safeParse({ f8912s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8912.inputSchema: all bond types accepted", () => {
  for (const bondType of Object.values(BondType)) {
    const parsed = f8912.inputSchema.safeParse({
      f8912s: [{ bond_type: bondType, face_amount: 10_000, credit_rate: 0.05, holding_period_days: 365, total_days_in_period: 365 }],
    });
    assertEquals(parsed.success, true, `BondType.${bondType} should be valid`);
  }
});

// =============================================================================
// 2. Per-Bond Credit Calculation
// =============================================================================

Deno.test("f8912.compute: full year holding = face × rate", () => {
  // 10,000 × 0.05 × (365/365) = 500
  const result = compute([minimalItem({
    bond_type: BondType.CREB,
    face_amount: 10_000,
    credit_rate: 0.05,
    holding_period_days: 365,
    total_days_in_period: 365,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 500);
});

Deno.test("f8912.compute: partial year holding prorates credit", () => {
  // 10,000 × 0.10 × (182/365) ≈ 498.63
  const result = compute([minimalItem({
    bond_type: BondType.NEW_CREB,
    face_amount: 10_000,
    credit_rate: 0.10,
    holding_period_days: 182,
    total_days_in_period: 365,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  // Check approximate value (floating point)
  const expected = 10_000 * 0.10 * (182 / 365);
  assertEquals(Math.abs((fields.line6z_general_business_credit ?? 0) - expected) < 0.01, true);
});

Deno.test("f8912.compute: zero face_amount — no output", () => {
  const result = compute([minimalItem({
    bond_type: BondType.QECB,
    face_amount: 0,
    credit_rate: 0.05,
    holding_period_days: 365,
    total_days_in_period: 365,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8912.compute: zero credit_rate — no output", () => {
  const result = compute([minimalItem({
    bond_type: BondType.BAB_DIRECT,
    face_amount: 100_000,
    credit_rate: 0,
    holding_period_days: 365,
    total_days_in_period: 365,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8912.compute: zero holding days — no output", () => {
  const result = compute([minimalItem({
    bond_type: BondType.QZAB,
    face_amount: 100_000,
    credit_rate: 0.05,
    holding_period_days: 0,
    total_days_in_period: 365,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8912.compute: routes to schedule3 line6z_general_business_credit", () => {
  // 50,000 × 0.06 × 1.0 = 3,000
  const result = compute([minimalItem({
    bond_type: BondType.QSCB,
    face_amount: 50_000,
    credit_rate: 0.06,
    holding_period_days: 365,
    total_days_in_period: 365,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3_000);
});

// =============================================================================
// 3. Aggregation — Multiple Bonds
// =============================================================================

Deno.test("f8912.compute: multiple bonds — credits summed", () => {
  // Bond 1: 10,000 × 0.05 × 1.0 = 500
  // Bond 2: 20,000 × 0.04 × 1.0 = 800
  // Total: 1,300
  const result = compute([
    minimalItem({ bond_type: BondType.CREB, face_amount: 10_000, credit_rate: 0.05, holding_period_days: 365, total_days_in_period: 365 }),
    minimalItem({ bond_type: BondType.QECB, face_amount: 20_000, credit_rate: 0.04, holding_period_days: 365, total_days_in_period: 365 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_300);
});

Deno.test("f8912.compute: multiple bonds — only one schedule3 output", () => {
  const result = compute([
    minimalItem({ bond_type: BondType.CREB, face_amount: 10_000, credit_rate: 0.05, holding_period_days: 365, total_days_in_period: 365 }),
    minimalItem({ bond_type: BondType.QECB, face_amount: 20_000, credit_rate: 0.04, holding_period_days: 365, total_days_in_period: 365 }),
  ]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 4. Leap Year
// =============================================================================

Deno.test("f8912.compute: 366-day year (leap year) — uses correct denominator", () => {
  // 10,000 × 0.05 × (366/366) = 500
  const result = compute([minimalItem({
    bond_type: BondType.CREB,
    face_amount: 10_000,
    credit_rate: 0.05,
    holding_period_days: 366,
    total_days_in_period: 366,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 500);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8912.compute: throws on total_days_in_period = 0", () => {
  assertThrows(() => compute([minimalItem({ bond_type: BondType.CREB, face_amount: 10_000, credit_rate: 0.05, holding_period_days: 10, total_days_in_period: 0 })]), Error);
});

Deno.test("f8912.compute: zero face does not throw", () => {
  const result = compute([minimalItem({ bond_type: BondType.CREB, face_amount: 0, credit_rate: 0.05, holding_period_days: 365, total_days_in_period: 365 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Edge Cases
// =============================================================================

Deno.test("f8912.compute: holding_period_days > total_days — still calculates", () => {
  // Not realistic but edge case — formula still works
  const result = compute([minimalItem({
    bond_type: BondType.NEW_CREB,
    face_amount: 10_000,
    credit_rate: 0.05,
    holding_period_days: 400,
    total_days_in_period: 365,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  const expected = 10_000 * 0.05 * (400 / 365);
  assertEquals(Math.abs((fields.line6z_general_business_credit ?? 0) - expected) < 0.01, true);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("f8912.compute: smoke test — mixed bond types, partial years", () => {
  const result = compute([
    minimalItem({ bond_type: BondType.CREB, face_amount: 100_000, credit_rate: 0.05, holding_period_days: 365, total_days_in_period: 365 }),
    minimalItem({ bond_type: BondType.BAB_DIRECT, face_amount: 200_000, credit_rate: 0.035, holding_period_days: 182, total_days_in_period: 365 }),
    minimalItem({ bond_type: BondType.QECB, face_amount: 50_000, credit_rate: 0.045, holding_period_days: 100, total_days_in_period: 365 }),
  ]);
  // Bond 1: 100,000 × 0.05 × 1.0 = 5,000
  // Bond 2: 200,000 × 0.035 × (182/365) ≈ 3,491.78
  // Bond 3: 50,000 × 0.045 × (100/365) ≈ 616.44
  // Total ≈ 9,108.22
  const fields = fieldsOf(result.outputs, schedule3)!;
  const expected = 5_000 + (200_000 * 0.035 * 182 / 365) + (50_000 * 0.045 * 100 / 365);
  assertEquals(Math.abs((fields.line6z_general_business_credit ?? 0) - expected) < 0.01, true);
});
