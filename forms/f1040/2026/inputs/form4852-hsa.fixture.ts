import { hsaGraph2026 } from "./hsa-graph.fixture.ts";
import { form4852Source2026 } from "./form4852.fixture.ts";
export function form4852HsaGraph2026() {
  const g = hsaGraph2026(true), r = g.f1099r!.claim;
  const c = r.copies[0],
    claim = form4852Source2026(true).claim,
    s = claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const funding = g.hsa_accounts.claim.excess_returns.contribution_sources
    .qualified_funding_review!;
  const account = funding.ira_accounts[0];
  s.source_document_reference = c.source_document_reference;
  s.payer_tin = c.payer_tin;
  s.payer_name = c.payer_name;
  s.account_number = c.account_number;
  s.amounts = {
    gross_distribution: 1500,
    taxable_amount_not_determined: true,
    total_distribution: false,
    capital_gain: 0,
    employee_contributions: 0,
    federal_withheld: 0,
    state_tax_withheld: 0,
    local_tax_withheld: 0,
    distribution_code: "1",
    is_ira: true,
  };
  s.distribution_sources = account.payments.map((p) => ({
    source_document_reference: `custodian-${p.record_reference}`,
    distribution_reference: p.record_reference,
    owner_ssn: g.general.taxpayer_ssn,
    payer_tin: s.payer_tin,
    account_number: s.account_number,
    paid_on: p.paid_on,
    gross_distribution: p.gross_amount,
    taxable_amount_not_determined: true,
    capital_gain: 0,
    employee_contributions: 0,
    federal_withheld: p.federal_withheld,
    state_tax_withheld: 0,
    local_tax_withheld: 0,
    distribution_code: "1",
    is_ira: true,
    account_type: "traditional_ira",
  }));
  const {
    form1099r: _copy,
    current_issued_copy_after_corrections_verified: _issued,
    ...source
  } = account;
  funding.ira_accounts = [];
  funding.substitute_ira_accounts = [{
    ...source,
    form4852_source_reference: s.source_document_reference,
  }];
  r.copies = [];
  const review = r.reviews[0];
  review.reviewed_on = r.reviewed_on;
  delete review.payer_determined_pension_taxability_verified;
  review.form4852_taxability_review_reference = s.source_document_reference;
  return { ...g, f4852: { claim } };
}
