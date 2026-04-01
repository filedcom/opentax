import { assertEquals, assertThrows } from "@std/assert";
import { f8903 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8903.compute({ taxYear: 2025 }, input as Parameters<typeof f8903.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Validation — required fields and type constraints
// =============================================================================

Deno.test("f8903.inputSchema: minimal valid input passes", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: 100000,
    form_w2_wages: 80000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8903.inputSchema: full valid input passes", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: 100000,
    form_w2_wages: 80000,
    adjusted_gross_income: 120000,
    oil_gas_rate: false,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8903.inputSchema: missing qualified_production_activities_income fails", () => {
  const parsed = f8903.inputSchema.safeParse({
    form_w2_wages: 80000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8903.inputSchema: missing form_w2_wages fails", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: 100000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8903.inputSchema: negative qualified_production_activities_income fails", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: -1000,
    form_w2_wages: 80000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8903.inputSchema: negative form_w2_wages fails", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: 100000,
    form_w2_wages: -1,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8903.inputSchema: negative adjusted_gross_income fails", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: 100000,
    form_w2_wages: 80000,
    adjusted_gross_income: -5000,
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Calculation — standard 9% deduction rate
// =============================================================================

Deno.test("f8903.compute: standard case — routes to schedule1", () => {
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 80000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
});

Deno.test("f8903.compute: deduction = 9% * QPAI when W-2 limit not binding", () => {
  // QPAI=100000, W2=200000 => tentative=9000, w2_limit=100000 => deduction=9000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 9000);
});

Deno.test("f8903.compute: deduction limited by 50% of W-2 wages", () => {
  // QPAI=100000, W2=10000 => tentative=9000, w2_limit=5000 => deduction=5000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 10000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 5000);
});

Deno.test("f8903.compute: AGI limit is binding when AGI < QPAI", () => {
  // QPAI=100000, AGI=50000, W2=200000 => tentative=9%*50000=4500, w2_limit=100000 => deduction=4500
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
    adjusted_gross_income: 50000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 4500);
});

Deno.test("f8903.compute: oil_gas_rate=true applies 6% rate", () => {
  // QPAI=100000, W2=200000, oil_gas_rate=true => tentative=6%*100000=6000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
    oil_gas_rate: true,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 6000);
});

// =============================================================================
// 3. Zero-value cases
// =============================================================================

Deno.test("f8903.compute: zero QPAI returns no outputs", () => {
  const result = compute({
    qualified_production_activities_income: 0,
    form_w2_wages: 80000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8903.compute: zero W-2 wages limits deduction to zero (no output)", () => {
  // W-2 limit = 50% * 0 = 0 => deduction = 0
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 0,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8903.compute: zero AGI returns no outputs", () => {
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 80000,
    adjusted_gross_income: 0,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 4. Hard validation rules
// =============================================================================

Deno.test("f8903.compute: throws on missing qualified_production_activities_income", () => {
  assertThrows(() => compute({ form_w2_wages: 80000 }), Error);
});

Deno.test("f8903.compute: throws on missing form_w2_wages", () => {
  assertThrows(() => compute({ qualified_production_activities_income: 100000 }), Error);
});

// =============================================================================
// 5. Smoke test — full population
// =============================================================================

Deno.test("f8903.compute: smoke test — all fields populated, deduction computed correctly", () => {
  // QPAI=200000, AGI=250000, W2=100000
  // tentative = 9% * min(200000, 250000) = 9% * 200000 = 18000
  // w2_limit = 50% * 100000 = 50000
  // deduction = min(18000, 50000) = 18000
  const result = compute({
    qualified_production_activities_income: 200000,
    form_w2_wages: 100000,
    adjusted_gross_income: 250000,
    oil_gas_rate: false,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields?.line24h_dpad, 18000);
});
