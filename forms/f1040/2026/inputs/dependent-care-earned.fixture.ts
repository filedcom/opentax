import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { CareEarnedIncomeReview2026 } from "./dependent-care-earned.ts";

export function monthlyCareFixture2026() {
  const base = dependentCareFixture2026(50000, 3000, 6000);
  const monthly: Extract<CareEarnedIncomeReview2026, { method: "monthly" }> = {
    method: "monthly",
    taxpayer: {
      record_reference: "primary-monthly-payroll",
      school_meets_full_time_student_definition: false,
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          w2_wages: i === 0 ? 50000 : 0,
          nontaxable_combat_pay: 0,
          taxable_care_benefits: i === 5 ? 1200 : 0,
          full_time_student: false,
          incapable_of_self_care: false,
        }),
      ),
    },
    spouse: {
      record_reference: "spouse-monthly-payroll",
      school_meets_full_time_student_definition: true,
      enrollment_record_reference: "spouse-full-time-school-record",
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          w2_wages: i === 4 || i === 5 ? 400 : 0,
          nontaxable_combat_pay: 0,
          taxable_care_benefits: 0,
          full_time_student: i < 5,
          incapable_of_self_care: false,
        }),
      ),
    },
    both_eligible_month_choices: [],
  };
  base.form2441.claim.earned_income = monthly;
  return {
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "444556666",
      spouse_first_name: "Joint",
      spouse_last_name: "Investor",
      spouse_dob: "1982-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
    },
    w2s: [base.w2s[0], {
      ...base.w2s[0],
      employee_ssn: "444556666",
      source_document_reference: "spouse-care-w2",
      employer_ein: "120000044",
      box1_wages: 800,
      box2_fed_withheld: 0,
      box3_ss_wages: 800,
      box4_ss_withheld: 49.60,
      box5_medicare_wages: 800,
      box6_medicare_withheld: 11.60,
      box10_dep_care: 0,
    }],
  };
}

/** The unused benefits worksheet deems June income, while elected combat pay
 * supplies actual June credit income. Only Part II is printed, so B is blank. */
export function monthlyCareCreditOnlyFixture2026() {
  const base = dependentCareFixture2026(50000);
  base.form2441.claim.combat_pay_elections.credit.taxpayer = true;
  base.form2441.claim.earned_income = {
    method: "monthly",
    taxpayer: {
      record_reference: "primary-monthly-payroll",
      school_meets_full_time_student_definition: false,
      incapacity_record_reference: "June-incapacity-record",
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          w2_wages: i === 0 ? 50000 : 0,
          nontaxable_combat_pay: i === 5 ? 300 : 0,
          taxable_care_benefits: 0,
          full_time_student: false,
          incapable_of_self_care: i === 5,
        }),
      ),
    },
    both_eligible_month_choices: [],
  };
  return {
    ...base,
    w2s: base.w2s.map((w) => ({
      ...w,
      box12_entries: [{ code: "Q" as const, amount: 300 }],
    })),
  };
}
