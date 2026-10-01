import { assertEquals, assertThrows } from "@std/assert";
import { clergy } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return clergy.compute({ taxYear: 2025, formType: "f1040" }, { clergys: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("clergy.inputSchema: valid minimal item passes", () => {
  const parsed = clergy.inputSchema.safeParse({ clergys: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("clergy.inputSchema: empty array fails (min 1)", () => {
  const parsed = clergy.inputSchema.safeParse({ clergys: [] });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: negative ministerial_wages fails", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{ ministerial_wages: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: negative housing_allowance_designated fails", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{ housing_allowance_designated: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: negative actual_housing_expenses fails", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{ actual_housing_expenses: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: negative fair_market_rental_value fails", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{ fair_market_rental_value: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: negative parsonage_value fails", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{ parsonage_value: -2000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("clergy.inputSchema: valid full item passes", () => {
  const parsed = clergy.inputSchema.safeParse({
    clergys: [{
      ministerial_wages: 50000,
      housing_allowance_designated: 12000,
      actual_housing_expenses: 11000,
      fair_market_rental_value: 13000,
      parsonage_value: 0,
      has_4361_exemption: false,
      is_ordained_minister: true,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// =============================================================================
// 2. Non-ordained Minister — No Special Outputs
// =============================================================================

Deno.test("clergy.compute: is_ordained_minister false — no outputs", () => {
  const result = compute([{ is_ordained_minister: false, ministerial_wages: 50000, housing_allowance_designated: 20000 }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("clergy.compute: is_ordained_minister omitted — no outputs", () => {
  const result = compute([{ ministerial_wages: 50000, housing_allowance_designated: 20000 }]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. SE Earnings — Ordained, No Form 4361 (Pub 517, IRC §1402(a)(8))
// =============================================================================

Deno.test("clergy.compute: SE earnings = wages + housing allowance paid", () => {
  const result = compute([{ is_ordained_minister: true, ministerial_wages: 60000, housing_allowance_designated: 24000 }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 84000);
});

Deno.test("clergy.compute: SE earnings use allowance paid when it differs from designated", () => {
  const result = compute([{ is_ordained_minister: true, ministerial_wages: 60000, housing_allowance_designated: 24000, housing_allowance_paid: 20000 }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 80000);
});

Deno.test("clergy.compute: parsonage fair rental value IS included in SE earnings", () => {
  const result = compute([{ is_ordained_minister: true, ministerial_wages: 40000, parsonage_value: 18000 }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 58000);
});

Deno.test("clergy.compute: unreimbursed ministerial expenses reduce SE earnings", () => {
  const result = compute([{ is_ordained_minister: true, ministerial_wages: 40000, housing_allowance_designated: 20000, unreimbursed_ministerial_expenses: 3000 }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 57000);
});

Deno.test("clergy.compute: ministerial loss reaches Schedule SE", () => {
  const result = compute([{
    is_ordained_minister: true,
    ministerial_wages: 1_000,
    unreimbursed_ministerial_expenses: 2_000,
  }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, -1_000);
});

Deno.test("clergy.compute: SE earnings zero — no schedule_se output", () => {
  const result = compute([{ is_ordained_minister: true }]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

// =============================================================================
// 4. Form 4361 Exemption
// =============================================================================

Deno.test("clergy.compute: has_4361_exemption — no schedule_se output", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, ministerial_wages: 90000, housing_allowance_designated: 30000, actual_housing_expenses: 30000, fair_market_rental_value: 30000 }]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("clergy.compute: has_4361_exemption — excess allowance still taxable on line 1h", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000, actual_housing_expenses: 26000, fair_market_rental_value: 32000 }]);
  assertEquals(findOutput(result, "f1040")?.fields.line1h_other_earned, 4000);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

// =============================================================================
// 5. Housing Allowance — allowance left out of W-2 box 1 (the normal case)
// =============================================================================

Deno.test("clergy.compute: fully substantiated allowance — no income adjustment (no double exclusion)", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000, actual_housing_expenses: 34000, fair_market_rental_value: 36000 }]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("clergy.compute: excess over actual expenses → line 1h and AGI", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000, actual_housing_expenses: 25000, fair_market_rental_value: 40000 }]);
  assertEquals(findOutput(result, "f1040")?.fields.line1h_other_earned, 5000);
  assertEquals(findOutput(result, "agi_aggregator")?.fields.line1h_other_earned, 5000);
});

Deno.test("clergy.compute: excess over fair rental value → line 1h", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000, actual_housing_expenses: 35000, fair_market_rental_value: 27000 }]);
  assertEquals(findOutput(result, "f1040")?.fields.line1h_other_earned, 3000);
});

Deno.test("clergy.compute: spending above the designation does not create a deduction", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000, actual_housing_expenses: 45000, fair_market_rental_value: 45000 }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("clergy.compute: missing expense or rental value — whole allowance is taxable", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_designated: 30000 }]);
  assertEquals(findOutput(result, "f1040")?.fields.line1h_other_earned, 30000);
});

Deno.test("clergy.compute: parsonage in kind — no income adjustment", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, parsonage_value: 18000 }]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Housing Allowance — church included it in W-2 box 1 (uncommon)
// =============================================================================

Deno.test("clergy.compute: allowance inside box 1 — SE earnings do not count it twice", () => {
  const result = compute([{ is_ordained_minister: true, housing_allowance_included_in_w2_box1: true, ministerial_wages: 70000, housing_allowance_designated: 20000, actual_housing_expenses: 20000, fair_market_rental_value: 25000 }]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 70000);
});

Deno.test("clergy.compute: allowance inside box 1 — allowable amount subtracted on schedule1", () => {
  const result = compute([{ is_ordained_minister: true, has_4361_exemption: true, housing_allowance_included_in_w2_box1: true, housing_allowance_designated: 30000, actual_housing_expenses: 25000, fair_market_rental_value: 40000 }]);
  assertEquals(findOutput(result, "schedule1")?.fields.line8z_other_income, -25000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("clergy.compute: throws on negative ministerial_wages", () => {
  assertThrows(() => compute([{ ministerial_wages: -1 }]));
});

Deno.test("clergy.compute: throws on negative housing_allowance_paid", () => {
  assertThrows(() => compute([{ housing_allowance_paid: -1 }]));
});

// =============================================================================
// 8. Aggregation — Multiple Ministers
// =============================================================================

Deno.test("clergy.compute: two ministers — SE earnings and excess summed separately", () => {
  const result = compute([
    { is_ordained_minister: true, ministerial_wages: 40000, housing_allowance_designated: 10000, actual_housing_expenses: 8000, fair_market_rental_value: 20000 },
    { is_ordained_minister: true, has_4361_exemption: true, ministerial_wages: 30000, housing_allowance_designated: 12000, actual_housing_expenses: 9000, fair_market_rental_value: 20000 },
  ]);
  assertEquals(findOutput(result, "schedule_se")?.fields.ministerial_se_earnings, 50000);
  assertEquals(findOutput(result, "f1040")?.fields.line1h_other_earned, 5000);
});
