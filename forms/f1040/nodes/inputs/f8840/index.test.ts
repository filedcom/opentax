import { assertEquals, assertThrows } from "@std/assert";
import { f8840 } from "./index.ts";

function minimalInput(overrides: Record<string, unknown> = {}) {
  return {
    country_of_tax_home: "Canada",
    days_in_us_current_year: 183,
    has_applied_for_green_card: false,
    maintained_tax_home_entire_year: true,
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f8840.compute({ taxYear: 2025 }, input);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8840.inputSchema: valid minimal input passes", () => {
  const parsed = f8840.inputSchema.safeParse(minimalInput());
  assertEquals(parsed.success, true);
});

Deno.test("f8840.inputSchema: missing country_of_tax_home fails", () => {
  const { country_of_tax_home: _omit, ...rest } = minimalInput();
  const parsed = f8840.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: missing days_in_us_current_year fails", () => {
  const { days_in_us_current_year: _omit, ...rest } = minimalInput();
  const parsed = f8840.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: missing has_applied_for_green_card fails", () => {
  const { has_applied_for_green_card: _omit, ...rest } = minimalInput();
  const parsed = f8840.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: missing maintained_tax_home_entire_year fails", () => {
  const { maintained_tax_home_entire_year: _omit, ...rest } = minimalInput();
  const parsed = f8840.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: negative days_in_us_current_year fails", () => {
  const parsed = f8840.inputSchema.safeParse(minimalInput({ days_in_us_current_year: -1 }));
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: negative days_in_us_prior_year_1 fails", () => {
  const parsed = f8840.inputSchema.safeParse(minimalInput({ days_in_us_prior_year_1: -10 }));
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: negative days_in_us_prior_year_2 fails", () => {
  const parsed = f8840.inputSchema.safeParse(minimalInput({ days_in_us_prior_year_2: -5 }));
  assertEquals(parsed.success, false);
});

Deno.test("f8840.inputSchema: valid full input passes", () => {
  const parsed = f8840.inputSchema.safeParse({
    country_of_tax_home: "Germany",
    days_in_us_current_year: 150,
    days_in_us_prior_year_1: 60,
    days_in_us_prior_year_2: 30,
    has_applied_for_green_card: false,
    maintained_tax_home_entire_year: true,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Output Routing — Declaration/Election Only
// =============================================================================

Deno.test("f8840.compute: valid closer connection — returns no outputs (election only)", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs, []);
});

Deno.test("f8840.compute: with prior year days — returns no outputs", () => {
  const result = compute(minimalInput({ days_in_us_prior_year_1: 90, days_in_us_prior_year_2: 45 }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation Rules
// =============================================================================

Deno.test("f8840.compute: throws when has_applied_for_green_card is true", () => {
  assertThrows(
    () => compute(minimalInput({ has_applied_for_green_card: true })),
    Error,
  );
});

Deno.test("f8840.compute: does not throw when has_applied_for_green_card is false", () => {
  const result = compute(minimalInput({ has_applied_for_green_card: false }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Edge Cases
// =============================================================================

Deno.test("f8840.compute: maintained_tax_home_entire_year false — no outputs (still disclosure)", () => {
  // Even if the declaration is incomplete, we capture data and return no outputs
  const result = compute(minimalInput({ maintained_tax_home_entire_year: false }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8840.compute: zero days in US — no outputs", () => {
  const result = compute(minimalInput({ days_in_us_current_year: 0 }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8840.compute: prior year days absent — no outputs", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8840.compute: smoke test — full valid closer connection claim", () => {
  const result = f8840.compute({ taxYear: 2025 }, {
    country_of_tax_home: "United Kingdom",
    days_in_us_current_year: 200,
    days_in_us_prior_year_1: 80,
    days_in_us_prior_year_2: 30,
    has_applied_for_green_card: false,
    maintained_tax_home_entire_year: true,
  });
  assertEquals(result.outputs.length, 0);
});
