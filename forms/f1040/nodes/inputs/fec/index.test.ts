import { assertEquals, assertThrows } from "@std/assert";
import { fec } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    foreign_employer_name: "ACME Foreign Corp",
    country_code: "DE",
    compensation_amount: 50000,
    compensation_usd: 55000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return fec.compute({ taxYear: 2025, formType: "f1040" }, { fecs: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("fec.inputSchema: empty array fails (min 1)", () => {
  const parsed = fec.inputSchema.safeParse({ fecs: [] });
  assertEquals(parsed.success, false);
});

Deno.test("fec.inputSchema: negative compensation_usd fails", () => {
  const parsed = fec.inputSchema.safeParse({
    fecs: [minimalItem({ compensation_usd: -100 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("fec.compute: compensation_usd routes to f1040 line1a_wages with exact value", () => {
  const result = compute([minimalItem({ compensation_usd: 75000 })]);
  assertEquals(result.outputs[0].fields.line1a_wages, 75000);
});

Deno.test("fec.compute: compensation_usd = 0 → no output", () => {
  const result = compute([minimalItem({ compensation_usd: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("fec.compute: compensation_amount > 0 but compensation_usd = 0 → no output (USD is authoritative)", () => {
  // Could happen with treaty exemption; USD is what matters for tax routing
  const result = compute([minimalItem({ compensation_amount: 100000, compensation_usd: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("fec.compute: informational fields do not affect line1a_wages amount", () => {
  // same compensation_usd, different employer/country/currency/description
  const result1 = compute([minimalItem({
    foreign_employer_name: "Corp A", country_code: "FR", currency: "EUR",
    description: "Engineer", compensation_usd: 60000,
  })]);
  const result2 = compute([minimalItem({
    foreign_employer_name: "Corp B", country_code: "JP", currency: "JPY",
    description: "Analyst", compensation_usd: 60000,
  })]);
  assertEquals(result1.outputs[0].fields.line1a_wages, 60000);
  assertEquals(result2.outputs[0].fields.line1a_wages, 60000);
});

// =============================================================================
// 3. Aggregation — Multiple Employers
// =============================================================================

Deno.test("fec.compute: two employers — compensation_usd summed into single f1040 output", () => {
  const result = compute([
    minimalItem({ compensation_usd: 45000, country_code: "DE" }),
    minimalItem({ compensation_usd: 30000, country_code: "FR" }),
  ]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line1a_wages, 75000);
});

Deno.test("fec.compute: three employers — all compensation_usd summed correctly", () => {
  const result = compute([
    minimalItem({ compensation_usd: 20000, foreign_employer_name: "Corp A" }),
    minimalItem({ compensation_usd: 35000, foreign_employer_name: "Corp B" }),
    minimalItem({ compensation_usd: 15000, foreign_employer_name: "Corp C" }),
  ]);
  assertEquals(result.outputs[0].fields.line1a_wages, 70000);
});

Deno.test("fec.compute: one item zero USD, one positive — only positive counted", () => {
  const result = compute([
    minimalItem({ compensation_usd: 0 }),
    minimalItem({ compensation_usd: 40000 }),
  ]);
  assertEquals(result.outputs[0].fields.line1a_wages, 40000);
});

Deno.test("fec.compute: all items zero compensation_usd → no output", () => {
  const result = compute([
    minimalItem({ compensation_usd: 0 }),
    minimalItem({ compensation_usd: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Currency Conversion Precision
// =============================================================================

Deno.test("fec.compute: EUR compensation — converted USD value used exactly (80000 EUR → 87500 USD)", () => {
  const result = compute([minimalItem({
    compensation_amount: 80000,
    currency: "EUR",
    compensation_usd: 87500,
  })]);
  assertEquals(result.outputs[0].fields.line1a_wages, 87500);
});

Deno.test("fec.compute: JPY compensation — large foreign amount converts to small USD value", () => {
  // 5,000,000 JPY at ~0.0066 = 33000 USD
  const result = compute([minimalItem({
    compensation_amount: 5_000_000,
    currency: "JPY",
    compensation_usd: 33000,
  })]);
  assertEquals(result.outputs[0].fields.line1a_wages, 33000);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("fec.compute: throws on negative compensation_usd", () => {
  assertThrows(() => compute([minimalItem({ compensation_usd: -1000 })]), Error);
});

Deno.test("fec.compute: throws on negative compensation_amount", () => {
  assertThrows(() => compute([minimalItem({ compensation_amount: -500 })]), Error);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("fec.compute: smoke test — three foreign employers, total USD wages correct", () => {
  const result = compute([
    minimalItem({
      foreign_employer_name: "Siemens AG",
      country_code: "DE",
      compensation_amount: 80000,
      currency: "EUR",
      compensation_usd: 87500,
      description: "Senior engineer",
    }),
    minimalItem({
      foreign_employer_name: "BNP Paribas",
      country_code: "FR",
      compensation_amount: 60000,
      currency: "EUR",
      compensation_usd: 65400,
      description: "Financial analyst",
    }),
    minimalItem({
      foreign_employer_name: "Toyota",
      country_code: "JP",
      compensation_amount: 5000000,
      currency: "JPY",
      compensation_usd: 33000,
    }),
  ]);

  // Total = 87500 + 65400 + 33000 = 185900
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line1a_wages, 185900);
});
