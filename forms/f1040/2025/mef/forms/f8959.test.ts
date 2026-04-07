import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8959 } from "./f8959.ts";

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
  assertEquals(form8959.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8959.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("medicare_wages at zero is emitted inside AdditionalMedicareTaxGrp", () => {
  const result = form8959.build({ medicare_wages: 0 });
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>0</TotalW2MedicareWagesAndTipsAmt>");
  assertStringIncludes(result, "<AdditionalMedicareTaxGrp>");
  assertStringIncludes(result, "<AdditionalTaxGrp>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping — correct nesting per XSD
// ---------------------------------------------------------------------------

Deno.test("medicare_wages maps to TotalW2MedicareWagesAndTipsAmt inside AdditionalMedicareTaxGrp", () => {
  const result = form8959.build({ medicare_wages: 120000 });
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>");
  assertStringIncludes(result, "<AdditionalMedicareTaxGrp>");
});

Deno.test("unreported_tips maps to TotalUnreportedMedicareTipsAmt inside AdditionalMedicareTaxGrp", () => {
  const result = form8959.build({ unreported_tips: 5000 });
  assertStringIncludes(result, "<TotalUnreportedMedicareTipsAmt>5000</TotalUnreportedMedicareTipsAmt>");
  assertStringIncludes(result, "<AdditionalMedicareTaxGrp>");
});

Deno.test("wages_8919 maps to TotalWagesWithNoWithholdingAmt inside AdditionalMedicareTaxGrp", () => {
  const result = form8959.build({ wages_8919: 8000 });
  assertStringIncludes(result, "<TotalWagesWithNoWithholdingAmt>8000</TotalWagesWithNoWithholdingAmt>");
  assertStringIncludes(result, "<AdditionalMedicareTaxGrp>");
});

Deno.test("se_income maps to TotalSelfEmploymentIncomeAmt inside AddnlSelfEmploymentTaxGrp", () => {
  const result = form8959.build({ se_income: 45000 });
  assertStringIncludes(result, "<TotalSelfEmploymentIncomeAmt>45000</TotalSelfEmploymentIncomeAmt>");
  assertStringIncludes(result, "<AddnlSelfEmploymentTaxGrp>");
});

Deno.test("rrta_wages maps to TotalRailroadRetirementCompAmt inside AddnlRailroadRetirementTaxGrp", () => {
  const result = form8959.build({ rrta_wages: 75000 });
  assertStringIncludes(result, "<TotalRailroadRetirementCompAmt>75000</TotalRailroadRetirementCompAmt>");
  assertStringIncludes(result, "<AddnlRailroadRetirementTaxGrp>");
});

Deno.test("medicare_withheld maps to TotalW2MedicareTaxWithheldAmt at top level", () => {
  const result = form8959.build({ medicare_withheld: 1740 });
  assertStringIncludes(result, "<TotalW2MedicareTaxWithheldAmt>1740</TotalW2MedicareTaxWithheldAmt>");
  // Must NOT be inside AdditionalTaxGrp
  assertNotIncludes(result, "<AdditionalTaxGrp>");
});

Deno.test("rrta_medicare_withheld maps to TotalW2AddlRRTTaxAmt at top level", () => {
  const result = form8959.build({ rrta_medicare_withheld: 900 });
  assertStringIncludes(result, "<TotalW2AddlRRTTaxAmt>900</TotalW2AddlRRTTaxAmt>");
  assertNotIncludes(result, "<AdditionalTaxGrp>");
});

// ---------------------------------------------------------------------------
// Section 5: AdditionalTaxGrp includes FilingStatusThresholdCd
// ---------------------------------------------------------------------------

Deno.test("single filing status uses threshold code 200000", () => {
  const result = form8959.build({ medicare_wages: 120000, filing_status: "single" });
  assertStringIncludes(result, "<FilingStatusThresholdCd>200000</FilingStatusThresholdCd>");
});

Deno.test("MFJ filing status uses threshold code 250000", () => {
  const result = form8959.build({ medicare_wages: 120000, filing_status: "mfj" });
  assertStringIncludes(result, "<FilingStatusThresholdCd>250000</FilingStatusThresholdCd>");
});

Deno.test("MFS filing status uses threshold code 125000", () => {
  const result = form8959.build({ medicare_wages: 120000, filing_status: "mfs" });
  assertStringIncludes(result, "<FilingStatusThresholdCd>125000</FilingStatusThresholdCd>");
});

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8959.build({ medicare_wages: 120000 });
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>");
  assertNotIncludes(result, "<TotalUnreportedMedicareTipsAmt>");
  assertNotIncludes(result, "<TotalSelfEmploymentIncomeAmt>");
  assertNotIncludes(result, "<TotalW2MedicareTaxWithheldAmt>");
});

Deno.test("medicare_wages and medicare_withheld: wages inside group, withheld outside", () => {
  const result = form8959.build({ medicare_wages: 120000, medicare_withheld: 1740 });
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>");
  assertStringIncludes(result, "<TotalW2MedicareTaxWithheldAmt>1740</TotalW2MedicareTaxWithheldAmt>");
  assertNotIncludes(result, "<TotalUnreportedMedicareTipsAmt>");
  assertNotIncludes(result, "<TotalRailroadRetirementCompAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  filing_status: "single",
  medicare_wages: 100000,
  unreported_tips: 500,
  wages_8919: 800,
  se_income: 45000,
  rrta_wages: 75000,
  medicare_withheld: 1450,
  rrta_medicare_withheld: 900,
};

Deno.test("all fields present: output wrapped in IRS8959 tag", () => {
  const result = form8959.build(allFields);
  assertStringIncludes(result, "<IRS8959>");
  assertStringIncludes(result, "</IRS8959>");
});

Deno.test("all fields present: correct nested structure", () => {
  const result = form8959.build(allFields);
  assertStringIncludes(result, "<AdditionalTaxGrp>");
  assertStringIncludes(result, "<FilingStatusThresholdCd>200000</FilingStatusThresholdCd>");
  assertStringIncludes(result, "<AdditionalMedicareTaxGrp>");
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>100000</TotalW2MedicareWagesAndTipsAmt>");
  assertStringIncludes(result, "<TotalUnreportedMedicareTipsAmt>500</TotalUnreportedMedicareTipsAmt>");
  assertStringIncludes(result, "<TotalWagesWithNoWithholdingAmt>800</TotalWagesWithNoWithholdingAmt>");
  assertStringIncludes(result, "<AddnlSelfEmploymentTaxGrp>");
  assertStringIncludes(result, "<TotalSelfEmploymentIncomeAmt>45000</TotalSelfEmploymentIncomeAmt>");
  assertStringIncludes(result, "<AddnlRailroadRetirementTaxGrp>");
  assertStringIncludes(result, "<TotalRailroadRetirementCompAmt>75000</TotalRailroadRetirementCompAmt>");
  // Part V — outside AdditionalTaxGrp
  assertStringIncludes(result, "<TotalW2MedicareTaxWithheldAmt>1450</TotalW2MedicareTaxWithheldAmt>");
  assertStringIncludes(result, "<TotalW2AddlRRTTaxAmt>900</TotalW2AddlRRTTaxAmt>");
});

// ---------------------------------------------------------------------------
// Section 8: Non-number fields (filing_status) are passed through, not emitted as element
// ---------------------------------------------------------------------------

Deno.test("filing_status does not appear as XML element", () => {
  const result = form8959.build({ filing_status: "single", medicare_wages: 50000 });
  assertStringIncludes(result, "<TotalW2MedicareWagesAndTipsAmt>50000</TotalW2MedicareWagesAndTipsAmt>");
  assertNotIncludes(result, "<filing_status>");
  assertNotIncludes(result, "single</");
});
