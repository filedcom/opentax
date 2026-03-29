import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8839 } from "./f8839.ts";

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
  assertEquals(form8839.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8839.build({ form8839: { junk: 999, foo: "bar", baz: 0 } }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("adoption_benefits at zero is emitted", () => {
  const result = form8839.build({ form8839: { adoption_benefits: 0 } });
  assertStringIncludes(result, "<AdoptionBenefitsAmt>0</AdoptionBenefitsAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 3 fields)
// ---------------------------------------------------------------------------

Deno.test("adoption_benefits maps to AdoptionBenefitsAmt", () => {
  const result = form8839.build({ form8839: { adoption_benefits: 5000 } });
  assertStringIncludes(
    result,
    "<AdoptionBenefitsAmt>5000</AdoptionBenefitsAmt>",
  );
});

Deno.test("magi maps to ModifiedAGIAmt", () => {
  const result = form8839.build({ form8839: { magi: 120000 } });
  assertStringIncludes(result, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
});

Deno.test("income_tax_liability maps to IncomeTaxLiabilityAmt", () => {
  const result = form8839.build({ form8839: { income_tax_liability: 15000 } });
  assertStringIncludes(
    result,
    "<IncomeTaxLiabilityAmt>15000</IncomeTaxLiabilityAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8839.build({ form8839: { adoption_benefits: 5000 } });
  assertStringIncludes(
    result,
    "<AdoptionBenefitsAmt>5000</AdoptionBenefitsAmt>",
  );
  assertNotIncludes(result, "<ModifiedAGIAmt>");
  assertNotIncludes(result, "<IncomeTaxLiabilityAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8839.build({ form8839: { adoption_benefits: 5000, magi: 120000 } });
  assertStringIncludes(
    result,
    "<AdoptionBenefitsAmt>5000</AdoptionBenefitsAmt>",
  );
  assertStringIncludes(result, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
  assertNotIncludes(result, "<IncomeTaxLiabilityAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  adoption_benefits: 5000,
  magi: 120000,
  income_tax_liability: 15000,
};

Deno.test("all 3 fields present: output wrapped in IRS8839 tag", () => {
  const result = form8839.build({ form8839: allFields });
  assertStringIncludes(result, "<IRS8839>");
  assertStringIncludes(result, "</IRS8839>");
});

Deno.test("all 3 fields present: all elements emitted", () => {
  const result = form8839.build({ form8839: allFields });
  assertStringIncludes(
    result,
    "<AdoptionBenefitsAmt>5000</AdoptionBenefitsAmt>",
  );
  assertStringIncludes(result, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
  assertStringIncludes(
    result,
    "<IncomeTaxLiabilityAmt>15000</IncomeTaxLiabilityAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (arrays, enums) are silently ignored
// ---------------------------------------------------------------------------

Deno.test("children array field is silently ignored", () => {
  const result = form8839.build({ form8839: {
    children: [{ name: "child1" }],
    adoption_benefits: 5000,
  } });
  assertStringIncludes(
    result,
    "<AdoptionBenefitsAmt>5000</AdoptionBenefitsAmt>",
  );
  assertNotIncludes(result, "children");
  assertNotIncludes(result, "child1");
});

Deno.test("filing_status enum field is silently ignored", () => {
  const result = form8839.build({ form8839: { filing_status: "MFJ", magi: 120000 } });
  assertStringIncludes(result, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
