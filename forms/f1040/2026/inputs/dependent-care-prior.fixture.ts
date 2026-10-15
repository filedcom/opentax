import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import type { PriorCarePayments2026 } from "./dependent-care-prior.ts";

export function priorCareFixture2026(priorOnly = false) {
  const f = dependentCareFixture2026();
  const child = f.general.dependents[0];
  const prior: Extract<PriorCarePayments2026, { kind: "paid_2025_in_2026" }> = {
    kind: "paid_2025_in_2026",
    prior_return: {
      tax_year: 2025,
      return_record_reference: "synthetic-2025-return",
      taxpayer_ssn: f.general.taxpayer_ssn.replaceAll("-", ""),
      filing_status: f.general.filing_status,
      form2441_line_a_considered_unmarried: false,
      complete_qualifying_person_inventory: true,
      qualifying_people: [{
        first_name: child.first_name,
        last_name: child.last_name,
        name_control: "INVE",
        ssn: child.ssn.replaceAll("-", ""),
        over_12_and_disabled: false,
        eligibility_in_2025_review_reference: "2025-care-person-review",
      }],
      form2441_line3_expenses: 2000,
      form2441_line4_earned_income: 15000,
      form2441_line5_earned_income: 15000,
      form2441_line6_credit_expenses: 2000,
      form2441_line24_deducted_benefits: 0,
      form2441_line25_excluded_benefits: 0,
      form1040_line11a_agi: 15000,
    },
    payments: [{
      receipt_reference: "2025-care-paid-2026",
      provider_index: 0,
      person_ssn: child.ssn.replaceAll("-", ""),
      incurred_start_date: "2025-12-01",
      incurred_end_date: "2025-12-31",
      paid_date: "2026-01-15",
      qualified_expense_review_reference: "prior-care-payment-review",
      not_previously_claimed_deducted_or_reimbursed: true,
      amount_paid: 600,
    }],
  };
  if (priorOnly) {
    f.form2441.claim.qualifying_people = [];
    f.form2441.claim.expenses = [];
    f.general.dependents = [];
  }
  f.form2441.claim.providers[0].amount_paid = priorOnly ? 600 : 6600;
  return {
    ...f,
    form2441: { claim: { ...f.form2441.claim, prior_year_expenses: prior } },
  };
}

export function priorCareOverflowFixture2026() {
  const f = priorCareFixture2026(true);
  const prior = f.form2441.claim.prior_year_expenses;
  const person = prior.prior_return.qualifying_people[0],
    payment = prior.payments[0];
  prior.prior_return.qualifying_people = Array.from({ length: 25 }, (_, i) => ({
    ...person,
    first_name: `PriorPerson${i + 1}`,
    ssn: String(222334400 + i),
    over_12_and_disabled: i === 24,
  }));
  prior.payments = prior.prior_return.qualifying_people.map((p, i) => ({
    ...payment,
    person_ssn: p.ssn,
    receipt_reference: `prior-receipt-${i + 1}`,
  }));
  f.form2441.claim.providers[0].amount_paid = 15000;
  return f;
}
