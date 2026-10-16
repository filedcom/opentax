import { directTransfersGraph2026 } from "./retirement-direct-transfers.fixture.ts";
import { iraBasisBindingFixture2026 } from "./ira-basis-binding.fixture.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";

export function planRolloverBasisGraph2026() {
  const g = directTransfersGraph2026(), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.amounts.taxable_amount = 0;
  s.distribution_sources.forEach((p) => p.taxable_amount = 0);
  const destinations = g.f1099r!.claim.reviews[0].direct_rollover_payments!
    .payments[0].destinations;
  destinations[0].destination_type = "traditional_ira";
  destinations[0].receipt_reference = "ira-basis-receipt";
  destinations.forEach((d) => d.account_number = "receiving-ira");
  const copy = retirementCopy2026("ira-current", true);
  Object.assign(copy, {
    payer_tin: "123456780",
    account_number: "receiving-ira",
    box1_gross_distribution: 10000,
    box2a_taxable_amount: 10000,
    box2b_taxable_amount_not_determined: true,
    box4_federal_withheld: 1000,
    box7a_distribution_codes: [Code.Code1],
  });
  const basis = iraBasisBindingFixture2026().claim, o = basis.owners[0];
  if (o.prior_basis.kind !== "filed_form8606") throw Error();
  delete o.prior_basis.no_intervening_basis_changes_verified;
  o.prior_basis.no_other_intervening_basis_changes_verified = true;
  o.accounts = [{
    custodian_tin: copy.payer_tin,
    account_number: copy.account_number,
    plan_type: "traditional_ira",
    year_end_statement: {
      owner_tin: o.owner_tin,
      source_document_reference: "receiving-yearend",
      as_of: "2026-12-31",
      fair_market_value: 30000,
    },
  }];
  o.contributions = [];
  delete o.nondeductible_election;
  o.distributions = [{
    source_document_reference: copy.source_document_reference,
    disposition_record_reference: "receiving-disposition",
    distributed_on: "2026-12-01",
    cash_paid_to_owner: 9000,
    no_unlisted_distribution_or_conversion: true,
  }];
  o.roth_conversion_forms5498 = [];
  o.plan_rollover_receipt_references = ["ira-basis-receipt", "ira-receipt"];
  const review = retirementSource2026([copy]).claim.reviews[0];
  delete review.no_ira_basis_or_current_nondeductible_contributions_verified;
  delete review
    .no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified;
  review.ira_basis_owner_review_reference = o.record_reference;
  review.reviewed_on = basis.reviewed_on;
  review.early_distribution = {
    record_reference: "receiving-early-payments",
    complete_payment_inventory_verified: true,
    no_additional_tax_exception_applies_verified: true,
    payments: [{
      record_reference: "receiving-withdrawal",
      payment_date: "2026-12-01",
      gross: 10000,
    }],
  };
  g.f1099r!.claim.copies = [copy];
  g.f1099r!.claim.reviews.push(review);
  g.f1099r!.claim.ira_basis = basis;
  g.f1099r!.claim.reviewed_on = basis.reviewed_on;
  return g;
}
