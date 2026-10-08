import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";

/** One beneficiary's issued shares of the participant's complete same-plan balance. */
export function partialBeneficiaryMultipleInputs(copies: 2 | 3) {
  const recipient = "123456789";
  const plan = {
    participant_name: "Pat Participant",
    participant_ssn: "444556666",
    plan_reference: "2025-Pat-stock-bonus-complete-balance",
    full_balance_statement_reference:
      "2025-Pat-administrator-full-balance-and-beneficiary-shares",
    all_qualified_distributions_included: true as const,
  };
  const f1099r = Array.from({ length: copies }, (_, index) => ({
    payer_name: "Pat Qualified Stock Bonus Plan",
    payer_ein: "123456789",
    recipient_ssn: recipient,
    source_document_reference: `2025-issued-Pat-beneficiary-1099R-${index + 1}`,
    account_number: `PAT-2025-SHARE-${index + 1}`,
    form4972_plan: plan,
    box1_gross_distribution: index === 0 ? 10000 : 12000,
    box2a_taxable_amount: 10000,
    box3_capital_gain: 2000,
    box6_nua: index === 0 ? 0 : 2000,
    box7_distribution_code: DistributionCode.CodeA,
    box8_other: index === 0 ? 0 : 1500,
    ...(index > 0 ? { box8_pct_total: 25 } : {}),
    box9a_pct_total: 50,
    ts: "T" as const,
    exclude_4972: true,
  }));
  return {
    general: {
      filing_status: "single" as const,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: recipient,
      taxpayer_dob: "1970-01-01",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      taxpayer_can_be_claimed_as_dependent: false,
    },
    f1099r,
    form4972: {
      elections: [{
        source_document_references: f1099r.map((copy) =>
          copy.source_document_reference
        ),
        participant_name: plan.participant_name,
        participant_ssn: plan.participant_ssn,
        plan_reference: plan.plan_reference,
        born_before_1936: true,
        entire_balance_distributed: true,
        rolled_over_any: false,
        beneficiary_distribution: true,
        participant_five_year_member: false,
        participant_died_before_1996_08_21: false,
        prior_beneficiary_election_after_1986: false,
        elect_include_nua: true,
        elect_capital_gain: true,
        elect_10yr_averaging: true,
      }],
    },
  };
}
