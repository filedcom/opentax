import { assertThrows } from "@std/assert";
import {
  assertForm8880EligibleTotals,
  assertForm8880FiledCalculation,
  assertForm8880TaxLimit,
} from "./form8880_tax_limit.ts";
import { calculateForm8880 } from "../nodes/intermediate/forms/form8880/calculation.ts";
import {
  calculatePhysicalPresence2555,
  type PhysicalPresenceFiling,
} from "../nodes/intermediate/forms/form2555/calculation.ts";
import { FilingStatus } from "../nodes/types.ts";

Deno.test("Form 8880 tax limit uses 1040 line 18 less only the specified Schedule 3 credits", () => {
  const pending = {
    f1040: { line18_total_tax_before_credits: 2_000 },
    schedule3: {
      line1_total: 100,
      line2_childcare_credit: 200,
      line3_education_credit: 300,
      line4_retirement_savings_credit: 800,
      line6d_elderly_disabled_credit: 100,
      line6l_form8978_credit: 100,
      line6k_tax_credit_bonds: 400,
    },
  };
  assertForm8880TaxLimit(1_200, 800, pending);
  assertThrows(
    () => assertForm8880TaxLimit(800, 800, pending),
    Error,
    "differs from the finalized credit-limit worksheet",
  );
  assertThrows(
    () => assertForm8880TaxLimit(1_200, 700, pending),
    Error,
    "differs from Schedule 3 line 4",
  );
});

Deno.test("Form 8880 positive credit needs finalized line 18", () => {
  assertThrows(
    () =>
      assertForm8880TaxLimit(800, 800, {
        schedule3: { line4_retirement_savings_credit: 800 },
      }),
    Error,
    "needs finalized Form 1040 line 18",
  );
});

Deno.test("Form 8880 line 7 cannot claim an unassigned contributor amount", () => {
  assertForm8880EligibleTotals(1_000, 500, 1_500);
  assertThrows(
    () => assertForm8880EligibleTotals(0, 0, 1_500),
    Error,
    "differs from eligible contributor lines",
  );
});

Deno.test("Form 8880 filed foreign AGI addback matches Form 2555 and Schedule 1", () => {
  const foreignAddress = {
    line1: "1 Main Street",
    city: "Toronto",
    province_or_state: "Ontario",
    country_code: "CA",
    postal_code: "M5V 2T6",
  };
  const filing: PhysicalPresenceFiling = {
    foreign_address: foreignAddress,
    occupation: "Engineer",
    employer_name: "Maple Systems Ltd",
    employer_foreign_address: { ...foreignAddress, line1: "10 King Street" },
    employer_has_us_ein: false,
    employer_issued_w2: false,
    citizenship_country: "United States",
    tax_home_description: "Toronto, Canada",
    tax_home_established_date: "2024-12-01",
    tax_home_foreign_entire_period: true,
    physical_presence_begin: "2025-01-01",
    physical_presence_end: "2025-12-31",
    principal_employment_country: "Canada",
    no_travel_during_period: true,
    employment_contract_terms: "Indefinite full-time employment",
    visa_type: "Work permit",
    visa_limits_stay: false,
    maintained_us_home: false,
    no_prior_exclusion_claim: true,
    exclusion_previously_revoked: false,
    separate_foreign_residence: false,
    foreign_wages: 5_000,
    no_other_foreign_earned_income: true,
    claiming_housing_exclusion_or_deduction: false,
    deductions_allocable_to_excluded_income: 0,
  };
  const addback = calculatePhysicalPresence2555(filing, 2025).line45;
  const source = {
    ira_contributions_taxpayer: 2_000,
    agi: 20_000,
    foreign_agi_addback: addback,
    filing_status: FilingStatus.Single,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_000,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 Form 2555 source did not produce a credit");
  }
  const pending = {
    f1040: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line18_total_tax_before_credits: 1_000,
    },
    schedule1: { line8d_foreign_earned_income_exclusion: addback },
    schedule3: { line4_retirement_savings_credit: result.credit },
    form2555: { filing_details: filing },
  };
  assertForm8880FiledCalculation({ ...source, ...result.printFields }, pending);
  assertThrows(
    () =>
      assertForm8880FiledCalculation(
        {
          ...source,
          foreign_agi_addback: addback + 1,
          ...result.printFields,
        },
        pending,
      ),
    Error,
    "foreign AGI addback differs",
  );
});
