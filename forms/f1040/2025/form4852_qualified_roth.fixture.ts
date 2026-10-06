import type { QualifiedRothReview } from "../nodes/inputs/f4852/qualified-roth.ts";
/** Constructed, separately retained source records; no external authentication. */
export function qualifiedRothSource(
  n: number,
  type: "roth_simple_ira" | "roth_sep_ira",
  inherited = false,
): QualifiedRothReview {
  const owner = inherited ? "777889999" : "111223333";
  const first = {
    owner_ssn: owner,
    custodian_ein: "323456790",
    account_number: `ORIGINAL-ORDINARY-ROTH-${n}`,
    account_type: "ordinary_roth_ira" as const,
  };
  const current = {
    owner_ssn: owner,
    custodian_ein: "123456790",
    account_number: inherited ? `DECEDENT-${n}` : `ACCOUNT-${n}`,
    account_type: type,
  };
  return {
    registration: {
      ...current,
      owner_ssn: "111223333",
      account_number: `ACCOUNT-${n}`,
      source_document_reference: `qualified-registration-${n}`,
      original_owner_ssn: owner,
      original_account_number: current.account_number,
    },
    first_contribution: {
      ...first,
      source_document_reference: `2020-paid-first-roth-${n}`,
      designated_tax_year: 2020,
      received_on: "2020-03-12",
      amount: 3000,
      regular_cash_contribution: true,
    },
    first_form5498: {
      ...first,
      source_document_reference: `2020-issued-first-roth5498-${n}`,
      tax_year: 2020,
      box10_regular_roth_contributions: 3000,
    },
    account_inventory: {
      source_document_reference: `complete-original-owner-roth-inventory-${n}`,
      owner_ssn: owner,
      all_owned_roth_accounts_included: true,
      accounts: [{ ...first, first_contribution_tax_year: 2020 }, {
        ...current,
        first_contribution_tax_year: 2024,
      }],
    },
    eligibility: inherited
      ? {
        kind: "inherited_after_death",
        source_document_reference: `original-owner-death-record-${n}`,
        original_owner_ssn: owner,
        died_on: "2024-09-15",
      }
      : {
        kind: "age_59_5",
        source_document_reference: `owner-birth-record-${n}`,
        owner_ssn: owner,
        date_of_birth: "1964-06-15",
      },
  };
}
