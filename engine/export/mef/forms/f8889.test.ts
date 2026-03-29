import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8889 } from "./f8889.ts";

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
  assertEquals(buildIRS8889({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS8889({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("taxpayer_hsa_contributions at zero is emitted", () => {
  const result = buildIRS8889({ taxpayer_hsa_contributions: 0 });
  assertStringIncludes(result, "<HSAContributionAmt>0</HSAContributionAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping tests
// ---------------------------------------------------------------------------

Deno.test("taxpayer_hsa_contributions maps to HSAContributionAmt", () => {
  const result = buildIRS8889({ taxpayer_hsa_contributions: 3000 });
  assertStringIncludes(result, "<HSAContributionAmt>3000</HSAContributionAmt>");
});

Deno.test(
  "employer_hsa_contributions maps to HSAEmployerContributionAmt",
  () => {
    const result = buildIRS8889({ employer_hsa_contributions: 1200 });
    assertStringIncludes(
      result,
      "<HSAEmployerContributionAmt>1200</HSAEmployerContributionAmt>",
    );
  },
);

Deno.test("hsa_distributions maps to TotalHSADistributionAmt", () => {
  const result = buildIRS8889({ hsa_distributions: 5000 });
  assertStringIncludes(
    result,
    "<TotalHSADistributionAmt>5000</TotalHSADistributionAmt>",
  );
});

Deno.test(
  "qualified_medical_expenses maps to UnreimbQualMedAndDentalExpAmt",
  () => {
    const result = buildIRS8889({ qualified_medical_expenses: 4500 });
    assertStringIncludes(
      result,
      "<UnreimbQualMedAndDentalExpAmt>4500</UnreimbQualMedAndDentalExpAmt>",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 5: Sparse output — single field only emits that element
// ---------------------------------------------------------------------------

Deno.test(
  "single known field emits only that element, absent fields omitted",
  () => {
    const result = buildIRS8889({ taxpayer_hsa_contributions: 3000 });
    assertStringIncludes(result, "<HSAContributionAmt>3000</HSAContributionAmt>");
    assertNotIncludes(result, "<HSAEmployerContributionAmt>");
    assertNotIncludes(result, "<TotalHSADistributionAmt>");
    assertNotIncludes(result, "<UnreimbQualMedAndDentalExpAmt>");
  },
);

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  taxpayer_hsa_contributions: 3000,
  employer_hsa_contributions: 1200,
  hsa_distributions: 5000,
  qualified_medical_expenses: 4500,
};

Deno.test("all fields present: output wrapped in IRS8889 tag", () => {
  const result = buildIRS8889(allFields);
  assertStringIncludes(result, "<IRS8889>");
  assertStringIncludes(result, "</IRS8889>");
});

Deno.test("all fields present: all elements emitted with correct values", () => {
  const result = buildIRS8889(allFields);
  assertStringIncludes(result, "<HSAContributionAmt>3000</HSAContributionAmt>");
  assertStringIncludes(
    result,
    "<HSAEmployerContributionAmt>1200</HSAEmployerContributionAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalHSADistributionAmt>5000</TotalHSADistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<UnreimbQualMedAndDentalExpAmt>4500</UnreimbQualMedAndDentalExpAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields ignored (coverage_type, age_55_or_older, distribution_exception)
// ---------------------------------------------------------------------------

Deno.test(
  "non-number fields silently skipped: coverage_type string excluded",
  () => {
    const result = buildIRS8889({
      coverage_type: "self_only",
      taxpayer_hsa_contributions: 3000,
    });
    assertStringIncludes(result, "<HSAContributionAmt>3000</HSAContributionAmt>");
    assertNotIncludes(result, "coverage_type");
    assertNotIncludes(result, "self_only");
  },
);

Deno.test(
  "non-number fields silently skipped: age_55_or_older boolean excluded",
  () => {
    const result = buildIRS8889({
      age_55_or_older: true,
      taxpayer_hsa_contributions: 500,
    });
    assertStringIncludes(result, "<HSAContributionAmt>500</HSAContributionAmt>");
    assertNotIncludes(result, "age_55_or_older");
  },
);

Deno.test(
  "non-number fields silently skipped: distribution_exception boolean excluded",
  () => {
    const result = buildIRS8889({
      distribution_exception: false,
      hsa_distributions: 2000,
    });
    assertStringIncludes(
      result,
      "<TotalHSADistributionAmt>2000</TotalHSADistributionAmt>",
    );
    assertNotIncludes(result, "distribution_exception");
  },
);

Deno.test("only non-number fields provided returns empty string", () => {
  assertEquals(
    buildIRS8889({ coverage_type: "family", age_55_or_older: true }),
    "",
  );
});
