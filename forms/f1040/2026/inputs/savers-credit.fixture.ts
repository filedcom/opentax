import { FilingStatus } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import type { SaversCreditSource2026 } from "./savers-credit-source.ts";
export function saverSource2026(joint = false): SaversCreditSource2026 {
  return {
    filing_status: joint ? FilingStatus.MFJ : FilingStatus.Single,
    taxpayer_ssn: "400001037",
    taxpayer_dob: "1980-01-01",
    ...(joint ? { spouse_ssn: "400001038", spouse_dob: "1980-02-01" } : {}),
    wage_sources: [{
      tax_year: 2026,
      source_document_reference: "saver-wage",
      employer_ein: "12-3456789",
      employer_name: "Synthetic Employer",
      employee_ssn: "400001037",
      box1_wages: joint ? 48000 : 24000,
      box2_fed_withheld: 0,
      box3_ss_wages: 0,
      box4_ss_withheld: 0,
      box12_entries: [{ code: Box12Code.D, amount: 2000 }],
    }],
    agi: joint ? 48000 : 24000,
    finalized_tax: {
      line18: 3000,
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line6d: 0,
      schedule3_line6l: 0,
    },
    claim: {
      tax_year: 2026,
      record_reference: "saver-review",
      reviewed_on: "2027-04-15",
      complete_contribution_and_distribution_inventory_verified: true,
      no_foreign_or_territory_income_exclusions_or_housing_deduction: true,
      no_ira_contributions_outside_retained_annual_workpaper: true,
      no_able_contributions_or_current_able_distributions: true,
      no_other_plan_contributions_or_distributions: true,
      no_returned_excess_or_prior_year_deferrals_in_current_wages: true,
      filing_due_date: "2027-04-15",
      standard_calendar_year_deadline_and_no_special_postponement_verified:
        true,
      distribution_inventory_reviewed_through: "2027-04-14",
      owners: ["400001037", ...(joint ? ["400001038"] : [])].map((
        owner_tin,
      ) => ({
        owner_tin,
        record_reference: `eligibility-${owner_tin}`,
        claimed_as_dependent_on_another_2026_return: false,
        full_time_student_calendar_months: [],
        statutory_school_or_on_farm_training_definition_reviewed: true,
      })),
      voluntary_employee_contributions: [],
      other_year_distributions: [],
      other_year_joint_status: joint
        ? ([2024, 2025, 2027] as const).map((year) => ({
          year,
          filed_or_plans_jointly_with_current_spouse: true,
          filed_return_or_filing_plan_reference: `joint-${year}`,
        }))
        : [],
    },
  };
}
export function saverDistribution2026(
  reference = "prior-distribution",
): SaversCreditSource2026["claim"]["other_year_distributions"][number] {
  return {
    source_document_reference: reference,
    classification_review_reference: `${reference}-review`,
    owner_tin: "400001037",
    received_on: "2024-01-01",
    payer_tin: "123456789",
    account_number: "prior-account",
    plan_type: "traditional_ira",
    gross: 1000,
    treatment: "included",
    entire_amount_treatment_supported_by_source_verified: true,
  };
}
