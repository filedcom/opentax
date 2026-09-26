import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form2441 } from "./f2441.ts";
import type { Form2441FilingDetails } from "../../../nodes/intermediate/forms/form2441/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const filingDetails: Form2441FilingDetails = {
  filing_status: FilingStatus.Single,
  care_providers: [{
    kind: "business",
    name: "Care Center",
    name_control: "CARE",
    ein: "123456789",
    us_address: {
      line1: "100 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    household_employee: false,
    amount_paid: 3000,
  }],
  qualifying_people: [{
    first_name: "Child",
    last_name: "Smith",
    name_control: "SMIT",
    ssn: "123456789",
    credit_expenses_paid: 3000,
  }],
  taxpayer_earned_income: 50_000,
  tax_liability_limit: 500,
};

Deno.test("Form 2441 absent with no filing facts", () => {
  assertEquals(form2441.build({}), "");
  assertEquals(form2441.build({ dep_care_benefits: 0 }), "");
});

Deno.test("Form 2441 rejects W-2 benefits without Part I and II facts", () => {
  assertThrows(
    () => form2441.build({ dep_care_benefits: 5000 }),
    Error,
    "care-provider and qualifying-person",
  );
});

Deno.test("Form 2441 emits provider, person, credit limit and capped credit", () => {
  const xml = form2441.build({ filing_details: filingDetails, agi: 50_000 });
  assertStringIncludes(xml, "<CareProviderGrp>");
  assertStringIncludes(
    xml,
    "<CareProviderBusNameControlTxt>CARE</CareProviderBusNameControlTxt>",
  );
  assertStringIncludes(
    xml,
    "<QualifyingPersonSSN>123456789</QualifyingPersonSSN>",
  );
  assertStringIncludes(
    xml,
    "<CareExpensesDecimalAmt>.20</CareExpensesDecimalAmt>",
  );
  assertStringIncludes(
    xml,
    "<CalculatedTentativeExpenseAmt>600</CalculatedTentativeExpenseAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxLiabLmtFromCrLmtWrkshtAmt>500</TaxLiabLmtFromCrLmtWrkshtAmt>",
  );
  assertStringIncludes(
    xml,
    "<CreditForChildAndDepdCareAmt>500</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("Form 2441 reconciles excluded benefits before calculating credit", () => {
  const xml = form2441.build({
    agi: 50_000,
    dep_care_benefits: 5000,
    filing_details: {
      ...filingDetails,
      care_providers: [{
        ...filingDetails.care_providers[0],
        amount_paid: 7000,
      }],
      qualifying_people: [{
        ...filingDetails.qualifying_people[0],
        credit_expenses_paid: 2000,
      }],
      total_qualified_expenses_incurred: 7000,
      dependent_care_plan_limit: 5000,
    },
  });
  assertStringIncludes(
    xml,
    "<DependentCareBenefitsAmt>5000</DependentCareBenefitsAmt>",
  );
  assertStringIncludes(xml, "<ExcludedBenefitsAmt>5000</ExcludedBenefitsAmt>");
  assertStringIncludes(xml, "<NetAllowableAmt>0</NetAllowableAmt>");
  assertStringIncludes(
    xml,
    "<CreditForChildAndDepdCareAmt>0</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("Form 2441 rejects credit expenses counted again as excluded benefits", () => {
  assertThrows(
    () =>
      form2441.build({
        agi: 50_000,
        dep_care_benefits: 5000,
        filing_details: {
          ...filingDetails,
          dependent_care_plan_limit: 5000,
          total_qualified_expenses_incurred: 5000,
        },
      }),
    Error,
    "exceed qualified expenses",
  );
});

Deno.test("Form 2441 requires the plan cap for employer benefits", () => {
  assertThrows(
    () =>
      form2441.build({
        agi: 50_000,
        dep_care_benefits: 1000,
        filing_details: {
          ...filingDetails,
          total_qualified_expenses_incurred: 4000,
        },
      }),
    Error,
    "plan limit",
  );
});

Deno.test("Form 2441 rejects more than three providers without the required statement", () => {
  assertThrows(
    () =>
      form2441.build({
        agi: 50_000,
        filing_details: {
          ...filingDetails,
          care_providers: Array.from(
            { length: 4 },
            () => filingDetails.care_providers[0],
          ),
        },
      }),
    Error,
    "attached statement",
  );
});

Deno.test("Form 2441 MFS exclusion does not create an ineligible credit", () => {
  const xml = form2441.build({
    agi: 50_000,
    dep_care_benefits: 1000,
    filing_details: {
      ...filingDetails,
      filing_status: FilingStatus.MFS,
      mfs_eligibility_met: false,
      mfs_line19_income: 10_000,
      dependent_care_plan_limit: 2500,
      total_qualified_expenses_incurred: 4000,
    },
  });
  assertStringIncludes(xml, "<SpecifiedAmt>2500</SpecifiedAmt>");
  assertStringIncludes(
    xml,
    "<SpouseEarnedIncomeAmt>50000</SpouseEarnedIncomeAmt>",
  );
  assertStringIncludes(xml, "<SpouseIncomeAmt>10000</SpouseIncomeAmt>");
  assertStringIncludes(
    xml,
    "<CreditForChildAndDepdCareAmt>0</CreditForChildAndDepdCareAmt>",
  );
});

Deno.test("Form 2441 refuses a Schedule 3 credit that disagrees with its own line 11", () => {
  assertThrows(
    () =>
      form2441.build(
        { filing_details: filingDetails, agi: 50_000 },
        { pending: { schedule3: { line2_childcare_credit: 600 } } },
      ),
    Error,
    "differs from Schedule 3",
  );
});

Deno.test("Form 2441 refuses taxable benefits that disagree with Form 1040", () => {
  assertThrows(
    () =>
      form2441.build(
        {
          agi: 50_000,
          dep_care_benefits: 6000,
          filing_details: {
            ...filingDetails,
            qualifying_people: [{
              ...filingDetails.qualifying_people[0],
              credit_expenses_paid: 0,
            }],
            dependent_care_plan_limit: 5000,
            total_qualified_expenses_incurred: 5000,
          },
        },
        { pending: { f1040: { line1e_taxable_dep_care: 0 } } },
      ),
    Error,
    "differ from Form 1040",
  );
});
