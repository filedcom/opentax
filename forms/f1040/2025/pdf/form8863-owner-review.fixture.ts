import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { ClaimantReview } from "../../nodes/inputs/f8863/claimant-review.ts";
export const adultEducationReview: ClaimantReview = {
  kind: "age_24_or_older",
  tax_year: 2025,
  claimant_ssn: "123456789",
  claimant_dob: "1985-06-15",
  dob_record_reference: "2025-parent-birth-record",
  claimant_actually_claimed_as_dependent: false,
  claimant_dependency_record_reference: "2025-parent-not-dependent-review",
};
export const educationOwnershipReview = (ssn: string) => ({
  tax_year: 2025 as const,
  claimant_ssn: "123456789",
  student_ssn: ssn,
  dependency_claim_state: "claimed_on_this_return" as const,
  student_can_be_claimed_as_dependent: true,
  dependency_claimant_ssn: "123456789",
  dependency_record_reference: `2025-${ssn}-dependency-review`,
  no_competing_education_claim: true as const,
  competing_claim_review_reference: `2025-${ssn}-competing-claim-review`,
});
export const educationDependentReview = (ssn: string) => ({
  first_name: "Student",
  last_name: "Test",
  name_control: "TEST",
  irs_relationship_code: IRSDependentRelationshipCode.Son,
  ssn,
  tin_issued_by_due_date: true,
  dob: "2005-06-15",
  relationship: DependentRelationship.Son,
  months_in_home: 12,
  full_time_student: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
  education_dependency_record_reference:
    educationOwnershipReview(ssn).dependency_record_reference,
});
export const educationGeneralReview = {
  filing_status: FilingStatus.Single,
  digital_assets: false,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn: "123456789",
  taxpayer_dob: adultEducationReview.claimant_dob,
  taxpayer_claimed_as_dependent: false,
  dependents: ["222-33-4444", "333-44-5555"].map(educationDependentReview),
};
