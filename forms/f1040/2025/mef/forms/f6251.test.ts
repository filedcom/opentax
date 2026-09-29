import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 } from "./f6251.ts";

function filed(fields: Parameters<typeof form6251.build>[0]): string {
  return form6251.build({ line11_amt: 1, ...fields });
}

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

Deno.test("line 2j estate/trust adjustment serializes signed in XSD order", () => {
  const xml = filed({
    iso_adjustment: 100,
    line2j_estates_and_trusts: -800,
    depreciation_adjustment: 50,
  });
  const line2i = xml.indexOf(
    "<IncentiveStockOptionsAmt>100</IncentiveStockOptionsAmt>",
  );
  const line2j = xml.indexOf("<EstatesAndTrustsAmt>-800</EstatesAndTrustsAmt>");
  const line2l = xml.indexOf("<DepreciationAmt>50</DepreciationAmt>");
  assertEquals(line2i >= 0 && line2i < line2j && line2j < line2l, true);
});

Deno.test("line 2k Form 8949 AMT basis difference serializes signed in XSD order", () => {
  const xml = filed({
    line2j_estates_and_trusts: 100,
    line2k_disposition: -10_000,
    depreciation_adjustment: 200,
  });
  const line2j = xml.indexOf("<EstatesAndTrustsAmt>100</EstatesAndTrustsAmt>");
  const line2k = xml.indexOf(
    "<PropertyDispositionAmt>-10000</PropertyDispositionAmt>",
  );
  const line2l = xml.indexOf("<DepreciationAmt>200</DepreciationAmt>");
  assertEquals(line2j >= 0 && line2j < line2k && line2k < line2l, true);
});

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

Deno.test("regular_tax_income at zero does not file Form 6251 by itself", () => {
  const result = form6251.build({ regular_tax_income: 0 });
  assertEquals(result, "");
});

Deno.test("an adjustment without AMT does not attach Form 6251", () => {
  assertEquals(form6251.build({ iso_adjustment: 5_000 }), "");
});

Deno.test("line 2d depletion serializes as a signed amount between lines 2c and 2g", () => {
  const xml = filed({
    line2c_investment_interest: 100,
    line2d_depletion: -250,
    private_activity_bond_interest: 500,
  });
  const line2c = xml.indexOf(
    "<InvestmentInterestAmt>100</InvestmentInterestAmt>",
  );
  const line2d = xml.indexOf("<DepletionAmt>-250</DepletionAmt>");
  const line2g = xml.indexOf(
    "<ExemptPrivateActivityBondsAmt>500</ExemptPrivateActivityBondsAmt>",
  );
  assertEquals(line2c >= 0 && line2c < line2d && line2d < line2g, true);
});

Deno.test("line 2o circulation cost serializes signed after depreciation", () => {
  const xml = filed({
    depreciation_adjustment: 100,
    line2o_circulation_costs: -250,
    amti: 1_000,
  });
  const line2l = xml.indexOf("<DepreciationAmt>100</DepreciationAmt>");
  const line2o = xml.indexOf("<CirculationCostAmt>-250</CirculationCostAmt>");
  const line4 = xml.indexOf("<AlternativeMinTaxableIncomeAmt>");
  assertEquals(line2l >= 0 && line2l < line2o && line2o < line4, true);
});

