import type { IraRecharacterizationReview } from "../nodes/intermediate/forms/form8606/recharacterization.ts";
/** Constructed reviewed evidence for regression; not externally authenticated. */
export function annualRecharacterizationSource(
  n: number,
  owner = "111223333",
  principal = 7000,
  earnings = 1000,
): IraRecharacterizationReview {
  const identity = {
    owner_ssn: owner,
    custodian_ein: "123456790",
    account_number: `ACCOUNT-${n}`,
  };
  const contribution = {
    ...identity,
    source_document_reference: `2025-regular-contribution-${n}`,
    designated_tax_year: 2025 as const,
    received_on: "2025-03-14",
    account_type: "traditional_ira" as const,
    regular_cash_contribution: true as const,
    amount: principal,
  };
  const receiving = {
    owner_ssn: owner,
    custodian_ein: "223456790",
    account_number: `RECEIVING-ROTH-${n}`,
  };
  return {
    original_contribution: contribution,
    original_form5498: {
      ...identity,
      source_document_reference: `2025-original-issued5498-${n}`,
      tax_year: 2025,
      account_type: "traditional_ira",
      box1_ira_contributions: principal,
      box2_rollovers: 0,
      box3_conversions: 0,
    },
    transfer: {
      ...identity,
      source_document_reference: `2025-custodian-recharacterization-${n}`,
      transferred_on: "2025-10-01",
      original_contribution_reference: contribution.source_document_reference,
      regular_contribution_not_conversion: true,
      entire_original_contribution: true,
      contribution_principal: principal,
      custodian_calculated_related_earnings: earnings,
      amount_transferred: principal + earnings,
      receiving_custodian_ein: receiving.custodian_ein,
      receiving_account_number: receiving.account_number,
      trustee_to_trustee: true,
    },
    destination_receipt: {
      ...receiving,
      source_document_reference: `2025-receiving-paid-receipt-${n}`,
      received_on: "2025-10-01",
      transfer_source_document_reference:
        `2025-custodian-recharacterization-${n}`,
      account_type: "ordinary_roth_ira",
      amount_received: principal + earnings,
    },
    destination_form5498: {
      ...receiving,
      source_document_reference: `2025-receiving-issued5498-${n}`,
      tax_year: 2025,
      account_type: "ordinary_roth_ira",
      box2_rollovers: 0,
      box3_conversions: 0,
      box4_recharacterized_contributions: principal + earnings,
      box10_regular_roth_contributions: 0,
    },
    annual_contribution_inventory: {
      source_document_reference:
        `2025-complete-annual-contribution-inventory-${n}`,
      owner_ssn: owner,
      tax_year: 2025,
      all_owned_ira_regular_contributions_included: true,
      regular_contribution_receipts: [contribution],
    },
  };
}
