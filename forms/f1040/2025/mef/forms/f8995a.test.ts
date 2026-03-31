import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8995a } from "./f8995a.ts";

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
  assertEquals(form8995a.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8995a.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("taxable_income at zero is emitted", () => {
  const result = form8995a.build({ taxable_income: 0 });
  assertStringIncludes(result, "<TaxableIncomeAmt>0</TaxableIncomeAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 11 fields)
// ---------------------------------------------------------------------------

Deno.test("taxable_income maps to TaxableIncomeAmt", () => {
  const result = form8995a.build({ taxable_income: 80000 });
  assertStringIncludes(result, "<TaxableIncomeAmt>80000</TaxableIncomeAmt>");
});

Deno.test("net_capital_gain maps to NetCapitalGainAmt", () => {
  const result = form8995a.build({ net_capital_gain: 5000 });
  assertStringIncludes(result, "<NetCapitalGainAmt>5000</NetCapitalGainAmt>");
});

Deno.test("qbi maps to QualifiedBusinessIncomeAmt", () => {
  const result = form8995a.build({ qbi: 40000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>40000</QualifiedBusinessIncomeAmt>",
  );
});

Deno.test("w2_wages maps to W2WagesAmt", () => {
  const result = form8995a.build({ w2_wages: 60000 });
  assertStringIncludes(result, "<W2WagesAmt>60000</W2WagesAmt>");
});

Deno.test("unadjusted_basis maps to UnadjustedBasisAmt", () => {
  const result = form8995a.build({ unadjusted_basis: 200000 });
  assertStringIncludes(
    result,
    "<UnadjustedBasisAmt>200000</UnadjustedBasisAmt>",
  );
});

Deno.test("sstb_qbi maps to SSTBQBIAmt", () => {
  const result = form8995a.build({ sstb_qbi: 30000 });
  assertStringIncludes(result, "<SSTBQBIAmt>30000</SSTBQBIAmt>");
});

Deno.test("sstb_w2_wages maps to SSTBW2WagesAmt", () => {
  const result = form8995a.build({ sstb_w2_wages: 25000 });
  assertStringIncludes(result, "<SSTBW2WagesAmt>25000</SSTBW2WagesAmt>");
});

Deno.test("sstb_unadjusted_basis maps to SSTBUnadjustedBasisAmt", () => {
  const result = form8995a.build({ sstb_unadjusted_basis: 150000 });
  assertStringIncludes(
    result,
    "<SSTBUnadjustedBasisAmt>150000</SSTBUnadjustedBasisAmt>",
  );
});

Deno.test("line6_sec199a_dividends maps to Section199ADividendsAmt", () => {
  const result = form8995a.build({ line6_sec199a_dividends: 1200 });
  assertStringIncludes(
    result,
    "<Section199ADividendsAmt>1200</Section199ADividendsAmt>",
  );
});

Deno.test("qbi_loss_carryforward maps to QBILossCarryforwardAmt", () => {
  const result = form8995a.build({ qbi_loss_carryforward: 8000 });
  assertStringIncludes(
    result,
    "<QBILossCarryforwardAmt>8000</QBILossCarryforwardAmt>",
  );
});

Deno.test("reit_loss_carryforward maps to REITLossCarryforwardAmt", () => {
  const result = form8995a.build({ reit_loss_carryforward: 3000 });
  assertStringIncludes(
    result,
    "<REITLossCarryforwardAmt>3000</REITLossCarryforwardAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8995a.build({ qbi: 40000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>40000</QualifiedBusinessIncomeAmt>",
  );
  assertNotIncludes(result, "<TaxableIncomeAmt>");
  assertNotIncludes(result, "<W2WagesAmt>");
  assertNotIncludes(result, "<SSTBQBIAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8995a.build({ taxable_income: 80000, qbi: 40000 });
  assertStringIncludes(result, "<TaxableIncomeAmt>80000</TaxableIncomeAmt>");
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>40000</QualifiedBusinessIncomeAmt>",
  );
  assertNotIncludes(result, "<W2WagesAmt>");
  assertNotIncludes(result, "<SSTBQBIAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  taxable_income: 80000,
  net_capital_gain: 5000,
  qbi: 40000,
  w2_wages: 60000,
  unadjusted_basis: 200000,
  sstb_qbi: 30000,
  sstb_w2_wages: 25000,
  sstb_unadjusted_basis: 150000,
  line6_sec199a_dividends: 1200,
  qbi_loss_carryforward: 8000,
  reit_loss_carryforward: 3000,
};

Deno.test("all 11 fields present: output wrapped in IRS8995A tag", () => {
  const result = form8995a.build(allFields);
  assertStringIncludes(result, "<IRS8995A>");
  assertStringIncludes(result, "</IRS8995A>");
});

Deno.test("all 11 fields present: all elements emitted", () => {
  const result = form8995a.build(allFields);
  assertStringIncludes(result, "<TaxableIncomeAmt>80000</TaxableIncomeAmt>");
  assertStringIncludes(result, "<NetCapitalGainAmt>5000</NetCapitalGainAmt>");
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>40000</QualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(result, "<W2WagesAmt>60000</W2WagesAmt>");
  assertStringIncludes(
    result,
    "<UnadjustedBasisAmt>200000</UnadjustedBasisAmt>",
  );
  assertStringIncludes(result, "<SSTBQBIAmt>30000</SSTBQBIAmt>");
  assertStringIncludes(result, "<SSTBW2WagesAmt>25000</SSTBW2WagesAmt>");
  assertStringIncludes(
    result,
    "<SSTBUnadjustedBasisAmt>150000</SSTBUnadjustedBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<Section199ADividendsAmt>1200</Section199ADividendsAmt>",
  );
  assertStringIncludes(
    result,
    "<QBILossCarryforwardAmt>8000</QBILossCarryforwardAmt>",
  );
  assertStringIncludes(
    result,
    "<REITLossCarryforwardAmt>3000</REITLossCarryforwardAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = form8995a.build({ filing_status: "MFJ", qbi: 40000 });
  assertStringIncludes(
    result,
    "<QualifiedBusinessIncomeAmt>40000</QualifiedBusinessIncomeAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