Deno.test("a claimed Form 8911 credit attaches Form 6251 with zero AMT", () => {
  const xml = form6251.build({ must_file_for_credit: true, line11_amt: 0 });
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("line 7 above line 10 attaches Form 6251 even when AMTFTC leaves zero AMT", () => {
  const xml = form6251.build({
    tentative_tax: 29_094,
    amtftc: 29_094,
    net_tmt: 0,
    regular_tax: 10_000,
    line11_amt: 0,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
  assertEquals(
    form6251.build({
      tentative_tax: 29_094,
      regular_tax: 30_000,
      line11_amt: 0,
    }),
    "",
  );
});

Deno.test("negative-adjustment filing attaches zero-AMT Form 6251 even when line 7 is below line 10", () => {
  const xml = form6251.build({
    regular_tax_income: 100_000,
    line2c_investment_interest: -20_000,
    tentative_tax: 0,
    regular_tax: 2_000,
    line11_amt: 0,
    must_file_for_negative_adjustments: true,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>-20000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("domestic preferential-income counterfactual retains a zero-AMT filing form", () => {
  const xml = form6251.build({
    regular_tax_income: 100_000,
    qualified_dividends: 1_000,
    line2c_investment_interest: -20_000,
    tentative_tax: 0,
    regular_tax: 2_000,
    line11_amt: 0,
    must_file_for_negative_adjustments: true,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>-20000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("negative-adjustment filing trigger cannot emit an empty Form 6251", () => {
  assertThrows(
    () => form6251.build({ must_file_for_negative_adjustments: true }),
    Error,
    "needs calculated form lines",
  );
});

Deno.test("Part III fields follow TY2025 XSD order and omit inapplicable lines", () => {
  const xml = filed({
    line12: 111_900,
    line13: 10_000,
    line20: 10_000,
    line23: 10_000,
    line40: 26_494,
  });
  assertEquals(xml.includes("<UnrecapturedSection1250GainAmt>"), false);
  const tags = [
    "ReportedAltMinTaxableIncAmt",
    "CapitalGainsWorksheetAmt",
    "IncomeAboveThresholdWorkshtAmt",
    "SmllrAbvThrshldOrAltMinGainAmt",
    "TaxOnAlternativeMinimumGainAmt",
  ];
  assertEquals(
    tags.map((tag) => xml.indexOf(`<${tag}>`)),
    [...tags.map((tag) => xml.indexOf(`<${tag}>`))].sort((a, b) => a - b),
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping for the base input fields
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income maps to Form 6251 line 1b", () => {
  const result = filed({
    regular_tax_income: 75000,
    iso_adjustment: 1,
  });
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
});

Deno.test("regular_tax maps to AdjustedRegularTaxAmt", () => {
  const result = filed({ regular_tax: 12000, iso_adjustment: 1 });
  assertStringIncludes(
    result,
    "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>",
  );
});

Deno.test("iso_adjustment maps to IncentiveStockOptionsAmt", () => {
  const result = filed({ iso_adjustment: 5000 });
  assertStringIncludes(
    result,
    "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>",
  );
});

Deno.test("depreciation_adjustment maps to DepreciationAmt", () => {
  const result = filed({ depreciation_adjustment: 3000 });
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
});

Deno.test("unsourced direct ATNOLD cannot be serialized as Form 6251 line 2f", () => {
  for (const adjustment of [-2_000, 2_000]) {
    assertThrows(
      () => filed({ nol_adjustment: adjustment }),
      Error,
      "sourced regular NOL and AMT NOL refigures",
    );
  }
});

Deno.test("private_activity_bond_interest maps to ExemptPrivateActivityBondsAmt", () => {
  const result = filed({ private_activity_bond_interest: 800 });
  assertStringIncludes(
    result,
    "<ExemptPrivateActivityBondsAmt>800</ExemptPrivateActivityBondsAmt>",
  );
});

Deno.test("qsbs_adjustment maps to Section1202ExclusionAmt", () => {
  const result = filed({ qsbs_adjustment: 10000 });
  assertStringIncludes(
    result,
    "<Section1202ExclusionAmt>10000</Section1202ExclusionAmt>",
  );
});

Deno.test("line2a_taxes_paid maps to ScheduleATaxesAmt", () => {
  const result = filed({ line2a_taxes_paid: 15000 });
  assertStringIncludes(result, "<ScheduleATaxesAmt>15000</ScheduleATaxesAmt>");
});

Deno.test("line2b_tax_refund maps to positive TotalRefundReceivedAmt", () => {
  const result = filed({ line2b_tax_refund: 1_000 });
  assertStringIncludes(
    result,
    "<TotalRefundReceivedAmt>1000</TotalRefundReceivedAmt>",
  );
});

Deno.test("mixed other_adjustments cannot be serialized as line 3", () => {
  for (const adjustment of [-1000, 1000]) {
    assertThrows(
      () => filed({ other_adjustments: adjustment }),
      Error,
      "mixed other_adjustments needs line-specific AMT modeling",
    );
  }
});

Deno.test("amtftc maps to AMTForeignTaxCreditAmt", () => {
  const result = filed({ amtftc: 4500 });
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

Deno.test("Form 6251 XML rejects a line 8 credit when line 10 reaches line 7", () => {
  assertThrows(
    () =>
      form6251.build({
        tentative_tax: 29_094,
        regular_tax: 30_000,
        amtftc: 5_000,
        net_tmt: 24_094,
        line11_amt: 0,
        must_file_for_credit: true,
      }),
    Error,
    "line 8 must be blank",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("context-only income does not file Form 6251", () => {
  const result = form6251.build({ regular_tax_income: 75000 });
  assertEquals(result, "");
});

Deno.test("context-only income and regular tax do not file Form 6251", () => {
  const result = form6251.build({
    regular_tax_income: 75000,
    regular_tax: 12000,
  });
  assertEquals(result, "");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line11_amt: 1,
  regular_tax_income: 75000,
  regular_tax: 12000,
  iso_adjustment: 5000,
  depreciation_adjustment: 3000,
  private_activity_bond_interest: 800,
  qsbs_adjustment: 10000,
  line2a_taxes_paid: 15000,
  amtftc: 4500,
};

Deno.test("base fields present: output wrapped in IRS6251 tag", () => {
  const result = form6251.build(allFields);
  assertStringIncludes(result, "<IRS6251>");
  assertStringIncludes(result, "</IRS6251>");
});

Deno.test("base fields present: all elements emitted", () => {
  const result = form6251.build(allFields);
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
  assertStringIncludes(
    result,
    "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>",
  );
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
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
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = filed({
    filing_status: "MFJ",
    regular_tax_income: 75000,
    iso_adjustment: 1,
  });
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
