import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8829 } from "./f8829.ts";

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
  assertEquals(buildIRS8829({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS8829({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("total_area at zero is emitted", () => {
  const result = buildIRS8829({ total_area: 0 });
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>0</TotalAreaOfHomeSqFtCnt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 12 fields)
// ---------------------------------------------------------------------------

Deno.test("total_area maps to TotalAreaOfHomeSqFtCnt", () => {
  const result = buildIRS8829({ total_area: 2000 });
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>2000</TotalAreaOfHomeSqFtCnt>",
  );
});

Deno.test("business_area maps to BusinessAreaOfHomeSqFtCnt", () => {
  const result = buildIRS8829({ business_area: 400 });
  assertStringIncludes(
    result,
    "<BusinessAreaOfHomeSqFtCnt>400</BusinessAreaOfHomeSqFtCnt>",
  );
});

Deno.test("mortgage_interest maps to MortgageInterestAmt", () => {
  const result = buildIRS8829({ mortgage_interest: 12000 });
  assertStringIncludes(
    result,
    "<MortgageInterestAmt>12000</MortgageInterestAmt>",
  );
});

Deno.test("insurance maps to InsuranceAmt", () => {
  const result = buildIRS8829({ insurance: 1500 });
  assertStringIncludes(result, "<InsuranceAmt>1500</InsuranceAmt>");
});

Deno.test("rent maps to RentAmt", () => {
  const result = buildIRS8829({ rent: 18000 });
  assertStringIncludes(result, "<RentAmt>18000</RentAmt>");
});

Deno.test("repairs_maintenance maps to RepairsAndMaintenanceAmt", () => {
  const result = buildIRS8829({ repairs_maintenance: 500 });
  assertStringIncludes(
    result,
    "<RepairsAndMaintenanceAmt>500</RepairsAndMaintenanceAmt>",
  );
});

Deno.test("utilities maps to UtilitiesAmt", () => {
  const result = buildIRS8829({ utilities: 3000 });
  assertStringIncludes(result, "<UtilitiesAmt>3000</UtilitiesAmt>");
});

Deno.test("other_expenses maps to OtherExpensesAmt", () => {
  const result = buildIRS8829({ other_expenses: 600 });
  assertStringIncludes(result, "<OtherExpensesAmt>600</OtherExpensesAmt>");
});

Deno.test("gross_income_limit maps to GrossIncomeLimitAmt", () => {
  const result = buildIRS8829({ gross_income_limit: 80000 });
  assertStringIncludes(
    result,
    "<GrossIncomeLimitAmt>80000</GrossIncomeLimitAmt>",
  );
});

Deno.test("prior_year_operating_carryover maps to PYOperatingExpensesCyovAmt", () => {
  const result = buildIRS8829({ prior_year_operating_carryover: 200 });
  assertStringIncludes(
    result,
    "<PYOperatingExpensesCyovAmt>200</PYOperatingExpensesCyovAmt>",
  );
});

Deno.test("home_fmv_or_basis maps to HomeFMVOrAdjBasisAmt", () => {
  const result = buildIRS8829({ home_fmv_or_basis: 350000 });
  assertStringIncludes(
    result,
    "<HomeFMVOrAdjBasisAmt>350000</HomeFMVOrAdjBasisAmt>",
  );
});

Deno.test("prior_year_depreciation_carryover maps to PYDepreciationCyovAmt", () => {
  const result = buildIRS8829({ prior_year_depreciation_carryover: 300 });
  assertStringIncludes(
    result,
    "<PYDepreciationCyovAmt>300</PYDepreciationCyovAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS8829({ total_area: 2000 });
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>2000</TotalAreaOfHomeSqFtCnt>",
  );
  assertNotIncludes(result, "<BusinessAreaOfHomeSqFtCnt>");
  assertNotIncludes(result, "<MortgageInterestAmt>");
  assertNotIncludes(result, "<RentAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS8829({ total_area: 2000, mortgage_interest: 12000 });
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>2000</TotalAreaOfHomeSqFtCnt>",
  );
  assertStringIncludes(
    result,
    "<MortgageInterestAmt>12000</MortgageInterestAmt>",
  );
  assertNotIncludes(result, "<BusinessAreaOfHomeSqFtCnt>");
  assertNotIncludes(result, "<InsuranceAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  total_area: 2000,
  business_area: 400,
  mortgage_interest: 12000,
  insurance: 1500,
  rent: 18000,
  repairs_maintenance: 500,
  utilities: 3000,
  other_expenses: 600,
  gross_income_limit: 80000,
  prior_year_operating_carryover: 200,
  home_fmv_or_basis: 350000,
  prior_year_depreciation_carryover: 300,
};

Deno.test("all 12 fields present: output wrapped in IRS8829 tag", () => {
  const result = buildIRS8829(allFields);
  assertStringIncludes(result, "<IRS8829>");
  assertStringIncludes(result, "</IRS8829>");
});

Deno.test("all 12 fields present: all elements emitted", () => {
  const result = buildIRS8829(allFields);
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>2000</TotalAreaOfHomeSqFtCnt>",
  );
  assertStringIncludes(
    result,
    "<BusinessAreaOfHomeSqFtCnt>400</BusinessAreaOfHomeSqFtCnt>",
  );
  assertStringIncludes(
    result,
    "<MortgageInterestAmt>12000</MortgageInterestAmt>",
  );
  assertStringIncludes(result, "<InsuranceAmt>1500</InsuranceAmt>");
  assertStringIncludes(result, "<RentAmt>18000</RentAmt>");
  assertStringIncludes(
    result,
    "<RepairsAndMaintenanceAmt>500</RepairsAndMaintenanceAmt>",
  );
  assertStringIncludes(result, "<UtilitiesAmt>3000</UtilitiesAmt>");
  assertStringIncludes(result, "<OtherExpensesAmt>600</OtherExpensesAmt>");
  assertStringIncludes(
    result,
    "<GrossIncomeLimitAmt>80000</GrossIncomeLimitAmt>",
  );
  assertStringIncludes(
    result,
    "<PYOperatingExpensesCyovAmt>200</PYOperatingExpensesCyovAmt>",
  );
  assertStringIncludes(
    result,
    "<HomeFMVOrAdjBasisAmt>350000</HomeFMVOrAdjBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<PYDepreciationCyovAmt>300</PYDepreciationCyovAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("string field is silently ignored", () => {
  const result = buildIRS8829({ method: "simplified", total_area: 2000 });
  assertStringIncludes(
    result,
    "<TotalAreaOfHomeSqFtCnt>2000</TotalAreaOfHomeSqFtCnt>",
  );
  assertNotIncludes(result, "method");
  assertNotIncludes(result, "simplified");
});
