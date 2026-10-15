import type { z } from "zod";
import type {
  marketplaceCopy2026Schema,
  MarketplaceSource2026,
} from "./marketplace-source.ts";

export function marketplaceCopy2026(
  reference = "marketplace-issued-1",
  person = "400001037",
): z.input<typeof marketplaceCopy2026Schema> {
  return {
    tax_year: 2026,
    source_document_reference: reference,
    current_copy_review_reference: `${reference}-current-review`,
    issuer_name: "Example Marketplace",
    policy_number: reference,
    recipient_ssn: person,
    coverage_state: "TX",
    covered_individuals: [{
      individual_tin: person,
      enrolled_from: "2026-01-01",
      enrolled_through: "2026-12-31",
    }],
    monthly_premiums: Array(12).fill(416.67),
    monthly_slcsps: Array(12).fill(833.33),
    monthly_aptcs: Array(12).fill(250),
    annual_premium: 5_000.04,
    annual_slcsp: 9_999.96,
    annual_aptc: 3_000,
  };
}

export function marketplaceSource2026(
  copies = [marketplaceCopy2026()],
): MarketplaceSource2026 {
  return {
    tax_family_tins: [
      ...new Set(
        copies.flatMap((copy) =>
          copy.covered_individuals.map((p) => p.individual_tin)
        ),
      ),
    ],
    claim: {
      tax_year: 2026,
      record_reference: "marketplace-complete-inventory",
      reviewed_on: "2027-03-01",
      reviewer_name: "Example Reviewer",
      complete_marketplace_copy_inventory_verified: true,
      no_shared_tax_family_allocation_verified: true,
      no_marriage_or_divorce_during_year_verified: true,
      no_marriage_alternative_qsehra_or_self_employed_plan_verified: true,
      premiums_net_of_refunds_and_nonessential_benefits_verified: true,
      payment_allocations_not_reused_verified: true,
      copies,
      month_reviews: copies.flatMap((copy) =>
        copy.monthly_premiums.flatMap((premium, i) => {
          if (!premium || copy.void_box_checked) return [];
          const first = `2026-${String(i + 1).padStart(2, "0")}-01`;
          const reviewed = new Date(Date.UTC(2026, i + 1, 0)).toISOString()
            .slice(0, 10);
          const people = copy.covered_individuals.filter((p) =>
            p.enrolled_from <= first && p.enrolled_through >= first
          ).map((p) => p.individual_tin);
          const family = [
            ...new Set(
              copies.filter((c) =>
                c.coverage_state === copy.coverage_state &&
                c.monthly_premiums[i] > 0
              ).flatMap((c) =>
                c.covered_individuals.filter((p) =>
                  p.enrolled_from <= first && p.enrolled_through >= first
                ).map((p) => p.individual_tin)
              ),
            ),
          ];
          return [{
            source_document_reference: copy.source_document_reference,
            month: i + 1,
            premium_payment: {
              amount:
                Math.round(Math.max(0, premium - copy.monthly_aptcs[i]) * 100) /
                100,
              paid_on: first,
              reference: `${copy.source_document_reference}-payment-${i + 1}`,
            },
            coverage_eligibility_review: {
              tax_year: 2026,
              policy_number: copy.policy_number,
              month: i + 1,
              review_reference:
                `${copy.source_document_reference}-eligibility-${i + 1}`,
              reviewed_on: reviewed,
              reviewer_name: "Example Reviewer",
              individuals: people.map((individual_ssn) => ({
                individual_ssn,
                qhp_enrolled_for_month: true,
                lawfully_present_for_month: true,
                incarcerated_other_than_pending_disposition: false,
                employer_sponsored_mec_enrolled: false,
                employer_offer_review: "no_offer_available",
                government_mec_eligibility_review: "not_eligible",
                other_designated_mec_eligibility_review: "not_eligible",
                eligibility_record_reference:
                  `${copy.source_document_reference}-${individual_ssn}-MEC-${
                    i + 1
                  }`,
              })),
            },
            applicable_slcsp: {
              tax_year: 2026,
              amount: copy.monthly_slcsps[i],
              coverage_family_tins: family,
              basis: "issued_copy_reconciled",
              record_reference: `${copy.source_document_reference}-benchmark-${
                i + 1
              }`,
              reviewed_on: reviewed,
            },
          }];
        })
      ),
    },
  };
}
