import { assertEquals } from "@std/assert";
import { f8965 } from "./index.ts";

function minimalInput(overrides: Record<string, unknown> = {}) {
  return {
    coverage_exemption_type: "none",
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f8965.compute({ taxYear: 2025 }, input as Parameters<typeof f8965.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8965.inputSchema: valid minimal input passes", () => {
  const parsed = f8965.inputSchema.safeParse(minimalInput());
  assertEquals(parsed.success, true);
});

Deno.test("f8965.inputSchema: missing coverage_exemption_type fails", () => {
  const parsed = f8965.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});

Deno.test("f8965.inputSchema: invalid coverage_exemption_type fails", () => {
  const parsed = f8965.inputSchema.safeParse(minimalInput({ coverage_exemption_type: "invalid_type" }));
  assertEquals(parsed.success, false);
});

Deno.test("f8965.inputSchema: all valid coverage_exemption_types pass", () => {
  const types = ["none", "marketplace", "hardship", "other"];
  for (const coverage_exemption_type of types) {
    const parsed = f8965.inputSchema.safeParse(minimalInput({ coverage_exemption_type }));
    assertEquals(parsed.success, true, `Expected ${coverage_exemption_type} to pass`);
  }
});

Deno.test("f8965.inputSchema: optional exemption_certificate_number accepted", () => {
  const parsed = f8965.inputSchema.safeParse(minimalInput({ exemption_certificate_number: "ECN-12345" }));
  assertEquals(parsed.success, true);
});

Deno.test("f8965.inputSchema: optional months_without_coverage accepted as array of booleans", () => {
  const months = [true, false, true, false, true, false, true, false, true, false, true, false];
  const parsed = f8965.inputSchema.safeParse(minimalInput({ months_without_coverage: months }));
  assertEquals(parsed.success, true);
});

Deno.test("f8965.inputSchema: months_without_coverage must have exactly 12 elements", () => {
  const tooShort = [true, false, true];
  const parsed = f8965.inputSchema.safeParse(minimalInput({ months_without_coverage: tooShort }));
  assertEquals(parsed.success, false);
});

Deno.test("f8965.inputSchema: months_without_coverage with 13 elements fails", () => {
  const tooLong = [true, false, true, false, true, false, true, false, true, false, true, false, true];
  const parsed = f8965.inputSchema.safeParse(minimalInput({ months_without_coverage: tooLong }));
  assertEquals(parsed.success, false);
});

Deno.test("f8965.inputSchema: optional household_income_below_threshold accepted", () => {
  const parsed = f8965.inputSchema.safeParse(minimalInput({ household_income_below_threshold: true }));
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Compute — No Federal Outputs (Mandate Penalty Eliminated TY2019+)
// =============================================================================

Deno.test("f8965.compute: returns empty outputs for minimal input", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: returns empty outputs for marketplace exemption type", () => {
  const result = compute(minimalInput({ coverage_exemption_type: "marketplace" }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: returns empty outputs for hardship exemption type", () => {
  const result = compute(minimalInput({ coverage_exemption_type: "hardship" }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: returns empty outputs for other exemption type", () => {
  const result = compute(minimalInput({ coverage_exemption_type: "other" }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: result.outputs is an array", () => {
  const result = compute(minimalInput());
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 3. Edge Cases
// =============================================================================

Deno.test("f8965.compute: with all months without coverage still produces no outputs", () => {
  const months = [true, true, true, true, true, true, true, true, true, true, true, true];
  const result = compute(minimalInput({ months_without_coverage: months }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: with household_income_below_threshold=true still produces no outputs", () => {
  const result = compute(minimalInput({ household_income_below_threshold: true }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8965.compute: with exemption_certificate_number still produces no outputs", () => {
  const result = compute(minimalInput({
    coverage_exemption_type: "marketplace",
    exemption_certificate_number: "ECN-99999",
  }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8965.compute: smoke test — fully populated form produces no federal outputs", () => {
  const months = [false, false, true, true, true, true, true, true, true, true, true, true];
  const result = compute(minimalInput({
    coverage_exemption_type: "hardship",
    exemption_certificate_number: "ECN-54321",
    months_without_coverage: months,
    household_income_below_threshold: false,
  }));
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});
