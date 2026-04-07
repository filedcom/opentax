import { assertEquals, assertStringIncludes } from "@std/assert";
import { form6251 } from "./f6251.ts";

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
  assertEquals(form6251.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form6251.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income at zero is emitted", () => {
  const result = form6251.build({ regular_tax_income: 0 });
  assertStringIncludes(result, "<AGIOrAGILessDeductionAmt>0</AGIOrAGILessDeductionAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 10 fields)
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income maps to AGIOrAGILessDeductionAmt", () => {
  const result = form6251.build({ regular_tax_income: 75000 });
  assertStringIncludes(
    result,
    "<AGIOrAGILessDeductionAmt>75000</AGIOrAGILessDeductionAmt>",
  );
});

Deno.test("regular_tax maps to AdjustedRegularTaxAmt", () => {
  const result = form6251.build({ regular_tax: 12000 });
  assertStringIncludes(result, "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>");
});

Deno.test("iso_adjustment maps to IncentiveStockOptionsAmt", () => {
  const result = form6251.build({ iso_adjustment: 5000 });
  assertStringIncludes(result, "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>");
});

Deno.test("depreciation_adjustment maps to DepreciationAmt", () => {
  const result = form6251.build({ depreciation_adjustment: 3000 });
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
});

Deno.test("nol_adjustment maps to AltTaxNetOperatingLossDedAmt", () => {
  const result = form6251.build({ nol_adjustment: 2000 });
  assertStringIncludes(result, "<AltTaxNetOperatingLossDedAmt>2000</AltTaxNetOperatingLossDedAmt>");
});

Deno.test("private_activity_bond_interest maps to ExemptPrivateActivityBondsAmt", () => {
  const result = form6251.build({ private_activity_bond_interest: 800 });
  assertStringIncludes(
    result,
    "<ExemptPrivateActivityBondsAmt>800</ExemptPrivateActivityBondsAmt>",
  );
});

Deno.test("qsbs_adjustment maps to Section1202ExclusionAmt", () => {
  const result = form6251.build({ qsbs_adjustment: 10000 });
  assertStringIncludes(
    result,
    "<Section1202ExclusionAmt>10000</Section1202ExclusionAmt>",
  );
});

Deno.test("line2a_taxes_paid maps to ScheduleATaxesAmt", () => {
  const result = form6251.build({ line2a_taxes_paid: 15000 });
  assertStringIncludes(result, "<ScheduleATaxesAmt>15000</ScheduleATaxesAmt>");
});

Deno.test("other_adjustments maps to RelatedAdjustmentAmt", () => {
  const result = form6251.build({ other_adjustments: 1000 });
  assertStringIncludes(
    result,
    "<RelatedAdjustmentAmt>1000</RelatedAdjustmentAmt>",
  );
});

Deno.test("amtftc maps to AMTForeignTaxCreditAmt", () => {
  const result = form6251.build({ amtftc: 4500 });
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form6251.build({ regular_tax_income: 75000 });
  assertStringIncludes(
    result,
    "<AGIOrAGILessDeductionAmt>75000</AGIOrAGILessDeductionAmt>",
  );
  assertNotIncludes(result, "<AdjustedRegularTaxAmt>");
  assertNotIncludes(result, "<IncentiveStockOptionsAmt>");
  assertNotIncludes(result, "<ScheduleATaxesAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form6251.build({
    regular_tax_income: 75000,
    regular_tax: 12000,
  });
  assertStringIncludes(
    result,
    "<AGIOrAGILessDeductionAmt>75000</AGIOrAGILessDeductionAmt>",
  );
  assertStringIncludes(result, "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>");
  assertNotIncludes(result, "<IncentiveStockOptionsAmt>");
  assertNotIncludes(result, "<AltTaxNetOperatingLossDedAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  regular_tax_income: 75000,
  regular_tax: 12000,
  iso_adjustment: 5000,
  depreciation_adjustment: 3000,
  nol_adjustment: 2000,
  private_activity_bond_interest: 800,
  qsbs_adjustment: 10000,
  line2a_taxes_paid: 15000,
  other_adjustments: 1000,
  amtftc: 4500,
};

Deno.test("all 10 fields present: output wrapped in IRS6251 tag", () => {
  const result = form6251.build(allFields);
  assertStringIncludes(result, "<IRS6251>");
  assertStringIncludes(result, "</IRS6251>");
});

Deno.test("all 10 fields present: all elements emitted", () => {
  const result = form6251.build(allFields);
  assertStringIncludes(
    result,
    "<AGIOrAGILessDeductionAmt>75000</AGIOrAGILessDeductionAmt>",
  );
  assertStringIncludes(result, "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>");
  assertStringIncludes(result, "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>");
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
  assertStringIncludes(result, "<AltTaxNetOperatingLossDedAmt>2000</AltTaxNetOperatingLossDedAmt>");
  assertStringIncludes(
    result,
    "<ExemptPrivateActivityBondsAmt>800</ExemptPrivateActivityBondsAmt>",
  );
  assertStringIncludes(
    result,
    "<Section1202ExclusionAmt>10000</Section1202ExclusionAmt>",
  );
  assertStringIncludes(result, "<ScheduleATaxesAmt>15000</ScheduleATaxesAmt>");
  assertStringIncludes(
    result,
    "<RelatedAdjustmentAmt>1000</RelatedAdjustmentAmt>",
  );
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = form6251.build({
    filing_status: "MFJ",
    regular_tax_income: 75000,
  });
  assertStringIncludes(
    result,
    "<AGIOrAGILessDeductionAmt>75000</AGIOrAGILessDeductionAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
