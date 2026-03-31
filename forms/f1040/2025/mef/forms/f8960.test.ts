import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8960 } from "./f8960.ts";

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
  assertEquals(form8960.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form8960.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("line1_taxable_interest at zero is emitted", () => {
  const result = form8960.build({ line1_taxable_interest: 0 });
  assertStringIncludes(result, "<TaxableInterestAmt>0</TaxableInterestAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 11 fields)
// ---------------------------------------------------------------------------

Deno.test("line1_taxable_interest maps to TaxableInterestAmt", () => {
  const result = form8960.build({ line1_taxable_interest: 3500 });
  assertStringIncludes(result, "<TaxableInterestAmt>3500</TaxableInterestAmt>");
});

Deno.test("line2_ordinary_dividends maps to OrdinaryDividendsAmt", () => {
  const result = form8960.build({ line2_ordinary_dividends: 1200 });
  assertStringIncludes(
    result,
    "<OrdinaryDividendsAmt>1200</OrdinaryDividendsAmt>",
  );
});

Deno.test("line3_annuities maps to AnnuitesFromNonQlfPlansAmt", () => {
  const result = form8960.build({ line3_annuities: 4000 });
  assertStringIncludes(
    result,
    "<AnnuitesFromNonQlfPlansAmt>4000</AnnuitesFromNonQlfPlansAmt>",
  );
});

Deno.test("line4a_passive_income maps to NetRentalIncomeOrLossAmt", () => {
  const result = form8960.build({ line4a_passive_income: 8000 });
  assertStringIncludes(
    result,
    "<NetRentalIncomeOrLossAmt>8000</NetRentalIncomeOrLossAmt>",
  );
});

Deno.test("line4b_rental_net maps to AdjNetIncmOrLossNonSect1411Amt", () => {
  const result = form8960.build({ line4b_rental_net: -2000 });
  assertStringIncludes(
    result,
    "<AdjNetIncmOrLossNonSect1411Amt>-2000</AdjNetIncmOrLossNonSect1411Amt>",
  );
});

Deno.test("line5a_net_gain maps to PropertyDisposGainOrLossAmt", () => {
  const result = form8960.build({ line5a_net_gain: 15000 });
  assertStringIncludes(
    result,
    "<PropertyDisposGainOrLossAmt>15000</PropertyDisposGainOrLossAmt>",
  );
});

Deno.test(
  "line5b_net_gain_adjustment maps to NonNIITPropDisposGainOrLossAmt",
  () => {
    const result = form8960.build({ line5b_net_gain_adjustment: -5000 });
    assertStringIncludes(
      result,
      "<NonNIITPropDisposGainOrLossAmt>-5000</NonNIITPropDisposGainOrLossAmt>",
    );
  },
);

Deno.test(
  "line7_other_modifications maps to OtherInvestmentIncomeOrLossAmt",
  () => {
    const result = form8960.build({ line7_other_modifications: 500 });
    assertStringIncludes(
      result,
      "<OtherInvestmentIncomeOrLossAmt>500</OtherInvestmentIncomeOrLossAmt>",
    );
  },
);

Deno.test(
  "line9a_investment_interest_expense maps to InvestmentInterestAmt",
  () => {
    const result = form8960.build({ line9a_investment_interest_expense: 1200 });
    assertStringIncludes(
      result,
      "<InvestmentInterestAmt>1200</InvestmentInterestAmt>",
    );
  },
);

Deno.test("line9b_state_local_tax maps to StateLocalForeignIncomeTaxAmt", () => {
  const result = form8960.build({ line9b_state_local_tax: 800 });
  assertStringIncludes(
    result,
    "<StateLocalForeignIncomeTaxAmt>800</StateLocalForeignIncomeTaxAmt>",
  );
});

Deno.test(
  "line10_additional_modifications maps to AdditionalModificationAmt",
  () => {
    const result = form8960.build({ line10_additional_modifications: 300 });
    assertStringIncludes(
      result,
      "<AdditionalModificationAmt>300</AdditionalModificationAmt>",
    );
  },
);

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form8960.build({ line1_taxable_interest: 3500 });
  assertStringIncludes(result, "<TaxableInterestAmt>3500</TaxableInterestAmt>");
  assertNotIncludes(result, "<OrdinaryDividendsAmt>");
  assertNotIncludes(result, "<NetRentalIncomeOrLossAmt>");
  assertNotIncludes(result, "<InvestmentInterestAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form8960.build({
    line1_taxable_interest: 2000,
    line9b_state_local_tax: 600,
  });
  assertStringIncludes(result, "<TaxableInterestAmt>2000</TaxableInterestAmt>");
  assertStringIncludes(
    result,
    "<StateLocalForeignIncomeTaxAmt>600</StateLocalForeignIncomeTaxAmt>",
  );
  assertNotIncludes(result, "<OrdinaryDividendsAmt>");
  assertNotIncludes(result, "<InvestmentInterestAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line1_taxable_interest: 100,
  line2_ordinary_dividends: 200,
  line3_annuities: 300,
  line4a_passive_income: 400,
  line4b_rental_net: 500,
  line5a_net_gain: 600,
  line5b_net_gain_adjustment: 700,
  line7_other_modifications: 800,
  line9a_investment_interest_expense: 900,
  line9b_state_local_tax: 1000,
  line10_additional_modifications: 1100,
};

Deno.test("all 11 fields present: output wrapped in IRS8960 tag", () => {
  const result = form8960.build(allFields);
  assertStringIncludes(result, "<IRS8960>");
  assertStringIncludes(result, "</IRS8960>");
});

Deno.test("all 11 fields present: all elements emitted", () => {
  const result = form8960.build(allFields);
  assertStringIncludes(result, "<TaxableInterestAmt>100</TaxableInterestAmt>");
  assertStringIncludes(
    result,
    "<OrdinaryDividendsAmt>200</OrdinaryDividendsAmt>",
  );
  assertStringIncludes(
    result,
    "<AnnuitesFromNonQlfPlansAmt>300</AnnuitesFromNonQlfPlansAmt>",
  );
  assertStringIncludes(
    result,
    "<NetRentalIncomeOrLossAmt>400</NetRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<AdjNetIncmOrLossNonSect1411Amt>500</AdjNetIncmOrLossNonSect1411Amt>",
  );
  assertStringIncludes(
    result,
    "<PropertyDisposGainOrLossAmt>600</PropertyDisposGainOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<NonNIITPropDisposGainOrLossAmt>700</NonNIITPropDisposGainOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<OtherInvestmentIncomeOrLossAmt>800</OtherInvestmentIncomeOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<InvestmentInterestAmt>900</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    result,
    "<StateLocalForeignIncomeTaxAmt>1000</StateLocalForeignIncomeTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<AdditionalModificationAmt>1100</AdditionalModificationAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status, magi) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status and magi are silently ignored", () => {
  const result = form8960.build({
    filing_status: "MFJ",
    magi: 300000,
    line1_taxable_interest: 5000,
  });
  assertStringIncludes(result, "<TaxableInterestAmt>5000</TaxableInterestAmt>");
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
  assertNotIncludes(result, "magi");
  assertNotIncludes(result, "300000");
});
