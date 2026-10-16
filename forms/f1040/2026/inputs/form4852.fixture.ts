import type { Form4852Source2026 } from "./form4852-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function form4852Source2026(retirement = false): Form4852Source2026 {
  const base = {
    source_document_reference: "substitute-2026",
    owner_tin: "400001037",
    payer_name: "Synthetic Employer",
    payer_tin: "120000001",
    payer_address: {
      street: "1 Example Way",
      city: "Boston",
      state: "MA",
      postal_code: "02108",
    },
    status: { kind: "missing" as const },
    estimation_method:
      "Totals reconstructed from the final payroll and payment records.",
    payer_efforts_explanation:
      "Requested the missing statement from the payer on February 15 and notified the IRS on March 2.",
    payer_contact: {
      record_reference: "payer-attempt",
      contacted_on: "2027-02-15",
      method: "telephone",
    },
    irs_notification: {
      record_reference: "irs-notification",
      notified_on: "2027-03-02",
    },
    best_estimate_of_all_payer_payments_and_withholding_verified: true as const,
    no_corrected_statement_received_as_of_review_verified: true as const,
  };
  const wage = {
    wages: 60000.25,
    federal_withheld: 5000.75,
    social_security_wages: 60000.25,
    social_security_withheld: 3720.02,
    social_security_tips: 0,
    medicare_wages: 60000.25,
    medicare_withheld: 870,
    state_tax_withheld: 2000.25,
    local_tax_withheld: 0,
    state_name: "MA",
  };
  const pension = {
    gross_distribution: 12000.25,
    taxable_amount: 10000.25,
    taxable_amount_not_determined: false,
    total_distribution: false,
    capital_gain: 0,
    employee_contributions: 2000,
    federal_withheld: 1000.25,
    state_tax_withheld: 400,
    local_tax_withheld: 0,
    state_name: "MA",
    distribution_code: "7",
    is_ira: false,
  };
  const { total_distribution: _total, ...payment } = pension;
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: base.owner_tin,
    claim: {
      tax_year: 2026,
      record_reference: "substitute-inventory",
      reviewed_on: "2027-03-15",
      original_return_not_yet_filed_verified: true,
      complete_original_corrected_and_substitute_inventory_verified: true,
      records: [
        retirement
          ? {
            ...base,
            kind: "1099r",
            account_number: "pension-account",
            amounts: pension,
            plan_classification_review_reference: "plan-review",
            distribution_sources: [{
              ...payment,
              source_document_reference: "pension-ledger",
              payer_tin: base.payer_tin,
              owner_ssn: base.owner_tin,
              account_number: "pension-account",
              distribution_reference: "pension-payment",
              paid_on: "2026-12-15",
              account_type: "non_ira",
            }],
          }
          : {
            ...base,
            kind: "w2",
            amounts: wage,
            supplemental_wage_facts_review_reference: "other-wage-facts",
            no_allocated_tips_dependent_care_deferrals_special_pay_or_other_unprinted_wage_facts_verified:
              true,
            payroll_allocations: [{
              ...wage,
              source_document_reference: "payroll-ledger",
              payer_tin: base.payer_tin,
              owner_ssn: base.owner_tin,
              payroll_account_reference: "payroll-account",
              period_identifier: "annual-2026",
              paid_on: "2026-12-31",
            }],
          },
      ],
    },
  };
}
