import { hsaRolloverGraph2026 } from "./hsa-rollover.fixture.ts";
import { inactiveHsaGraph2026 } from "./hsa-graph.fixture.ts";

/** Mixed actual account ledgers: ordinary payouts, rollover, IRA funding,
 * returned excess, a direct transfer, and an accepted mistake repayment. */
export function hsaNonreportableGraph2026(
  corrected = false,
  crossYear = false,
) {
  const g = hsaRolloverGraph2026(false, true),
    c = g.hsa_accounts.claim,
    f = c.excess_returns.contribution_sources,
    a = f.claim.accounts[0],
    d = c.claim.accounts[0];
  c.claim.reviewed_on = "2027-05-31";
  a.ledger_through = "2027-05-31";
  const destination = structuredClone(a);
  destination.record_reference = "receiving-funding-account";
  destination.trustee_tin = "888888888";
  destination.account_number = "HSA-2";
  destination.ledger_statement_reference = "receiving-funding-ledger";
  destination.receipts = [{
    kind: "trustee_transfer",
    record_reference: "direct-transfer-receipt",
    custodian_transaction_identifier: "transfer-credit",
    statement_reference: destination.ledger_statement_reference,
    received_on: "2026-06-12",
    amount: 1250.25,
    source_account_or_payment_reference: "direct-transfer-debit",
    originating_account_type: "hsa",
    originating_owner_tin: a.owner_tin,
    direct_trustee_transfer_verified: true,
  }];
  destination.form5498sa = {
    ...destination.form5498sa,
    source_document_reference: "receiving-5498sa",
    trustee_tin: destination.trustee_tin,
    account_number: destination.account_number,
    box2_calendar_year_contributions: 0,
    box3_following_year_contributions_for_2026: 0,
    box4_calendar_year_rollovers: 0,
    box5_year_end_fmv: 1250.25,
  };
  f.claim.accounts.push(destination);
  c.claim.accounts.push({
    ...d,
    record_reference: "receiving-distribution-account",
    trustee_tin: destination.trustee_tin,
    account_number: destination.account_number,
    account_agreement_reference: "receiving-agreement",
    establishment_record_reference: "receiving-establishment",
    ledger_statement_reference: "receiving-distribution-ledger",
    payments: [],
  });
  const repaidOn = crossYear ? "2027-04-15" : "2026-11-15";
  a.receipts.push({
    kind: "mistaken_distribution_repayment",
    record_reference: "mistake-repayment",
    custodian_transaction_identifier: "mistake-credit",
    statement_reference: a.ledger_statement_reference,
    received_on: repaidOn,
    amount: 400.35,
    source_account_or_payment_reference: "mistake-debit",
    original_distribution_reference: "mistake-debit",
    custodian_accepted_mistaken_distribution_repayment_verified: true,
  });
  const reporting = corrected
    ? {
      kind: "corrected" as const,
      original_form1099sa_source_reference: "1099sa",
      current_form1099sa_source_reference: "1099sa-corrected",
      correction_excludes_only_linked_nonreportable_payments_verified:
        true as const,
    }
    : {
      kind: "never_reported" as const,
      custodian_reporting_review_reference: "nonreportable-custodian-review",
      not_in_any_issued_1099sa_verified: true as const,
    };
  d.nonreportable_payments = [{
    kind: "trustee_transfer",
    record_reference: "direct-transfer-debit",
    custodian_transaction_identifier: "transfer-debit",
    distributed_on: "2026-06-10",
    amount: 1250.25,
    reporting,
    destination_receipt_reference: "direct-transfer-receipt",
    transfer_instruction_reference: "direct-transfer-instruction",
    beneficiary_never_received_funds_verified: true,
    cash_transfer_verified: true,
  }, {
    kind: "mistaken_distribution",
    record_reference: "mistake-debit",
    custodian_transaction_identifier: "mistake-debit-transaction",
    distributed_on: "2026-10-01",
    amount: 400.35,
    reporting: structuredClone(reporting),
    repayment_receipt_reference: "mistake-repayment",
    mistake_evidence_reference: "reasonable-cause-record",
    mistake_of_fact_due_to_reasonable_cause_verified: true,
    first_knew_or_should_have_known_on: "2026-11-01",
    beneficiary_representation_reference: "beneficiary-representation",
    representation_signed_on: "2026-11-02",
    custodian_acceptance_reference: "custodian-acceptance",
    custodian_accepted_on: repaidOn,
    ordinary_repayment_deadline_no_postponement_claimed: true,
  }];
  f.nonreportable_review = {
    record_reference: "nonreportable-review",
    reviewed_on: "2027-05-31",
    complete_transfer_mistake_and_correction_inventory_verified: true,
  };
  if (corrected) {
    const original = c.claim.copies.find((v) =>
      v.source_document_reference === "1099sa"
    )!;
    const current = {
      ...original,
      source_document_reference: "1099sa-corrected",
      issued_on: "2027-05-20",
      corrected: true,
      supersedes_document_reference: original.source_document_reference,
    };
    original.box1_gross_distribution += 1650.60;
    c.claim.copies.push(current);
    for (const p of d.payments) {
      if (
        p.form1099sa_source_reference === original.source_document_reference
      ) {
        p.form1099sa_source_reference = current.source_document_reference;
      }
    }
  }
  return g;
}

export function onlyNonreportableHsaGraph2026() {
  const g = inactiveHsaGraph2026(), mixed = hsaNonreportableGraph2026();
  const c = g.hsa_accounts.claim, other = mixed.hsa_accounts.claim;
  const f = c.excess_returns.contribution_sources,
    of = other.excess_returns.contribution_sources;
  c.claim.reviewed_on = other.claim.reviewed_on;
  c.claim.accounts[0].nonreportable_payments =
    other.claim.accounts[0].nonreportable_payments;
  c.claim.accounts.push(other.claim.accounts[1]);
  f.claim.accounts[0].ledger_through = "2027-05-31";
  f.claim.accounts[0].receipts = of.claim.accounts[0].receipts.filter((r) =>
    r.kind === "mistaken_distribution_repayment"
  );
  f.claim.accounts.push(of.claim.accounts[1]);
  f.nonreportable_review = of.nonreportable_review;
  return g;
}
