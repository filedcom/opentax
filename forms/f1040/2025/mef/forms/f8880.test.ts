import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8880 } from "./f8880.ts";

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
  assertEquals(form8880.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8880.build({ form8880: { junk: 999, foo: "bar", baz: 0 } }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("ira_contributions_taxpayer at zero is emitted", () => {
  const result = form8880.build({ form8880: { ira_contributions_taxpayer: 0 } });
  assertStringIncludes(
    result,
    "<TxpyrRetirePlanContriAmt>0</TxpyrRetirePlanContriAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 9 fields)
// ---------------------------------------------------------------------------

Deno.test("ira_contributions_taxpayer maps to TxpyrRetirePlanContriAmt", () => {
  const result = form8880.build({ form8880: { ira_contributions_taxpayer: 2000 } });
  assertStringIncludes(
    result,
    "<TxpyrRetirePlanContriAmt>2000</TxpyrRetirePlanContriAmt>",
  );
});

Deno.test("ira_contributions_spouse maps to SpouseRetirePlanContriAmt", () => {
  const result = form8880.build({ form8880: { ira_contributions_spouse: 1500 } });
  assertStringIncludes(
    result,
    "<SpouseRetirePlanContriAmt>1500</SpouseRetirePlanContriAmt>",
  );
});

Deno.test("elective_deferrals maps to ElectiveDeferralAmt", () => {
  const result = form8880.build({ form8880: { elective_deferrals: 19500 } });
  assertStringIncludes(
    result,
    "<ElectiveDeferralAmt>19500</ElectiveDeferralAmt>",
  );
});

Deno.test("elective_deferrals_taxpayer maps to TxpyrElectiveDeferralAmt", () => {
  const result = form8880.build({ form8880: { elective_deferrals_taxpayer: 10000 } });
  assertStringIncludes(
    result,
    "<TxpyrElectiveDeferralAmt>10000</TxpyrElectiveDeferralAmt>",
  );
});

Deno.test("elective_deferrals_spouse maps to SpouseElectiveDeferralAmt", () => {
  const result = form8880.build({ form8880: { elective_deferrals_spouse: 9500 } });
  assertStringIncludes(
    result,
    "<SpouseElectiveDeferralAmt>9500</SpouseElectiveDeferralAmt>",
  );
});

Deno.test("distributions_taxpayer maps to TxpyrDistributionAmt", () => {
  const result = form8880.build({ form8880: { distributions_taxpayer: 3000 } });
  assertStringIncludes(
    result,
    "<TxpyrDistributionAmt>3000</TxpyrDistributionAmt>",
  );
});

Deno.test("distributions_spouse maps to SpouseDistributionAmt", () => {
  const result = form8880.build({ form8880: { distributions_spouse: 2500 } });
  assertStringIncludes(
    result,
    "<SpouseDistributionAmt>2500</SpouseDistributionAmt>",
  );
});

Deno.test("agi maps to AGIAmt", () => {
  const result = form8880.build({ form8880: { agi: 60000 } });
  assertStringIncludes(result, "<AGIAmt>60000</AGIAmt>");
});

Deno.test("income_tax_liability maps to IncomeTaxLiabilityAmt", () => {
  const result = form8880.build({ form8880: { income_tax_liability: 8000 } });
  assertStringIncludes(
    result,
    "<IncomeTaxLiabilityAmt>8000</IncomeTaxLiabilityAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8880.build({ form8880: { agi: 60000 } });
  assertStringIncludes(result, "<AGIAmt>60000</AGIAmt>");
  assertNotIncludes(result, "<TxpyrRetirePlanContriAmt>");
  assertNotIncludes(result, "<SpouseRetirePlanContriAmt>");
  assertNotIncludes(result, "<ElectiveDeferralAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8880.build({ form8880: { agi: 60000, income_tax_liability: 8000 } });
  assertStringIncludes(result, "<AGIAmt>60000</AGIAmt>");
  assertStringIncludes(
    result,
    "<IncomeTaxLiabilityAmt>8000</IncomeTaxLiabilityAmt>",
  );
  assertNotIncludes(result, "<TxpyrRetirePlanContriAmt>");
  assertNotIncludes(result, "<ElectiveDeferralAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  ira_contributions_taxpayer: 2000,
  ira_contributions_spouse: 1500,
  elective_deferrals: 19500,
  elective_deferrals_taxpayer: 10000,
  elective_deferrals_spouse: 9500,
  distributions_taxpayer: 3000,
  distributions_spouse: 2500,
  agi: 60000,
  income_tax_liability: 8000,
};

Deno.test("all 9 fields present: output wrapped in IRS8880 tag", () => {
  const result = form8880.build({ form8880: allFields });
  assertStringIncludes(result, "<IRS8880>");
  assertStringIncludes(result, "</IRS8880>");
});

Deno.test("all 9 fields present: all elements emitted", () => {
  const result = form8880.build({ form8880: allFields });
  assertStringIncludes(
    result,
    "<TxpyrRetirePlanContriAmt>2000</TxpyrRetirePlanContriAmt>",
  );
  assertStringIncludes(
    result,
    "<SpouseRetirePlanContriAmt>1500</SpouseRetirePlanContriAmt>",
  );
  assertStringIncludes(
    result,
    "<ElectiveDeferralAmt>19500</ElectiveDeferralAmt>",
  );
  assertStringIncludes(
    result,
    "<TxpyrElectiveDeferralAmt>10000</TxpyrElectiveDeferralAmt>",
  );
  assertStringIncludes(
    result,
    "<SpouseElectiveDeferralAmt>9500</SpouseElectiveDeferralAmt>",
  );
  assertStringIncludes(
    result,
    "<TxpyrDistributionAmt>3000</TxpyrDistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<SpouseDistributionAmt>2500</SpouseDistributionAmt>",
  );
  assertStringIncludes(result, "<AGIAmt>60000</AGIAmt>");
  assertStringIncludes(
    result,
    "<IncomeTaxLiabilityAmt>8000</IncomeTaxLiabilityAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (filing_status) are silently ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = form8880.build({ form8880: { filing_status: "MFJ", agi: 60000 } });
  assertStringIncludes(result, "<AGIAmt>60000</AGIAmt>");
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
