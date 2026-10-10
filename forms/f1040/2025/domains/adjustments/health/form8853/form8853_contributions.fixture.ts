import type { ArcherContributionLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";

export function ledger(): ArcherContributionLedger {
  return {
    owner: "taxpayer",
    filing_status: "single",
    holder_ssn: "111223333",
    identity_source_reference: "Synthetic holder identity",
    sole_archer_msa_holder_on_return_confirmed: true,
    eligibility: {
      kind: "participating_employer",
      employer_ein: "123456789",
      source_reference: "Synthetic participating employer Archer policy",
    },
    employer_ein: "123456789",
    small_employer: {
      calendar_year: 2024,
      average_employee_count: 20,
      source_reference: "Synthetic employer workforce record",
    },
    months: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      source_reference: `Synthetic first day month ${i + 1} coverage review`,
      all_holder_and_spouse_hdhps_on_first_day_identified_confirmed: true,
      other_coverage_holder_and_spouse_review_reference:
        `Synthetic household health policies review month ${i + 1}`,
      medicare_enrolled: false,
      dependent_of_another: false,
      nonpermitted_other_health_coverage: false,
      employer_hdhp_coverage: true,
      plans: [{
        coverage: "self_only",
        deductible: 4000,
        maximum_out_of_pocket: 5000,
        policy_source_reference: "Synthetic HDHP policy",
      }],
    })),
    personal_contributions: [{
      amount: 2000.49,
      payer_ssn: "111223333",
      payment_source_reference: "Synthetic holder bank payment",
      personal_cash_not_employer_rollover_or_transfer_confirmed: true,
      deposit_date: "2025-04-15",
      designated_tax_year: 2025,
      source_reference: "Synthetic custodian deposit",
    }],
    compensation: {
      w2_source_reference: "issued2025w2",
      service_wages: 50000,
      payroll_source_reference: "Synthetic current-services payroll",
      all_box1_other_than_reported_employer_excess_is_current_service_compensation_confirmed:
        true,
      employer_excess_already_in_box1: 0,
      employer_excess_box1_review_reference: "Synthetic W2 box1 review",
    },
    no_spouse_archer_contributions_or_other_archer_accounts_review_reference:
      "Synthetic all return owners/accounts review",
    no_2026_employer_contributions_for_2025_review_reference:
      "Synthetic custodian/employer no following-year funding review",
    no_hsa_contributions_review_reference: "Synthetic no HSA funding review",
    no_other_form8853_activity_review_reference:
      "Synthetic no distributions/LTC/Medicare MSA review",
    no_prior_excess_or_withdrawals_review_reference:
      "Synthetic prior return/custodian no excess or withdrawals review",
    december_31: {
      value: 10000.49,
      source_reference: "Synthetic December31 custodian all-account value",
      all_holder_archer_accounts_included_confirmed: true,
    },
  };
}
export function fixture(source: ArcherContributionLedger, employer = 0) {
  return {
    general: {
      filing_status: source.filing_status,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1980-04-15",
      ...(source.months[0].dependent_of_another
        ? { dependent_earned_income: source.compensation.service_wages }
        : {}),
      taxpayer_can_be_claimed_as_dependent: source.owner === "taxpayer" &&
        source.months[0].dependent_of_another,
      spouse_can_be_claimed_as_dependent: source.owner === "spouse" &&
        source.months[0].dependent_of_another,
      ...((source.filing_status === "mfj" || source.filing_status === "mfs")
        ? {
          spouse_first_name: "Casey",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1981-04-15",
        }
        : {}),
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    w2: [{
      employee_ssn: source.holder_ssn,
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Employer Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      source_document_reference: "issued2025w2",
      box1_wages: source.compensation.service_wages +
        source.compensation.employer_excess_already_in_box1,
      box2_fed_withheld: 5000,
      box3_ss_wages: source.compensation.service_wages,
      box4_ss_withheld:
        Math.round(source.compensation.service_wages * .062 * 100) / 100,
      box5_medicare_wages: source.compensation.service_wages,
      box6_medicare_withheld:
        Math.round(source.compensation.service_wages * .0145 * 100) / 100,
      box12_entries: employer ? [{ code: "R", amount: employer }] : [],
    }],
    form8853: { archer_contribution_ledger: source },
  };
}
