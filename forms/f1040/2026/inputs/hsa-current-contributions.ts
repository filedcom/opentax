import {
  type HsaQualifiedFunding2026,
  reconcileHsaQualifiedFunding2026,
} from "./hsa-qualified-funding.ts";
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
  raw: HsaQualifiedFunding2026,
) {
  const limits = reconcileHsaQualifiedFunding2026(raw);
  const pending = limits.source_input.claim.accounts.flatMap((a) =>
    a.receipts.filter((r) =>
      r.received_on.startsWith("2026-") &&
      r.kind !== "personal_cash" && r.kind !== "employer_cash" &&
      r.kind !== "ira_funding_transfer"
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
    const qualified = limits.qualified_funding.find((q) =>
      q.owner_tin === owner.owner_tin
    );
    const qualifiedAmount = qualified?.amount ?? zero;
    const exact = hsaCurrentContributionsWith(
      owner.exact_limits.line8,
      personal,
      employer,
      qualifiedAmount,
      math,
    );
    const monthly = hsaCurrentContributionsWith(
      owner.exact_monthly_baseline_limits.line8,
      personal,
      employer,
      qualifiedAmount,
      math,
    );
    const line2 = roundHsaAmount(personal), line9 = roundHsaAmount(employer);
    const line10 = roundHsaAmount(qualifiedAmount);
    const filed = hsaCurrentContributions(
      owner.limits.line8,
      line2,
      line9,
      line10,
    );
    const gross = math.add(personal, employer);
    // Notice 2008-51: the funding transfer has its own testing period.
    // Last-month exposure includes its use of monthly capacity but cannot
    // exceed the non-funding contributions subject to that separate rule.
    const currentExposure = math.min(
      gross,
      math.subtractFloorZero(
        math.min(math.add(gross, qualifiedAmount), owner.exact_limits.line8),
        owner.exact_monthly_baseline_limits.line8,
      ),
    );
    return [{
      ...owner,
      current_contributions: {
        exact_personal: personal,
        exact_employer: employer,
        exact_qualified_funding: qualifiedAmount,
        qualified_funding_transfers: qualified?.transfers ?? [],
        before_withdrawals_and_prior_excess: exact,
        monthly_baseline_before_withdrawals_and_prior_excess: monthly,
        // Replayed printed arithmetic can differ from rounding an exact
        // deduction. Neither view discards the other or settles an excess tax.
        filed_current_lines: {
          line2,
          line8: owner.limits.line8,
          line9,
          line10,
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
