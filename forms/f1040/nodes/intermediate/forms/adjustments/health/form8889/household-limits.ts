import {
  calculateHsaContributionLimit,
  CoverageType as C,
} from "./contribution-limit.ts";
import { hsaExactAmount } from "./exact-amount.ts";

/** Shared annual household allocation using integer units before projecting
 * exact dollars or filed lines. Source-year adapters reconcile identity and shares. */
export function hsaHouseholdLimitAmounts(
  coverage: (C | null)[][],
  owners: { hasAccount: boolean; age55: boolean }[],
  married: boolean,
  split:
    | { taxpayer_share: { numerator: number; denominator: number } }
    | undefined,
  annual: { selfOnlyLimit: number; familyLimit: number; catchupLimit: number },
) {
  const hasAccount = owners.map((o) => o.hasAccount);
  const paired = married && owners.length === 2 && hasAccount.every(Boolean);
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
  const sharedUnits = annual.familyLimit * 100 * sharedMonths * denominator;
  const primaryUnits = annual.familyLimit * 100 * sharedMonths *
    (split?.taxpayer_share.numerator ?? 0);
  const limits = owners.map((o, i) => {
    if (!hasAccount[i]) return undefined;
    const soleMonths = paired
      ? coverage[i].filter((c, m) =>
        c === C.Family && coverage[1 - i][m] !== C.Family
      ).length
      : 0;
    return calculateHsaContributionLimit(
      {
        eligible_hdhp_coverage_by_month: coverage[i],
        age_55_or_older: o.age55,
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
      annual.selfOnlyLimit * unitsPerDollar,
      annual.familyLimit * unitsPerDollar,
      annual.catchupLimit * unitsPerDollar,
      split ? annual.familyLimit * 100 * soleMonths * denominator : 0,
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
}
