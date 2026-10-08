import { assertEquals, assertGreater } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: "single",
  taxpayer_ssn: "111-22-3333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference: "Synthetic 2025 family review",
  },
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "Synthetic IRS account transcript review",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
  },
};
const w2 = {
  employee_ssn: "111-22-3333",
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  box1_wages: 5_000,
  box2_fed_withheld: 0,
};
const foreignAddress = {
  line1: "1 Main Street",
  city: "Toronto",
  province_or_state: "Ontario",
  country_code: "CA",
  postal_code: "M5V 2T6",
};
const filingDetails = {
  foreign_address: foreignAddress,
  occupation: "Engineer",
  employer_name: "Maple Systems Ltd",
  employer_foreign_address: foreignAddress,
  employer_has_us_ein: false,
  employer_issued_w2: false,
  citizenship_country: "United States",
  tax_home_description: "Toronto, Canada",
  tax_home_established_date: "2024-06-01",
  tax_home_foreign_entire_period: true,
  physical_presence_begin: "2024-07-01",
  physical_presence_end: "2025-06-30",
  principal_employment_country: "Canada",
  no_travel_during_period: true,
  employment_contract_terms: "Indefinite full-time employment",
  visa_type: "Work permit",
  visa_limits_stay: false,
  maintained_us_home: false,
  no_prior_exclusion_claim: true,
  exclusion_previously_revoked: false,
  separate_foreign_residence: false,
  foreign_wages: 1,
  no_other_foreign_earned_income: true,
  claiming_housing_exclusion_or_deduction: false,
  deductions_allocable_to_excluded_income: 0,
  amt_line2b_disallowed_deductions_and_exclusions: 0,
};

Deno.test("a filed Form 2555 removes the EIC in the full computation graph", () => {
  const baseInputs = { general, w2: [w2] };
  const context = { taxYear: 2025, formType: "f1040" };
  const without2555 = execute(plan, registry, baseInputs, context);
  assertEquals(without2555.diagnostics, []);
  assertGreater(without2555.pending.f1040.line27_eitc as number, 0);

  const with2555 = execute(plan, registry, {
    ...baseInputs,
    form2555: { filing_details: filingDetails },
  }, context);
  assertEquals(with2555.diagnostics, []);
  assertEquals(with2555.pending.eitc.form2555_filed, true);
  assertEquals(with2555.pending.f1040.line27_eitc, undefined);
});
