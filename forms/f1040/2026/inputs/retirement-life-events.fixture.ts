import { earlyRetirementSource2026 } from "./retirement-early.fixture.ts";
import { claimEarlyExceptions2026 } from "./retirement-exceptions.fixture.ts";
import type { EarlyExceptionClaim2026 } from "./retirement-exceptions.fixture.ts";
export function terminalIllnessClaim2026(): Extract<
  EarlyExceptionClaim2026,
  { kind: "terminal_illness" }
> {
  return {
    kind: "terminal_illness",
    record_reference: "private-physician-certification",
    payment_reference: "payment-one",
    patient_tin: "400001037",
    physician_name: "Synthetic Physician",
    physician_contact: "Synthetic medical office record",
    physician_qualification: "MD",
    physician_license_jurisdiction: "TX",
    physician_legally_authorized_to_practice_verified: true,
    physician_is_not_patient_verified: true,
    examination_or_evidence_review_date: "2026-08-01",
    certification_signed_on: "2026-09-01",
    certified_expected_death_within_months: 84,
    physician_signed_narrative_and_attestation_verified: true,
    underlying_evidence_record_reference: "private-supporting-records",
    certification_and_underlying_evidence_retained_verified: true,
    distribution_otherwise_permissible_verified: true,
    administration: {
      route: "return_election",
      plan_does_not_permit_terminal_illness_distributions_verified: true,
      election_record_reference: "terminal-treatment-election",
    },
  };
}
export function terminalRetirementSource2026(simple = false, amount = 10000) {
  return claimEarlyExceptions2026(earlyRetirementSource2026(simple, amount), [
    terminalIllnessClaim2026(),
  ]);
}
export function deathRetirementSource2026(simple = false, amount = 10000) {
  const s = earlyRetirementSource2026(simple, amount);
  s.claim.reviews[0].death_benefit = {
    decedent_tin: "111223333",
    death_date: "2026-08-01",
    record_reference: "death-and-inherited-basis-review",
    no_inherited_basis_or_special_tax_treatment_verified: true,
  };
  return claimEarlyExceptions2026(s, [{
    kind: "death_beneficiary",
    record_reference: "beneficiary-treatment-review",
    payment_reference: "payment-one",
    decedent_tin: "111223333",
    beneficiary_entitlement_record_reference: "beneficiary-designation",
    inherited_account_not_treated_as_own_verified: true,
  }]);
}
