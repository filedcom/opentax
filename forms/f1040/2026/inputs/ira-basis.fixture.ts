import type { IraBasisSource2026 } from "./ira-basis-source.ts";
import { retirementCopy2026 } from "./retirement.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function iraBasisFixture2026(): IraBasisSource2026 {
  const copy = retirementCopy2026("ira-distribution", true);
  copy.box1_gross_distribution = copy.box2a_taxable_amount = 16000;
  copy.box2b_taxable_amount_not_determined = true;
  copy.box4_federal_withheld = 1000;
  const owner_tin = "400001037",
    account = {
      custodian_tin: copy.payer_tin,
      account_number: copy.account_number,
    };
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: owner_tin,
    taxpayer_dob: "1966-01-01",
    current_copies: [copy],
    claim: {
      tax_year: 2026,
      record_reference: "annual-ira-review",
      reviewed_on: "2027-05-31",
      complete_current_copy_inventory_verified: true,
      owners: [{
        owner_tin,
        record_reference: "owner-review",
        all_owned_traditional_sep_simple_accounts_included: true,
        no_inherited_ira_or_divorce_transfer: true,
        no_qcd_hsa_disaster_repayment_recharacterization_or_returned_contribution:
          true,
        no_outstanding_or_indirect_rollover: true,
        no_roth_distributions_or_current_regular_roth_contributions: true,
        no_rmd_shortfall_or_excess_contribution: true,
        prior_basis: {
          kind: "filed_form8606",
          owner_tin,
          source_document_reference: "prior8606",
          tax_year: 2025,
          line14: 2000,
          line15c_worksheet_line6: 0,
          no_intervening_basis_changes_verified: true,
        },
        accounts: [
          {
            ...account,
            plan_type: "traditional_ira",
            year_end_statement: {
              owner_tin,
              source_document_reference: "yearend-1",
              as_of: "2026-12-31",
              fair_market_value: 12000,
            },
          },
          {
            custodian_tin: "765432100",
            account_number: "sep-account",
            plan_type: "sep_ira",
            year_end_statement: {
              owner_tin,
              source_document_reference: "yearend-2",
              as_of: "2026-12-31",
              fair_market_value: 12000,
            },
          },
        ],
        contributions: [{
          form5498: {
            ...account,
            owner_tin,
            source_document_reference: "traditional5498",
            tax_year: 2026,
            box1_ira_contributions: 2000,
            no_rollover_recharacterization_or_employer_contribution_in_box1:
              true,
          },
          receipts: ["2026-04-01", "2027-02-01"].map((received_on, i) => ({
            ...account,
            owner_tin,
            source_document_reference: `contribution-${i}`,
            designated_tax_year: 2026 as const,
            received_on,
            amount: 1000,
          })),
        }],
        nondeductible_election: {
          record_reference: "nondeductible-election",
          owner_tin,
          all_listed_contributions_elected_nondeductible: true,
          no_ira_deduction_claimed: true,
          compensation_record_reference: "compensation-workpaper",
          own_eligible_compensation: 40000,
          no_spousal_compensation_allocation: true,
        },
        distributions: [{
          source_document_reference: copy.source_document_reference,
          disposition_record_reference: "distribution-disposition",
          distributed_on: "2026-06-01",
          cash_paid_to_owner: 5000,
          no_unlisted_distribution_or_conversion: true,
          conversion: {
            receipt: {
              owner_tin,
              custodian_tin: "987654321",
              account_number: "roth-account",
              source_document_reference: "roth-receipt",
              received_on: "2026-06-02",
              amount: 10000,
            },
            direct_trustee_transfer_verified: true,
            not_required_minimum_distribution_verified: true,
            destination_roth_ira_verified: true,
          },
        }],
        roth_conversion_forms5498: [{
          owner_tin,
          custodian_tin: "987654321",
          account_number: "roth-account",
          source_document_reference: "roth5498",
          tax_year: 2026,
          box3_conversion_amount: 10000,
        }],
      }],
    },
  };
}
