import { businessCreditGraphFixture2026 } from "./business-earned.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import type { CareEarnedIncomeReview2026 } from "./dependent-care-earned.ts";

export function businessCareFixture2026(
  profit = 10000,
  wages = 50000,
  benefits = 0,
  expenses = 6000,
) {
  const b = businessCreditGraphFixture2026(profit);
  const care = dependentCareFixture2026(wages || 1, benefits, expenses);
  if (wages === 0) {
    Object.assign(care.w2s[0], {
      box1_wages: 0,
      box2_fed_withheld: 0,
      box3_ss_wages: 0,
      box4_ss_withheld: 0,
      box5_medicare_wages: 0,
      box6_medicare_withheld: 0,
    });
  }
  delete care.form2441.claim.ordinary_w2_earnings_only;
  care.form2441.claim.business_inventory_reference =
    b.schedule_c.claim.record_reference;
  care.form2441.claim.earned_income = {
    method: "annual_business",
    no_student_or_disability_deemed_income: true,
  };
  return {
    ...b,
    general: { ...b.general, dependents: care.general.dependents },
    w2s: care.w2s,
    form2441: care.form2441,
  };
}

export function monthlyBusinessCareFixture2026() {
  const f = businessCareFixture2026(1000, 0, 2000, 3000);
  const review: CareEarnedIncomeReview2026 = {
    method: "monthly",
    taxpayer: {
      record_reference: "monthly-earnings",
      business_allocation_review: {
        record_reference: "monthly-business-books-and-se-deduction",
        actual_months_earned_and_se_deduction_allocation_reviewed: true,
      },
      school_meets_full_time_student_definition: true,
      enrollment_record_reference: "five-month-full-time-enrollment",
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        w2_wages: 0,
        nontaxable_combat_pay: 0,
        taxable_care_benefits: i === 0 ? 71 : 0,
        business: {
          regular_net_profit: i === 0 ? 1000 : 0,
          statutory_gross_income: 0,
          se_deduction: i === 0 ? 71 : 0,
        },
        full_time_student: i < 5,
        incapable_of_self_care: false,
      })),
    },
    both_eligible_month_choices: [],
  };
  f.form2441.claim.earned_income = review;
  return f;
}
