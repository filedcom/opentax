import { retirementIraLedgerGraph2026 } from "./retirement-ira-ledger.fixture.ts";
import { form4852Source2026 } from "./form4852.fixture.ts";
/** Same evidenced IRA account as the issued-statement fixture, now missing its 1099-R. */
export function form4852IraGraph2026() {
  const g = retirementIraLedgerGraph2026(), c = g.f1099r.claim.copies[0];
  const claim = form4852Source2026(true).claim, s = claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const ledger =
    g.f1099r.claim.ira_basis!.owners[0].statement_payment_ledgers![0];
  s.source_document_reference = c.source_document_reference;
  s.payer_tin = c.payer_tin;
  s.payer_name = c.payer_name;
  s.account_number = c.account_number;
  s.amounts = {
    gross_distribution: 16000,
    taxable_amount_not_determined: true,
    total_distribution: false,
    capital_gain: 0,
    employee_contributions: 0,
    federal_withheld: 1000,
    state_tax_withheld: 200,
    state_name: "MA",
    local_tax_withheld: 100,
    locality_name: "Test locality",
    distribution_code: "2",
    is_ira: true,
  };
  s.distribution_sources = ledger.payments.map((p) => ({
    source_document_reference: `evidence-${p.record_reference}`,
    distribution_reference: p.record_reference,
    owner_ssn: g.general.taxpayer_ssn,
    payer_tin: s.payer_tin,
    account_number: s.account_number,
    paid_on: p.distributed_on,
    gross_distribution: p.gross,
    taxable_amount_not_determined: true,
    capital_gain: 0,
    employee_contributions: 0,
    federal_withheld: p.federal_withheld,
    state_tax_withheld: p.state_withholding![0].withheld,
    state_name: "MA",
    local_tax_withheld: p.local_withholding![0].withheld,
    locality_name: "Test locality",
    distribution_code: "2",
    is_ira: true,
    account_type: "traditional_ira",
  }));
  g.f1099r.claim.copies = [];
  const r = g.f1099r.claim.reviews[0];
  r.reviewed_on = g.f1099r.claim.reviewed_on;
  delete r.payer_determined_pension_taxability_verified;
  r.form4852_taxability_review_reference = s.source_document_reference;
  return { ...g, f4852: { claim } };
}
export function form4852IraWithdrawals2026() {
  const g = form4852IraGraph2026(), o = g.f1099r.claim.ira_basis!.owners[0];
  for (const p of o.statement_payment_ledgers![0].payments) {
    p.cash_paid_to_owner += p.conversion!.receipt.amount;
    delete p.conversion;
  }
  o.roth_conversion_forms5498 = [];
  const s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.amounts.distribution_code = "1";
  s.distribution_sources.forEach((p) => p.distribution_code = "1");
  g.f1099r.claim.reviews[0].early_distribution!.payments.forEach((p, i) =>
    p.gross = s.distribution_sources[i].gross_distribution
  );
  return g;
}
