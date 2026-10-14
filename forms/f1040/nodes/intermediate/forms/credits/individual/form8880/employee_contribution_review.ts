import { z } from "zod";
import { FilingStatus } from "../../../../../types.ts";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const ein = z.string().regex(/^\d{9}$/);

/** Reviewed annual employee payments, distinct from Box12 elective deferrals. */
export const employeeContributionReviewSchema = z.object({
  tax_year: z.literal(2025),
  reviewed_by: reference,
  reviewed_on: z.string().date(),
  entries: z.array(
    z.object({
      payroll: z.object({
        source_document_ref: reference,
        employee_ssn: ssn,
        employer_ein: ein,
        employee_after_tax_paid: z.number().finite().positive(),
        not_reported_in_box12_confirmed: z.literal(true),
        not_employer_contributions_confirmed: z.literal(true),
        not_section414h2_pickup_confirmed: z.literal(true),
      }).strict(),
      plan_statement: z.object({
        source_document_ref: reference,
        participant_ssn: ssn,
        sponsoring_employer_ein: ein,
        account_number: reference,
        qualified_under_section4974c_confirmed: z.literal(true),
        not_ira_or_able_confirmed: z.literal(true),
        voluntary_employee_contributions: z.number().finite().positive(),
        no_returned_contributions_confirmed: z.literal(true),
      }).strict(),
    }).strict(),
  ).min(1),
}).strict().superRefine((review, context) => {
  const references = new Set<string>();
  const accounts = new Set<string>();
  for (
    const [index, { payroll, plan_statement: plan }] of review.entries.entries()
  ) {
    const account =
      `${plan.participant_ssn}/${plan.sponsoring_employer_ein}/${plan.account_number}`;
    if (
      payroll.employee_ssn !== plan.participant_ssn ||
      payroll.employer_ein !== plan.sponsoring_employer_ein ||
      payroll.employee_after_tax_paid !==
        plan.voluntary_employee_contributions ||
      payroll.source_document_ref === plan.source_document_ref ||
      references.has(payroll.source_document_ref) ||
      references.has(plan.source_document_ref) ||
      accounts.has(account)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries", index],
        message:
          "Form 8880 voluntary employee payments need distinct reconciled payroll and plan records",
      });
    }
    references.add(payroll.source_document_ref);
    references.add(plan.source_document_ref);
    accounts.add(account);
  }
});

export function ownedEmployeeContributions(
  review: z.infer<typeof employeeContributionReviewSchema> | undefined,
  taxpayerSsn: string | undefined,
  spouseSsn: string | undefined,
  status: FilingStatus | undefined,
): { taxpayer: number; spouse: number } {
  if (!review) return { taxpayer: 0, spouse: 0 };
  const parsed = employeeContributionReviewSchema.parse(review);
  const primary = taxpayerSsn?.replaceAll("-", "");
  const spouse = spouseSsn?.replaceAll("-", "");
  if (!primary || !/^\d{9}$/.test(primary) || primary === spouse) {
    throw new Error(
      "Form 8880 voluntary contribution needs distinct sourced filer identities",
    );
  }
  return parsed.entries.reduce((totals, { payroll }) => {
    const owner = payroll.employee_ssn;
    if (
      owner !== primary &&
      (status !== FilingStatus.MFJ || !spouse || owner !== spouse)
    ) {
      throw new Error(
        "Form 8880 voluntary contribution owner is not this taxpayer or joint spouse",
      );
    }
    return {
      taxpayer: totals.taxpayer +
        (owner === primary ? payroll.employee_after_tax_paid : 0),
      spouse: totals.spouse +
        (owner === spouse ? payroll.employee_after_tax_paid : 0),
    };
  }, { taxpayer: 0, spouse: 0 });
}
