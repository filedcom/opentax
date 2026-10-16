import type { HsaEligibility2026 } from "./hsa-eligibility.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { hsa2026 } from "../../nodes/config/2026-hsa.ts";
import { sourceCents } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

/** Same source classification for first-of-month contribution limits and
 * daily testing-period continuity. Callers reconcile active source records. */
export function classifyHsaCoverage2026(
  plans: HsaEligibility2026["plans"],
  dpcs: HsaEligibility2026["direct_primary_care_arrangements"],
  canBeClaimedAsDependent: boolean,
  medicareEnrolled: boolean,
  otherCoverage:
    HsaEligibility2026["months"][number]["other_coverage"]["disposition"],
  first: string,
) {
  return classifyHsaCoverage(
    plans,
    dpcs,
    canBeClaimedAsDependent,
    medicareEnrolled,
    otherCoverage,
    first,
    hsa2026,
  );
}
export function classifyHsaCoverage2025History(
  plans: HsaEligibility2026["plans"],
  dpcs: HsaEligibility2026["direct_primary_care_arrangements"],
  canBeClaimedAsDependent: boolean,
  medicareEnrolled: boolean,
  otherCoverage:
    HsaEligibility2026["months"][number]["other_coverage"]["disposition"],
  first: string,
) {
  if (plans.some((p) => p.kind !== "ordinary_health_plan") || dpcs.length) {
    throw Error(
      "2025 historical eligibility requires actual ordinary-plan terms, without 2026 bronze or direct-care relief",
    );
  }
  return classifyHsaCoverage(
    plans,
    dpcs,
    canBeClaimedAsDependent,
    medicareEnrolled,
    otherCoverage,
    first,
    {
      minimumDeductible: { self_only: 1650, family: 3300 },
      maximumOutOfPocket: { self_only: 8300, family: 16600 },
      telehealthSafeHarborFrom: "2023-01-01",
    },
  );
}
function classifyHsaCoverage(
  plans: HsaEligibility2026["plans"],
  dpcs: HsaEligibility2026["direct_primary_care_arrangements"],
  canBeClaimedAsDependent: boolean,
  medicareEnrolled: boolean,
  otherCoverage:
    HsaEligibility2026["months"][number]["other_coverage"]["disposition"],
  first: string,
  rules: {
    minimumDeductible: Record<CoverageType, number>;
    maximumOutOfPocket: Record<CoverageType, number>;
    telehealthSafeHarborFrom?: string;
  },
) {
  const planEligibility = plans.map((p) => {
    if (p.kind !== "ordinary_health_plan") {
      return {
        source_reference: p.source_document_reference,
        coverage: p.coverage,
        qualified: true,
      };
    }
    if (p.annual_out_of_pocket_maximum < p.annual_deductible) {
      throw Error(
        "HSA ordinary plan deductible exceeds its out-of-pocket maximum",
      );
    }
    if (
      p.plan_year_begins > first ||
      p.coverage === CoverageType.SelfOnly &&
        p.embedded_individual_deductible !== null
    ) {
      throw Error(
        "HSA ordinary plan year or embedded deductible contradicts coverage",
      );
    }
    const minimum = rules.minimumDeductible[p.coverage];
    const qualified = p.annual_deductible >= minimum &&
      p.annual_out_of_pocket_maximum <=
        rules.maximumOutOfPocket[p.coverage] &&
      (p.embedded_individual_deductible === null ||
        p.embedded_individual_deductible >= minimum) &&
      !p.nonpermitted_benefits_before_minimum_deductible &&
      (!p.telehealth_or_remote_care_before_deductible ||
        p.plan_year_begins >= (rules.telehealthSafeHarborFrom ?? "2025-01-01"));
    return {
      source_reference: p.source_document_reference,
      coverage: p.coverage,
      qualified,
    };
  });
  // LCM(1..12) makes aggregate periodic fees exact even for three-/seven-month
  // contracts; rounding an annualized fee must not turn an excess into $150.
  const denominator = 27720;
  const feeUnits = dpcs.reduce((n, p) =>
    n +
    sourceCents(p.fixed_periodic_fee) *
      (denominator / p.billing_period_months), 0);
  const cap = dpcs.some((p) => p.covers_more_than_one_individual)
    ? hsa2026.directPrimaryCareMonthlyFee.multiple
    : hsa2026.directPrimaryCareMonthlyFee.single;
  const dpcQualified =
    dpcs.every((p) =>
      p.statutory_primary_care_practitioners_only &&
      p.solely_primary_care_without_prohibited_services &&
      p.fixed_fee_is_sole_compensation_for_care_within_arrangement
    ) && feeUnits <= cap * 100 * denominator;
  const reasons = [
    ...(canBeClaimedAsDependent ? ["dependent"] : []),
    ...(medicareEnrolled ? ["medicare"] : []),
    ...(otherCoverage === "disqualifying" ? ["other_coverage"] : []),
    ...(!plans.length ? ["no_health_plan"] : []),
    ...(planEligibility.some((p) => !p.qualified)
      ? ["nonqualifying_health_plan"]
      : []),
    ...(!dpcQualified ? ["direct_primary_care"] : []),
  ];
  const coverage = reasons.length
    ? null
    : plans.some((p) => p.coverage === CoverageType.Family)
    ? CoverageType.Family
    : CoverageType.SelfOnly;
  return {
    eligible_coverage: coverage,
    disqualification_reasons: reasons,
    plan_review: planEligibility,
    direct_primary_care_monthly_fee: feeUnits / denominator / 100,
    direct_primary_care_monthly_cap: cap,
  };
}
