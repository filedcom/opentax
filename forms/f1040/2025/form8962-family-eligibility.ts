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
export const coverageEligibilityReviewSchema = z.object({
  tax_year: z.literal(2025),
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

/** The initial joint family route requires an affirmative zero-income inventory. */
export const ptcSpouseIncomeReviewSchema = z.object({
  tax_year: z.literal(2025),
  spouse_ssn: ssn,
  review_reference: reference,
  reviewed_on: date,
  reviewer_name: reference,
  inventory_complete: z.literal(true),
  income_amounts: z.object({
    wages: z.literal(0),
    taxable_interest: z.literal(0),
    tax_exempt_interest: z.literal(0),
    ordinary_dividends: z.literal(0),
    taxable_ira_distributions: z.literal(0),
    taxable_pensions: z.literal(0),
    social_security_total: z.literal(0),
    social_security_taxable: z.literal(0),
    capital_gain: z.literal(0),
    additional_income: z.literal(0),
    adjustments: z.literal(0),
    foreign_earned_income_exclusion: z.literal(0),
  }).strict(),
  income_source_references: z.array(reference),
}).strict();

function canonical(value: unknown): string {
  const sorted = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(sorted)
      : item && typeof item === "object"
      ? Object.fromEntries(
        Object.entries(item).sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, sorted(entry)]),
      )
      : item;
  return JSON.stringify(sorted(value));
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
): void {
  const policy = object(policyValue);
  const covered = Array.isArray(policy.covered_individual_ssns)
    ? policy.covered_individual_ssns.map(normalize)
    : [];
  const evidence = Array.isArray(policy.no_aptc_monthly_evidence)
    ? policy.no_aptc_monthly_evidence.map(object)
    : [];
  const aptcs = policy.monthly_aptcs;
  const premiums = policy.monthly_premiums;
  const noAptc = Array.isArray(aptcs) && aptcs.length === 12 &&
    aptcs.every((amount) => amount === 0);
  const required = requireReview || (noAptc && covered.length > 3);
  const supplied = evidence.some((row) =>
    row.coverage_eligibility_review !== undefined
  );
  if (!required && !supplied) return;
  if (
    !noAptc || !Array.isArray(premiums) || premiums.length !== 12 ||
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
    const parsed = coverageEligibilityReviewSchema.safeParse(
      row.coverage_eligibility_review,
    );
    if (!parsed.success) {
      throw new Error(
        "Form 8962 family PTC needs affirmative monthly outside-MEC eligibility review",
      );
    }
    const review = parsed.data;
    const monthEnd = new Date(Date.UTC(2025, review.month, 0)).toISOString()
      .slice(0, 10);
    if (
      review.policy_number !== policy.policy_number ||
      review.month !== row.month ||
      review.reviewed_on < monthEnd ||
      !exactIdentities(
        review.individuals.map((person) => normalize(person.individual_ssn)),
        covered,
      )
    ) {
      throw new Error(
        "Form 8962 eligibility review policy, month, date or persons disagree",
      );
    }
  }
}

