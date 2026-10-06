import {
  assertRequiredServiceScholarshipCopies,
  requiredServiceScholarshipEarned,
  requiredServiceScholarshipSchema,
} from "../education_income/required-service-scholarship.ts";
import {
  assertReviewedBusinessIncome,
  businessReviewSchema,
  evidenceCents,
  reviewedBusinessIncome,
  supportMoney,
} from "./business-review.ts";
import { z } from "zod";
import { dependentScholarshipReviewSchema } from "../education_income/dependent-scholarship-review.ts";
import type { F8863Input, F8863Item } from "./index.ts";
import { inputSchema as w2Schema } from "../w2/index.ts";

const ssnSchema = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const reference = z.string().trim().min(1);
const common = {
  tax_year: z.literal(2025),
  claimant_ssn: ssnSchema,
  claimant_dob: z.string().date(),
  dob_record_reference: reference,
  claimant_actually_claimed_as_dependent: z.boolean(),
  claimant_dependency_record_reference: reference,
};
export const claimantReviewSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("age_24_or_older") }).strict(),
  z.object({
    ...common,
    kind: z.literal("under_24"),
    full_time_student_months: z.array(z.number().int().min(1).max(12)).max(12),
    full_time_enrollment_record_reference: reference,
    at_least_one_parent_alive_at_year_end: z.boolean(),
    parent_status_record_reference: reference,
    other_earned_income_present: z.literal(false),
    earned_income_w2_sources: z.array(
      z.object({
        source_document_reference: reference,
        employee_ssn: ssnSchema,
        employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
        box1_wages: z.number().int().nonnegative(),
        box3_ss_wages: z.number().int().nonnegative().optional(),
        box7_ss_tips: z.number().int().nonnegative().optional(),
      }).strict(),
    ),
    earned_income_business_sources: z.array(businessReviewSchema).min(1)
      .optional(),
    earned_income_service_scholarship_sources: z.array(
      requiredServiceScholarshipSchema,
    ).min(1).optional(),
    support_sources: z.array(
      z.object({
        source_document_reference: reference,
        beneficiary_ssn: ssnSchema,
        kind: z.enum(["ordinary_support", "scholarship_support"]),
        amount: supportMoney,
      }).strict(),
    ).min(1),
  }).strict(),
]);
export const studentOwnershipReviewSchema = z.object({
  tax_year: z.literal(2025),
  claimant_ssn: ssnSchema,
  student_ssn: ssnSchema,
  dependency_claim_state: z.enum([
    "claimed_on_this_return",
    "not_claimed",
    "claimed_on_another_return",
  ]),
  student_can_be_claimed_as_dependent: z.boolean(),
  dependency_claimant_ssn: ssnSchema.optional(),
  dependency_record_reference: reference,
  eligible_parent_ssn: ssnSchema.optional(),
  parent_nonclaim_record_reference: reference.optional(),
  no_competing_education_claim: z.literal(true),
  competing_claim_review_reference: reference,
  dependent_student_income_return: z.object({
    source_document_reference: reference,
    student_claim_review: dependentScholarshipReviewSchema,
    pending: z.record(z.string(), z.unknown()),
  }).strict().optional(),
}).strict();
export type ClaimantReview = z.infer<typeof claimantReviewSchema>;
const tin = (value: string) => value.replaceAll("-", "");
export function claimantRefundRestriction(
  review: ClaimantReview,
  filingStatus?: string,
): boolean {
  if (review.claimant_actually_claimed_as_dependent) {
    throw new Error(
      "Form 8863 return claimant actually claimed as a dependent cannot claim an education credit",
    );
  }
  // IRS age convention: a January 1 birthday attains the age on December 31.
  const under24 = review.claimant_dob >= "2002-01-02";
  if (
    (review.kind === "under_24") !== under24 ||
    review.claimant_dob > "2025-12-31"
  ) {
    throw new Error(
      "Form 8863 claimant age review conflicts with the birth-date source",
    );
  }
  if (review.kind !== "under_24") return false;
  if (
    new Set(review.full_time_student_months).size !==
      review.full_time_student_months.length ||
    new Set(
        review.earned_income_w2_sources.map((source) =>
          source.source_document_reference
        ),
      ).size !== review.earned_income_w2_sources.length ||
    new Set(
        review.support_sources.map((source) =>
          source.source_document_reference
        ),
      ).size !== review.support_sources.length ||
    review.earned_income_w2_sources.some((source) =>
      tin(source.employee_ssn) !== tin(review.claimant_ssn)
    ) ||
    review.support_sources.some((source) =>
      tin(source.beneficiary_ssn) !== tin(review.claimant_ssn)
    )
  ) {
    throw new Error(
      "Form 8863 claimant earned-income, enrollment and support records need distinct references and the claimant's identity",
    );
  }
  const fullTime = review.full_time_student_months.length >= 5;
  const support = review.support_sources.reduce((sum, source) =>
    sum +
    (fullTime && source.kind === "scholarship_support"
      ? 0
      : evidenceCents(source.amount)), 0);
  const earned = reviewedBusinessIncome(
    review.earned_income_business_sources ?? [],
    review.earned_income_w2_sources,
    review.claimant_ssn,
  ).earned +
    requiredServiceScholarshipEarned(
      review.earned_income_service_scholarship_sources ?? [],
      review.claimant_ssn,
    );
  const under18 = review.claimant_dob >= "2008-01-02";
  const age18 = review.claimant_dob >= "2007-01-02" && !under18;
  const ageTest = under18 ||
    ((age18 || fullTime) &&
      (earned < 0 || evidenceCents(earned) * 2 < support));
  return ageTest && review.at_least_one_parent_alive_at_year_end &&
    filingStatus !== "mfj";
}
export function reviewedEducationStudents(input: F8863Input): F8863Item[] {
  const review = input.claimant_review;
  if (!review) return input.f8863s;
  const restriction = claimantRefundRestriction(
    review,
    input.f8863s[0].filing_status,
  );
  return input.f8863s.map((student) => {
    const owner = student.ownership_review;
    if (
      !owner || tin(owner.claimant_ssn) !== tin(review.claimant_ssn) ||
      tin(owner.student_ssn) !== student.student_ssn?.replaceAll("-", "") ||
      owner.dependency_claim_state === "claimed_on_another_return" ||
      (owner.dependency_claim_state === "claimed_on_this_return" &&
        (!owner.student_can_be_claimed_as_dependent ||
          owner.dependency_claimant_ssn?.replaceAll("-", "") !==
            tin(review.claimant_ssn) ||
          tin(owner.student_ssn) === tin(review.claimant_ssn))) ||
      (owner.dependency_claim_state === "not_claimed" &&
        (tin(owner.student_ssn) !== tin(review.claimant_ssn) ||
          owner.dependency_claimant_ssn !== undefined ||
          (owner.student_can_be_claimed_as_dependent &&
            (!owner.eligible_parent_ssn ||
              !owner.parent_nonclaim_record_reference ||
              tin(owner.eligible_parent_ssn) === tin(review.claimant_ssn)))))
    ) {
      throw new Error(
        "Form 8863 education credit owner must match actual dependency claim or documented parent nonclaim",
      );
    }
    if (
      student.credit_type === "aoc" &&
      student.taxpayer_under_24_no_refundable_aoc !== undefined &&
      student.taxpayer_under_24_no_refundable_aoc !== restriction
    ) {
      throw new Error(
        "Form 8863 refundable AOC answer must follow the return claimant's age/support review, not the student's age",
      );
    }
    return student.credit_type === "aoc"
      ? { ...student, taxpayer_under_24_no_refundable_aoc: restriction }
      : student;
  });
}
export function assertEducationClaimantSources(
  fields: F8863Input,
  pending: Readonly<Record<string, unknown>> | undefined,
  primarySsn: string,
  dependentEligible: (source: Record<string, unknown>) => boolean,
  spouseSsn?: string,
): void {
  const general = pending?.general as Record<string, unknown> | undefined;
  const final = pending?.f1040 as Record<string, unknown> | undefined;
  const review = fields.claimant_review;
  const dependentStudents = fields.f8863s.some((student) =>
    student.student_ssn?.replaceAll("-", "") !== tin(primarySsn) &&
    student.student_ssn?.replaceAll("-", "") !==
      String(general?.spouse_ssn ?? spouseSsn ?? "").replaceAll("-", "")
  );
  const youngClaimant = typeof general?.taxpayer_dob === "string" &&
    general.taxpayer_dob >= "2002-01-02";
  if (!review) {
    if (
      dependentStudents || youngClaimant ||
      general?.taxpayer_claimed_as_dependent === true ||
      general?.taxpayer_can_be_claimed_as_dependent === true
    ) {
      throw new Error(
        "Form 8863 dependent or young-claimant credit needs source-backed ownership and claimant age/support review",
      );
    }
    return;
  }
  reviewedEducationStudents(fields);
  if (
    !general || !final || tin(review.claimant_ssn) !== tin(primarySsn) ||
    String(general.taxpayer_ssn ?? "").replaceAll("-", "") !==
      tin(primarySsn) ||
    review.claimant_dob !== general.taxpayer_dob ||
    review.claimant_actually_claimed_as_dependent !==
      general.taxpayer_claimed_as_dependent
  ) {
    throw new Error(
      "Form 8863 claimant review must match retained general identity, birth date and actual dependency claim",
    );
  }
  const dependents =
    (Array.isArray(general.dependents) ? general.dependents : []) as Record<
      string,
      unknown
    >[];
  const filed =
    (Array.isArray(final.dependent_details)
      ? final.dependent_details
      : []) as Record<string, unknown>[];
  for (const student of fields.f8863s) {
    const owner = student.ownership_review!;
    if (owner.dependency_claim_state === "claimed_on_this_return") {
      const source = dependents.filter((dependent) =>
        String(dependent.ssn ?? "").replaceAll("-", "") ===
          tin(owner.student_ssn)
      );
      const row = filed.filter((dependent) =>
        String(dependent.ssn ?? "").replaceAll("-", "") ===
          tin(owner.student_ssn)
      );
      if (
        source.length !== 1 || row.length !== 1 ||
        [
          "dob",
          "relationship",
          "months_in_home",
          "full_time_student",
          "us_citizen_national_or_resident",
          "provided_over_half_own_support",
          "filed_joint_return_except_refund_only",
          "taxpayer_provided_over_half_support",
          "gross_income",
        ].some((key) =>
          source[0][key] !== undefined && source[0][key] !== row[0][key]
        ) ||
        !dependentEligible(source[0]) ||
        source[0].education_dependency_record_reference !==
          owner.dependency_record_reference ||
        row[0].education_dependency_record_reference !==
          owner.dependency_record_reference
      ) {
        throw new Error(
          "Form 8863 student dependency ownership must match its source and finalized dependent row, including any release",
        );
      }
    } else if (
      general.taxpayer_can_be_claimed_as_dependent !==
        owner.student_can_be_claimed_as_dependent ||
      final.taxpayer_can_be_claimed_as_dependent !==
        owner.student_can_be_claimed_as_dependent
    ) {
      throw new Error(
        "Form 8863 student own-return dependency eligibility must match the filed can-be-claimed indicator",
      );
    }
  }
  if (review.kind === "under_24") {
    const wages = pending?.w2 === undefined
      ? []
      : w2Schema.parse(pending.w2).w2s;
    if (wages.length !== review.earned_income_w2_sources.length) {
      throw new Error(
        "Form 8863 young claimant review must inventory the retained earned-income W-2 copies",
      );
    }
    for (const source of review.earned_income_w2_sources) {
      const copies = wages.filter((wage) =>
        wage.source_document_reference === source.source_document_reference
      );
      if (
        copies.length !== 1 || copies[0].box1_wages !== source.box1_wages ||
        copies[0].employee_ssn?.replaceAll("-", "") !==
          tin(review.claimant_ssn) ||
        (review.earned_income_business_sources &&
          (copies[0].box3_ss_wages !== source.box3_ss_wages ||
            (copies[0].box7_ss_tips ?? 0) !== source.box7_ss_tips)) ||
        copies[0].employer_ein?.replaceAll("-", "") !==
          source.employer_ein.replaceAll("-", "")
      ) {
        throw new Error(
          "Form 8863 claimant earned-income support test must reconcile to the retained issued W-2 copies",
        );
      }
    }
    assertRequiredServiceScholarshipCopies(
      review.earned_income_service_scholarship_sources ?? [],
      review.claimant_ssn,
      pending?.education_income,
    );
    assertReviewedBusinessIncome(
      review.earned_income_business_sources ?? [],
      review.earned_income_w2_sources,
      review.claimant_ssn,
      pending,
    );
    const earned = review.earned_income_w2_sources.reduce(
      (sum, source) => sum + source.box1_wages,
      0,
    );
    if (
      (final.line1a_wages ?? 0) !== earned ||
      wages.some((wage) =>
        (wage.box12_entries ?? []).some((entry) =>
          ["D", "E", "F", "G", "H", "S", "Q"].includes(entry.code) &&
          entry.amount > 0
        )
      ) ||
      (pending?.schedule_c !== undefined &&
        !review.earned_income_business_sources) ||
      pending?.k1_partnership !== undefined ||
      [
        "line1b_household_wages",
        "line1c_unreported_tips",
        "line1d_medicaid_waiver",
        "line1e_taxable_dep_care",
        "line1f_taxable_adoption_benefits",
        "line1g_wages_8919",
        "line1h_other_earned",
        "line1i_combat_pay",
      ].some((key) => Number(final[key] ?? 0) !== 0)
    ) {
      throw new Error(
        "Form 8863 claimant support review needs all earned-income sources and finalized wage reconciliation",
      );
    }
  }
}
