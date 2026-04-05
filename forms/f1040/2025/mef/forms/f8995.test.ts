import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8995 } from "./f8995.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty input
// ---------------------------------------------------------------------------

Deno.test("empty object returns empty string", () => {
  assertEquals(form8995.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8995.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Internal tracking fields do NOT emit (no valid IRS8995 element)
// qbi_from_schedule_c and qbi_from_schedule_f are written by Schedule C/F nodes
// for internal tracking; they have no IRS8995 top-level XSD element.
// ---------------------------------------------------------------------------

Deno.test("qbi_from_schedule_c alone returns empty string (tracking field only)", () => {
  assertEquals(form8995.build({ qbi_from_schedule_c: 50000 }), "");
});

Deno.test("qbi_from_schedule_f alone returns empty string (tracking field only)", () => {
  assertEquals(form8995.build({ qbi_from_schedule_f: 30000 }), "");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping for valid IRS8995 XSD elements
// Tag names verified against IRS8995.xsd (2025v3.0)
// ---------------------------------------------------------------------------

Deno.test("qbi maps to TotQualifiedBusinessIncomeAmt", () => {
  const result = form8995.build({ qbi: 80000 });
  assertStringIncludes(
    result,
    "<TotQualifiedBusinessIncomeAmt>80000</TotQualifiedBusinessIncomeAmt>",
  );
});

Deno.test("net_capital_gain maps to NetCapitalGainAmt", () => {
  const result = form8995.build({ net_capital_gain: 10000 });
  assertStringIncludes(result, "<NetCapitalGainAmt>10000</NetCapitalGainAmt>");
});

Deno.test("taxable_income maps to TaxableIncomeBeforeQBIDedAmt", () => {
  const result = form8995.build({ taxable_income: 150000 });
  assertStringIncludes(
    result,
    "<TaxableIncomeBeforeQBIDedAmt>150000</TaxableIncomeBeforeQBIDedAmt>",
  );
});

Deno.test("qbi_loss_carryforward maps to TotQlfyBusLossCarryforwardAmt", () => {
  const result = form8995.build({ qbi_loss_carryforward: 3000 });
  assertStringIncludes(
    result,
    "<TotQlfyBusLossCarryforwardAmt>3000</TotQlfyBusLossCarryforwardAmt>",
  );
});

Deno.test("reit_loss_carryforward maps to TotQlfyREITDivPTPLossCfwdAmt", () => {
  const result = form8995.build({ reit_loss_carryforward: 1500 });
  assertStringIncludes(
    result,
    "<TotQlfyREITDivPTPLossCfwdAmt>1500</TotQlfyREITDivPTPLossCfwdAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8995.build({ qbi: 80000 });
  assertStringIncludes(
    result,
    "<TotQualifiedBusinessIncomeAmt>80000</TotQualifiedBusinessIncomeAmt>",
  );
  assertNotIncludes(result, "<NetCapitalGainAmt>");
  assertNotIncludes(result, "<TaxableIncomeBeforeQBIDedAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8995.build({ qbi: 80000, taxable_income: 150000 });
  assertStringIncludes(
    result,
    "<TotQualifiedBusinessIncomeAmt>80000</TotQualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxableIncomeBeforeQBIDedAmt>150000</TaxableIncomeBeforeQBIDedAmt>",
  );
  assertNotIncludes(result, "<NetCapitalGainAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All mappable fields present
// ---------------------------------------------------------------------------

const allFields = {
  qbi: 80000,
  net_capital_gain: 10000,
  taxable_income: 150000,
  qbi_loss_carryforward: 3000,
  reit_loss_carryforward: 1500,
};

Deno.test("all 5 mappable fields present: output wrapped in IRS8995 tag", () => {
  const result = form8995.build(allFields);
  assertStringIncludes(result, "<IRS8995>");
  assertStringIncludes(result, "</IRS8995>");
});

Deno.test("all 5 mappable fields present: all elements emitted", () => {
  const result = form8995.build(allFields);
  assertStringIncludes(
    result,
    "<TotQualifiedBusinessIncomeAmt>80000</TotQualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<NetCapitalGainAmt>10000</NetCapitalGainAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxableIncomeBeforeQBIDedAmt>150000</TaxableIncomeBeforeQBIDedAmt>",
  );
  assertStringIncludes(
    result,
    "<TotQlfyBusLossCarryforwardAmt>3000</TotQlfyBusLossCarryforwardAmt>",
  );
  assertStringIncludes(
    result,
    "<TotQlfyREITDivPTPLossCfwdAmt>1500</TotQlfyREITDivPTPLossCfwdAmt>",
  );
});
