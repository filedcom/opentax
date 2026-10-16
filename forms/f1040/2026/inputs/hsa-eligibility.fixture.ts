import type { HsaEligibility2026 } from "./hsa-eligibility.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
export function hsaEligibility2026(): HsaEligibility2026 {
  return {
    tax_year: 2026,
    owner_tin: "400001037",
    owner_dob: "1980-01-01",
    can_be_claimed_as_dependent: false,
    record_reference: "hsa-eligibility-inventory",
    reviewed_on: "2027-04-15",
    complete_monthly_plan_medicare_other_coverage_and_direct_care_inventory_verified:
      true,
    living_owner_no_inherited_account_verified: true,
    plans: [{
      source_document_reference: "health-plan-contract",
      policy_identifier: "health-policy",
      covered_owner_tin: "400001037",
      effective_from: "2026-01-01",
      effective_through: "2026-12-31",
      coverage: CoverageType.SelfOnly,
      contract_and_enrollment_terms_reviewed: true,
      kind: "ordinary_health_plan",
      annual_deductible: 1700,
      annual_out_of_pocket_maximum: 8500,
      embedded_individual_deductible: null,
      nonpermitted_benefits_before_minimum_deductible: false,
      telehealth_or_remote_care_before_deductible: false,
      plan_year_begins: "2026-01-01",
      all_deductible_out_of_pocket_network_and_preventive_care_terms_reviewed:
        true,
    }],
    direct_primary_care_arrangements: [],
    months: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      record_reference: `month-${i + 1}`,
      first_day_enrollment_and_other_coverage_reviewed: true,
      plan_references: ["health-plan-contract"],
      medicare: {
        enrolled: false,
        source_document_reference: "medicare-enrollment-review",
        retroactive_enrollment_reviewed: true,
      },
      other_coverage: {
        disposition: "none",
        source_document_reference: "other-coverage-review",
        spouse_plans_fsa_hra_va_ihs_and_other_health_coverage_reviewed: true,
      },
      direct_primary_care_references: [],
    })),
  };
}
export function hsaDpc2026(): HsaEligibility2026[
  "direct_primary_care_arrangements"
][number] {
  return {
    source_document_reference: "dpc-contract",
    arrangement_identifier: "dpc-membership",
    covered_owner_tin: "400001037",
    effective_from: "2026-01-01",
    effective_through: "2026-12-31",
    fixed_periodic_fee: 1800,
    billing_period_months: 12,
    covers_more_than_one_individual: false,
    statutory_primary_care_practitioners_only: true,
    solely_primary_care_without_prohibited_services: true,
    fixed_fee_is_sole_compensation_for_care_within_arrangement: true,
    entire_contract_not_only_services_used_reviewed: true,
  };
}
