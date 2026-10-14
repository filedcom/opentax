import { fixture, ledger } from "./form8853_contributions.fixture.ts";
import { combinedPackets } from "./form8853_combined.fixture.ts";
import type { Form8853Input } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import type { ArcherDistributionLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_distributions.ts";
import type { MedicareHolderLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/medicare_distributions.ts";
import { LtcOwner } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";

const activity = {
  source_reference:
    "Synthetic distribution/LTC annual inventory and medical allocation review",
  no_other_msa_activity_confirmed: true as const,
  msa_medical_expenses_separate_from_ltc_costs_and_reimbursements_confirmed:
    true as const,
};
const disability = {
  onset_date: "2025-06-15",
  source_reference: "Synthetic disability medical certification",
  unable_to_engage_in_substantial_gainful_activity_confirmed: true as const,
  condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
    true as const,
};
function archer(gross = 2000.4, medical = 500.6): ArcherDistributionLedger {
  return {
    all_distributions_identified_confirmed: true,
    no_rollover_or_excess_contribution_withdrawal_confirmed: true,
    ltc_activity_review: { ...activity },
    source: {
      kind: "normal",
      holder_ssn: "111223333",
      holder_date_of_birth: "1980-04-15",
      holder_identity_source_reference: "Synthetic Archer holder identity",
      distributions: [{
        distribution_reference: "Archer payment",
        distribution_date: "2025-06-14",
        distribution_date_source_reference: "Synthetic June custodian ledger",
        gross_amount: gross,
        unreimbursed_qualified_expenses: medical,
        form1099sa_distribution_code: "1",
        form1099sa_source_reference: "Synthetic issued Archer 1099-SA",
        qualified_expense_source_references: ["Archer separate dental receipt"],
        qualified_expense_eligibility_and_no_schedule_a_double_deduction_confirmed:
          true,
      }],
    },
  };
}
function medicare(
  owner: "taxpayer" | "spouse",
  gross = 6000,
  medical = 2000,
): NonNullable<Form8853Input["medicare_joint_distribution_ledgers"]>[number] {
  return {
    owner,
    all_distributions_identified_confirmed: true,
    erroneous_medicare_contributions_and_earnings_and_trustee_transfers_excluded_confirmed:
      true,
    ltc_activity_review: { ...activity },
    source: {
      kind: "normal",
      holder_ssn: owner === "taxpayer" ? "111223333" : "222334444",
      holder_identity_source_reference:
        `Synthetic ${owner} Medicare holder identity`,
      medicare_enrollment_and_eligible_hdhp_confirmed: true,
      enrollment_and_hdhp_source_reference:
        `Synthetic ${owner} Medicare enrollment and HDHP review`,
      distributions: [{
        distribution_reference: `${owner} Medicare payment`,
        account_source_reference: `${owner} Medicare account`,
        distribution_date: "2025-06-14",
        distribution_date_source_reference:
          `Synthetic ${owner} custodian ledger`,
        gross_amount: gross,
        unreimbursed_holder_qualified_expenses: medical,
        form1099sa_distribution_code: "1",
        form1099sa_source_reference:
          `Synthetic ${owner} issued Medicare 1099-SA`,
        qualified_expense_source_references: [
          `${owner} Medicare separate dental receipt`,
        ],
        holder_only_medical_eligibility_and_no_schedule_a_double_deduction_confirmed:
          true,
      }],
    },
    prior_year: {
      had_account_at_end_2024: false,
      year_end_account_review_source_reference:
        `Synthetic ${owner} 2024 accounts review`,
    },
  };
}
const age = archer();
if (age.source.kind !== "normal") throw new Error("fixture");
age.source.holder_date_of_birth = "1960-06-15";
const archerRow = age.source.distributions[0];
age.source.distributions = ["14", "15", "16"].map((day) => ({
  ...archerRow,
  distribution_reference: `Archer June ${day}`,
  distribution_date: `2025-06-${day}`,
  gross_amount: 2000,
  unreimbursed_qualified_expenses: 500,
  qualified_expense_source_references: [`Archer dental ${day}`],
}));
const disabled = structuredClone(age);
if (disabled.source.kind !== "normal") throw new Error("fixture");
disabled.source.holder_date_of_birth = "1980-04-15";
disabled.source.disability = disability;
const death: ArcherDistributionLedger = {
  ...archer(),
  source: {
    kind: "death_transfer",
    beneficiary_kind: "nonspouse_individual",
    recipient_ssn: "111223333",
    deceased_holder_name: "Morgan Example",
    deceased_holder_ssn: "555667777",
    death_date: "2025-04-15",
    death_source_reference: "Synthetic Morgan death certificate",
    beneficiary_source_reference: "Synthetic nonspouse beneficiary designation",
    fair_market_value_at_death: 6000,
    valuation_source_reference: "Synthetic death-date custodian valuation",
    expenses: [{
      amount: 2000,
      incurred_date: "2025-04-10",
      paid_date: "2025-05-20",
      source_reference: "Morgan separate dental bill",
      qualified_unreimbursed_confirmed: true,
    }],
    no_postdeath_earnings_in_transfer_confirmed: true,
    no_other_inherited_or_owned_msa_confirmed: true,
  },
};
const prior = medicare("taxpayer", 10000, 2000);
prior.prior_year = {
  had_account_at_end_2024: true,
  balance_on_2024_12_31: 10000,
  balance_source_reference: "Synthetic 2024 custodian balance",
  balance_includes_all_holder_medicare_msas_confirmed: true,
  annual_hdhp_deductible_on_2025_01_01: 8000,
  deductible_policy_source_reference: "Synthetic January 1 HDHP deductible",
};
const partial = structuredClone(prior);
if (partial.source.kind !== "normal") throw new Error("fixture");
const medRow = partial.source.distributions[0];
partial.source.disability = disability;
partial.source.distributions = ["14", "15", "16"].map((day) => ({
  ...medRow,
  distribution_reference: `Medicare June ${day}`,
  distribution_date: `2025-06-${day}`,
  gross_amount: 4000,
  unreimbursed_holder_qualified_expenses: 1000,
  qualified_expense_source_references: [`Medicare separate dental ${day}`],
}));
if (!partial.prior_year?.had_account_at_end_2024) throw new Error("fixture");
partial.prior_year.annual_hdhp_deductible_on_2025_01_01 = 12000;
if (death.source.kind !== "death_transfer") throw new Error("fixture");
const medicareDeath: MedicareHolderLedger = {
  ...medicare("taxpayer"),
  source: death.source,
  prior_year: undefined,
};
const sole = (source: MedicareHolderLedger): Form8853Input => ({
  medicare_distribution_ledger: {
    ...source,
    sole_medicare_msa_holder_on_return_confirmed: true,
  },
});

// Amounts are independent 2025 entered-line/worksheet expectations, not calculator outputs.
const cases: Array<
  {
    id: string;
    source: Form8853Input;
    msaIncome: number;
    additionalTax: number;
    joint?: boolean;
    senior?: boolean;
    ltcZero?: boolean;
    ltcMultiple?: boolean;
    ltcSpouse?: boolean;
  }
> = [
  {
    id: "archer-cents",
    source: { archer_distribution_ledger: archer() },
    msaIncome: 1499,
    additionalTax: 300,
  },
  {
    id: "archer-all-medical",
    source: { archer_distribution_ledger: archer(2000, 2000) },
    msaIncome: 0,
    additionalTax: 0,
    ltcZero: true,
  },
  {
    id: "archer-age65",
    source: { archer_distribution_ledger: age },
    msaIncome: 4500,
    additionalTax: 600,
    senior: true,
  },
  {
    id: "archer-disability",
    source: { archer_distribution_ledger: disabled },
    msaIncome: 4500,
    additionalTax: 600,
  },
  {
    id: "archer-death-beneficiary",
    source: { archer_distribution_ledger: death },
    msaIncome: 4000,
    additionalTax: 0,
  },
  {
    id: "medicare-new-account",
    source: sole(medicare("taxpayer")),
    msaIncome: 4000,
    additionalTax: 2000,
  },
  {
    id: "medicare-prior-account",
    source: sole(prior),
    msaIncome: 8000,
    additionalTax: 1400,
  },
  {
    id: "medicare-partial-disability",
    source: sole(partial),
    msaIncome: 9000,
    additionalTax: 100,
  },
  {
    id: "medicare-spouse-ltc-primary",
    source: sole(medicare("spouse")),
    msaIncome: 4000,
    additionalTax: 2000,
    joint: true,
  },
  {
    id: "medicare-death-beneficiary",
    source: sole(medicareDeath),
    msaIncome: 4000,
    additionalTax: 0,
  },
  {
    id: "joint-medicare-prior-and-ltc-payees",
    source: {
      medicare_joint_distribution_ledgers: [
        prior,
        medicare("spouse", 2000.4, 500.6),
      ],
    },
    msaIncome: 9499,
    additionalTax: 2150,
    joint: true,
    ltcMultiple: true,
  },
  {
    id: "joint-medicare-cents-ltc-spouse",
    source: {
      medicare_joint_distribution_ledgers: [
        medicare("taxpayer", 1000.49, 100.51),
        medicare("spouse", 1000.49, 100.51),
      ],
    },
    msaIncome: 1798,
    additionalTax: 900,
    joint: true,
    ltcSpouse: true,
  },
  {
    id: "joint-medicare-all-medical",
    source: {
      medicare_joint_distribution_ledgers: [
        medicare("taxpayer", 2000, 2000),
        medicare("spouse", 3000, 3000),
      ],
    },
    msaIncome: 0,
    additionalTax: 0,
    joint: true,
    ltcZero: true,
  },
  {
    id: "joint-medicare-partial-disability",
    source: {
      medicare_joint_distribution_ledgers: [partial, medicare("spouse")],
    },
    msaIncome: 13000,
    additionalTax: 2100,
    joint: true,
  },
];
export const distributionLtcPackets = cases.map((entry) => {
  const base = fixture(ledger());
  base.general.filing_status = entry.joint ? "mfj" : "single";
  base.general.taxpayer_dob = entry.senior ? "1960-06-15" : "1980-04-15";
  if (entry.joint) {
    Object.assign(base.general, {
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1981-04-15",
    });
  }
  Object.assign(base.w2[0], {
    box1_wages: 200000,
    box2_fed_withheld: 45000,
    box3_ss_wages: 176100,
    box4_ss_withheld: 10918.2,
    box5_medicare_wages: 200000,
    box6_medicare_withheld: 2900,
  });
  const ltc = structuredClone(
    combinedPackets.find((p) =>
      p.id ===
        (entry.ltcZero
          ? "zero-income-deduction-and-tax"
          : entry.ltcMultiple
          ? "multiple-payees-with-deduction"
          : "personal-deduction")
    )!.inputs.form8853.ltc_ledger,
  );
  if (entry.ltcSpouse) {
    ltc.insureds[0].filing_policyholders = [{
      owner: LtcOwner.Spouse,
      ssn: "222334444",
    }];
    ltc.insureds[0].sources = ltc.insureds[0].sources.map((s) =>
      s.policyholder.ssn === "111223333"
        ? { ...s, policyholder: { ssn: "222334444", name: "Casey Example" } }
        : s
    );
  }
  return {
    ...entry,
    ltcIncome: entry.ltcZero ? 0 : entry.ltcMultiple ? 27680 : 7400,
    inputs: {
      general: base.general,
      w2: base.w2,
      ...(entry.senior
        ? {
          schedule1a: {
            senior_zero_exclusions_review: {
              no_section933_puerto_rico_excluded_income: true,
              section933_review_source_reference: "Synthetic domestic review",
              no_form2555_filed: true,
              form2555_review_source_reference:
                "Synthetic no foreign exclusion",
              no_form4563_filed: true,
              form4563_review_source_reference:
                "Synthetic no possessions exclusion",
            },
          },
        }
        : {}),
      form8853: { ...structuredClone(entry.source), ltc_ledger: ltc },
    },
  };
});
