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

Deno.test("medicare_wages at zero is emitted", () => {
  const result = form8959.build({ medicare_wages: 0 });
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>0</TotalW2MedicareWagesAndTipsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 7 fields)
// ---------------------------------------------------------------------------

Deno.test("medicare_wages maps to TotalW2MedicareWagesAndTipsAmt", () => {
  const result = form8959.build({ medicare_wages: 120000 });
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>",
  );
});

Deno.test("unreported_tips maps to TotalUnreportedMedicareTipsAmt", () => {
  const result = form8959.build({ unreported_tips: 5000 });
  assertStringIncludes(
    result,
    "<TotalUnreportedMedicareTipsAmt>5000</TotalUnreportedMedicareTipsAmt>",
  );
});

Deno.test("wages_8919 maps to TotalWagesWithNoWithholdingAmt", () => {
  const result = form8959.build({ wages_8919: 8000 });
  assertStringIncludes(
    result,
    "<TotalWagesWithNoWithholdingAmt>8000</TotalWagesWithNoWithholdingAmt>",
  );
});

Deno.test("se_income maps to TotalSelfEmploymentIncomeAmt", () => {
  const result = form8959.build({ se_income: 45000 });
  assertStringIncludes(
    result,
    "<TotalSelfEmploymentIncomeAmt>45000</TotalSelfEmploymentIncomeAmt>",
  );
});

Deno.test("rrta_wages maps to TotalRailroadRetirementCompAmt", () => {
  const result = form8959.build({ rrta_wages: 75000 });
  assertStringIncludes(
    result,
    "<TotalRailroadRetirementCompAmt>75000</TotalRailroadRetirementCompAmt>",
  );
});

Deno.test("medicare_withheld maps to TotalW2MedicareTaxWithheldAmt", () => {
  const result = form8959.build({ medicare_withheld: 1740 });
  assertStringIncludes(
    result,
    "<TotalW2MedicareTaxWithheldAmt>1740</TotalW2MedicareTaxWithheldAmt>",
  );
});

Deno.test("rrta_medicare_withheld maps to TotalW2AddlRRTTaxAmt", () => {
  const result = form8959.build({ rrta_medicare_withheld: 900 });
  assertStringIncludes(
    result,
    "<TotalW2AddlRRTTaxAmt>900</TotalW2AddlRRTTaxAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8959.build({ medicare_wages: 120000 });
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertNotIncludes(result, "<TotalUnreportedMedicareTipsAmt>");
  assertNotIncludes(result, "<TotalSelfEmploymentIncomeAmt>");
  assertNotIncludes(result, "<TotalW2MedicareTaxWithheldAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8959.build({
    medicare_wages: 120000,
    medicare_withheld: 1740,
  });
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>120000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalW2MedicareTaxWithheldAmt>1740</TotalW2MedicareTaxWithheldAmt>",
  );
  assertNotIncludes(result, "<TotalUnreportedMedicareTipsAmt>");
  assertNotIncludes(result, "<TotalRailroadRetirementCompAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  medicare_wages: 100000,
  unreported_tips: 500,
  wages_8919: 800,
  se_income: 45000,
  rrta_wages: 75000,
  medicare_withheld: 1450,
  rrta_medicare_withheld: 900,
};

Deno.test("all 7 fields present: output wrapped in IRS8959 tag", () => {
  const result = form8959.build(allFields);
  assertStringIncludes(result, "<IRS8959>");
  assertStringIncludes(result, "</IRS8959>");
});

Deno.test("all 7 fields present: all elements emitted", () => {
  const result = form8959.build(allFields);
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>100000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalUnreportedMedicareTipsAmt>500</TotalUnreportedMedicareTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalWagesWithNoWithholdingAmt>800</TotalWagesWithNoWithholdingAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalSelfEmploymentIncomeAmt>45000</TotalSelfEmploymentIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalRailroadRetirementCompAmt>75000</TotalRailroadRetirementCompAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalW2MedicareTaxWithheldAmt>1450</TotalW2MedicareTaxWithheldAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalW2AddlRRTTaxAmt>900</TotalW2AddlRRTTaxAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = form8959.build({ filing_status: "MFJ", medicare_wages: 50000 });
  assertStringIncludes(
    result,
    "<TotalW2MedicareWagesAndTipsAmt>50000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
