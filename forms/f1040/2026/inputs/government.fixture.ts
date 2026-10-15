import type { z } from "zod";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type {
  governmentCopy2026Schema,
  refundHistory2025Schema,
} from "./government-source.ts";
export function governmentCopy2026(): z.input<typeof governmentCopy2026Schema> {
  return {
    tax_year: 2026,
    source_document_reference: "1099g-1",
    payer_name: "Synthetic State",
    payer_tin: "120001234",
    recipient_tin: "123456789",
    account_number: "benefit-1",
    corrected: false,
    superseded_document_references: [],
    box1_unemployment: 20000,
    box2_state_refund: 0,
    box4_federal_withheld: 2000.25,
    box5_rtaa: 0,
    box6_taxable_grants: 0,
    box7_agriculture: 0,
    box8_trade_or_business: false,
    box9_market_gain: 0,
    box10_family_leave: 0,
    state_information: [{
      state: "MA",
      payer_state_id: "STATE1",
      box12_state_withheld: 1500.25,
    }],
    unemployment_review: {
      record_reference: "benefits",
      program: "state_or_federal_unemployment",
      no_aftertax_contributions_or_other_excludable_benefits: true,
      all_2026_receipts_and_repayments_included: true,
      box1_reporting: "gross",
      receipts: [{
        record_reference: "payment",
        date: "2026-05-01",
        amount: 20000,
      }],
      repayments: [{
        record_reference: "repayment",
        date: "2026-09-01",
        benefit_year: 2026,
        amount: 3000,
      }],
    },
  };
}
export function refundHistory2025(): z.input<typeof refundHistory2025Schema> {
  return {
    record_reference: "prior-refund",
    return_reference: "return-2025",
    tax_year: 2025,
    taxpayer_tin: "123456789",
    filing_status: FilingStatus.Single,
    deduction_method: "itemized_income_tax",
    taxpayer_age_65_or_older: false,
    taxpayer_blind: false,
    spouse_age_65_or_older: false,
    spouse_blind: false,
    taxpayer_can_be_claimed_as_dependent: false,
    dependent_earned_income: 0,
    standard_deduction_eligible: true,
    salt_magi: 100000,
    state_local_income_taxes: 12000,
    state_local_sales_taxes: 2000,
    real_personal_property_taxes: 33000,
    schedule_a_line5e: 40000,
    total_itemized_deductions: 45000,
    taxable_income: 55000,
    all_2026_recoveries_of_2025_income_taxes_included: true,
    no_other_itemized_recoveries_prior_credits_amt_niit_or_special_tax_benefit_cases:
      true,
    no_tax_payments_deducted_in_other_years_or_refunded_previously: true,
  };
}
export function governmentGraphFixture2026(wages = 40000) {
  const { investment_income: _investment, ...base } = investmentGraphInput2026(
    wages,
  );
  return {
    ...base,
    general: { ...base.general, do_not_claim_eic: true },
    government_payments: {
      claim: {
        record_reference: "government-inventory",
        all_government_payment_copies_and_corrections_included: true as const,
        copies: [governmentCopy2026()],
        refund_histories: [] as z.input<typeof refundHistory2025Schema>[],
      },
    },
  };
}
export function governmentRefundFixture2026(wages = 40000) {
  const f = governmentGraphFixture2026(wages),
    c = f.government_payments.claim.copies[0];
  c.box2_state_refund = 8000;
  c.box3_tax_year = 2025;
  c.refund_history_reference = "prior-refund";
  f.government_payments.claim.refund_histories = [refundHistory2025()];
  return f;
}
export function familyLeaveFixture2026(wages = 0) {
  const f = governmentGraphFixture2026(wages),
    c = f.government_payments.claim.copies[0];
  c.box1_unemployment = 0;
  delete c.unemployment_review;
  c.box10_family_leave = 3000.4;
  c.family_leave_review = {
    record_reference: "family",
    state_program: "State PFML",
    state_paid_family_leave_under_rev_rul_2025_4: true,
    no_medical_leave_sick_pay_or_employer_paid_benefits: true,
  };
  c.box5_rtaa = 100.4;
  c.rtaa_review = {
    record_reference: "rtaa",
    program: "reemployment_trade_adjustment_assistance",
    no_amount_reported_as_wages_or_unemployment: true,
  };
  c.box6_taxable_grants = 200.4;
  c.grant_review = {
    record_reference: "grant",
    program_name: "Nonbusiness grant",
    taxable_nonbusiness_noninvestment_grant: true,
    no_compensation_disaster_recovery_or_exclusion: true,
  };
  return f;
}
