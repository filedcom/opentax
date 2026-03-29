import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS1040Schedule3 } from "./schedule3.ts";

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
  assertEquals(buildIRS1040Schedule3({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS1040Schedule3({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line2_childcare_credit at zero is emitted", () => {
  const result = buildIRS1040Schedule3({ line2_childcare_credit: 0 });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>0</CreditForChildAndDepdCareAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (direct 1:1 mappings)
// ---------------------------------------------------------------------------

Deno.test("line2_childcare_credit maps to CreditForChildAndDepdCareAmt", () => {
  const result = buildIRS1040Schedule3({ line2_childcare_credit: 1200 });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("line3_education_credit maps to EducationCreditAmt", () => {
  const result = buildIRS1040Schedule3({ line3_education_credit: 2500 });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
});

Deno.test("line4_retirement_savings_credit maps to RtrSavingsContributionsCrAmt", () => {
  const result = buildIRS1040Schedule3({ line4_retirement_savings_credit: 400 });
  assertStringIncludes(
    result,
    "<RtrSavingsContributionsCrAmt>400</RtrSavingsContributionsCrAmt>",
  );
});

Deno.test("line6c_adoption_credit maps to AdoptionCreditAmt", () => {
  const result = buildIRS1040Schedule3({ line6c_adoption_credit: 15950 });
  assertStringIncludes(
    result,
    "<AdoptionCreditAmt>15950</AdoptionCreditAmt>",
  );
});

Deno.test("line10_amount_paid_extension maps to RequestForExtensionAmt", () => {
  const result = buildIRS1040Schedule3({ line10_amount_paid_extension: 3000 });
  assertStringIncludes(
    result,
    "<RequestForExtensionAmt>3000</RequestForExtensionAmt>",
  );
});

Deno.test("line11_excess_ss maps to ExcessSocSecAndTier1RRTATaxAmt", () => {
  const result = buildIRS1040Schedule3({ line11_excess_ss: 5000 });
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
});

// line6b_child_tax_credit is excluded from FIELD_MAP:
// The 2025v3.0 XSD line 6b (MinAMTCrAmt) is the Minimum AMT Credit from Form 8801,
// not the child tax credit. No XSD element maps to the engine's line6b_child_tax_credit.
Deno.test("line6b_child_tax_credit is not emitted (no matching XSD element)", () => {
  const result = buildIRS1040Schedule3({ line6b_child_tax_credit: 2000 });
  // When the only known field has no XSD mapping, result is empty
  assertEquals(result, "");
});

// ---------------------------------------------------------------------------
// Section 5: Aggregated field tests (line1 foreign tax credit)
// ---------------------------------------------------------------------------

Deno.test("line1_foreign_tax_credit(1000) + line1_foreign_tax_1099(200) -> ForeignTaxCreditAmt=1200", () => {
  const result = buildIRS1040Schedule3({
    line1_foreign_tax_credit: 1000,
    line1_foreign_tax_1099: 200,
  });
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>1200</ForeignTaxCreditAmt>",
  );
});

Deno.test("line1_foreign_tax_credit alone -> ForeignTaxCreditAmt=1000", () => {
  const result = buildIRS1040Schedule3({ line1_foreign_tax_credit: 1000 });
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>1000</ForeignTaxCreditAmt>",
  );
});

Deno.test("line1_foreign_tax_1099 alone -> ForeignTaxCreditAmt=200", () => {
  const result = buildIRS1040Schedule3({ line1_foreign_tax_1099: 200 });
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>200</ForeignTaxCreditAmt>",
  );
});

Deno.test("both line1 fields absent: ForeignTaxCreditAmt not emitted", () => {
  const result = buildIRS1040Schedule3({ line2_childcare_credit: 500 });
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS1040Schedule3({ line3_education_credit: 2500 });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
  assertNotIncludes(result, "<CreditForChildAndDepdCareAmt>");
  assertNotIncludes(result, "<AdoptionCreditAmt>");
  assertNotIncludes(result, "<RequestForExtensionAmt>");
  assertNotIncludes(result, "<ExcessSocSecAndTier1RRTATaxAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS1040Schedule3({
    line2_childcare_credit: 1200,
    line11_excess_ss: 5000,
  });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
  assertNotIncludes(result, "<ForeignTaxCreditAmt>");
  assertNotIncludes(result, "<EducationCreditAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line1_foreign_tax_credit: 800,
  line1_foreign_tax_1099: 200,
  line2_childcare_credit: 1200,
  line3_education_credit: 2500,
  line4_retirement_savings_credit: 400,
  line6c_adoption_credit: 15950,
  line10_amount_paid_extension: 3000,
  line11_excess_ss: 5000,
};

Deno.test("all present: output wrapped in IRS1040Schedule3 tag", () => {
  const result = buildIRS1040Schedule3(allFields);
  assertStringIncludes(result, "<IRS1040Schedule3>");
  assertStringIncludes(result, "</IRS1040Schedule3>");
});

Deno.test("all present: all expected elements emitted", () => {
  const result = buildIRS1040Schedule3(allFields);
  // Aggregated: 800 + 200 = 1000
  assertStringIncludes(
    result,
    "<ForeignTaxCreditAmt>1000</ForeignTaxCreditAmt>",
  );
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertStringIncludes(
    result,
    "<RtrSavingsContributionsCrAmt>400</RtrSavingsContributionsCrAmt>",
  );
  assertStringIncludes(result, "<AdoptionCreditAmt>15950</AdoptionCreditAmt>");
  assertStringIncludes(
    result,
    "<RequestForExtensionAmt>3000</RequestForExtensionAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
});

Deno.test("all present: ForeignTaxCreditAmt appears before CreditForChildAndDepdCareAmt (XSD order)", () => {
  const result = buildIRS1040Schedule3(allFields);
  const foreignIdx = result.indexOf("<ForeignTaxCreditAmt>");
  const childcareIdx = result.indexOf("<CreditForChildAndDepdCareAmt>");
  assertEquals(
    foreignIdx < childcareIdx,
    true,
    "ForeignTaxCreditAmt must appear before CreditForChildAndDepdCareAmt",
  );
});

Deno.test("all present: CreditForChildAndDepdCareAmt before ExcessSocSecAndTier1RRTATaxAmt", () => {
  const result = buildIRS1040Schedule3(allFields);
  const childcareIdx = result.indexOf("<CreditForChildAndDepdCareAmt>");
  const excessSsIdx = result.indexOf("<ExcessSocSecAndTier1RRTATaxAmt>");
  assertEquals(
    childcareIdx < excessSsIdx,
    true,
    "CreditForChildAndDepdCareAmt must appear before ExcessSocSecAndTier1RRTATaxAmt",
  );
});

// ---------------------------------------------------------------------------
// Section 8: Mixed known/unknown keys
// ---------------------------------------------------------------------------

Deno.test("known field emitted, unknown field dropped", () => {
  const result = buildIRS1040Schedule3({
    line2_childcare_credit: 1200,
    junk: 999,
  });
  assertStringIncludes(
    result,
    "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>",
  );
  assertNotIncludes(result, "junk");
  assertNotIncludes(result, "999");
});

Deno.test("multiple known and unknown fields: only known emitted", () => {
  const result = buildIRS1040Schedule3({
    line3_education_credit: 2500,
    unknown_field_1: 500,
    line11_excess_ss: 5000,
    not_a_real_key: "ignored",
  });
  assertStringIncludes(result, "<EducationCreditAmt>2500</EducationCreditAmt>");
  assertStringIncludes(
    result,
    "<ExcessSocSecAndTier1RRTATaxAmt>5000</ExcessSocSecAndTier1RRTATaxAmt>",
  );
  assertNotIncludes(result, "unknown_field_1");
  assertNotIncludes(result, "not_a_real_key");
});
