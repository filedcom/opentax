import { hsaLastMonth2025History } from "./hsa-testing-history.fixture.ts";
import { hsaQualifiedFunding2026 } from "./hsa-qualified-funding.fixture.ts";
import type { HsaContribution2025History } from "./hsa-testing-history.ts";
import type { z } from "zod";
import type { hsaFundingReview2025Schema } from "./hsa-funding-evidence.ts";
/** Synthetic filed 2025 records: $1,000 June IRA funding plus $3,300 cash. */
export function hsaFunding2025History(): HsaContribution2025History {
  const s: HsaContribution2025History = hsaLastMonth2025History();
  s.last_month_rule_elected = false;
  delete s.election_reference;
  delete s.no_archer_msa_or_qualified_ira_funding_contributions_verified;
  s.no_archer_msa_contributions_verified = true;
  s.no_death_or_disability_testing_exception_in_2025_verified = true;
  s.no_other_2025_testing_income_verified = true;
  const e = s.owners[0].eligibility, f = s.filed_forms[0];
  e.plans[0].effective_from = "2025-01-01";
  for (const m of e.months) {
    m.plan_references = [e.plans[0].source_document_reference];
  }
  const q = hsaQualifiedFunding2026().qualified_funding_review!;
  const account = q.ira_accounts[0], copy = account.form1099r;
  const {
    box7c_trump_account: _trump,
    box7d_excess_contribution_earnings: _earnings,
    ...historicalCopy
  } = copy;
  const review: z.input<typeof hsaFundingReview2025Schema> = {
    ...q,
    reviewed_on: "2026-05-31",
    ira_accounts: [{
      ...account,
      form1099r: { ...historicalCopy, tax_year: 2025 },
      payments: account.payments.map((p) => ({
        ...p,
        paid_on: "2025-06-01",
        transfer_election: {
          ...p.transfer_election!,
          requested_on: "2025-05-28",
        },
      })),
    }],
  };
  s.qualified_funding_review = review;
  f.funding_receipts = [{
    record_reference: "hsa-ira-receipt",
    owner_tin: f.owner_tin,
    trustee_tin: "987654321",
    account_number: "hsa-account",
    custodian_transaction_identifier: "2025-funding-transaction",
    custodian_statement_reference: "2025-trustee-ledger",
    received_on: "2025-06-01",
    amount: 1000,
    originating_ira_type: "traditional",
    ira_distribution_source_reference: copy.source_document_reference,
    source_account_or_payment_reference: account.payments[0].record_reference,
    direct_trustee_transfer_verified: true,
  }];
  f.contributions[0].amount = 2800;
  Object.assign(f.lines, {
    line2: 2800,
    line10: 1000,
    line11: 1500,
    line12: 2800,
    line13: 2800,
  });
  f.filed_part_iii = {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
    ira_exclusion_workpaper_reference: "filed-2025-ira-basis-exclusion",
    excluded_qualified_funding_amount: 1000,
    latest_filed_ira_exclusion_and_basis_reviewed: true,
  };
  return s;
}
