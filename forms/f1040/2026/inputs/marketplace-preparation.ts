import { z } from "zod";
import {
  calculateMarketplaceFamily2026,
  marketplaceFamilyReview2026Schema,
  type MarketplaceTaxFamily2026,
} from "./marketplace-family.ts";
import {
  calculateMarketplaceSources2026,
  marketplaceClaim2026Schema,
} from "./marketplace-source.ts";

/** Source-only review. General supplies the family; AGI supplies taxpayer MAGI. */
export const marketplacePreparation2026Schema = marketplaceClaim2026Schema
  .extend({
    family_review: marketplaceFamilyReview2026Schema,
  }).strict();
export type MarketplacePreparation2026 = z.input<
  typeof marketplacePreparation2026Schema
>;

/** Internal source preparation; graph/medical/Pub.974 coordination remains required. */
export function prepareMarketplace2026(
  taxFamily: MarketplaceTaxFamily2026,
  raw: MarketplacePreparation2026,
) {
  const input = marketplacePreparation2026Schema.parse(raw);
  if (input.family_review.reviewed_on > input.claim.reviewed_on) {
    throw new Error(
      "2026 Marketplace family review must precede the complete claim review",
    );
  }
  const family = calculateMarketplaceFamily2026(taxFamily, input.family_review);
  const policies = calculateMarketplaceSources2026({
    claim: input.claim,
    tax_family_tins: family.tax_family_tins,
  });
  return {
    source_input: input,
    family,
    policies,
    calculation_input: {
      filing_status: family.filing_status,
      household_size: family.household_size,
      fpl_region: family.fpl_region,
      dependents_modified_agi: family.dependents_modified_agi,
      dependent_income_complete: family.dependent_income_complete,
      monthly_premiums: policies.monthly_premiums,
      monthly_slcsps: policies.monthly_slcsps,
      monthly_aptcs: policies.monthly_aptcs,
      annual_premium: policies.annual_premium,
      annual_slcsp: policies.annual_slcsp,
      annual_aptc: policies.annual_aptc,
      annual_line11_eligible: policies.annual_line11_eligible,
    },
  };
}
