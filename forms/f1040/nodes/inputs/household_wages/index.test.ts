import { assertEquals, assertThrows } from "@std/assert";
import { household_wages } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    wages_received: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return household_wages.compute({ taxYear: 2025, formType: "f1040" }, { household_wages: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("household_wages.inputSchema: valid minimal item passes", () => {
  const parsed = household_wages.inputSchema.safeParse({
    household_wages: [minimalItem()],
  });
  assertEquals(parsed.success, true);
});

Deno.test("household_wages.inputSchema: empty array fails (min 1)", () => {
  const parsed = household_wages.inputSchema.safeParse({ household_wages: [] });
  assertEquals(parsed.success, false);
});

Deno.test("household_wages.inputSchema: negative wages_received fails", () => {
  const parsed = household_wages.inputSchema.safeParse({
    household_wages: [minimalItem({ wages_received: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("household_wages.inputSchema: negative federal_income_tax_withheld fails", () => {
  const parsed = household_wages.inputSchema.safeParse({
    household_wages: [minimalItem({ federal_income_tax_withheld: -50 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("household_wages.inputSchema: negative ss_tax_withheld fails", () => {
  const parsed = household_wages.inputSchema.safeParse({
    household_wages: [minimalItem({ ss_tax_withheld: -10 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("household_wages.inputSchema: valid full item passes", () => {
  const parsed = household_wages.inputSchema.safeParse({
    household_wages: [minimalItem({
      wages_received: 25000,
      federal_income_tax_withheld: 3000,
      social_security_wages: 25000,
      medicare_wages: 25000,
      ss_tax_withheld: 1550,
      medicare_tax_withheld: 362.50,
      employer_name: "Smith Family",
      employer_ein: "12-3456789",
    })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing to f1040
// =============================================================================

Deno.test("household_wages.compute: wages_received > 0 → routes to f1040 line1b_household_wages", () => {
  const result = compute([minimalItem({ wages_received: 20000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1b_household_wages, 20000);
});

Deno.test("household_wages.compute: wages_received = 0 → no f1040 output", () => {
  const result = compute([minimalItem({ wages_received: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("household_wages.compute: federal_income_tax_withheld > 0 → routes to f1040 line25a_w2_withheld", () => {
  const result = compute([minimalItem({ wages_received: 20000, federal_income_tax_withheld: 3000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line25a_w2_withheld, 3000);
});

Deno.test("household_wages.compute: employer_name and employer_ein are informational only — no output effect", () => {
  const withInfo = compute([minimalItem({
    wages_received: 10000,
    employer_name: "Johnson Family",
    employer_ein: "99-1234567",
  })]);
  const withoutInfo = compute([minimalItem({ wages_received: 10000 })]);
  const outWith = findOutput(withInfo, "f1040");
  const outWithout = findOutput(withoutInfo, "f1040");
  assertEquals(outWith!.fields.line1b_household_wages, outWithout!.fields.line1b_household_wages);
});

// =============================================================================
// 3. Aggregation — Multiple Items
// =============================================================================

Deno.test("household_wages.compute: multiple items — wages summed", () => {
  const result = compute([
    minimalItem({ wages_received: 15000 }),
    minimalItem({ wages_received: 10000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1b_household_wages, 25000);
});

Deno.test("household_wages.compute: multiple items — withholding summed", () => {
  const result = compute([
    minimalItem({ wages_received: 15000, federal_income_tax_withheld: 2000 }),
    minimalItem({ wages_received: 10000, federal_income_tax_withheld: 1500 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line25a_w2_withheld, 3500);
});

Deno.test("household_wages.compute: one item zero wages, one item positive wages → routes positive only", () => {
  const result = compute([
    minimalItem({ wages_received: 0 }),
    minimalItem({ wages_received: 5000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1b_household_wages, 5000);
});

// =============================================================================
// 4. Withholding Fields — No Separate Output
// =============================================================================

Deno.test("household_wages.compute: ss_tax_withheld does not create separate output", () => {
  const result = compute([minimalItem({ wages_received: 20000, ss_tax_withheld: 1240 })]);
  // Only one output to f1040
  assertEquals(result.outputs.length, 1);
});

Deno.test("household_wages.compute: medicare_tax_withheld routes to form8959", () => {
  const result = compute([minimalItem({ wages_received: 20000, medicare_tax_withheld: 290 })]);
  // f1040 output for wages + form8959 output for Medicare withholding
  assertEquals(result.outputs.length, 2);
  const f8959 = findOutput(result, "form8959");
  assertEquals(f8959?.fields?.medicare_withheld, 290);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("household_wages.compute: throws on negative wages_received", () => {
  assertThrows(() => compute([minimalItem({ wages_received: -500 })]), Error);
});

Deno.test("household_wages.compute: zero wages does not throw", () => {
  const result = compute([minimalItem({ wages_received: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Output Routing — single f1040 output with merged fields
// =============================================================================

Deno.test("household_wages.compute: wages + withholding → single f1040 output (not two)", () => {
  const result = compute([minimalItem({ wages_received: 20000, federal_income_tax_withheld: 2500 })]);
  assertEquals(result.outputs.length, 1);
  const out = findOutput(result, "f1040");
  assertEquals(out!.fields.line1b_household_wages, 20000);
  assertEquals(out!.fields.line25a_w2_withheld, 2500);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("household_wages.compute: withholding with zero wages — no output (withholding alone)", () => {
  // Withholding without wages is unusual; if wages=0, no output
  const result = compute([minimalItem({ wages_received: 0, federal_income_tax_withheld: 500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("household_wages.compute: multiple employers — total wages correctly summed", () => {
  const result = compute([
    minimalItem({ wages_received: 8000, employer_name: "Family A" }),
    minimalItem({ wages_received: 12000, employer_name: "Family B" }),
    minimalItem({ wages_received: 5000, employer_name: "Family C" }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out!.fields.line1b_household_wages, 25000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("household_wages.compute: smoke test — two employers with full details", () => {
  const result = compute([
    minimalItem({
      wages_received: 18000,
      federal_income_tax_withheld: 2700,
      social_security_wages: 18000,
      medicare_wages: 18000,
      ss_tax_withheld: 1116,
      medicare_tax_withheld: 261,
      employer_name: "Smith Family",
      employer_ein: "12-3456789",
    }),
    minimalItem({
      wages_received: 7000,
      federal_income_tax_withheld: 700,
      social_security_wages: 7000,
      medicare_wages: 7000,
      ss_tax_withheld: 434,
      medicare_tax_withheld: 101.50,
      employer_name: "Jones Family",
    }),
  ]);

  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1b_household_wages, 25000);
  assertEquals(out!.fields.line25a_w2_withheld, 3400);
  // f1040 + form8959 (Medicare wages 25000, withheld 362.50)
  assertEquals(result.outputs.length, 2);
});