/** General-node validation; complete retained input is checked at filing. */
export function assertForm8962SpouseIncomeReview(
  generalValue: unknown,
  pendingValue?: unknown,
  requireReview = false,
): void {
  const general = object(generalValue);
  if (general.ptc_spouse_income_review === undefined && !requireReview) return;
  const parsed = ptcSpouseIncomeReviewSchema.safeParse(
    general.ptc_spouse_income_review,
  );
  if (
    !parsed.success || general.filing_status !== "mfj" ||
    normalize(parsed.data.spouse_ssn) !== normalize(general.spouse_ssn) ||
    normalize(general.spouse_ssn) === normalize(general.taxpayer_ssn) ||
    parsed.data.reviewed_on < "2025-12-31"
  ) {
    throw new Error(
      "Form 8962 joint family needs its owned reviewed zero-income spouse inventory",
    );
  }
  if (pendingValue === undefined) return;
  const pending = object(pendingValue);
  const original = object(pending.start);
  if (!Object.keys(original).length) {
    throw new Error(
      "Form 8962 spouse inventory needs retained complete entered source input",
    );
  }
  // This route has only parent W-2 earnings. Other income categories must be
  // reconciled before they can coexist with the zero-spouse inventory.
  if (
    Object.keys(original).some((key) =>
      !["general", "w2", "f1095a"].includes(key)
    )
  ) {
    throw new Error(
      "Form 8962 zero-spouse family inventory cannot omit another entered source category",
    );
  }
  const rawWages = Array.isArray(original.w2) ? original.w2.map(object) : [];
  const retainedWages = object(pending.w2).w2s;
  if (
    !Array.isArray(retainedWages) || retainedWages.length !== rawWages.length
  ) {
    throw new Error(
      "Form 8962 spouse inventory needs matching raw and retained W-2 sources",
    );
  }
  const primary = normalize(general.taxpayer_ssn);
  for (const wages of [rawWages, retainedWages.map(object)]) {
    if (wages.some((row) => normalize(row.employee_ssn) !== primary)) {
      throw new Error(
        "Form 8962 zero-spouse review conflicts with actual W-2 owner inventory",
      );
    }
  }
  if (
    canonical(object(original.general).ptc_spouse_income_review) !==
      canonical(general.ptc_spouse_income_review)
  ) {
    throw new Error(
      "Form 8962 retained spouse review differs from entered source review",
    );
  }
}

/** Shared complete source guard for the new larger/joint monthly filing path. */
export function assertForm8962FamilyEligibility(
  pendingValue: unknown,
  finalFilerTin?: string,
  finalSpouseTin?: string,
): void {
  const pending = object(pendingValue);
  const general = object(pending.general);
  const joint = general.filing_status === "mfj";
  const dependents = Array.isArray(general.dependents)
    ? general.dependents.map(object)
    : [];
  const familySize = (joint ? 2 : 1) +
    dependents.filter((dep) => dep.dependent_on_another_return !== true).length;
  const required = joint || familySize > 3;
  if (!required) return;
  if (
    (finalFilerTin !== undefined &&
      normalize(finalFilerTin) !== normalize(general.taxpayer_ssn)) ||
    (joint && finalSpouseTin !== undefined &&
      normalize(finalSpouseTin) !== normalize(general.spouse_ssn))
  ) {
    throw new Error(
      "Form 8962 family review differs from final filer identity",
    );
  }
  const policies = object(pending.f1095a).f1095as;
  if (!Array.isArray(policies) || policies.length !== 1) {
    throw new Error(
      "Form 8962 family eligibility supports one complete reviewed policy",
    );
  }
  const original = object(pending.start);
  const rawPolicies = original.f1095a;
  const rawGeneral = object(original.general);
  if (
    !Array.isArray(rawPolicies) || rawPolicies.length !== 1 ||
    normalize(rawGeneral.taxpayer_ssn) !== normalize(general.taxpayer_ssn) ||
    rawGeneral.filing_status !== general.filing_status ||
    (joint &&
      normalize(rawGeneral.spouse_ssn) !== normalize(general.spouse_ssn))
  ) {
    throw new Error(
      "Form 8962 family eligibility needs its retained entered policy and filer source",
    );
  }
  assertForm8962PolicyEligibility(rawPolicies[0], rawGeneral, true);
  const retainedEvidence = object(policies[0]).no_aptc_monthly_evidence;
  const rawEvidence = object(rawPolicies[0]).no_aptc_monthly_evidence;
  if (
    canonical(retainedEvidence) !== canonical(rawEvidence) ||
    canonical(object(policies[0]).covered_individual_ssns) !==
      canonical(object(rawPolicies[0]).covered_individual_ssns) ||
    object(policies[0]).policy_number !== object(rawPolicies[0]).policy_number
  ) {
    throw new Error(
      "Form 8962 retained family eligibility differs from entered policy review",
    );
  }
  assertForm8962PolicyEligibility(policies[0], general, true);
  if (joint) assertForm8962SpouseIncomeReview(general, pending, true);
}
