import { hsaGraph2026 } from "./hsa-graph.fixture.ts";
export function hsaRolloverGraph2026(crossYear = false, funding = false) {
  const g = hsaGraph2026(funding),
    c = g.hsa_accounts.claim,
    f = c.excess_returns.contribution_sources;
  const a = f.claim.accounts[0],
    p = c.claim.accounts[0].payments.find((p) =>
      p.record_reference === (crossYear ? "july-payment" : "june-payment")
    )!;
  if (crossYear) p.distributed_on = "2026-12-20";
  a.receipts.push({
    kind: "reported_rollover",
    record_reference: "rollover-receipt",
    custodian_transaction_identifier: "rollover-deposit",
    statement_reference: a.ledger_statement_reference,
    received_on: crossYear ? "2027-01-10" : "2026-07-10",
    amount: 500,
    source_account_or_payment_reference: p.record_reference,
    originating_account_type: "hsa",
    originating_owner_tin: a.owner_tin,
    distribution_received_on: p.distributed_on,
    originating_distribution_reference: p.record_reference,
  });
  if (!crossYear) a.form5498sa.box4_calendar_year_rollovers = 500;
  f.rollover_review = {
    record_reference: "rollover-review",
    reviewed_on: "2027-05-31",
    ordinary_60_day_deadline_no_waiver_or_postponement_claimed: true,
    complete_current_and_cross_year_rollover_inventory_verified: true,
    owners: [{
      owner_tin: a.owner_tin,
      history_reference: "rollover-history",
      history_from: "2025-01-01",
      history_through: "2026-12-31",
      all_owned_hsa_rollover_distributions_across_custodians_reviewed: true,
      prior_tax_free_rollovers: [],
    }],
    rollovers: [{
      record_reference: "rollover-election",
      owner_tin: a.owner_tin,
      distribution_payment_reference: p.record_reference,
      destination_receipt_reference: "rollover-receipt",
      beneficiary_received_cash_before_redeposit_verified: true,
      custodian_rollover_acceptance_reference: "rollover-acceptance",
    }],
  };
  delete c.treatment_review.owners[0]
    .no_rollover_or_mistaken_distribution_in_payments_verified;
  c.treatment_review.owners[0].no_mistaken_distribution_in_payments_verified =
    true;
  return g;
}
