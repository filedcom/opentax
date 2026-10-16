import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { earlyRetirementSource2026 } from "./retirement-early.fixture.ts";
import {
  claimEarlyExceptions2026,
  type EarlyExceptionClaim2026,
} from "./retirement-exceptions.fixture.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
export function disabilityException2026(): Extract<
  EarlyExceptionClaim2026,
  { kind: "total_permanent_disability" }
> {
  return {
    kind: "total_permanent_disability",
    record_reference: "private-disability-review",
    payment_reference: "payment-one",
    patient_tin: "400001037",
    physician_record_reference: "private-disability-physician-record",
    physician_determination_signed_on: "2027-01-15",
    disability_onset_date: "2026-08-01",
    unable_to_perform_any_substantial_gainful_activity_verified: true,
    disability_caused_by_physical_or_mental_condition_verified: true,
    physician_expected_duration: "long_continued_indefinite",
    medical_evidence_covers_payment_date_verified: true,
    distribution_due_to_disability_verified: true,
  };
}
export function disabilityWithdrawal2026(simple = false) {
  return claimEarlyExceptions2026(earlyRetirementSource2026(simple), [
    disabilityException2026(),
  ]);
}
export function disabilityPension2026() {
  const c = retirementCopy2026("disability-pension");
  c.box7a_distribution_codes = [Code.Code3];
  c.box1_gross_distribution = 12000.75;
  c.box2a_taxable_amount = 10000.75;
  const s = retirementSource2026([c]);
  s.taxpayer_dob = "1971-06-15";
  const r = s.claim.reviews[0];
  r.payer_code3_disability_verified = true;
  r.disability_income = {
    kind: "employer_disability_pension",
    record_reference: "disability-pension-income-review",
    owner_tin: s.taxpayer_ssn,
    account_number: c.account_number,
    plan_record_reference: "plan-minimum-retirement-age-record",
    disability_retirement_date: "2025-01-01",
    minimum_retirement_age_date: "2026-06-15",
    earliest_non_disability_pension_eligibility_verified: true,
    employer_paid_disability_pension_verified: true,
    no_special_military_service_or_terrorism_exclusion_verified: true,
    complete_payment_inventory_verified: true,
    payments: [
      {
        record_reference: "may-payment",
        payment_date: "2026-05-31",
        gross: 4000.25,
        taxable: 3500.25,
      },
      {
        record_reference: "birthday-payment",
        payment_date: "2026-06-15",
        gross: 4000.25,
        taxable: 3500.25,
      },
      {
        record_reference: "after-birthday-payment",
        payment_date: "2026-06-16",
        gross: 4000.25,
        taxable: 3000.25,
      },
    ],
  };
  return s;
}
