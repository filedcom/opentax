import { z } from "zod";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}
const date = z.string().refine(
  validDate,
  "Review date must be a real ISO date",
);
const normalize = (value: unknown): string =>
  typeof value === "string" ? value.replaceAll("-", "") : "";
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

/** Reviewed eligibility facts, not issuer or government authentication. */
export const coverageEligibilityReviewSchemaForYear = <T extends 2025 | 2026>(
  taxYear: T,
) =>
  z.object({
    tax_year: z.literal(taxYear),
    policy_number: reference,
    month: z.number().int().min(1).max(12),
    review_reference: reference,
    reviewed_on: date,
    reviewer_name: reference,
    individuals: z.array(
      z.object({
        individual_ssn: ssn,
        qhp_enrolled_for_month: z.literal(true),
        lawfully_present_for_month: z.literal(true),
        incarcerated_other_than_pending_disposition: z.literal(false),
        employer_sponsored_mec_enrolled: z.literal(false),
        employer_offer_review: z.literal("no_offer_available"),
        government_mec_eligibility_review: z.literal("not_eligible"),
        other_designated_mec_eligibility_review: z.literal("not_eligible"),
        eligibility_record_reference: reference,
      }).strict(),
    ).min(1),
  }).strict();

export const coverageEligibilityReviewSchema =
  coverageEligibilityReviewSchemaForYear(2025);

/** Ordinary payment and person-month review for a policy receiving advances. */
export const aptcMonthlyEvidenceSchemaForYear = <T extends 2025 | 2026>(
  taxYear: T,
) =>
  z.object({
    month: z.number().int().min(1).max(12),
    coverage_eligibility_review: coverageEligibilityReviewSchemaForYear(
      taxYear,
    ),
    premium_payment: z.object({
      amount: z.number().nonnegative(),
      paid_on: date,
      reference,
    }).strict(),
  }).strict();

export const aptcMonthlyEvidenceSchema = aptcMonthlyEvidenceSchemaForYear(2025);

export interface PolicyEligibilityRules {
  readonly taxYear: 2025 | 2026;
  readonly paymentDeadline: string;
  readonly allowZeroAdvanceMonths?: boolean;
  readonly coveredByMonth?: ReadonlyMap<number, readonly string[]>;
}

function exactIdentities(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    new Set(expected).size === expected.length &&
    actual.every((tin) => /^\d{9}$/.test(tin) && expected.includes(tin));
}

/** Public policy-local checks; filing adds the derived tax family identities. */
export function assertForm8962PolicyEligibility(
  policyValue: unknown,
  generalValue?: unknown,
  requireReview = false,
  rules: PolicyEligibilityRules = {
    taxYear: 2025,
    paymentDeadline: "2026-04-15",
  },
): void {
  const policy = object(policyValue);
  const covered = Array.isArray(policy.covered_individual_ssns)
    ? policy.covered_individual_ssns.map(normalize)
    : [];
  const withAdvances = policy.aptc_monthly_evidence !== undefined;
  const evidenceValue = withAdvances
    ? policy.aptc_monthly_evidence
    : policy.no_aptc_monthly_evidence;
  const evidence = Array.isArray(evidenceValue)
    ? evidenceValue.map(object)
    : [];
  const aptcs = policy.monthly_aptcs;
  const premiums = policy.monthly_premiums;
  const noAptc = Array.isArray(aptcs) && aptcs.length === 12 &&
    aptcs.every((amount) => amount === 0);
  const required = requireReview || withAdvances ||
    (noAptc && covered.length > 3);
  const supplied = evidence.some((row) =>
    row.coverage_eligibility_review !== undefined
  );
  if (!required && !supplied) return;
  if (
    (!noAptc && !withAdvances) ||
    (withAdvances && (policy.no_aptc_monthly_evidence !== undefined ||
      !Array.isArray(aptcs) || aptcs.length !== 12)) ||
    !Array.isArray(premiums) || premiums.length !== 12 ||
    !exactIdentities(covered, covered) || !policy.policy_number
  ) {
    throw new Error(
      "Form 8962 family eligibility needs owned monthly policy identities",
    );
  }
  const general = object(generalValue);
  if (generalValue !== undefined) {
    const dependents = Array.isArray(general.dependents)
      ? general.dependents.map(object)
      : [];
    const family = [
      normalize(general.taxpayer_ssn),
      ...(general.filing_status === "mfj"
        ? [normalize(general.spouse_ssn)]
        : []),
      ...dependents.filter((dep) => dep.dependent_on_another_return !== true)
        .map((dep) => normalize(dep.ssn)),
    ];
    if (!exactIdentities(covered, family)) {
      throw new Error(
        "Form 8962 eligible policy persons must equal the actual tax family",
      );
    }
  }
  const months = premiums.flatMap((amount, index) =>
    typeof amount === "number" && amount > 0 ? [index + 1] : []
  );
  if (
    evidence.length !== months.length ||
    new Set(evidence.map((row) => row.month)).size !== evidence.length ||
    evidence.some((row) => !months.includes(Number(row.month)))
  ) {
    throw new Error(
      "Form 8962 family eligibility needs each covered month exactly once",
    );
  }
  for (const row of evidence) {
    if (withAdvances) {
      const proof = aptcMonthlyEvidenceSchemaForYear(rules.taxYear).parse(row);
      const premium = premiums[proof.month - 1];
      const advance = Array.isArray(aptcs) ? aptcs[proof.month - 1] : undefined;
      if (
        typeof premium !== "number" || typeof advance !== "number" ||
        (advance < 0 || (!rules.allowZeroAdvanceMonths && advance === 0)) ||
        [premium, advance, proof.premium_payment.amount].some((v) =>
          !Number.isFinite(v) || !Number.isSafeInteger(Math.round(v * 100)) ||
          Math.abs(v - Math.round(v * 100) / 100) > 1e-7
        ) ||
        Math.round(proof.premium_payment.amount * 100) +
              Math.round(advance * 100) < Math.round(premium * 100) ||
        proof.premium_payment.paid_on > rules.paymentDeadline ||
        proof.coverage_eligibility_review.reviewed_on <
          proof.premium_payment.paid_on
      ) {
        throw new Error(
          "Form 8962 advance-credit month needs reviewed full premium payment including APTC",
        );
      }
    }
    const parsed = coverageEligibilityReviewSchemaForYear(rules.taxYear)
      .safeParse(
        row.coverage_eligibility_review,
      );
    if (!parsed.success) {
      throw new Error(
        "Form 8962 family PTC needs affirmative monthly outside-MEC eligibility review",
      );
    }
    const review = parsed.data;
    const monthEnd = new Date(Date.UTC(rules.taxYear, review.month, 0))
      .toISOString()
      .slice(0, 10);
    if (
      review.policy_number !== policy.policy_number ||
      review.month !== row.month ||
      review.reviewed_on < monthEnd ||
      !exactIdentities(
        review.individuals.map((person) => normalize(person.individual_ssn)),
        [...(rules.coveredByMonth?.get(review.month) ?? covered)],
      )
    ) {
      throw new Error(
        "Form 8962 eligibility review policy, month, date or persons disagree",
      );
    }
  }
}
