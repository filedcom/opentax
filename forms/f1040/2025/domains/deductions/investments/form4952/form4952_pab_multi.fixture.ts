import { form4952PabAmtInputs } from "./form4952_pab_amt.fixture.ts";

/** Two issued bond copies with one separately paid bond-debt expense. */
export function form4952PabMultiInputs() {
  const input: Record<string, any> = structuredClone(form4952PabAmtInputs());
  const owner = input.general.taxpayer_ssn.replaceAll("-", "");
  input.f1099int[0].pab_allocable_deduction_workpaper = {
    tax_year: 2025,
    reviewed_workpaper_reference: "bond-A-interest-allocation-review",
    expense_record_reference: "bond-A-lender-2025-statement",
    allocable_deduction: 1_000,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
    expense_classification: "bond_debt_interest",
    bond_debt_trace: {
      tax_year: 2025,
      owner_tin: owner,
      bond_identifier: "distinct-2025-project-bond",
      loan_id: "bond-A-direct-loan",
      lender_statement_reference: "bond-A-lender-2025-statement",
      loan_agreement_reference: "bond-A-signed-loan",
      disbursement_record_reference: "bond-A-bank-wire",
      purchase_record_reference: "bond-A-broker-purchase",
      loan_date: "2025-01-10",
      direct_purchase_date: "2025-01-10",
      borrowed_principal: 50_000,
      direct_bond_purchase: 50_000,
      no_other_loan_proceeds_use: true,
      investment_use_maintained_through_2025: true,
      lender_2025_interest_total: 1_000,
      interest_payments: [
        {
          payment_id: "bond-A-June",
          payment_date: "2025-06-10",
          payment_record_reference: "bond-A-bank-June",
          interest_amount: 500,
        },
        {
          payment_id: "bond-A-December",
          payment_date: "2025-12-10",
          payment_record_reference: "bond-A-bank-December",
          interest_amount: 500,
        },
      ],
    },
  };
  input.f1099int.push({
    payer_name: "Second Municipal Issuer",
    payer_tin: "778899001",
    recipient_tin: owner,
    account_number: "PAB-2025-B",
    source_document_reference: "issued-PAB-B-1099INT",
    box8: 4_000,
    box9: 4_000,
    investment_property_for_form4952: true,
    pab_eligible_bonds_reviewed: true,
    pab_bond_identifier: "second-2025-project-bond",
    pab_review_reference: "bond-B-eligibility-review",
    pab_allocable_deduction_workpaper: {
      tax_year: 2025,
      reviewed_workpaper_reference: "bond-B-custody-allocation-review",
      expense_record_reference: "bond-B-zero-expense-ledger",
      allocable_deduction: 0,
      direct_allocation_to_reported_bond: true,
      deductible_if_interest_taxable: true,
      not_claimed_elsewhere_on_return: true,
    },
  });
  return input;
}
