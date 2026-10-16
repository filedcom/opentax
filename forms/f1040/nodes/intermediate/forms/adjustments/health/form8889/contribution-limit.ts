export enum CoverageType {
  SelfOnly = "self_only",
  Family = "family",
}

/** Year-independent worksheet facts. Source adapters own eligibility and spouse
 * allocation evidence; annual monetary limits are always supplied explicitly. */
export interface HsaContributionLimitInput {
  eligible_hdhp_coverage_by_month?: (CoverageType | null)[];
  age_55_or_older?: boolean;
  last_month_rule_elected?: boolean;
  married_at_year_end?: boolean;
  spouse_has_separate_hsa?: boolean;
  allocated_family_limit?: number;
  archer_msa_contributions?: number;
  /** Retain the actual monthly baseline for section 223(b)(8) testing. */
  monthly_limit_only?: boolean;
}

export function calculateHsaContributionLimit(
  input: HsaContributionLimitInput,
  selfOnlyLimit: number,
  familyLimit: number,
  catchupLimit: number,
  soleFamilyLimit = 0,
): {
  line1?: CoverageType;
  line3: number;
  line5: number;
  line6: number;
  line7: number;
  line8: number;
} {
  const coverage = input.eligible_hdhp_coverage_by_month;
  if (input.monthly_limit_only && input.last_month_rule_elected) {
    throw new Error(
      "Form 8889 monthly baseline cannot elect the last-month rule",
    );
  }
  if (
    coverage === undefined || input.age_55_or_older === undefined ||
    input.last_month_rule_elected === undefined
  ) {
    throw new Error(
      "Form 8889 contributions need twelve monthly HDHP eligibility/coverage facts, age, and a last-month-rule answer",
    );
  }
  const eligible = coverage.filter((month) => month !== null);
  const december = coverage[11];
  if (eligible.length === 0) {
    if (input.last_month_rule_elected) {
      throw new Error(
        "Form 8889 last-month rule requires December 1 HDHP eligibility",
      );
    }
    return { line3: 0, line5: 0, line6: 0, line7: 0, line8: 0 };
  }
  if (input.last_month_rule_elected && december === null) {
    throw new Error(
      "Form 8889 last-month rule requires December 1 HDHP eligibility",
    );
  }
  const familyMonths =
    coverage.filter((month) => month === CoverageType.Family).length;
  const selfOnlyMonths = eligible.length - familyMonths;
  // The form's line 1 is the longer-duration coverage unless December is
  // family. The instructions do not resolve a non-December tie, so stop.
  if (
    !input.last_month_rule_elected &&
    december !== CoverageType.Family && familyMonths === selfOnlyMonths
  ) {
    throw new Error(
      "Form 8889 line 1 needs a source-backed coverage choice when durations tie",
    );
  }
  const line1 = input.last_month_rule_elected
    ? december!
    : december === CoverageType.Family || familyMonths > selfOnlyMonths
    ? CoverageType.Family
    : CoverageType.SelfOnly;
  const marriedFamily = familyMonths > 0 && input.married_at_year_end === true;
  if (
    familyMonths > 0 && input.married_at_year_end === undefined
  ) {
    throw new Error(
      "Form 8889 family contribution limit needs an explicit marriage answer",
    );
  }
  if (marriedFamily && input.spouse_has_separate_hsa === undefined) {
    throw new Error(
      "Form 8889 married family coverage needs a separate-spouse-HSA answer",
    );
  }
  const catchupOnLine7 = input.age_55_or_older === true && marriedFamily;
  const monthLimit = (month: CoverageType | null): number => {
    if (month === null) return 0;
    const base = month === CoverageType.Family ? familyLimit : selfOnlyLimit;
    return base +
      (input.age_55_or_older === true && !catchupOnLine7 ? catchupLimit : 0);
  };
  const worksheet =
    coverage.reduce((sum, month) => sum + monthLimit(month), 0) /
    12;
  const fullYear = eligible.length === 12;
  const changedCoverage = familyMonths > 0 && selfOnlyMonths > 0;
  const decemberLimit = december === null ? 0 : monthLimit(december);
  const line3 = Math.round(
    input.monthly_limit_only
      ? worksheet
      : fullYear && changedCoverage
      ? Math.max(worksheet, decemberLimit)
      : input.last_month_rule_elected
      ? decemberLimit
      : worksheet,
  );
  const line5 = Math.max(0, line3 - (input.archer_msa_contributions ?? 0));
  // For spouses with separate HSAs and mixed family/self-only months, line 6
  // first takes the agreed family-month share, then adds this owner's own
  // self-only-month limit. The latter is not shared with the spouse.
  const ownSelfOnlyLimit = marriedFamily &&
      input.spouse_has_separate_hsa === true &&
      input.allocated_family_limit !== undefined && selfOnlyMonths > 0
    ? Math.round(selfOnlyLimit * selfOnlyMonths / 12)
    : 0;
  const line6 = input.allocated_family_limit === undefined
    ? line5
    : input.allocated_family_limit + ownSelfOnlyLimit + soleFamilyLimit;
  if (line6 > line5) {
    throw new Error("Form 8889 allocated family limit cannot exceed line 5");
  }
  const catchupMonths = input.last_month_rule_elected ? 12 : eligible.length;
  const line7 = catchupOnLine7
    ? Math.round(catchupLimit * catchupMonths / 12)
    : 0;
  return { line1, line3, line5, line6, line7, line8: line6 + line7 };
}
