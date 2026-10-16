import type { HsaQualifiedFunding2026 } from "./hsa-qualified-funding.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { retirementCopy2026 } from "./retirement.fixture.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
export function hsaQualifiedFunding2026(): HsaQualifiedFunding2026 {
  const s = hsaLimits2026(), a = s.claim.accounts[0];
  a.receipts.push({
    kind: "ira_funding_transfer",
    record_reference: "hsa-ira-receipt",
    custodian_transaction_identifier: "tx-ira",
    statement_reference: "custodian-ledger",
    received_on: "2026-06-01",
    amount: 1000,
    source_account_or_payment_reference: "ira-payment",
    originating_owner_tin: a.owner_tin,
    originating_ira_type: "traditional",
    ira_distribution_source_reference: "ira-copy",
    direct_trustee_transfer_verified: true,
  });
  a.form5498sa.box2_calendar_year_contributions += 1000;
  const copy = retirementCopy2026("ira-copy", true);
  Object.assign(copy, {
    box1_gross_distribution: 1000,
    box2a_taxable_amount: 1000,
    box4_federal_withheld: 0,
    box7a_distribution_codes: [DistributionCode.Code1],
  });
  return {
    ...s,
    qualified_funding_review: {
      record_reference: "qualified-funding-review",
      reviewed_on: "2027-05-31",
      complete_current_ira_transfer_and_correction_inventory_verified: true,
      owners: [{
        owner_tin: a.owner_tin,
        lifetime_history_reference: "lifetime-history",
        complete_lifetime_qualified_funding_history_reviewed: true,
        prior_qualified_transfers: [],
      }],
      ira_accounts: [{
        record_reference: "ira-account",
        owner_tin: a.owner_tin,
        trustee_tin: copy.payer_tin,
        account_number: copy.account_number,
        ira_type: "traditional",
        account_agreement_reference: "ira-agreement",
        owned_or_maintained_for_identified_beneficiary_verified: true,
        current_issued_copy_after_corrections_verified: true,
        form1099r: copy,
        ledger_reference: "ira-ledger",
        complete_calendar_year_distribution_ledger_verified: true,
        payments: [{
          record_reference: "ira-payment",
          custodian_transaction_identifier: "ira-tx-1",
          paid_on: "2026-06-01",
          gross_amount: 1000,
          federal_withheld: 0,
          hsa_receipt_reference: "hsa-ira-receipt",
          transfer_election: {
            record_reference: "ira-election",
            requested_on: "2026-05-28",
            direct_trustee_payment_instruction_reference: "wire-instruction",
            direct_trustee_transfer_verified: true,
            coverage_continuity_reference: "coverage-continuity",
            household_first_day_facts_unchanged_through_transfer_verified: true,
            separate_funding_testing_period_acknowledged: true,
          },
        }],
      }],
    },
  };
}
