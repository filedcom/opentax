import { assertEquals, assertThrows } from "@std/assert";
import { f8903 } from "./index.ts";

function compute(input: Parameters<typeof f8903.compute>[1]) {
  return f8903.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("f8903.inputSchema: rejects negative qualified_production_activities_income", () => {
  const parsed = f8903.inputSchema.safeParse({
    qualified_production_activities_income: -1000,
    form_w2_wages: 80000,
  });
  assertEquals(parsed.success, false);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

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

// ── Standard 9% Rate ──────────────────────────────────────────────────────────

Deno.test("f8903.compute: deduction = 9% * QPAI when W-2 limit not binding", () => {
  // QPAI=100000, W2=200000 => tentative=9000, w2_limit=100000 => deduction=9000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 9000);
});

Deno.test("f8903.compute: routes to schedule1", () => {
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
  });
  assertEquals(result.outputs[0]?.nodeType, "schedule1");
});

// ── W-2 Wage Limit ────────────────────────────────────────────────────────────

Deno.test("f8903.compute: deduction limited by 50% of W-2 wages", () => {
  // QPAI=100000, W2=10000 => tentative=9000, w2_limit=5000 => deduction=5000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 10000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 5000);
});

// ── AGI Limit ─────────────────────────────────────────────────────────────────

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

Deno.test("f8903.compute: AGI >= QPAI does not reduce deduction", () => {
  // QPAI=100000, AGI=200000 => min(QPAI,AGI)=100000 => 9%*100000=9000
  const result = compute({
    qualified_production_activities_income: 100000,
    form_w2_wages: 200000,
    adjusted_gross_income: 200000,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 9000);
});

// ── Oil/Gas Rate ──────────────────────────────────────────────────────────────

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

// ── Validation ────────────────────────────────────────────────────────────────

Deno.test("f8903.compute: throws on missing qualified_production_activities_income", () => {
  assertThrows(
    () => f8903.compute({ taxYear: 2025, formType: "f1040" }, { form_w2_wages: 80000 } as Parameters<typeof f8903.compute>[1]),
    Error,
  );
});

Deno.test("f8903.compute: throws on missing form_w2_wages", () => {
  assertThrows(
    () =>
      f8903.compute(
        { taxYear: 2025, formType: "f1040" },
        { qualified_production_activities_income: 100000 } as Parameters<typeof f8903.compute>[1],
      ),
    Error,
  );
});

// ── Full Calculation ──────────────────────────────────────────────────────────

Deno.test("f8903.compute: all three limits interact — QPAI binding, W-2 not binding", () => {
  // QPAI=200000, AGI=250000, W2=100000
  // tentative = 9% * min(200000, 250000) = 18000
  // w2_limit = 50% * 100000 = 50000
  // deduction = min(18000, 50000) = 18000
  const result = compute({
    qualified_production_activities_income: 200000,
    form_w2_wages: 100000,
    adjusted_gross_income: 250000,
    oil_gas_rate: false,
  });
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields?.line24h_dpad, 18000);
});
