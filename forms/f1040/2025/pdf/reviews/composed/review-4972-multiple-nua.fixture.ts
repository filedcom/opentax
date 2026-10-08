import type { PdfReviewFixture } from "../../review-fixtures.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";

export function multipleNuaInputs(primaryCopies: number, spouseCopies = 0) {
  const people = [
    {
      owner: "T",
      name: "Ada Taxpayer",
      ssn: "123456789",
      copies: primaryCopies,
      ein: "123456789",
    },
    {
      owner: "S",
      name: "Ben Taxpayer",
      ssn: "987654321",
      copies: spouseCopies,
      ein: "987654321",
    },
  ].filter((person) => person.copies > 0);
  const groups = people.map((person) => {
    const plan = {
      participant_name: person.name,
      participant_ssn: person.ssn,
      plan_reference: `2025 complete stock bonus plan ${person.owner}`,
      full_balance_statement_reference:
        `2025 issued final-balance statement ${person.owner}`,
      all_qualified_distributions_included: true,
    };
    const copies = Array.from({ length: person.copies }, (_, i) => ({
      payer_name: `Issued Stock Bonus Plan ${person.owner}`,
      payer_ein: person.ein,
      recipient_ssn: person.ssn,
      source_document_reference: `2025-issued-stock-${person.owner}-${i + 1}`,
      form4972_plan: plan,
      box1_gross_distribution: 12000,
      box2a_taxable_amount: 10000,
      box3_capital_gain: 1000,
      box6_nua: 2000,
      box9a_pct_total: 100,
      box7_distribution_code: DistributionCode.CodeA,
      ts: person.owner,
      exclude_4972: true,
    }));
    const election = {
      source_document_references: copies.map((copy) =>
        copy.source_document_reference
      ),
      participant_name: person.name,
      participant_ssn: person.ssn,
      plan_reference: plan.plan_reference,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      beneficiary_distribution: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      elect_capital_gain: true,
      elect_include_nua: true,
      elect_10yr_averaging: true,
    };
    return { copies, election };
  });
  return {
    general: {
      filing_status: spouseCopies ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
      taxpayer_dob: "1930-01-01",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      ...(spouseCopies
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
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f1099r: groups.flatMap((group) => group.copies),
    form4972: { elections: groups.map((group) => group.election) },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "2025 residency and income record",
        no_form2555_filed: true,
        form2555_review_source_reference:
          "2025 complete foreign-income inventory",
        no_form4563_filed: true,
        form4563_review_source_reference:
          "2025 complete Samoa-income inventory",
      },
    },
  };
}

export const multipleNuaReviewFixtures: readonly PdfReviewFixture[] = [
  [3, 0],
  [5, 0],
  [7, 0],
  [2, 3],
  [4, 5],
].map(([primary, spouse]) => ({
  id: `form4972-nua-primary-${primary}-spouse-${spouse}`,
  inputs: multipleNuaInputs(primary, spouse),
  filer: extractFilerIdentity(multipleNuaInputs(primary, spouse).general)!,
  expectedPdfForms: ["f1040", "schedule1a", "form4972", ...(spouse ? ["form4972"] : [])],
  reviewFocus: [
    "All complete same-plan source copies are included once in the elected NUA worksheet",
    "Capital gain and ordinary NUA allocations reconcile source boxes and independent ten-year tax rates",
    "Spouse elections retain distinct recipient identity and combine once on Form1040 line16",
  ],
}));
