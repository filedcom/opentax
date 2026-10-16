import { iraBasisBindingFixture2026 } from "./ira-basis-binding.fixture.ts";
import {
  retirementGraph2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";

export function retirementIraSource2026(early = false) {
  const b = iraBasisBindingFixture2026();
  const s = retirementSource2026(b.current_copies);
  s.wage_sources = b.wage_sources;
  s.claim.ira_basis = b.claim;
  s.claim.reviewed_on = b.claim.reviewed_on;
  const review = s.claim.reviews[0];
  review.no_ira_basis_or_current_nondeductible_contributions_verified =
    undefined;
  review
    .no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified =
      undefined;
  review.ira_basis_owner_review_reference = b.claim.owners[0].record_reference;
  if (early) {
    s.taxpayer_dob = "1980-01-01";
    s.claim.copies[0].box7a_distribution_codes = [Code.Code2];
    review.early_distribution = {
      record_reference: "ira-nonconversion-payment-review",
      complete_payment_inventory_verified: true,
      no_additional_tax_exception_applies_verified: true,
      payments: [{
        record_reference: "ira-retained-payment",
        payment_date: "2026-06-01",
        gross: 6000,
      }],
    };
  }
  return s;
}

export function retirementIraGraph2026(early = false) {
  const s = retirementIraSource2026(early);
  const graph = retirementGraph2026(s.claim.copies, 40000);
  graph.w2s[0].source_document_reference =
    s.wage_sources![0].source_document_reference;
  graph.f1099r.claim = s.claim;
  graph.general.taxpayer_dob = s.taxpayer_dob;
  return graph;
}
