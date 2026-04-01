import { assertEquals, assertThrows } from "@std/assert";
import { f8864 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalInput(overrides: Record<string, unknown> = {}) {
  return {
    gallons_biodiesel: 0,
    gallons_agri_biodiesel: 0,
    gallons_renewable_diesel: 0,
    gallons_saf: 0,
    saf_ghg_reduction_percentage: 0,
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f8864.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8864.inputSchema: valid minimal input passes", () => {
  const parsed = f8864.inputSchema.safeParse(minimalInput());
  assertEquals(parsed.success, true);
});

Deno.test("f8864.inputSchema: all fields optional — empty object passes", () => {
  const parsed = f8864.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8864.inputSchema: negative gallons_biodiesel fails", () => {
  const parsed = f8864.inputSchema.safeParse({ gallons_biodiesel: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8864.inputSchema: negative gallons_agri_biodiesel fails", () => {
  const parsed = f8864.inputSchema.safeParse({ gallons_agri_biodiesel: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8864.inputSchema: negative gallons_renewable_diesel fails", () => {
  const parsed = f8864.inputSchema.safeParse({ gallons_renewable_diesel: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8864.inputSchema: negative gallons_saf fails", () => {
  const parsed = f8864.inputSchema.safeParse({ gallons_saf: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8864.inputSchema: negative saf_ghg_reduction_percentage fails", () => {
  const parsed = f8864.inputSchema.safeParse({ saf_ghg_reduction_percentage: -1 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Biodiesel Credit — $1.00/gallon
// =============================================================================

Deno.test("f8864.compute: biodiesel credit = $1.00 per gallon", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 1_000 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_000);
});

Deno.test("f8864.compute: biodiesel = 0 — no contribution", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 0 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Agri-Biodiesel Credit — $1.10/gallon
// =============================================================================

Deno.test("f8864.compute: agri-biodiesel credit = $1.10 per gallon", () => {
  // 500 gallons × $1.10 = $550
  const result = compute(minimalInput({ gallons_agri_biodiesel: 500 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 550);
});

Deno.test("f8864.compute: agri-biodiesel more than biodiesel per gallon", () => {
  // Same gallons: agri should yield more credit
  const biodieselResult = compute(minimalInput({ gallons_biodiesel: 100 }));
  const agriResult = compute(minimalInput({ gallons_agri_biodiesel: 100 }));
  const biodieselCredit = fieldsOf(biodieselResult.outputs, schedule3)!.line6z_general_business_credit!;
  const agriCredit = fieldsOf(agriResult.outputs, schedule3)!.line6z_general_business_credit!;
  assertEquals(agriCredit > biodieselCredit, true);
});

// =============================================================================
// 4. Renewable Diesel Credit — $1.00/gallon
// =============================================================================

Deno.test("f8864.compute: renewable diesel credit = $1.00 per gallon", () => {
  const result = compute(minimalInput({ gallons_renewable_diesel: 2_000 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_000);
});

// =============================================================================
// 5. SAF Credit — $1.25/gallon base + $0.01/gallon per % above 50%
// =============================================================================

Deno.test("f8864.compute: SAF with GHG reduction = 50% or less — no SAF credit", () => {
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 50 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8864.compute: SAF with GHG reduction = 51% — $1.26/gallon", () => {
  // base = $1.25; bonus = (51 - 50) × $0.01 = $0.01; total = $1.26/gallon
  // 1000 × $1.26 = $1,260
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 51 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_260);
});

Deno.test("f8864.compute: SAF with GHG reduction = 75% — $1.50/gallon", () => {
  // bonus = (75 - 50) × $0.01 = $0.25; total = $1.50/gallon
  // 1000 × $1.50 = $1,500
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 75 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_500);
});

Deno.test("f8864.compute: SAF with GHG reduction = 100% — $1.75/gallon (max)", () => {
  // bonus = (100 - 50) × $0.01 = $0.50; total = $1.75/gallon
  // 1000 × $1.75 = $1,750
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 100 }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_750);
});

Deno.test("f8864.compute: SAF gallons > 0 but no GHG percentage provided — no SAF credit", () => {
  // saf_ghg_reduction_percentage defaults to 0 (or absent) → ≤ 50 → no credit
  const result = compute(minimalInput({ gallons_saf: 1_000 }));
  // gallons_saf=1000, saf_ghg=0 → no saf credit; total=0 → no output
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. All Zeros — No Output
// =============================================================================

Deno.test("f8864.compute: all zeros — no output emitted", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Combined Fuel Types
// =============================================================================

Deno.test("f8864.compute: biodiesel + agri-biodiesel — credits summed", () => {
  // 1000 × $1.00 + 500 × $1.10 = $1,000 + $550 = $1,550
  const result = compute(minimalInput({
    gallons_biodiesel: 1_000,
    gallons_agri_biodiesel: 500,
  }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_550);
});

Deno.test("f8864.compute: all four fuel types combined", () => {
  // biodiesel: 1000 × $1.00 = $1,000
  // agri: 500 × $1.10 = $550
  // renewable: 2000 × $1.00 = $2,000
  // SAF: 1000 × ($1.25 + 25 × $0.01) = 1000 × $1.50 = $1,500
  // Total: $5,050
  const result = compute(minimalInput({
    gallons_biodiesel: 1_000,
    gallons_agri_biodiesel: 500,
    gallons_renewable_diesel: 2_000,
    gallons_saf: 1_000,
    saf_ghg_reduction_percentage: 75,
  }));
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_050);
});

// =============================================================================
// 8. Output Routing
// =============================================================================

Deno.test("f8864.compute: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 100 }));
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
});

Deno.test("f8864.compute: does not route to schedule2", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 100 }));
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// =============================================================================
// 9. Hard Validation
// =============================================================================

Deno.test("f8864.compute: throws on negative gallons_biodiesel", () => {
  assertThrows(() => compute(minimalInput({ gallons_biodiesel: -1 })), Error);
});

Deno.test("f8864.compute: throws on negative gallons_saf", () => {
  assertThrows(() => compute(minimalInput({ gallons_saf: -1 })), Error);
});

// =============================================================================
// 10. Smoke Test
// =============================================================================

Deno.test("f8864.compute: smoke test — realistic blender scenario", () => {
  const result = compute({
    gallons_biodiesel: 50_000,
    gallons_agri_biodiesel: 25_000,
    gallons_renewable_diesel: 10_000,
    gallons_saf: 5_000,
    saf_ghg_reduction_percentage: 80,
  });
  // biodiesel: 50000 × $1.00 = $50,000
  // agri: 25000 × $1.10 = $27,500
  // renewable: 10000 × $1.00 = $10,000
  // SAF: 5000 × ($1.25 + 30 × $0.01) = 5000 × $1.55 = $7,750
  // Total: $95,250
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 95_250);
  assertEquals(result.outputs.length, 1);
});
