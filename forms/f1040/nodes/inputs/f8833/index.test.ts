import { assertEquals, assertThrows } from "@std/assert";
import { f8833 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    treaty_country: "Canada",
    treaty_article: "Article XV",
    description_of_position: "Treaty exemption on pension income",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8833.compute({ taxYear: 2025 }, { f8833s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8833.inputSchema: valid minimal item passes", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [{ treaty_country: "Canada", treaty_article: "Art XV", description_of_position: "Pension" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8833.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8833.inputSchema.safeParse({ f8833s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: missing treaty_country fails", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [{ treaty_article: "Art XV", description_of_position: "Pension" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: missing treaty_article fails", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [{ treaty_country: "Canada", description_of_position: "Pension" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: missing description_of_position fails", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [{ treaty_country: "Canada", treaty_article: "Art XV" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: negative gross_amount fails", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [minimalItem({ gross_amount: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: negative amount_of_tax_reduction fails", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [minimalItem({ amount_of_tax_reduction: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8833.inputSchema: valid full item passes", () => {
  const parsed = f8833.inputSchema.safeParse({
    f8833s: [{
      treaty_country: "United Kingdom",
      treaty_article: "Article 17 paragraph 2",
      description_of_position: "Pension income exempt from US tax under UK treaty",
      gross_amount: 50000,
      amount_of_tax_reduction: 15000,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Output Routing — Disclosure Only
// =============================================================================

Deno.test("f8833.compute: single position — returns no outputs (disclosure only)", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8833.compute: item with all amounts — still no outputs", () => {
  const result = compute([minimalItem({ gross_amount: 50000, amount_of_tax_reduction: 15000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8833.compute: multiple positions — still no outputs", () => {
  const result = compute([
    minimalItem({ treaty_country: "Canada", treaty_article: "Art XV" }),
    minimalItem({ treaty_country: "United Kingdom", treaty_article: "Art 17" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8833.compute: result.outputs is an array", () => {
  const result = compute([minimalItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8833.compute: throws on negative gross_amount", () => {
  assertThrows(() => compute([minimalItem({ gross_amount: -500 })]), Error);
});

Deno.test("f8833.compute: throws on negative amount_of_tax_reduction", () => {
  assertThrows(() => compute([minimalItem({ amount_of_tax_reduction: -100 })]), Error);
});

Deno.test("f8833.compute: zero amounts do not throw", () => {
  const result = compute([minimalItem({ gross_amount: 0, amount_of_tax_reduction: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Edge Cases
// =============================================================================

Deno.test("f8833.compute: optional amounts absent — no outputs", () => {
  const result = compute([{ treaty_country: "Germany", treaty_article: "Art 18", description_of_position: "Dividend reduced rate" }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8833.compute: multiple treaty positions for same country — no outputs", () => {
  const result = compute([
    minimalItem({ treaty_country: "Canada", treaty_article: "Art XV" }),
    minimalItem({ treaty_country: "Canada", treaty_article: "Art XXI" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8833.compute: smoke test — multiple countries, amounts, all output empty", () => {
  const result = f8833.compute({ taxYear: 2025 }, {
    f8833s: [
      {
        treaty_country: "United Kingdom",
        treaty_article: "Article 17, paragraph 2",
        description_of_position: "Pension income exempt from US tax under UK-US tax treaty",
        gross_amount: 60000,
        amount_of_tax_reduction: 13200,
      },
      {
        treaty_country: "Canada",
        treaty_article: "Article XV",
        description_of_position: "Employment income reduction under Canada-US tax treaty",
        gross_amount: 30000,
        amount_of_tax_reduction: 6600,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});
