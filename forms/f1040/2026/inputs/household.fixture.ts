import type { z } from "zod";
import type {
  householdClaim2026Schema,
  householdEmployee2026Schema,
} from "./household-source.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
export function householdEmployee2026(
  annual = 3900,
): z.input<typeof householdEmployee2026Schema> {
  return {
    employee_tin: "222334444",
    name: "Synthetic Worker",
    record_reference: "payroll",
    birth_date: "1980-03-01",
    relationship: "unrelated",
    relationship_record_reference: "relationship",
    household_work_under_employers_control: true,
    ordinary_cash_wages_only: true,
    no_employer_paid_employee_tax_or_state_disability: true,
    relationship_unchanged_during_service_years: true,
    payments: [1, 2, 3, 4].map((q) => ({
      record_reference: `pay-${q}`,
      paid_date: `2026-${String(q * 3).padStart(2, "0")}-15`,
      gross_cash_wages: annual / 4,
      federal_income_tax_withheld: 0,
      work_state: "MA",
    })),
    w2: {
      record_reference: "worker-w2",
      tax_year: 2026,
      employer_ein: "123456789",
      employee_tin: "222334444",
      box1_wages: annual,
      box2_withheld: 0,
      box3_ss_wages: annual >= 3000 ? Math.min(184500, annual) : 0,
      box5_medicare_wages: annual >= 3000 ? annual : 0,
    },
  };
}
export function householdFixture2026(annual = 3900) {
  const { investment_income: _investment, ...base } = investmentGraphInput2026(
    48100,
  );
  const household_employment: z.input<typeof householdClaim2026Schema> = {
    claim: {
      record_reference: "household",
      employer_tin: "123456789",
      employer_ein: "123456789",
      all_2025_and_2026_household_workers_and_payments_included: true,
      no_payroll_reported_by_agent_or_on_business_employment_returns: true,
      employees: [householdEmployee2026(annual)],
    },
  };
  return {
    ...base,
    general: { ...base.general, do_not_claim_eic: true },
    household_employment,
  };
}
export function householdFutaFixture2026(annual = 8000) {
  const f = householdFixture2026(annual);
  f.household_employment.claim.state_unemployment = {
    record_reference: "state",
    tax_year: 2026,
    state: "MA",
    all_futa_wages_subject_to_this_states_tax: true,
    no_other_state_taxable_workers_or_wages: true,
    wage_base: 15000,
    experience_rate: .02,
    rate_notice_reference: "rate",
    rate_applies_all_year: true,
    assessment_reference: "assessment",
    assessed_contributions: Math.min(annual, 15000) * .02,
    payments: [{
      record_reference: "state-payment",
      paid_date: "2027-04-15",
      amount: Math.min(annual, 15000) * .02,
    }],
    all_assessments_and_payments_included: true,
  };
  return f;
}
export function householdParentFixture2026() {
  const f = householdFixture2026(4100),
    e = f.household_employment.claim.employees[0];
  e.relationship = "parent";
  e.parent_review = {
    kind: "care_exception",
    record_reference: "parent-care",
    child_tin: "333445555",
    child_birth_date: "2015-06-01",
    child_lived_in_employers_home_all_year: true,
    employer_circumstance: "divorced_not_remarried",
    circumstance_record_reference: "divorce",
    qualifying_circumstance_applies_all_year: true,
    spouse_incapable_at_least_four_continuous_weeks_in_each_quarter: false,
    adult_child_incapable_at_least_four_continuous_weeks_in_each_quarter: false,
  };
  return f;
}
