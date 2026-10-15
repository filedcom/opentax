import { marketplaceSource2026 } from "./marketplace.fixture.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";
import type { z } from "zod";
import type { marketplaceReturnClaim2026Schema } from "./marketplace-return.ts";

export function marketplaceGraph2026(wages = 62600, medical = false) {
  const base = refundAllocationGraph2026();
  const source = marketplaceSource2026();
  for (const row of source.claim.month_reviews) {
    row.premium_payment.payer_tin = "400001037";
  }
  const marketplace: z.input<typeof marketplaceReturnClaim2026Schema> = {
    claim: source.claim,
    income_review: {
      tax_year: 2026,
      record_reference: "filer-income-inventory",
      reviewed_on: "2027-02-28",
      reviewer_name: "Example Reviewer",
      reviewed_filer_tins: ["400001037"],
      all_taxable_income_and_magi_addback_sources_included_verified: true,
      all_adjustment_sources_included_verified: true,
      all_filer_income_reported_once_verified: true,
    },
    family_review: {
      tax_year: 2026,
      record_reference: "family-review",
      reviewed_on: "2027-02-28",
      reviewer_name: "Example Reviewer",
      complete_dependent_income_inventory_verified: true,
      complete_filer_residence_inventory_verified: true,
      dependent_returns: [],
      filer_residences: [{
        filer_tin: "400001037",
        record_reference: "filer-residence",
        from: "2026-01-01",
        through: "2026-12-31",
        state: "TX",
      }],
    },
    medical_review: medical
      ? {
        treatment: "schedule_a",
        record_reference: "medical-review",
        reviewed_on: "2027-02-28",
        all_covered_people_eligible_under_section213_verified: true,
        no_reimbursements_tax_free_funding_or_other_deductions_verified: true,
        all_personal_premiums_paid_in_2026_verified: true,
      }
      : {
        treatment: "not_claimed",
        record_reference: "medical-review",
        reviewed_on: "2027-02-28",
        marketplace_premiums_excluded_from_other_deductions_verified: true,
      },
  };
  return {
    general: base.general,
    w2s: [{
      ...base.w2s[0],
      box1_wages: wages,
      box3_ss_wages: Math.min(wages, 184500),
      box5_medicare_wages: wages,
      box4_ss_withheld: Math.round(Math.min(wages, 184500) * .062 * 100) / 100,
      box6_medicare_withheld: Math.round(wages * .0145 * 100) / 100,
    }],
    f1095a: marketplace,
  };
}
