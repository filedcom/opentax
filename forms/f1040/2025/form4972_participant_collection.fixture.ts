/** Constructed reviewed source records; never issuer/IRS authentication. */
export const participantCollectionCases = [
  "two-inherited",
  "own-plus-parent",
  "own-plus-parents",
  "paired-inherited",
  "joint-three",
  "five-inherited",
  "death-estate-pair",
] as const;
export function participantCollectionInputs(
  id: typeof participantCollectionCases[number],
) {
  const configurations: Record<
    typeof id,
    readonly ["T" | "S", boolean, number, boolean][]
  > = {
    "own-plus-parent": [["T", false, 1, true], ["T", true, 2, false]],
    "two-inherited": [["T", true, 2, false], ["T", true, 1, false]],
    "own-plus-parents": [["T", false, 1, true], ["T", true, 2, false], [
      "T",
      true,
      3,
      false,
    ]],
    "paired-inherited": [["T", true, 2, false], ["S", true, 3, false]],
    "joint-three": [["T", false, 1, true], ["T", true, 2, false], [
      "S",
      true,
      3,
      false,
    ]],
    "death-estate-pair": [["T", true, 2, false], ["S", true, 3, false]],
    "five-inherited": [
      ["T", true, 1, false],
      ["T", true, 2, false],
      ["T", true, 3, false],
      ["T", true, 4, false],
      ["T", true, 5, false],
    ],
  };
  const specs = configurations[id],
    joint = specs.some(([owner]) => owner === "S");
  const general = {
    filing_status: joint ? "mfj" : "single",
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "123456789",
    taxpayer_dob: "1930-01-01",
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
    digital_assets: false,
    address_line1: "1 Main St",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    ...(joint
      ? {
        spouse_first_name: "Ben",
        spouse_last_name: "Taxpayer",
        spouse_ssn: "987654321",
        spouse_dob: "1934-02-02",
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
      }
      : {}),
  };
  const groups = specs.map(([owner, beneficiary, count, part2], index) => {
    const recipient = owner === "T" ? "123456789" : "987654321",
      participant = beneficiary ? String(444556660 + index) : recipient,
      prefix = `${id}-participant-${index + 1}`;
    const plan = {
      participant_name: beneficiary
        ? `Reviewed Participant ${index + 1}`
        : owner === "T"
        ? "Ada Taxpayer"
        : "Ben Taxpayer",
      participant_ssn: participant,
      plan_reference: `${prefix}-qualified-plan`,
      full_balance_statement_reference:
        `${prefix}-complete-distribution-statement`,
      all_qualified_distributions_included: true,
    };
    const sources = Array.from({ length: count }, (_, n) => ({
      payer_name: `Reviewed Plan ${index + 1}`,
      payer_ein: String(123456780 + index),
      recipient_name: owner === "T" ? "Ada Taxpayer" : "Ben Taxpayer",
      recipient_ssn: recipient,
      source_document_reference: `${prefix}-issued-${n + 1}`,
      form4972_plan: plan,
      box1_gross_distribution: part2 ? 30000 : 12000.74,
      box2a_taxable_amount: part2 ? 30000 : 10000.25,
      box3_capital_gain: part2 ? 6000 : 1000.17,
      box6_nua: part2 ? 0 : 2000.49,
      box8_other: part2 ? 0 : 2000.49,
      box8_pct_total: 100,
      box9a_pct_total: 100,
      box7_distribution_code: "A",
      ...(beneficiary ? { box7_code2: "4" } : {}),
      ts: owner,
      exclude_4972: true,
    }));
    const estate = beneficiary ? 500 + 100 * index : 0;
    const election = {
      source_document_references: sources.map((s) =>
        s.source_document_reference
      ),
      participant_name: plan.participant_name,
      participant_ssn: participant,
      plan_reference: plan.plan_reference,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      beneficiary_distribution: beneficiary,
      participant_five_year_member: !beneficiary,
      ...(beneficiary
        ? { prior_beneficiary_election_after_1986: false }
        : { prior_election_after_1986: false }),
      elect_capital_gain: !(id === "five-inherited" && index === 1),
      elect_include_nua: !part2,
      elect_10yr_averaging: !part2,
      ...(estate ? { federal_estate_tax: estate } : {}),
      ...(id === "death-estate-pair"
        ? {
          participant_died_before_1996_08_21: true,
          death_benefit_exclusion: 1000,
        }
        : {}),
      participant_collection_review: {
        role: beneficiary ? "beneficiary" : "participant",
        participant_ssn: participant,
        recipient_ssn: recipient,
        participant_birth_date: beneficiary
          ? "1928-01-01"
          : owner === "T"
          ? "1930-01-01"
          : "1934-02-02",
        ...(beneficiary
          ? {
            participant_death_date: id === "death-estate-pair"
              ? "1995-02-01"
              : "2025-02-01",
          }
          : {}),
        eligibility_record_reference: `${prefix}-reviewed-eligibility`,
        entitlement_record_reference: `${prefix}-reviewed-entitlement`,
        election_history_record_reference:
          `${prefix}-reviewed-election-history`,
        no_prior_election_after_1986: true,
        full_balance_statement_reference: plan.full_balance_statement_reference,
        source_document_references: sources.map((s) =>
          s.source_document_reference
        ),
        ...(id === "death-estate-pair"
          ? {
            allowed_death_benefit_exclusion: 1000,
            death_benefit_record_reference:
              `${prefix}-death-benefit-entitlement`,
          }
          : {}),
        ...(estate
          ? {
            attributable_federal_estate_tax: estate,
            estate_tax_return_reference: `${prefix}-estate-return-allocation`,
          }
          : {}),
      },
    };
    return { sources, election };
  });
  return {
    general,
    f1099r: groups.flatMap((g) => g.sources),
    form4972: { elections: groups.map((g) => g.election) },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: `${id}-residency-income`,
        no_form2555_filed: true,
        form2555_review_source_reference: `${id}-foreign-income-inventory`,
        no_form4563_filed: true,
        form4563_review_source_reference: `${id}-Samoa-income-inventory`,
      },
    },
  };
}
