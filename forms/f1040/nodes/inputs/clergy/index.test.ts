import { assertEquals, assertThrows } from "@std/assert";
import { clergy } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return clergy.compute({ taxYear: 2025 }, { clergys: items });
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
// 2. Non-ordained Minister — No Special Outputs
// =============================================================================

Deno.test("clergy.compute: non-ordained minister — no SE output", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    is_ordained_minister: false,
  })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

Deno.test("clergy.compute: is_ordained_minister omitted — no SE output", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
  })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

Deno.test("clergy.compute: non-ordained — no schedule1 housing exclusion output", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 10000,
    fair_market_rental_value: 15000,
    is_ordained_minister: false,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// =============================================================================
// 3. SE Tax Routing — Ordained, No Form 4361
// =============================================================================

Deno.test("clergy.compute: ordained minister routes to schedule_se", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    is_ordained_minister: true,
    has_4361_exemption: false,
  })]);
  assertEquals(findOutput(result, "schedule_se") !== undefined, true);
});

Deno.test("clergy.compute: SE base = ministerial_wages + housing_allowance_designated", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    is_ordained_minister: true,
    has_4361_exemption: false,
  })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 62000);
});

Deno.test("clergy.compute: SE base uses only wages when no housing allowance", () => {
  const result = compute([minimalItem({
    ministerial_wages: 40000,
    is_ordained_minister: true,
    has_4361_exemption: false,
  })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 40000);
});

Deno.test("clergy.compute: parsonage_value not included in SE base", () => {
  // SE base = wages + housing allowance (NOT parsonage)
  const result = compute([minimalItem({
    ministerial_wages: 40000,
    parsonage_value: 15000,
    is_ordained_minister: true,
    has_4361_exemption: false,
  })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 40000);
});

Deno.test("clergy.compute: SE base zero — no schedule_se output", () => {
  const result = compute([minimalItem({
    ministerial_wages: 0,
    housing_allowance_designated: 0,
    is_ordained_minister: true,
    has_4361_exemption: false,
  })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

// =============================================================================
// 4. Form 4361 Exemption — No SE Output
// =============================================================================

Deno.test("clergy.compute: has_4361_exemption = true — no schedule_se output", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    is_ordained_minister: true,
    has_4361_exemption: true,
  })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

Deno.test("clergy.compute: has_4361_exemption = true — still routes housing exclusion to schedule1", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 11000,
    fair_market_rental_value: 13000,
    is_ordained_minister: true,
    has_4361_exemption: true,
  })]);
  // Housing exclusion still applies even with 4361 exemption
  assertEquals(findOutput(result, "schedule1") !== undefined, true);
});

// =============================================================================
// 5. Housing Allowance Exclusion — Three-Way Minimum
// =============================================================================

Deno.test("clergy.compute: housing exclusion = min(designated, actual, fmrv)", () => {
  // designated=12000, actual=10000, fmrv=15000 → exclusion = 10000
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 10000,
    fair_market_rental_value: 15000,
    is_ordained_minister: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -10000);
});

Deno.test("clergy.compute: housing exclusion limited by designated amount", () => {
  // designated=8000, actual=12000, fmrv=15000 → exclusion = 8000
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 8000,
    actual_housing_expenses: 12000,
    fair_market_rental_value: 15000,
    is_ordained_minister: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -8000);
});

Deno.test("clergy.compute: housing exclusion limited by fmrv", () => {
  // designated=12000, actual=12000, fmrv=9000 → exclusion = 9000
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 12000,
    fair_market_rental_value: 9000,
    is_ordained_minister: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -9000);
});

Deno.test("clergy.compute: no housing exclusion when actual_housing_expenses is zero", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 0,
    fair_market_rental_value: 15000,
    is_ordained_minister: true,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("clergy.compute: no housing exclusion when fields are missing", () => {
  // No housing fields provided — no schedule1 output
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    is_ordained_minister: true,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// =============================================================================
// 6. Parsonage Exclusion
// =============================================================================

Deno.test("clergy.compute: parsonage_value > 0 routes exclusion to schedule1", () => {
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    parsonage_value: 15000,
    is_ordained_minister: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -15000);
});

Deno.test("clergy.compute: parsonage + housing allowance exclusions combined", () => {
  // parsonage=15000, housing exclusion=min(12000,10000,13000)=10000 → total exclusion = -25000
  const result = compute([minimalItem({
    ministerial_wages: 50000,
    housing_allowance_designated: 12000,
    actual_housing_expenses: 10000,
    fair_market_rental_value: 13000,
    parsonage_value: 15000,
    is_ordained_minister: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -25000);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("clergy.compute: throws on negative ministerial_wages", () => {
  assertThrows(() => compute([minimalItem({ ministerial_wages: -100 })]), Error);
});

Deno.test("clergy.compute: throws on negative housing_allowance_designated", () => {
  assertThrows(
    () => compute([minimalItem({ housing_allowance_designated: -500 })]),
    Error,
  );
});

Deno.test("clergy.compute: zero wages do not throw", () => {
  const result = compute([minimalItem({ ministerial_wages: 0, is_ordained_minister: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 8. Aggregation — Multiple Ministers
// =============================================================================

Deno.test("clergy.compute: multiple ordained ministers — SE bases summed", () => {
  const result = compute([
    minimalItem({ ministerial_wages: 30000, housing_allowance_designated: 6000, is_ordained_minister: true }),
    minimalItem({ ministerial_wages: 20000, housing_allowance_designated: 4000, is_ordained_minister: true }),
  ]);
  // (30000 + 6000) + (20000 + 4000) = 36000 + 24000 = 60000
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 60000);
});

Deno.test("clergy.compute: one ordained, one with 4361 exemption — only ordained routes to SE", () => {
  const result = compute([
    minimalItem({ ministerial_wages: 30000, housing_allowance_designated: 6000, is_ordained_minister: true, has_4361_exemption: false }),
    minimalItem({ ministerial_wages: 20000, housing_allowance_designated: 4000, is_ordained_minister: true, has_4361_exemption: true }),
  ]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 36000);
});

Deno.test("clergy.compute: housing exclusions from multiple ministers combined", () => {
  const result = compute([
    minimalItem({
      ministerial_wages: 30000,
      housing_allowance_designated: 10000,
      actual_housing_expenses: 9000,
      fair_market_rental_value: 12000,
      is_ordained_minister: true,
    }),
    minimalItem({
      ministerial_wages: 20000,
      housing_allowance_designated: 8000,
      actual_housing_expenses: 7000,
      fair_market_rental_value: 10000,
      is_ordained_minister: true,
    }),
  ]);
  // exclusion1 = min(10000, 9000, 12000) = 9000
  // exclusion2 = min(8000, 7000, 10000) = 7000
  // total = -16000
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -16000);
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("clergy.compute: smoke test — ordained minister with all fields", () => {
  const result = compute([
    minimalItem({
      ministerial_wages: 55000,
      housing_allowance_designated: 15000,
      actual_housing_expenses: 14000,
      fair_market_rental_value: 18000,
      parsonage_value: 0,
      is_ordained_minister: true,
      has_4361_exemption: false,
    }),
  ]);

  // SE base = 55000 + 15000 = 70000
  const seOut = findOutput(result, "schedule_se");
  assertEquals(seOut?.fields.net_profit_schedule_c, 70000);

  // housing exclusion = min(15000, 14000, 18000) = 14000
  const s1Out = findOutput(result, "schedule1");
  assertEquals(s1Out?.fields.line8z_other_income, -14000);
});
