import { z } from "zod";
import {
  hsaContributionEvidence2026Schema,
  reconcileHsaContributionEvidence2026,
} from "./hsa-household-eligibility.ts";
import {
  calculateHsaContributionLimit,
  CoverageType as C,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { hsa2026 } from "../../nodes/config/2026-hsa.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  compareHsaAmounts,
  hsaExactAmount,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
const ref = z.string().trim().min(1);
// Bound the denominator so the reused worksheet's scaled integer sums stay
// below Number.MAX_SAFE_INTEGER even before division by twelve.
const share = z.object({
  numerator: z.number().int().nonnegative().max(10_000_000),
  denominator: z.number().int().min(1).max(10_000_000),
}).strict().refine(
  (s) => s.numerator <= s.denominator,
  "HSA agreed share cannot exceed the family pool",
);
const allocation = z.object({
  record_reference: ref,
  agreed_by_both_spouses_verified: z.literal(true),
  // Examples: 1/2 is equal allocation; 16/35 allocates $4,000 of $8,750.
  // The spouse receives the exact remaining fraction, not a rounded remainder.
  taxpayer_share: share,
}).strict();
export const hsaContributionLimits2026Schema = hsaContributionEvidence2026Schema
  .extend({
    limit_review: z.object({
      record_reference: ref,
      no_archer_msa_contributions_for_either_owner_verified: z.literal(true),
      same_marital_status_throughout_year_verified: z.literal(true),
      basis: z.enum(["monthly", "last_month"]),
      allocation: allocation.optional(),
      monthly_baseline_allocation: allocation.optional(),
      last_month_testing_obligation_acknowledged: z.literal(true).optional(),
      // Supporting account inventory for an MFS spouse; these are never filed
      // account sources or deductions on the taxpayer's separate return.
      separate_return_spouse_accounts: z.object({
        record_reference: ref,
        complete_spouse_hsa_account_inventory_verified: z.literal(true),
        accounts: z.array(
          z.object({
            trustee_tin: z.string().regex(/^\d{9}$/),
            account_number: ref,
            source_document_reference: ref,
          }).strict(),
        ).max(100),
      }).strict().optional(),
    }).strict(),
  }).strict();
export type HsaContributionLimits2026 = z.input<
  typeof hsaContributionLimits2026Schema
>;

/** Internal limit workpaper, not a deduction or excess-tax output. Funding
 * transfers, distributions and prior excess must be reconciled before Part I
 * can become a return result. All owner allocations are retained for recapture. */
export function calculateHsaContributionLimits2026(
  raw: HsaContributionLimits2026,
) {
  const { limit_review: review, ...evidence } = hsaContributionLimits2026Schema
    .parse(raw);
  const r = reconcileHsaContributionEvidence2026(evidence);
  const h = r.household, married = h.source_input.married_at_year_end;
  if (h.months.some((m) => m.married_on_first_day !== married)) {
    throw Error(
      "HSA marital-status changes need a separate contribution-allocation review",
    );
  }
  const mfs = evidence.filing_status === FilingStatus.MFS;
  if (mfs !== (review.separate_return_spouse_accounts !== undefined)) {
    throw Error(
      "HSA separate-return limits need the spouse's actual account inventory",
    );
  }
  const external = review.separate_return_spouse_accounts?.accounts ?? [];
  if (
    new Set(external.map((a) => `${a.trustee_tin}/${a.account_number}`))
        .size !== external.length ||
    new Set(external.map((a) => a.source_document_reference)).size !==
      external.length
  ) {
    throw Error("HSA separate-return spouse accounts must be distinct");
  }
  const hasAccount = h.owners.map((o) =>
    r.funding.owners.some((f) => f.owner_tin === o.owner_tin) ||
    (mfs && o.owner_tin === h.source_input.spouse_tin && external.length > 0)
  );
  const paired = married && hasAccount.length === 2 &&
    hasAccount.every(Boolean);
  const actual = h.owners.map((o) => o.eligible_hdhp_coverage_by_month);
  const lastMonth = review.basis === "last_month";
  if (lastMonth && review.last_month_testing_obligation_acknowledged !== true) {
    throw Error(
      "HSA last-month limits need the December 2026 through December 2027 testing acknowledgement",
    );
  }
  if (
    !lastMonth &&
    (review.monthly_baseline_allocation ||
      review.last_month_testing_obligation_acknowledged)
  ) {
    throw Error(
      "HSA monthly limits cannot carry a last-month election or alternative allocation",
    );
  }
  if (
    lastMonth &&
    actual.some((months, i) => hasAccount[i] && months[11] === null)
  ) {
    throw Error(
      "HSA last-month household basis requires December eligibility for every account owner",
    );
  }
  // Full contribution treatment preserves December's deemed coverage for all
  // months; the actual calendar remains separately retained below.
  const elected = lastMonth
    ? actual.map((months, i) =>
      hasAccount[i] ? Array<C | null>(12).fill(months[11]) : months
    )
    : actual;
  const calculate = (
    coverage: (C | null)[][],
    split: z.input<typeof allocation> | undefined,
  ) => {
    const sharedMonths = paired
      ? coverage[0].filter((c, m) =>
        c === C.Family && coverage[1][m] === C.Family
      ).length
      : 0;
    if (sharedMonths > 0 && !split) {
      throw Error("HSA shared family months need the agreed allocation ratio");
    } else if (sharedMonths === 0 && split) {
      throw Error(
        "HSA family allocation requires two account owners with shared eligible family months",
      );
    }
    const denominator = split?.taxpayer_share.denominator ?? 1;
    // One unit is 1/(1200 * denominator) dollars. Every monthly contribution
    // and agreed allocation is integral in these units, so the existing
    // worksheet's Math.round calls lose no precision.
    const unitsPerDollar = 1200 * denominator;
    const sharedUnits = hsa2026.familyLimit * 100 * sharedMonths * denominator;
    const primaryUnits = hsa2026.familyLimit * 100 * sharedMonths *
      (split?.taxpayer_share.numerator ?? 0);
    const limits = h.owners.map((o, i) => {
      if (!hasAccount[i]) return undefined;
      const soleMonths = paired
        ? coverage[i].filter((c, m) =>
          c === C.Family && coverage[1 - i][m] !== C.Family
        ).length
        : 0;
      return calculateHsaContributionLimit(
        {
          eligible_hdhp_coverage_by_month: coverage[i],
          age_55_or_older: o.eligibility.age_55_or_older,
          married_at_year_end: married,
          spouse_has_separate_hsa: paired,
          last_month_rule_elected: false,
          monthly_limit_only: true,
          archer_msa_contributions: 0,
          ...(split
            ? {
              allocated_family_limit: i === 0
                ? primaryUnits
                : sharedUnits - primaryUnits,
            }
            : {}),
        },
        hsa2026.selfOnlyLimit * unitsPerDollar,
        hsa2026.familyLimit * unitsPerDollar,
        hsa2026.catchupLimit * unitsPerDollar,
        split ? hsa2026.familyLimit * 100 * soleMonths * denominator : 0,
      );
    });
    return {
      shared_family_months: sharedMonths,
      shared_family_limit: hsaExactAmount(sharedUnits, unitsPerDollar),
      total_limit: hsaExactAmount(
        limits.reduce((sum, owner) => sum + (owner?.line8 ?? 0), 0),
        unitsPerDollar,
      ),
      units_per_dollar: unitsPerDollar,
      limits,
    };
  };
  const current = calculate(elected, review.allocation);
  const baseline = lastMonth
    ? calculate(actual, review.monthly_baseline_allocation)
    : current;
  if (
    lastMonth && paired && baseline.shared_family_limit.numerator > 0 &&
    current.shared_family_limit.numerator === 0
  ) {
    throw Error(
      "HSA paired family-to-self last-month treatment needs a separate allocation review",
    );
  }
  if (lastMonth && review.allocation && review.monthly_baseline_allocation) {
    const primary = review.allocation.taxpayer_share;
    const monthly = review.monthly_baseline_allocation.taxpayer_share;
    if (
      BigInt(primary.numerator) * BigInt(monthly.denominator) !==
        BigInt(monthly.numerator) * BigInt(primary.denominator)
    ) {
      throw Error(
        "HSA monthly baseline must retain the agreed family allocation proportion",
      );
    }
  }
  if (
    lastMonth &&
    compareHsaAmounts(current.total_limit, baseline.total_limit) < 0
  ) {
    throw Error(
      "HSA December basis is below the monthly limit; use the monthly worksheet",
    );
  }
  const project = (
    l: NonNullable<typeof current.limits[number]>,
    units: number,
  ) => {
    const exact = {
      line3: hsaExactAmount(l.line3, units),
      line5: hsaExactAmount(l.line5, units),
      line6: hsaExactAmount(l.line6, units),
      line7: hsaExactAmount(l.line7, units),
      line8: hsaExactAmount(l.line8, units),
    };
    const line6 = roundHsaAmount(exact.line6),
      line7 = roundHsaAmount(exact.line7);
    return {
      exact,
      filed: {
        line1: l.line1,
        line3: roundHsaAmount(exact.line3),
        line5: roundHsaAmount(exact.line5),
        line6,
        line7,
        line8: line6 + line7,
      },
    };
  };
  const owners = h.owners.flatMap((o, i) => {
    const currentUnits = current.limits[i], baselineUnits = baseline.limits[i];
    if (!currentUnits || !baselineUnits) return [];
    const selected = project(currentUnits, current.units_per_dollar);
    const prior = project(baselineUnits, baseline.units_per_dollar);
    const limits = selected.filed, monthly = prior.filed;
    const funding = r.funding.owners.find((f) => f.owner_tin === o.owner_tin);
    return [{
      owner_tin: o.owner_tin,
      included_on_this_return: funding !== undefined,
      actual_eligible_hdhp_coverage_by_month: actual[i],
      limit_coverage_by_month: elected[i],
      limits,
      monthly_baseline_limits: monthly,
      exact_limits: selected.exact,
      exact_monthly_baseline_limits: prior.exact,
      funding,
      ...(lastMonth &&
          compareHsaAmounts(selected.exact.line8, prior.exact.line8) > 0
        ? {
          testing_obligation: {
            starts_on: "2026-12-01",
            ends_on: "2027-12-31",
            contribution_year: 2026,
            current_limit: limits.line8,
            monthly_filed_limit: monthly.line8,
            exact_current_limit: selected.exact.line8,
            exact_monthly_limit: prior.exact.line8,
            eligibility_source_reference:
              o.eligibility.source_input.record_reference,
            allocation_source_reference: review.allocation?.record_reference,
            monthly_allocation_source_reference: review
              .monthly_baseline_allocation?.record_reference,
            // This is a future review obligation, not a computed Part III tax.
            gross_personal_contributions: funding
              ?.personal_contributions_for_2026,
            gross_employer_contributions: funding
              ?.employer_contributions_for_2026,
          },
        }
        : {}),
    }];
  });
  return {
    source_input: { ...r.source_input, limit_review: review },
    shared_family_limit: roundHsaAmount(current.shared_family_limit),
    monthly_shared_family_limit: roundHsaAmount(baseline.shared_family_limit),
    exact_shared_family_limit: current.shared_family_limit,
    exact_monthly_shared_family_limit: baseline.shared_family_limit,
    owners,
  };
}
