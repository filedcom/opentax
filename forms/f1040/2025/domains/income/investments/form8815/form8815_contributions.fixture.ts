import { z } from "zod";
import { institutionInputs } from "./form8815_institutions.fixture.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { itemSchema as childCreditSchema } from "../../../../../nodes/inputs/credits/child/f8812/index.ts";
import {
  type Form8815Input,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { EducationAccountKind } from "../../../../../nodes/intermediate/forms/income/investments/form8815/education_contributions.ts";

export const contributionCases = [
  "qtp-self",
  "coverdell-dependent",
  "joint-spouse-qtp",
  "mixed-single-phaseout",
  "joint-mixed-continuation",
  "qtp-overflow",
] as const;

export function contributionInputs(kind: typeof contributionCases[number]) {
  const joint = kind === "joint-spouse-qtp" ||
    kind === "joint-mixed-continuation";
  const phase = kind === "mixed-single-phaseout";
  const dependent = kind === "coverdell-dependent";
  const base = institutionInputs(
    joint ? "joint-four" : phase ? "four-phaseout" : "three",
  );
  const student = base.form8815.eligible_students[0];
  const account = (
    index: number,
    accountKind: EducationAccountKind,
    name = "Alex Example",
    tin = "111223333",
  ) => ({
    ...student,
    person_name: name,
    institution_name: `Example Education Savings ${index}`,
    contribution_account: {
      kind: accountKind,
      account_reference: `account-${index}`,
      beneficiary_tin: tin,
      qualification_record_reference: `synthetic-qualified-account-${index}`,
    },
  });
  const qtp = EducationAccountKind.Qtp;
  const esa = EducationAccountKind.Coverdell;
  const students = kind === "qtp-self"
    ? [account(1, qtp)]
    : dependent
    ? [account(1, esa, "Jamie Example", "333445555")]
    : kind === "qtp-overflow"
    ? Array.from({ length: 12 }, (_, i) => account(i + 1, qtp))
    : kind === "joint-spouse-qtp"
    ? [student, account(2, qtp, "Morgan Example", "222334444"), account(3, qtp)]
    : phase
    ? [student, account(2, esa), account(3, qtp)]
    : [
      student,
      account(2, esa),
      account(3, qtp, "Morgan Example", "222334444"),
      account(4, esa),
    ];
  const contributions = students.flatMap((row, i) =>
    "contribution_account" in row ? [{ row, i }] : []
  );
  const amounts = kind === "qtp-self"
    ? [15000]
    : dependent
    ? [2000]
    : kind === "qtp-overflow"
    ? Array.from({ length: 12 }, () => 1250)
    : phase
    ? [1000, 5000]
    : kind === "joint-spouse-qtp"
    ? [2000, 2000]
    : [500, 2000, 1500];
  const total = dependent ? 2000 : joint || phase ? 8000 : 15000;
  const bond: Form8815Input = inputSchema.parse({
    ...base.form8815,
    eligible_students: students,
    line2_qualified_education_expenses: total,
    education_facts: {
      no_coverdell_or_qtp_contributions_in_claim: false,
      all_students_are_taxpayer_spouse_or_claimed_dependents: true,
      tuition_institutions_eligible: true,
      contribution_accounts_qualified: true,
      expenses_are_eligible_2025_tuition_fees_or_contributions: true,
      expenses_not_used_for_education_credit_or_tax_free_distribution: true,
      nontaxable_benefits_paid_directly_by_institution_excluded: true,
    },
    education_contributions: {
      tuition_and_fees_amount: total -
        amounts.reduce((sum, value) => sum + value, 0),
      payments: contributions.map(({ i }, n) => ({
        line1_entry_number: i + 1,
        payment_reference: `payment-${i + 1}`,
        source_document_reference: `synthetic-custodian-receipt-${i + 1}`,
        contributor_tin: joint && n % 2 === 0 ? "222334444" : "111223333",
        paid_date: "2025-04-15",
        amount: amounts[n],
        cash_contribution_not_rollover_or_transfer: true,
        not_returned_or_used_for_another_tax_benefit: true,
      })),
      coverdell_beneficiaries:
        dependent || phase || kind === "joint-mixed-continuation"
          ? [{
            beneficiary_tin: dependent ? "333445555" : "111223333",
            beneficiary_dob: dependent
              ? "2008-06-15"
              : base.general.taxpayer_dob,
            ...(dependent ? {} : {
              special_needs_record_reference:
                "synthetic-coverdell-special-needs-record",
            }),
            other_2025_contributions_all_sources: phase ? 500 : 0,
            other_2025_contributions_by_filers: 0,
            annual_contribution_inventory_reference:
              "synthetic-all-accounts-2025-inventory",
            no_prior_excess_remaining: true,
          }]
          : [],
    },
  });
  if (!dependent) return { ...base, form8815: bond };
  const template = pdfReviewFixtures.find((row) =>
    row.id === "single-five-dependent-continuation"
  )!;
  const dependentGeneral = generalSchema.parse(template.inputs.general);
  const credit = z.array(childCreditSchema).parse(template.inputs.f8812)[0];
  return {
    ...base,
    general: {
      ...base.general,
      main_home_in_us_over_half_year: true,
      taxpayer_tin_issued_by_due_date: true,
      dependents: [{
        ...dependentGeneral.dependents![0],
        ssn: "333-44-5555",
        dob: "2008-06-15",
      }],
    },
    f8812: [{
      ...credit,
      other_dependents_count: 1,
      agi: 71666,
      income_tax_liability: 7218,
    }],
    form8815: bond,
  };
}
