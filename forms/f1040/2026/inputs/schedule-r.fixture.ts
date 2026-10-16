import { disabilityWageGraph2026 } from "./retirement-earned.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { ScheduleRSource2026 } from "./schedule-r-source.ts";
import { disabilityForFiler2026 } from "./retirement-earned.fixture.ts";
export function scheduleRSourceFixture2026(): ScheduleRSource2026 {
  const retirement = disabilityForFiler2026("123456789");
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: retirement.taxpayer_ssn,
    taxpayer_dob: retirement.taxpayer_dob,
    taxpayer_first_name: "Synthetic",
    tax_residency: "full_year_citizen_or_resident",
    retirement_sources_2026: retirement,
    agi: 17001,
    gross_ssa: 0,
    taxable_ssa: 0,
    regular_tax: 93,
    schedule2_part1_tax: 0,
    finalized_dependent_care_credit: 0,
    claim: {
      tax_year: 2026,
      record_reference: "schedule-r-review",
      reviewed_on: "2027-03-01",
      all_taxable_disability_and_nontaxable_benefit_sources_included: true,
      no_foreign_tax_or_form8978_credit: true,
      all_taxable_disability_payments_reported_in_retirement_inventory: true,
      retirement_inventory_reference: retirement.claim.record_reference,
      other_benefits: [],
      disability: [{
        owner_tin: retirement.taxpayer_ssn,
        record_reference: "disability-review",
        permanent_total_disability_due_to_physical_or_mental_condition_verified:
          true,
        no_substantial_gainful_activity_after_disability_retirement_verified:
          true,
        permanent_total_disability_at_retirement_verified: true,
        disability_onset_date: "2024-12-01",
        physician_statement: {
          kind: "prior_statement",
          record_reference: "private-physician-statement",
          signed_on: "2025-01-15",
          filed_for_1983_or_earlier_or_physician_signed_line_b_verified: true,
          continued_disability_and_no_substantial_gainful_activity_during_2026_verified:
            true,
        },
        plans: [{
          source_document_reference:
            retirement.claim.copies[0].source_document_reference,
          mandatory_retirement: {
            kind: "date",
            record_reference: "employer-mandatory-age",
            reached_on: "2036-06-15",
            employer_required_retirement_date_verified: true,
          },
        }],
      }],
    },
  };
}
export function scheduleRGraphFixture2026(wages = 7000, children = 1) {
  const b = disabilityWageGraph2026(wages, children),
    s = scheduleRSourceFixture2026();
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _old,
    ...child
  } = b.f8812;
  return {
    ...b,
    general: { ...b.general, do_not_claim_eic: true },
    schedule_r: { claim: s.claim! },
    f8812: {
      ...child,
      schedule_r_inventory_reference: s.claim!.record_reference,
      no_nonrefundable_credits_other_than_reviewed_sources: true as const,
    },
  };
}
