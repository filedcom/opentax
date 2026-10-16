import { fixture } from "./business.fixture.ts";
import type { BusinessReturnSource2026 } from "./business-qbi.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { business, payment, vehicle, wage } from "./business.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

export function businessQbiFixture2026(): BusinessReturnSource2026 {
  const source = fixture();
  return {
    ...source,
    qbi_review: {
      record_reference: "qbi-review",
      no_current_qbi_sources_other_than_listed_businesses: true,
      not_a_patron_of_a_specified_cooperative: true,
      no_released_suspended_losses_or_qualified_tip_deduction: true,
      no_adjustments_other_than_deductible_half_se_tax: true,
      not_business_of_trading_financial_instruments_or_commodities: true,
      se_deduction_allocation: "positive_net_profit_proportion_per_owner",
      businesses: source.businesses.map((b) => ({
        business_reference: b.business_reference,
        record_reference: `${b.business_reference}-qbi`,
        section162_business_and_current_income_qualifies_under199a: true,
        no_excluded_investment_capital_or_other_non_qbi_items: true,
        no_former_employee_presumption_or_rebuttal_needed: true,
      })),
      prior_losses: {
        kind: "none",
        record_reference: "2025-review",
        no_prior_qbi_or_reit_ptp_loss_carryover: true,
      },
    },
  };
}

export function businessGraphFixture2026() {
  const {
    filing_status: _status,
    taxpayer_tin: _tin,
    spouse_tin: _spouse,
    w2s,
    ...claim
  } = businessQbiFixture2026();
  return {
    general: { ...investmentGraphInput2026(0).general, do_not_claim_eic: true },
    w2s,
    schedule_c: { claim },
  };
}

export function jointBusinessGraphFixture2026() {
  const f = businessGraphFixture2026();
  const businesses = Array.from(
    { length: 6 },
    (_, i) =>
      business(`activity-${i + 1}`, i === 5 ? "987654321" : "123456789"),
  );
  businesses[0].vehicle = vehicle();
  businesses[0].expenses = Array.from({ length: 12 }, (_, i) => ({
    ...payment(`expense-${i}`, 25.25),
    category: "other" as const,
    description: `Current expense ${i + 1}`,
  }));
  businesses[0].vehicle.interest = {
    loan_reference: "vehicle-loan",
    lender_name: "Synthetic Lender",
    borrower_tin: "123456789",
    payments: [payment("interest", 1650.80)],
    loan_used_only_to_buy_this_vehicle: true,
    interest_not_claimed_elsewhere: true,
  };
  f.schedule_c.claim.businesses = businesses;
  f.schedule_c.claim.qbi_review.businesses = businesses.map((b) => ({
    ...f.schedule_c.claim.qbi_review.businesses[0],
    business_reference: b.business_reference,
  }));
  f.w2s = [wage("123456789", 184500)];
  return {
    ...f,
    general: {
      ...f.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "987654321",
      spouse_first_name: "Synthetic",
      spouse_last_name: "Spouse",
      spouse_dob: "1981-08-09",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
    },
  };
}
