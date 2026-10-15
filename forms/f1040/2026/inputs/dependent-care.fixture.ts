import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import type { z } from "zod";
import type { dependentCareClaim2026Schema } from "./dependent-care.ts";

export function dependentCareFixture2026(
  wages = 50000,
  benefits = 0,
  expenses = 6000,
) {
  const base = childCreditGraphFixture2026(wages);
  base.general.dependents[0].dob = "2018-06-01";
  const form2441: z.input<typeof dependentCareClaim2026Schema> = {
    claim: {
      tax_year: 2026,
      review_reference: "synthetic-care-review",
      ordinary_w2_earnings_only: true,
      earned_income: {
        method: "annual_w2",
        no_student_or_disability_deemed_income: true,
      },
      combat_pay_elections: {
        benefits: { taxpayer: false, spouse: false },
        credit: { taxpayer: false, spouse: false },
      },
      no_prior_year_expenses_paid: true,
      no_proprietor_or_partner_benefits: true,
      no_foreign_tax_or_form8978_credit: true,
      no_spouse_death_during_year: true,
      care_enabled_work_or_job_search: true,
      eligible_unrelated_providers_reviewed: true,
      no_medical_deduction_or_other_reimbursement_for_these_expenses: true,
      providers: [{
        kind: "business",
        name: "Synthetic Childcare",
        name_control: "SYNT",
        ein: "120000099",
        us_address: {
          line1: "123 Example Road",
          city: "Boston",
          state: "MA",
          zip: "02110",
        },
        household_employee: false,
        amount_paid: expenses,
      }],
      children: [{
        ssn: base.general.dependents[0].ssn,
        care_only_while_under_13: true,
        custodial_parent_and_dependency_requirements_met: true,
      }],
      expenses: [{
        receipt_reference: "care-receipt-2026",
        provider_index: 0,
        child_ssn: base.general.dependents[0].ssn,
        qualified_amount_incurred_and_paid_in_2026: expenses,
      }],
      ...(benefits > 0
        ? {
          benefits: {
            plan_record_reference: "care-plan-2026",
            plan_maximum_exclusion: 7500,
            carryover_used_in_2026: 0,
            forfeited_or_carried_to_2027: 0,
            w2_box10_reviews: [{
              source_document_reference: base.w2s![0].source_document_reference,
              amount_already_in_box1: 0,
            }],
          },
        }
        : {}),
    },
  };
  return {
    ...base,
    w2s: base.w2s!.map((w) => ({
      ...w,
      tax_year: 2026 as const,
      box10_dep_care: benefits,
    })),
    form2441,
  };
}
