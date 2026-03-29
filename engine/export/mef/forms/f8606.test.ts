import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8606 } from "./f8606.ts";

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

Deno.test("f8606: empty object returns empty string", () => {
  assertEquals(buildIRS8606({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f8606: all unknown keys returns empty string", () => {
  assertEquals(buildIRS8606({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f8606: nondeductible_contributions at zero is emitted", () => {
  const result = buildIRS8606({ nondeductible_contributions: 0 });
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>0</NondeductibleContriAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 8 fields)
// ---------------------------------------------------------------------------

Deno.test("f8606: nondeductible_contributions maps to NondeductibleContriAmt", () => {
  const result = buildIRS8606({ nondeductible_contributions: 6000 });
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>6000</NondeductibleContriAmt>",
  );
});

Deno.test("f8606: prior_basis maps to TotalBasisInTraditionalIRAAmt", () => {
  const result = buildIRS8606({ prior_basis: 12000 });
  assertStringIncludes(
    result,
    "<TotalBasisInTraditionalIRAAmt>12000</TotalBasisInTraditionalIRAAmt>",
  );
});

Deno.test("f8606: year_end_ira_value maps to TraditionalIRAValueAmt", () => {
  const result = buildIRS8606({ year_end_ira_value: 80000 });
  assertStringIncludes(
    result,
    "<TraditionalIRAValueAmt>80000</TraditionalIRAValueAmt>",
  );
});

Deno.test("f8606: traditional_distributions maps to TraditionalIRADistriAmt", () => {
  const result = buildIRS8606({ traditional_distributions: 5000 });
  assertStringIncludes(
    result,
    "<TraditionalIRADistriAmt>5000</TraditionalIRADistriAmt>",
  );
});

Deno.test("f8606: roth_conversion maps to RothConversionAmt", () => {
  const result = buildIRS8606({ roth_conversion: 20000 });
  assertStringIncludes(result, "<RothConversionAmt>20000</RothConversionAmt>");
});

Deno.test("f8606: roth_distribution maps to RothIRADistributionAmt", () => {
  const result = buildIRS8606({ roth_distribution: 3000 });
  assertStringIncludes(
    result,
    "<RothIRADistributionAmt>3000</RothIRADistributionAmt>",
  );
});

Deno.test("f8606: roth_basis_contributions maps to RothContributionsBasisAmt", () => {
  const result = buildIRS8606({ roth_basis_contributions: 18000 });
  assertStringIncludes(
    result,
    "<RothContributionsBasisAmt>18000</RothContributionsBasisAmt>",
  );
});

Deno.test("f8606: roth_basis_conversions maps to RothConversionBasisAmt", () => {
  const result = buildIRS8606({ roth_basis_conversions: 10000 });
  assertStringIncludes(
    result,
    "<RothConversionBasisAmt>10000</RothConversionBasisAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f8606: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS8606({ nondeductible_contributions: 6000 });
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>6000</NondeductibleContriAmt>",
  );
  assertNotIncludes(result, "<TotalBasisInTraditionalIRAAmt>");
  assertNotIncludes(result, "<TraditionalIRAValueAmt>");
  assertNotIncludes(result, "<RothConversionAmt>");
});

Deno.test("f8606: two fields present: only those two elements emitted", () => {
  const result = buildIRS8606({
    nondeductible_contributions: 6000,
    roth_conversion: 20000,
  });
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>6000</NondeductibleContriAmt>",
  );
  assertStringIncludes(result, "<RothConversionAmt>20000</RothConversionAmt>");
  assertNotIncludes(result, "<TotalBasisInTraditionalIRAAmt>");
  assertNotIncludes(result, "<TraditionalIRAValueAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  nondeductible_contributions: 6000,
  prior_basis: 12000,
  year_end_ira_value: 80000,
  traditional_distributions: 5000,
  roth_conversion: 20000,
  roth_distribution: 3000,
  roth_basis_contributions: 18000,
  roth_basis_conversions: 10000,
};

Deno.test("f8606: all 8 fields present: output wrapped in IRS8606 tag", () => {
  const result = buildIRS8606(allFields);
  assertStringIncludes(result, "<IRS8606>");
  assertStringIncludes(result, "</IRS8606>");
});

Deno.test("f8606: all 8 fields present: all elements emitted", () => {
  const result = buildIRS8606(allFields);
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>6000</NondeductibleContriAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalBasisInTraditionalIRAAmt>12000</TotalBasisInTraditionalIRAAmt>",
  );
  assertStringIncludes(
    result,
    "<TraditionalIRAValueAmt>80000</TraditionalIRAValueAmt>",
  );
  assertStringIncludes(
    result,
    "<TraditionalIRADistriAmt>5000</TraditionalIRADistriAmt>",
  );
  assertStringIncludes(result, "<RothConversionAmt>20000</RothConversionAmt>");
  assertStringIncludes(
    result,
    "<RothIRADistributionAmt>3000</RothIRADistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<RothContributionsBasisAmt>18000</RothContributionsBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<RothConversionBasisAmt>10000</RothConversionBasisAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields silently ignored
// ---------------------------------------------------------------------------

Deno.test("f8606: string field is silently ignored", () => {
  const result = buildIRS8606({
    filing_status: "S",
    nondeductible_contributions: 6000,
  });
  assertStringIncludes(
    result,
    "<NondeductibleContriAmt>6000</NondeductibleContriAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "\"S\"");
});
