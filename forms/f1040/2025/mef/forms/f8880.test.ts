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
  assertEquals(form8880.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("roth_contributions_taxpayer at zero is emitted", () => {
  const result = form8880.build({ roth_contributions_taxpayer: 0 });
  assertStringIncludes(
    result,
    "<PrimaryRothIRAForCurrentYrAmt>0</PrimaryRothIRAForCurrentYrAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping — key fields
// ---------------------------------------------------------------------------

Deno.test("roth_contributions_taxpayer maps to PrimaryRothIRAForCurrentYrAmt", () => {
  const result = form8880.build({ roth_contributions_taxpayer: 2000 });
  assertStringIncludes(
    result,
    "<PrimaryRothIRAForCurrentYrAmt>2000</PrimaryRothIRAForCurrentYrAmt>",
  );
});

Deno.test("roth_contributions_spouse maps to SpouseRothIRAForCurrentYrAmt", () => {
  const result = form8880.build({ roth_contributions_spouse: 1500 });
  assertStringIncludes(
    result,
    "<SpouseRothIRAForCurrentYrAmt>1500</SpouseRothIRAForCurrentYrAmt>",
  );
});

Deno.test("contributions_taxpayer maps to PrimaryContributionsAmt", () => {
  const result = form8880.build({ contributions_taxpayer: 3000 });
  assertStringIncludes(
    result,
    "<PrimaryContributionsAmt>3000</PrimaryContributionsAmt>",
  );
});

Deno.test("contributions_spouse maps to SpouseContributionsAmt", () => {
  const result = form8880.build({ contributions_spouse: 2500 });
  assertStringIncludes(
    result,
    "<SpouseContributionsAmt>2500</SpouseContributionsAmt>",
  );
});

Deno.test("distributions_taxpayer maps to PrimTaxableDistributionsAmt", () => {
  const result = form8880.build({ distributions_taxpayer: 1000 });
  assertStringIncludes(
    result,
    "<PrimTaxableDistributionsAmt>1000</PrimTaxableDistributionsAmt>",
  );
});

Deno.test("distributions_spouse maps to SpsTaxableDistributionsAmt", () => {
  const result = form8880.build({ distributions_spouse: 500 });
  assertStringIncludes(
    result,
    "<SpsTaxableDistributionsAmt>500</SpsTaxableDistributionsAmt>",
  );
});

Deno.test("agi maps to TaxReturnAGIAmt", () => {
  const result = form8880.build({ agi: 60000 });
  assertStringIncludes(result, "<TaxReturnAGIAmt>60000</TaxReturnAGIAmt>");
});

Deno.test("credit maps to CrQualifiedRetirementSavAmt", () => {
  const result = form8880.build({ credit: 400 });
  assertStringIncludes(
    result,
    "<CrQualifiedRetirementSavAmt>400</CrQualifiedRetirementSavAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output — only agi (engine's typical flow)
// ---------------------------------------------------------------------------

Deno.test("only agi present: emits TaxReturnAGIAmt, no other elements", () => {
  const result = form8880.build({ agi: 60000 });
  assertStringIncludes(result, "<TaxReturnAGIAmt>60000</TaxReturnAGIAmt>");
  assertNotIncludes(result, "<PrimaryRothIRAForCurrentYrAmt>");
  assertNotIncludes(result, "<PrimaryContributionsAmt>");
  assertNotIncludes(result, "AGIAmt>60000</AGIAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: Wrapper tag
// ---------------------------------------------------------------------------

Deno.test("any field present: output wrapped in IRS8880 tag", () => {
  const result = form8880.build({ agi: 60000 });
  assertStringIncludes(result, "<IRS8880");
  assertStringIncludes(result, "</IRS8880>");
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (filing_status) are silently ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = form8880.build({ filing_status: "MFJ", agi: 60000 });
  assertStringIncludes(result, "<TaxReturnAGIAmt>60000</TaxReturnAGIAmt>");
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
