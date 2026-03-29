import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS6251 } from "./f6251.ts";

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
  assertEquals(buildIRS6251({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS6251({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income at zero is emitted", () => {
  const result = buildIRS6251({ regular_tax_income: 0 });
  assertStringIncludes(result, "<RegularTaxIncomeAmt>0</RegularTaxIncomeAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 10 fields)
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income maps to RegularTaxIncomeAmt", () => {
  const result = buildIRS6251({ regular_tax_income: 75000 });
  assertStringIncludes(
    result,
    "<RegularTaxIncomeAmt>75000</RegularTaxIncomeAmt>",
  );
});

Deno.test("regular_tax maps to RegularTaxAmt", () => {
  const result = buildIRS6251({ regular_tax: 12000 });
  assertStringIncludes(result, "<RegularTaxAmt>12000</RegularTaxAmt>");
});

Deno.test("iso_adjustment maps to ISOAdjustmentAmt", () => {
  const result = buildIRS6251({ iso_adjustment: 5000 });
  assertStringIncludes(result, "<ISOAdjustmentAmt>5000</ISOAdjustmentAmt>");
});

Deno.test("depreciation_adjustment maps to DepreciationAdjustmentAmt", () => {
  const result = buildIRS6251({ depreciation_adjustment: 3000 });
  assertStringIncludes(
    result,
    "<DepreciationAdjustmentAmt>3000</DepreciationAdjustmentAmt>",
  );
});

Deno.test("nol_adjustment maps to NOLAdjustmentAmt", () => {
  const result = buildIRS6251({ nol_adjustment: 2000 });
  assertStringIncludes(result, "<NOLAdjustmentAmt>2000</NOLAdjustmentAmt>");
});

Deno.test("private_activity_bond_interest maps to PrivateActivityBondIntAmt", () => {
  const result = buildIRS6251({ private_activity_bond_interest: 800 });
  assertStringIncludes(
    result,
    "<PrivateActivityBondIntAmt>800</PrivateActivityBondIntAmt>",
  );
});

Deno.test("qsbs_adjustment maps to QSBSAdjustmentAmt", () => {
  const result = buildIRS6251({ qsbs_adjustment: 10000 });
  assertStringIncludes(
    result,
    "<QSBSAdjustmentAmt>10000</QSBSAdjustmentAmt>",
  );
});

Deno.test("line2a_taxes_paid maps to TaxesPaidAmt", () => {
  const result = buildIRS6251({ line2a_taxes_paid: 15000 });
  assertStringIncludes(result, "<TaxesPaidAmt>15000</TaxesPaidAmt>");
});

Deno.test("other_adjustments maps to OtherAdjustmentsAmt", () => {
  const result = buildIRS6251({ other_adjustments: 1000 });
  assertStringIncludes(
    result,
    "<OtherAdjustmentsAmt>1000</OtherAdjustmentsAmt>",
  );
});

Deno.test("amtftc maps to AMTForeignTaxCreditAmt", () => {
  const result = buildIRS6251({ amtftc: 4500 });
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS6251({ regular_tax_income: 75000 });
  assertStringIncludes(
    result,
    "<RegularTaxIncomeAmt>75000</RegularTaxIncomeAmt>",
  );
  assertNotIncludes(result, "<RegularTaxAmt>");
  assertNotIncludes(result, "<ISOAdjustmentAmt>");
  assertNotIncludes(result, "<TaxesPaidAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS6251({
    regular_tax_income: 75000,
    regular_tax: 12000,
  });
  assertStringIncludes(
    result,
    "<RegularTaxIncomeAmt>75000</RegularTaxIncomeAmt>",
  );
  assertStringIncludes(result, "<RegularTaxAmt>12000</RegularTaxAmt>");
  assertNotIncludes(result, "<ISOAdjustmentAmt>");
  assertNotIncludes(result, "<NOLAdjustmentAmt>");
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
  const result = buildIRS6251(allFields);
  assertStringIncludes(result, "<IRS6251>");
  assertStringIncludes(result, "</IRS6251>");
});

Deno.test("all 10 fields present: all elements emitted", () => {
  const result = buildIRS6251(allFields);
  assertStringIncludes(
    result,
    "<RegularTaxIncomeAmt>75000</RegularTaxIncomeAmt>",
  );
  assertStringIncludes(result, "<RegularTaxAmt>12000</RegularTaxAmt>");
  assertStringIncludes(result, "<ISOAdjustmentAmt>5000</ISOAdjustmentAmt>");
  assertStringIncludes(
    result,
    "<DepreciationAdjustmentAmt>3000</DepreciationAdjustmentAmt>",
  );
  assertStringIncludes(result, "<NOLAdjustmentAmt>2000</NOLAdjustmentAmt>");
  assertStringIncludes(
    result,
    "<PrivateActivityBondIntAmt>800</PrivateActivityBondIntAmt>",
  );
  assertStringIncludes(
    result,
    "<QSBSAdjustmentAmt>10000</QSBSAdjustmentAmt>",
  );
  assertStringIncludes(result, "<TaxesPaidAmt>15000</TaxesPaidAmt>");
  assertStringIncludes(
    result,
    "<OtherAdjustmentsAmt>1000</OtherAdjustmentsAmt>",
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
  const result = buildIRS6251({
    filing_status: "MFJ",
    regular_tax_income: 75000,
  });
  assertStringIncludes(
    result,
    "<RegularTaxIncomeAmt>75000</RegularTaxIncomeAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
