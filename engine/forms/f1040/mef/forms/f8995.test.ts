import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8995 } from "./f8995.ts";

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
  assertEquals(buildIRS8995({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS8995({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("qbi_from_schedule_c at zero is emitted", () => {
  const result = buildIRS8995({ qbi_from_schedule_c: 0 });
  assertStringIncludes(
    result,
    "<QBIFromScheduleCAmt>0</QBIFromScheduleCAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 10 fields)
// ---------------------------------------------------------------------------

Deno.test("qbi_from_schedule_c maps to QBIFromScheduleCAmt", () => {
  const result = buildIRS8995({ qbi_from_schedule_c: 50000 });
  assertStringIncludes(
    result,
    "<QBIFromScheduleCAmt>50000</QBIFromScheduleCAmt>",
  );
});

Deno.test("qbi_from_schedule_f maps to QBIFromScheduleFAmt", () => {
  const result = buildIRS8995({ qbi_from_schedule_f: 30000 });
  assertStringIncludes(
    result,
    "<QBIFromScheduleFAmt>30000</QBIFromScheduleFAmt>",
  );
});

Deno.test("qbi maps to QualifiedBusinessIncomeAmt", () => {
  const result = buildIRS8995({ qbi: 80000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>80000</QualifiedBusinessIncomeAmt>",
  );
});

Deno.test("w2_wages maps to W2WagesAmt", () => {
  const result = buildIRS8995({ w2_wages: 100000 });
  assertStringIncludes(result, "<W2WagesAmt>100000</W2WagesAmt>");
});

Deno.test("unadjusted_basis maps to UnadjustedBasisAmt", () => {
  const result = buildIRS8995({ unadjusted_basis: 200000 });
  assertStringIncludes(
    result,
    "<UnadjustedBasisAmt>200000</UnadjustedBasisAmt>",
  );
});

Deno.test("line6_sec199a_dividends maps to Section199ADividendsAmt", () => {
  const result = buildIRS8995({ line6_sec199a_dividends: 5000 });
  assertStringIncludes(
    result,
    "<Section199ADividendsAmt>5000</Section199ADividendsAmt>",
  );
});

Deno.test("taxable_income maps to TaxableIncomeAmt", () => {
  const result = buildIRS8995({ taxable_income: 150000 });
  assertStringIncludes(
    result,
    "<TaxableIncomeAmt>150000</TaxableIncomeAmt>",
  );
});

Deno.test("net_capital_gain maps to NetCapitalGainAmt", () => {
  const result = buildIRS8995({ net_capital_gain: 10000 });
  assertStringIncludes(
    result,
    "<NetCapitalGainAmt>10000</NetCapitalGainAmt>",
  );
});

Deno.test("qbi_loss_carryforward maps to QBILossCarryforwardAmt", () => {
  const result = buildIRS8995({ qbi_loss_carryforward: 3000 });
  assertStringIncludes(
    result,
    "<QBILossCarryforwardAmt>3000</QBILossCarryforwardAmt>",
  );
});

Deno.test("reit_loss_carryforward maps to REITLossCarryforwardAmt", () => {
  const result = buildIRS8995({ reit_loss_carryforward: 1500 });
  assertStringIncludes(
    result,
    "<REITLossCarryforwardAmt>1500</REITLossCarryforwardAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS8995({ qbi: 80000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>80000</QualifiedBusinessIncomeAmt>",
  );
  assertNotIncludes(result, "<QBIFromScheduleCAmt>");
  assertNotIncludes(result, "<W2WagesAmt>");
  assertNotIncludes(result, "<TaxableIncomeAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS8995({ qbi: 80000, taxable_income: 150000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>80000</QualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxableIncomeAmt>150000</TaxableIncomeAmt>",
  );
  assertNotIncludes(result, "<QBIFromScheduleCAmt>");
  assertNotIncludes(result, "<W2WagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  qbi_from_schedule_c: 50000,
  qbi_from_schedule_f: 30000,
  qbi: 80000,
  w2_wages: 100000,
  unadjusted_basis: 200000,
  line6_sec199a_dividends: 5000,
  taxable_income: 150000,
  net_capital_gain: 10000,
  qbi_loss_carryforward: 3000,
  reit_loss_carryforward: 1500,
};

Deno.test("all 10 fields present: output wrapped in IRS8995 tag", () => {
  const result = buildIRS8995(allFields);
  assertStringIncludes(result, "<IRS8995>");
  assertStringIncludes(result, "</IRS8995>");
});

Deno.test("all 10 fields present: all elements emitted", () => {
  const result = buildIRS8995(allFields);
  assertStringIncludes(
    result,
    "<QBIFromScheduleCAmt>50000</QBIFromScheduleCAmt>",
  );
  assertStringIncludes(
    result,
    "<QBIFromScheduleFAmt>30000</QBIFromScheduleFAmt>",
  );
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>80000</QualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(result, "<W2WagesAmt>100000</W2WagesAmt>");
  assertStringIncludes(
    result,
    "<UnadjustedBasisAmt>200000</UnadjustedBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<Section199ADividendsAmt>5000</Section199ADividendsAmt>",
  );
  assertStringIncludes(
    result,
    "<TaxableIncomeAmt>150000</TaxableIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<NetCapitalGainAmt>10000</NetCapitalGainAmt>",
  );
  assertStringIncludes(
    result,
    "<QBILossCarryforwardAmt>3000</QBILossCarryforwardAmt>",
  );
  assertStringIncludes(
    result,
    "<REITLossCarryforwardAmt>1500</REITLossCarryforwardAmt>",
  );
});
