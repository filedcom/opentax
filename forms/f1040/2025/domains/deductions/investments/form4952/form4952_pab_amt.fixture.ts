import { form6251Form4952Fixture } from "../../../taxes/amt/form6251/form6251_4952.fixture.ts";

/** Current-year issued mixed-interest copy and paid taxable-securities debt. */
export function form4952PabAmtInputs() {
  const input: Record<string, any> = structuredClone(
    form6251Form4952Fixture(),
  );
  input.general = {
    ...input.general,
    address_line1: "1 Main St",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  input.w2[0] = {
    ...input.w2[0],
    employer_address_line1: "100 Primary Way",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
  };
  input.f1099int[0] = {
    ...input.f1099int[0],
    payer_tin: "667788990",
    account_number: "MIXED-2025-A",
    box1: 18_000,
    box8: 5_000,
    box9: 5_000,
    pab_eligible_bonds_reviewed: true,
    pab_review_reference: "2025-PAB-eligibility-review",
    pab_bond_identifier: "distinct-2025-project-bond",
    pab_allocable_deduction_workpaper: {
      tax_year: 2025,
      reviewed_workpaper_reference: "2025-PAB-expense-review",
      expense_record_reference: "2025-PAB-no-expense-ledger",
      allocable_deduction: 0,
      direct_allocation_to_reported_bond: true,
      deductible_if_interest_taxable: true,
      not_claimed_elsewhere_on_return: true,
    },
  };
  delete input.form4952.prior_year_carryforward;
  delete input.form4952.prior_year_carryforward_source;
  input.form4952.amt_refigure.prior_year_disallowed_interest = 0;
  return input;
}
