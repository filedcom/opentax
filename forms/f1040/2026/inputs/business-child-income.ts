import type { BusinessReturnSource2026 } from "./business-qbi.ts";
import { businessPersonalServices2026 } from "./business-personal-services.ts";

/** i8615 (2026), pp. 3–4: support earnings and the regular/alternate line 1
 * worksheet are distinct from education net earnings and dependent deductions.
 * Reuse source validation and the actual per-business half-SE allocation. */
export function businessChildIncome2026(raw: BusinessReturnSource2026) {
  const reviewed = businessPersonalServices2026(raw);
  const rows = reviewed.rows.map((b) => {
    const capital = b.review.kind === "services_and_capital";
    const netAfterSe = b.net_profit - b.allocated_se_deduction;
    // Unlike the education worksheet, i8615 removes the 30% limit when the
    // business has no net profits. Retain the reviewed reasonable allowance.
    const cap = capital && b.net_profit > 0
      ? Math.max(0, netAfterSe) * .3
      : null;
    const allowance = b.review.kind === "services_and_capital"
      ? Math.min(
        b.review.reasonable_compensation_for_owner_services,
        cap ?? Infinity,
      )
      : null;
    return {
      ...b,
      child_tax_capital_limit: cap,
      earned_income_for_support: allowance ?? b.gross_income,
      earned_income_for_line1: allowance ?? Math.max(0, b.net_profit),
      loss_addback: Math.max(0, -b.net_profit),
      unearned_business_income: capital
        ? Math.max(0, b.net_profit - allowance!)
        : 0,
    };
  });
  const total = (
    field:
      | "earned_income_for_support"
      | "earned_income_for_line1"
      | "loss_addback"
      | "unearned_business_income",
  ) => rows.reduce((n, b) => n + b[field], 0);
  return {
    rows,
    self_employment_filing_required: reviewed.self_employment_filing_required,
    schedule1_line3: reviewed.schedule1_line3,
    earned_income_for_support: total("earned_income_for_support"),
    earned_income_for_line1: total("earned_income_for_line1"),
    loss_addback: total("loss_addback"),
    unearned_business_income: total("unearned_business_income"),
    worksheet: rows.some((b) => b.loss_addback > 0) ? "alternate" : "regular",
  };
}
