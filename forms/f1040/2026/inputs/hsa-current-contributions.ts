import {
  calculateHsaContributionLimits2026,
  type HsaContributionLimits2026,
} from "./hsa-contribution-limits.ts";
import {
  hsaCurrentContributions,
  hsaCurrentContributionsWith,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/current-contributions.ts";
import {
  hsaExactAmount,
  hsaExactArithmetic as math,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { sourceCents } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

/** Source-derived current-year Part I workpaper. These are gross contribution
 * calculations, not final Schedule 1 or Form 5329 outputs: timely returns,
 * prior excess and employer W-2 inclusions require separate source settlement.
 * Never assume an IRA transfer/rollover/repayment qualifies from its label. */
export function calculateHsaCurrentContributions2026(
  raw: HsaContributionLimits2026,
) {
  const limits = calculateHsaContributionLimits2026(raw);
  const pending = limits.source_input.claim.accounts.flatMap((a) =>
    a.receipts.filter((r) =>
      r.received_on.startsWith("2026-") &&
      r.kind !== "personal_cash" && r.kind !== "employer_cash"
    ).map((r) => r.record_reference)
  );
  if (pending.length) {
    throw Error(
      "HSA current contributions require tax-treatment reconciliation for noncash receipts: " +
        pending.join(", "),
    );
  }
  const zero = hsaExactAmount(0, 1);
  const owners = limits.owners.flatMap((owner) => {
    // MFS supporting spouse accounts are not on this taxpayer's return.
    if (!owner.funding) return [];
    const f = owner.funding;
    const personal = hsaExactAmount(
      sourceCents(f.personal_contributions_for_2026),
      100,
    );
    const employer = hsaExactAmount(
      sourceCents(f.employer_contributions_for_2026),
      100,
    );
    const exact = hsaCurrentContributionsWith(
      owner.exact_limits.line8,
      personal,
      employer,
      zero,
      math,
    );
    const monthly = hsaCurrentContributionsWith(
      owner.exact_monthly_baseline_limits.line8,
      personal,
      employer,
      zero,
      math,
    );
    const line2 = roundHsaAmount(personal), line9 = roundHsaAmount(employer);
    const filed = hsaCurrentContributions(owner.limits.line8, line2, line9, 0);
    const gross = math.add(personal, employer);
    const currentExposure = math.subtractFloorZero(
      math.min(gross, owner.exact_limits.line8),
      math.min(gross, owner.exact_monthly_baseline_limits.line8),
    );
    return [{
      ...owner,
      current_contributions: {
        exact_personal: personal,
        exact_employer: employer,
        exact_qualified_funding: zero,
        before_withdrawals_and_prior_excess: exact,
        monthly_baseline_before_withdrawals_and_prior_excess: monthly,
        // Replayed printed arithmetic can differ from rounding an exact
        // deduction. Neither view discards the other or settles an excess tax.
        filed_current_lines: {
          line2,
          line8: owner.limits.line8,
          line9,
          line10: 0,
          line11: filed.employerAndFunding,
          line12: filed.remainingPersonalLimit,
          line13_before_prior_excess: filed.currentPersonalDeduction,
        },
        ...(owner.testing_obligation
          ? {
            gross_contribution_last_month_exposure: currentExposure,
          }
          : {}),
      },
    }];
  });
  return { ...limits, owners };
}
