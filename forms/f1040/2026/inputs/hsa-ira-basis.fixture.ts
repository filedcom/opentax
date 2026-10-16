import type { IraBasisBinding2026 } from "./ira-basis-binding.ts";
import { hsaQualifiedFunding2026 } from "./hsa-qualified-funding.fixture.ts";
export function hsaIraBasis2026(): IraBasisBinding2026 {
  const hsa = hsaQualifiedFunding2026(),
    ira = hsa.qualified_funding_review!.ira_accounts[0];
  ira.payments.push({
    record_reference: "ordinary-payment",
    custodian_transaction_identifier: "ira-ordinary-tx",
    paid_on: "2026-09-01",
    gross_amount: 500,
    federal_withheld: 0,
  });
  ira.form1099r.box1_gross_distribution =
    ira.form1099r.box2a_taxable_amount =
      1500;
  const account = {
    custodian_tin: ira.trustee_tin,
    account_number: ira.account_number,
  };
  return {
    filing_status: hsa.filing_status,
    taxpayer_ssn: hsa.taxpayer_ssn,
    taxpayer_dob: hsa.household_eligibility.owners[0].owner_dob,
    taxpayer_can_be_claimed_as_dependent: false,
    current_copies: [structuredClone(ira.form1099r)],
    wage_sources: structuredClone(hsa.wage_sources),
    claim: {
      tax_year: 2026,
      record_reference: "annual-ira",
      reviewed_on: "2027-05-31",
      complete_current_copy_inventory_verified: true,
      hsa_funding_sources: hsa,
      owners: [{
        owner_tin: hsa.taxpayer_ssn,
        record_reference: "annual-owner",
        all_owned_traditional_sep_simple_accounts_included: true,
        no_inherited_ira_or_divorce_transfer: true,
        no_qcd_disaster_repayment_recharacterization_or_returned_contribution:
          true,
        no_outstanding_or_indirect_rollover: true,
        no_roth_distributions_or_current_regular_roth_contributions: true,
        no_rmd_shortfall_or_excess_contribution: true,
        prior_basis: {
          kind: "filed_form8606",
          owner_tin: hsa.taxpayer_ssn,
          source_document_reference: "2025-8606",
          tax_year: 2025,
          line14: 200,
          line15c_worksheet_line6: 0,
          no_intervening_basis_changes_verified: true,
        },
        accounts: [{
          ...account,
          plan_type: "traditional_ira",
          year_end_statement: {
            owner_tin: hsa.taxpayer_ssn,
            source_document_reference: "ira-yearend",
            as_of: "2026-12-31",
            fair_market_value: 1500,
          },
        }],
        contributions: [],
        distributions: [],
        roth_conversion_forms5498: [],
        statement_payment_ledgers: [{
          source_document_reference: ira.form1099r.source_document_reference,
          record_reference: "annual-ledger",
          complete_payment_inventory_verified: true,
          no_substantially_equal_payment_modification_or_recapture_verified:
            true,
          payments: ira.payments.map((p) => ({
            record_reference: p.record_reference,
            distributed_on: p.paid_on,
            gross: p.gross_amount,
            cash_paid_to_owner: p.hsa_receipt_reference ? 0 : p.gross_amount,
            federal_withheld: p.federal_withheld,
            hsa_receipt_reference: p.hsa_receipt_reference,
          })),
        }],
        hsa_funding_valuations: [{
          payment_reference: "ira-payment",
          as_of: "2026-06-01",
          immediately_before_distribution_values_verified: true,
          all_owned_traditional_sep_simple_accounts_included: true,
          accounts: [{
            ...account,
            source_document_reference: "ira-before-transfer",
            fair_market_value: 2000,
          }],
        }],
      }],
    },
  };
}
