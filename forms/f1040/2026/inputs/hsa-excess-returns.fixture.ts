import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { hsaMedicalDistributions2026 } from "./hsa-medical-distributions.fixture.ts";
import type { HsaMedicalDistributions2026 } from "./hsa-medical-distributions.ts";
export function hsaExcessReturns2026(
  employer = false,
): HsaMedicalDistributions2026 {
  const s = hsaMedicalDistributions2026(),
    f = hsaLimits2026(),
    a = f.claim.accounts[0];
  a.receipts = a.receipts.slice(0, 3);
  a.receipts[1].amount = employer ? 5000 : 1000;
  a.receipts[2].amount = employer ? 700 : 4000;
  a.form5498sa.box2_calendar_year_contributions = a.receipts.reduce(
    (n, r) => n + r.amount,
    0,
  );
  a.form5498sa.box3_following_year_contributions_for_2026 = 0;
  f.wage_sources[0].box12_entries![0].amount = a.receipts[0].amount +
    a.receipts[1].amount;
  s.taxpayer_dob = f.household_eligibility.owners[0].owner_dob;
  const d = s.claim.accounts[0];
  d.trustee_tin = a.trustee_tin;
  d.account_number = a.account_number;
  s.claim.copies[0].trustee_tin = a.trustee_tin;
  s.claim.copies[0].account_number = a.account_number;
  const code2 = structuredClone(s.claim.copies[0]);
  Object.assign(code2, {
    source_document_reference: "code2-1099sa",
    statement_identifier: "code2-statement",
    box1_gross_distribution: 630,
    box2_earnings_on_excess: 30,
    box3_distribution_code: "2",
  });
  s.claim.copies.push(code2);
  d.payments.push({
    record_reference: "excess-payment",
    custodian_transaction_identifier: "excess-txn",
    form1099sa_source_reference: code2.source_document_reference,
    distributed_on: "2026-11-01",
    gross_amount: 630,
    earnings_on_excess: 30,
  });
  delete s.treatment_review.owners[0]
    .no_rollover_excess_return_or_mistaken_distribution_in_payments_verified;
  s.treatment_review.owners[0]
    .no_rollover_or_mistaken_distribution_in_payments_verified = true;
  s.excess_returns = {
    contribution_sources: f,
    review: {
      record_reference: "excess-review",
      reviewed_on: "2027-05-31",
      deadline: {
        kind: "ordinary",
        record_reference: "deadline-review",
        return_due_on: "2027-04-15",
      },
      all_current_year_excess_returns_and_payroll_inclusions_reviewed: true,
      no_disaster_combat_zone_or_3019100_2_relief_claimed: true,
      no_employer_recoveries_or_loss_adjusted_returns_verified: true,
      owners: [{
        owner_tin: s.taxpayer_ssn,
        payroll_review_reference: "payroll-review",
        all_2026_w2_excess_inclusions_reviewed: true,
        w2_inclusions: [],
      }],
      withdrawals: [{
        record_reference: "excess-return",
        owner_tin: s.taxpayer_ssn,
        trustee_tin: a.trustee_tin,
        account_number: a.account_number,
        contribution_tax_year: 2026,
        contribution_kind: employer ? "employer_cash" : "personal_cash",
        contribution_allocations: [{
          receipt_reference: employer ? "payroll-current" : "personal-current",
          principal: 600,
        }],
        trustee_return_instruction_reference: "return-instruction",
        net_income_calculation_reference: "trustee-net-income",
        all_attributable_earnings_distributed_verified: true,
        no_deduction_or_income_exclusion_for_returned_principal_verified: true,
        payment: {
          kind: "current_year",
          distribution_payment_reference: "excess-payment",
        },
      }],
    },
  };
  return s;
}
export function moveHsaExcessReturnTo2027(
  s: HsaMedicalDistributions2026,
  paidOn = "2027-04-15",
) {
  s.claim.copies = s.claim.copies.filter((f) =>
    f.source_document_reference !== "code2-1099sa"
  );
  s.claim.accounts[0].payments = s.claim.accounts[0].payments.filter((p) =>
    p.record_reference !== "excess-payment"
  );
  s.excess_returns!.review.withdrawals[0].payment = {
    kind: "following_year",
    trustee_payment_reference: "postyear-payment",
    custodian_transaction_identifier: "postyear-txn",
    paid_on: paidOn,
    owner_receipt_reference: "owner-receipt",
    received_on: paidOn,
    amount_received: 630,
    gross_amount: 630,
    earnings_on_excess: 30,
    paid_to: "hsa_owner",
    current_custodian_paid_record_after_corrections_verified: true,
  };
}
