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
  return fec.compute({ taxYear: 2025 }, { fecs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("fec.inputSchema: valid minimal item passes", () => {
  const parsed = fec.inputSchema.safeParse({ fecs: [minimalItem()] });
  assertEquals(parsed.success, true);
});

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

Deno.test("fec.inputSchema: negative compensation_amount fails", () => {
  const parsed = fec.inputSchema.safeParse({
    fecs: [minimalItem({ compensation_amount: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("fec.inputSchema: valid full item with optional fields passes", () => {
  const parsed = fec.inputSchema.safeParse({
    fecs: [minimalItem({
      currency: "EUR",
      description: "Software engineer at Berlin tech firm",
    })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("fec.compute: compensation_usd > 0 → routes to f1040 line1a_wages", () => {
  const result = compute([minimalItem({ compensation_usd: 75000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1a_wages, 75000);
});

Deno.test("fec.compute: compensation_usd = 0 → no output", () => {
  const result = compute([minimalItem({ compensation_usd: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("fec.compute: foreign_employer_name is informational — does not affect output", () => {
  const result1 = compute([minimalItem({ foreign_employer_name: "Corp A", compensation_usd: 50000 })]);
  const result2 = compute([minimalItem({ foreign_employer_name: "Corp B", compensation_usd: 50000 })]);
  assertEquals(
    findOutput(result1, "f1040")!.fields.line1a_wages,
    findOutput(result2, "f1040")!.fields.line1a_wages,
  );
});

Deno.test("fec.compute: country_code is informational — does not affect output", () => {
  const result1 = compute([minimalItem({ country_code: "FR", compensation_usd: 60000 })]);
  const result2 = compute([minimalItem({ country_code: "JP", compensation_usd: 60000 })]);
  assertEquals(
    findOutput(result1, "f1040")!.fields.line1a_wages,
    findOutput(result2, "f1040")!.fields.line1a_wages,
  );
});

Deno.test("fec.compute: currency is informational — does not affect output", () => {
  const withCurrency = compute([minimalItem({ currency: "GBP", compensation_usd: 80000 })]);
  const withoutCurrency = compute([minimalItem({ compensation_usd: 80000 })]);
  assertEquals(
    findOutput(withCurrency, "f1040")!.fields.line1a_wages,
    findOutput(withoutCurrency, "f1040")!.fields.line1a_wages,
  );
});

Deno.test("fec.compute: description is informational — does not affect output", () => {
  const withDesc = compute([minimalItem({ description: "CTO role", compensation_usd: 200000 })]);
  const withoutDesc = compute([minimalItem({ compensation_usd: 200000 })]);
  assertEquals(
    findOutput(withDesc, "f1040")!.fields.line1a_wages,
    findOutput(withoutDesc, "f1040")!.fields.line1a_wages,
  );
});

// =============================================================================
// 3. Aggregation — Multiple Employers
// =============================================================================

Deno.test("fec.compute: multiple items — compensation_usd summed", () => {
  const result = compute([
    minimalItem({ compensation_usd: 45000, country_code: "DE" }),
    minimalItem({ compensation_usd: 30000, country_code: "FR" }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1a_wages, 75000);
});

Deno.test("fec.compute: three employers — all compensation summed", () => {
  const result = compute([
    minimalItem({ compensation_usd: 20000, foreign_employer_name: "Corp A" }),
    minimalItem({ compensation_usd: 35000, foreign_employer_name: "Corp B" }),
    minimalItem({ compensation_usd: 15000, foreign_employer_name: "Corp C" }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out!.fields.line1a_wages, 70000);
});

Deno.test("fec.compute: one item zero USD, one positive — only positive counted", () => {
  const result = compute([
    minimalItem({ compensation_usd: 0 }),
    minimalItem({ compensation_usd: 40000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out!.fields.line1a_wages, 40000);
});

// =============================================================================
// 4. Hard Validation
// =============================================================================

Deno.test("fec.compute: throws on negative compensation_usd", () => {
  assertThrows(() => compute([minimalItem({ compensation_usd: -1000 })]), Error);
});

Deno.test("fec.compute: throws on negative compensation_amount", () => {
  assertThrows(() => compute([minimalItem({ compensation_amount: -500 })]), Error);
});

Deno.test("fec.compute: zero compensation_usd does not throw", () => {
  const result = compute([minimalItem({ compensation_usd: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 5. Output Routing — single f1040 output
// =============================================================================

Deno.test("fec.compute: multiple items → single f1040 output (not multiple)", () => {
  const result = compute([
    minimalItem({ compensation_usd: 30000 }),
    minimalItem({ compensation_usd: 20000 }),
  ]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

// =============================================================================
// 6. Edge Cases
// =============================================================================

Deno.test("fec.compute: compensation_amount > 0 but compensation_usd = 0 → no output", () => {
  // Could happen with treaty exemption; USD is what matters for routing
  const result = compute([minimalItem({ compensation_amount: 100000, compensation_usd: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("fec.compute: all items have zero compensation_usd → no output", () => {
  const result = compute([
    minimalItem({ compensation_usd: 0 }),
    minimalItem({ compensation_usd: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("fec.compute: smoke test — multiple foreign employers with various fields", () => {
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
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1a_wages, 185900);
  assertEquals(result.outputs.length, 1);
});
