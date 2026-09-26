import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8962 } from "./f8962.ts";

const annual = {
  household_size: 1,
  taxpayer_modified_agi: 75_300,
  household_income: 75_300,
  federal_poverty_line: 15_060,
  fpl_region: "contiguous" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 6_401,
  monthly_applicable_contribution: 533,
  annual_premium: 7_000,
  annual_slcsp: 7_000,
  annual_max_ptc: 599,
  annual_ptc_allowed: 599,
  annual_aptc: 2_000,
  total_premium_tax_credit: 599,
  total_advance_ptc: 2_000,
  excess_advance_payment: 1_401,
  excess_advance_premium: 1_401,
};

Deno.test("Form 8962 does not file solely because AGI and family context exist", () => {
  assertEquals(
    form8962.build({
      household_size: 1,
      household_income: 75_300,
      fpl_region: "contiguous",
    }),
    "",
  );
});

Deno.test("Form 8962 refuses raw premiums without its computed 2025 lines", () => {
  assertThrows(
    () => form8962.build({ annual_premium: 7_000 }),
    Error,
    "requires the completed 2025 calculation",
  );
});

Deno.test("annual Form 8962 uses the TY2025 group and line 24-29 tags", () => {
  const xml = form8962.build(annual);
  assertStringIncludes(xml, "<ModifiedAGIAmt>75300</ModifiedAGIAmt>");
  assertStringIncludes(xml, "<HouseholdIncomeAmt>75300</HouseholdIncomeAmt>");
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertStringIncludes(xml, "<AnnualPremiumAmt>7000</AnnualPremiumAmt>");
  assertStringIncludes(
    xml,
    "<AnnualPremiumTaxCreditAllwAmt>599</AnnualPremiumTaxCreditAllwAmt>",
  );
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2000</AnnualAdvancedPTCAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>599</TotalPremiumTaxCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>2000</TotalAdvancedPTCAmt>");
  assertStringIncludes(
    xml,
    "<ExcessAdvncPaymentAmt>1401</ExcessAdvncPaymentAmt>",
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1401</PremiumTaxCreditTaxLiabAmt>",
  );
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  assertEquals(xml.includes("<TotalPremiumAmt>"), false);
});

Deno.test("Form 8962 distinguishes taxpayer, dependent, and household income", () => {
  const xml = form8962.build({
    ...annual,
    household_size: 2,
    taxpayer_modified_agi: 60_000,
    dependents_modified_agi: 15_300,
    household_income: 75_300,
  });
  assertStringIncludes(xml, "<ModifiedAGIAmt>60000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>15300</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(xml, "<HouseholdIncomeAmt>75300</HouseholdIncomeAmt>");
});

Deno.test("Form 8962 rejects income totals that do not reconcile", () => {
  assertThrows(
    () =>
      form8962.build({
        ...annual,
        taxpayer_modified_agi: 60_000,
        dependents_modified_agi: 15_300,
        household_income: 60_000,
      }),
    Error,
    "household income must reconcile",
  );
});

Deno.test("monthly Form 8962 emits only the monthly choice branch", () => {
  const xml = form8962.build({
    ...annual,
    monthly_ptc_rows: [{
      month_code: "JANUARY",
      premium: 500,
      slcsp: 600,
      contribution: 50,
      max_assistance: 550,
      allowed_credit: 500,
      aptc: 0,
    }],
  });
  assertStringIncludes(xml, "<MonthlyPTCCalculationGrp>");
  assertStringIncludes(xml, "<MonthCd>JANUARY</MonthCd>");
  assertStringIncludes(xml, "<MonthlyAdvancedPTCAmt>0</MonthlyAdvancedPTCAmt>");
  assertEquals(xml.includes("<AnnualPTCCalculationGrp>"), false);
});

Deno.test("Form 8962 carries five Part IV groups and marks line 34 No", () => {
  const allocations = Array.from({ length: 5 }, (_, index) => ({
    basis: "other_agreed" as const,
    policy_number: `POLICY-${index + 1}`,
    other_taxpayer_ssn: "222334444",
    start_month: index + 1,
    end_month: index + 1,
    premium_pct: 0.5,
    slcsp_pct: 0.5,
    aptc_pct: 0.5,
  }));
  const xml = form8962.build({
    ...annual,
    monthly_ptc_rows: [],
    shared_policy_allocations: allocations,
  });
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 5);
  assertStringIncludes(
    xml,
    "<SharedPolicyAllocationInfoInd>false</SharedPolicyAllocationInfoInd>",
  );
  assertThrows(
    () =>
      form8962.build({
        ...annual,
        monthly_ptc_rows: [],
        shared_policy_allocations: Array.from({ length: 100 }, (_, index) => ({
          ...allocations[0],
          policy_number: `P${index}`,
        })),
      }),
    Error,
    "at most 99 MeF allocations",
  );
});
