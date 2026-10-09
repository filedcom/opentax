import { z } from "zod";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { dependentFilingSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import type { Form8815Input } from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { EducationAccountKind } from "../../../../../nodes/intermediate/forms/income/investments/form8815/education_contributions.ts";

const finalPeopleSchema = z.object({
  taxpayer_first_name: z.string(),
  taxpayer_middle_initial: z.string().optional(),
  taxpayer_last_name: z.string(),
  taxpayer_ssn: z.string(),
  taxpayer_dob: z.string(),
  spouse_first_name: z.string().optional(),
  spouse_middle_initial: z.string().optional(),
  spouse_last_name: z.string().optional(),
  spouse_ssn: z.string().optional(),
  spouse_dob: z.string().optional(),
  dependent_details: z.array(dependentFilingSchema).optional(),
  line11_agi: z.number(),
});

/** Match beneficiary, contributor and Coverdell MAGI to the filed return. */
export function assertContributionOwners(
  input: Form8815Input,
  finalReturn: unknown,
): void {
  const review = input.education_contributions;
  if (!review) return;
  const filer = finalPeopleSchema.parse(finalReturn);
  const { owners, people } = filedContributionPeople(
    input.filing_status,
    filer,
  );
  if (
    review.payments.some((payment) => !owners.includes(payment.contributor_tin))
  ) {
    throw new Error(
      "Form 8815 contribution payer differs from the filed taxpayer or spouse",
    );
  }
  for (const student of input.eligible_students) {
    const account = student.contribution_account;
    if (!account) continue;
    const matching = people.filter((person) =>
      person.tin === account.beneficiary_tin &&
      person.name === student.person_name.toUpperCase()
    );
    if (matching.length !== 1) {
      throw new Error(
        "Form 8815 account beneficiary differs from the filed family",
      );
    }
    const inventory = review.coverdell_beneficiaries.find((row) =>
      row.beneficiary_tin === account.beneficiary_tin
    );
    if (
      account.kind === EducationAccountKind.Coverdell &&
      inventory?.beneficiary_dob !== matching[0].dob
    ) {
      throw new Error(
        "Form 8815 Coverdell birth date differs from the filed beneficiary",
      );
    }
  }
  assertCoverdellMagiLimit(input, review, filer.line11_agi);
}

function assertCoverdellMagiLimit(
  input: Form8815Input,
  review: NonNullable<Form8815Input["education_contributions"]>,
  agi: number,
): void {
  // Existing Form 8815 final-return guards prohibit foreign income addbacks,
  // so Pub. 970 Worksheet 6-1 MAGI is the final AGI, after bond exclusion.
  const start = input.filing_status === FilingStatus.MFJ ? 190000 : 95000;
  const width = input.filing_status === FilingStatus.MFJ ? 30000 : 15000;
  const fraction = Math.min(
    1,
    Number((Math.max(0, agi - start) / width).toFixed(3)),
  );
  const limit = 2000 - Math.round(2000 * fraction);
  for (const inventory of review.coverdell_beneficiaries) {
    const paid = review.payments.reduce((sum, payment) => {
      const account = input.eligible_students[payment.line1_entry_number - 1]
        .contribution_account;
      return sum +
        (account?.kind === EducationAccountKind.Coverdell &&
            account.beneficiary_tin === inventory.beneficiary_tin
          ? payment.amount
          : 0);
    }, inventory.other_2025_contributions_by_filers);
    if (paid > limit) {
      throw new Error(
        "Form 8815 Coverdell payments exceed the final-return MAGI limit",
      );
    }
  }
}

function filedContributionPeople(
  status: FilingStatus,
  filer: z.infer<typeof finalPeopleSchema>,
) {
  const personName = (
    first: string | undefined,
    middle: string | undefined,
    last: string | undefined,
  ) => [first, middle, last].filter(Boolean).join(" ").toUpperCase();
  const owners = [
    filer.taxpayer_ssn,
    ...(status === FilingStatus.MFJ && filer.spouse_ssn
      ? [filer.spouse_ssn]
      : []),
  ]
    .map((value) => value.replaceAll("-", ""));
  const people = [
    {
      tin: owners[0],
      name: personName(
        filer.taxpayer_first_name,
        filer.taxpayer_middle_initial,
        filer.taxpayer_last_name,
      ),
      dob: filer.taxpayer_dob,
    },
    ...(owners[1]
      ? [{
        tin: owners[1],
        name: personName(
          filer.spouse_first_name,
          filer.spouse_middle_initial,
          filer.spouse_last_name,
        ),
        dob: filer.spouse_dob,
      }]
      : []),
    ...(filer.dependent_details ?? []).map((dependent) => ({
      tin: (dependent.ssn ?? dependent.itin ?? dependent.atin ?? "").replaceAll(
        "-",
        "",
      ),
      name: personName(
        dependent.first_name,
        dependent.middle_initial,
        dependent.last_name,
      ),
      dob: dependent.dob,
    })),
  ];
  return { owners, people };
}
