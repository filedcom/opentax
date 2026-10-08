import type { MedicareDistributionLedger } from "../../../../nodes/intermediate/forms/form8853/medicare_distributions.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";

const review = {
  sole_medicare_msa_holder_on_return_confirmed: true as const,
  all_distributions_identified_confirmed: true as const,
  erroneous_medicare_contributions_and_earnings_and_trustee_transfers_excluded_confirmed:
    true as const,
  no_other_form8853_activity_confirmed: true as const,
};
function row(
  reference: string,
  date = "2025-06-14",
  gross = 6000,
  medical = 2000,
) {
  return {
    distribution_reference: reference,
    account_source_reference: "Medicare MSA custodian account",
    distribution_date: date,
    distribution_date_source_reference:
      `custodian dated transaction ${reference}`,
    gross_amount: gross,
    form1099sa_distribution_code: "1" as const,
    form1099sa_source_reference: "2025 Form1099-SA Medicare MSA",
    unreimbursed_holder_qualified_expenses: medical,
    qualified_expense_source_references: [`holder medical bill ${reference}`],
    holder_only_medical_eligibility_and_no_schedule_a_double_deduction_confirmed:
      true as const,
  };
}
export const noPriorLedger: MedicareDistributionLedger = {
  ...review,
  owner: "taxpayer",
  source: {
    kind: "normal",
    holder_ssn: "111223333",
    holder_identity_source_reference: "holder identity record",
    medicare_enrollment_and_eligible_hdhp_confirmed: true,
    enrollment_and_hdhp_source_reference:
      "Medicare enrollment and MSA HDHP policy",
    distributions: [row("first")],
  },
  prior_year: {
    had_account_at_end_2024: false,
    year_end_account_review_source_reference:
      "custodian opening history and 2024 review",
  },
};
export const priorBalanceLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("first", "2025-06-14", 10000, 2000)],
  },
  prior_year: {
    had_account_at_end_2024: true,
    balance_on_2024_12_31: 10000,
    balance_source_reference: "2024 year-end custodian statement",
    balance_includes_all_holder_medicare_msas_confirmed: true,
    annual_hdhp_deductible_on_2025_01_01: 8000,
    deductible_policy_source_reference:
      "January1 2025 annual HDHP deductible policy",
  },
};
export const partialLedger: MedicareDistributionLedger = {
  ...priorBalanceLedger,
  source: {
    ...priorBalanceLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    disability: {
      onset_date: "2025-06-15",
      source_reference: "disability certification",
      unable_to_engage_in_substantial_gainful_activity_confirmed: true,
      condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
        true,
    },
    distributions: [
      row("before", "2025-06-14", 4000, 1000),
      row("on", "2025-06-15", 4000, 1000),
      row("after", "2025-06-16", 4000, 1000),
    ],
  },
  prior_year: {
    ...priorBalanceLedger.prior_year as Extract<
      NonNullable<MedicareDistributionLedger["prior_year"]>,
      { had_account_at_end_2024: true }
    >,
    annual_hdhp_deductible_on_2025_01_01: 12000,
  },
};
export const centsLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [
      row("one", "2025-06-14", 1000.2, 250.3),
      row("two", "2025-06-15", 1000.2, 250.3),
    ],
  },
};
export const spouseLedger: MedicareDistributionLedger = {
  ...priorBalanceLedger,
  owner: "spouse",
  source: {
    ...priorBalanceLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    holder_ssn: "222334444",
  },
};
export const fullyQualifiedLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  prior_year: undefined,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("fully-qualified", "2025-06-14", 2000, 2000)],
  },
};
export const fullyExceptedLedger: MedicareDistributionLedger = {
  ...partialLedger,
  prior_year: undefined,
  source: {
    ...partialLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("on-event", "2025-06-15", 6000, 2000)],
  },
};
export const deathLedger: MedicareDistributionLedger = {
  ...review,
  owner: "taxpayer",
  source: {
    kind: "death_transfer",
    beneficiary_kind: "nonspouse_individual",
    recipient_ssn: "111223333",
    deceased_holder_name: "Morgan Example",
    deceased_holder_ssn: "222334444",
    death_date: "2025-04-15",
    death_source_reference: "holder death certificate",
    beneficiary_source_reference: "nonspouse beneficiary designation",
    fair_market_value_at_death: 6000,
    valuation_source_reference: "custodian date-of-death valuation",
    expenses: [{
      amount: 2000,
      incurred_date: "2025-04-10",
      paid_date: "2025-05-20",
      source_reference: "deceased medical bill and beneficiary receipt",
      qualified_unreimbursed_confirmed: true,
    }],
    no_postdeath_earnings_in_transfer_confirmed: true,
    no_other_inherited_or_owned_msa_confirmed: true,
  },
};
export function fixture(ledger: MedicareDistributionLedger) {
  return {
    general: {
      filing_status: ledger.owner === "spouse" ? "mfj" : "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: ledger.owner === "spouse" ? "1985-06-15" : "1955-06-15",
      ...(ledger.owner === "spouse"
        ? {
          spouse_first_name: "Casey",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1955-06-15",
        }
        : {}),
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "synthetic domestic source review",
        no_form2555_filed: true,
        form2555_review_source_reference:
          "synthetic no foreign exclusion review",
        no_form4563_filed: true,
        form4563_review_source_reference:
          "synthetic no possessions exclusion review",
      },
    },
    form8853: { medicare_distribution_ledger: ledger },
  };
}

export function medicareMsaReviewFixture(): PdfReviewFixture {
  const inputs = fixture(partialLedger);
  const filer = extractFilerIdentity(inputs.general as Record<string, unknown>);
  if (!filer) {
    throw new Error("Synthetic Medicare source needs complete filer identity");
  }
  return {
    id: "single-medicare-msa-partial-disability-prior-account",
    inputs,
    filer,
    expectedPdfForms: ["f1040", "schedule1", "schedule2", "form8853"],
    reviewFocus: [
      "Owned Medicare distributions retain dated disability/medical source records and2024balance/HDHP worksheet inputs",
      "Only distributions on or after disability onset are excepted; taxable income9000 remains unreduced while worksheet additionaltax100 reachesSchedule2",
      "SectionB account-holder identity, exceptionbox, taxable9000 andtax100 match native/form1040 totals",
    ],
  };
}
