import { assertEquals, assertAlmostEquals, assertThrows } from "@std/assert";
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
  return f8864.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8864: all fields optional — empty object passes", () => {
  const parsed = f8864.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8864: negative gallons_biodiesel fails", () => {
  assertEquals(f8864.inputSchema.safeParse({ gallons_biodiesel: -1 }).success, false);
});

Deno.test("f8864: negative gallons_agri_biodiesel fails", () => {
  assertEquals(f8864.inputSchema.safeParse({ gallons_agri_biodiesel: -1 }).success, false);
});

Deno.test("f8864: negative gallons_renewable_diesel fails", () => {
  assertEquals(f8864.inputSchema.safeParse({ gallons_renewable_diesel: -1 }).success, false);
});

Deno.test("f8864: negative gallons_saf fails", () => {
  assertEquals(f8864.inputSchema.safeParse({ gallons_saf: -1 }).success, false);
});

// =============================================================================
// 2. Biodiesel Credit — $1.00/gallon (IRC §40A(a)(1))
// =============================================================================

Deno.test("f8864: biodiesel credit = $1.00 per gallon", () => {
  // 1,000 gallons × $1.00 = $1,000
  const result = compute(minimalInput({ gallons_biodiesel: 1_000 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 1_000);
});

Deno.test("f8864: biodiesel credit scales linearly — 500 gallons = $500", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 500 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 500);
});

Deno.test("f8864: zero biodiesel gallons — no output", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 0 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Agri-Biodiesel Credit — $1.10/gallon (IRC §40A(b)(2),(4))
// =============================================================================

Deno.test("f8864: agri-biodiesel credit = $1.10 per gallon", () => {
  // 500 gallons × $1.10 = $550
  const result = compute(minimalInput({ gallons_agri_biodiesel: 500 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 550);
});

Deno.test("f8864: agri-biodiesel yields more credit than same gallons of biodiesel", () => {
  // 100 gallons biodiesel → $100; 100 gallons agri-biodiesel → $110
  const biodieselCredit = fieldsOf(
    compute(minimalInput({ gallons_biodiesel: 100 })).outputs,
    schedule3,
  )?.line6z_general_business_credit!;
  const agriCredit = fieldsOf(
    compute(minimalInput({ gallons_agri_biodiesel: 100 })).outputs,
    schedule3,
  )?.line6z_general_business_credit!;
  assertEquals(biodieselCredit, 100);
  assertAlmostEquals(agriCredit, 110, 0.001);
});

// =============================================================================
// 4. Renewable Diesel Credit — $1.00/gallon (IRC §40A(f))
// =============================================================================

Deno.test("f8864: renewable diesel credit = $1.00 per gallon", () => {
  // 2,000 gallons × $1.00 = $2,000
  const result = compute(minimalInput({ gallons_renewable_diesel: 2_000 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 2_000);
});

// =============================================================================
// 5. SAF Credit — $1.25/gallon base + $0.01/gallon per % above 50% GHG reduction
//    (IRC §40B(a)-(b))
// =============================================================================

Deno.test("f8864: SAF with GHG reduction at exactly 50% — no SAF credit", () => {
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 50 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8864: SAF with GHG reduction below 50% — no SAF credit", () => {
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 40 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8864: SAF with GHG reduction = 51% → $1.26/gallon", () => {
  // base $1.25 + (51 - 50) × $0.01 = $1.26; 1,000 × $1.26 = $1,260
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 51 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 1_260);
});

Deno.test("f8864: SAF with GHG reduction = 75% → $1.50/gallon", () => {
  // base $1.25 + (75 - 50) × $0.01 = $1.50; 1,000 × $1.50 = $1,500
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 75 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 1_500);
});

Deno.test("f8864: SAF with GHG reduction = 100% → $1.75/gallon", () => {
  // base $1.25 + (100 - 50) × $0.01 = $1.75; 1,000 × $1.75 = $1,750
  const result = compute(minimalInput({ gallons_saf: 1_000, saf_ghg_reduction_percentage: 100 }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 1_750);
});

Deno.test("f8864: SAF gallons provided but no GHG percentage — no SAF credit", () => {
  // saf_ghg_reduction_percentage defaults to 0 → ≤ 50 → no credit
  const result = compute(minimalInput({ gallons_saf: 1_000 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. All Zeros — No Output
// =============================================================================

Deno.test("f8864: all zeros — no output emitted", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Combined Fuel Types — credits summed into single output
// =============================================================================

Deno.test("f8864: biodiesel + agri-biodiesel credits summed", () => {
  // 1,000 × $1.00 + 500 × $1.10 = $1,000 + $550 = $1,550
  const result = compute(minimalInput({
    gallons_biodiesel: 1_000,
    gallons_agri_biodiesel: 500,
  }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 1_550);
});

Deno.test("f8864: all four fuel types combined into single schedule3 output", () => {
  // biodiesel:  1,000 × $1.00 = $1,000
  // agri:         500 × $1.10 = $550
  // renewable:  2,000 × $1.00 = $2,000
  // SAF: 1,000 × ($1.25 + 25 × $0.01) = 1,000 × $1.50 = $1,500
  // Total: $5,050
  const result = compute(minimalInput({
    gallons_biodiesel: 1_000,
    gallons_agri_biodiesel: 500,
    gallons_renewable_diesel: 2_000,
    gallons_saf: 1_000,
    saf_ghg_reduction_percentage: 75,
  }));
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 5_050);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 8. Routing
// =============================================================================

Deno.test("f8864: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute(minimalInput({ gallons_biodiesel: 100 }));
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit, 100);
});

// =============================================================================
// 9. Hard Validation — compute throws on invalid input
// =============================================================================

Deno.test("f8864: throws on negative gallons_biodiesel", () => {
  assertThrows(() => compute(minimalInput({ gallons_biodiesel: -1 })), Error);
});

Deno.test("f8864: throws on negative gallons_saf", () => {
  assertThrows(() => compute(minimalInput({ gallons_saf: -1 })), Error);
});

// =============================================================================
// 10. Realistic blender scenario
// =============================================================================

Deno.test("f8864: realistic blender scenario — multiple fuels at scale", () => {
  // biodiesel:  50,000 × $1.00 = $50,000
  // agri:       25,000 × $1.10 = $27,500
  // renewable:  10,000 × $1.00 = $10,000
  // SAF: 5,000 × ($1.25 + 30 × $0.01) = 5,000 × $1.55 = $7,750
  // Total: $95,250
  const result = compute({
    gallons_biodiesel: 50_000,
    gallons_agri_biodiesel: 25_000,
    gallons_renewable_diesel: 10_000,
    gallons_saf: 5_000,
    saf_ghg_reduction_percentage: 80,
  });
  assertEquals(fieldsOf(result.outputs, schedule3)?.line6z_general_business_credit, 95_250);
  assertEquals(result.outputs.length, 1);
});
