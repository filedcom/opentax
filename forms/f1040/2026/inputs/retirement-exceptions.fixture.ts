import { earlyRetirementSource2026 } from "./retirement-early.fixture.ts";
import { retirementGraph2026 } from "./retirement.fixture.ts";
import type { RetirementSource2026 } from "./retirement-source.ts";
type Early = NonNullable<
  RetirementSource2026["claim"]["reviews"][number]["early_distribution"]
>;
export type EarlyExceptionClaim2026 = NonNullable<
  Early["exception_review"]
>["claims"][number];
export function claimEarlyExceptions2026(
  s: RetirementSource2026,
  claims: EarlyExceptionClaim2026[],
) {
  const e = s.claim.reviews[0].early_distribution!;
  delete e.no_additional_tax_exception_applies_verified;
  e.exception_review = {
    record_reference: "complete-exception-review",
    owner_tin: s.taxpayer_ssn,
    account_number: s.claim.copies[0].account_number,
    complete_exception_inventory_verified: true,
    no_other_payment_exception_applies_verified: true,
    claims,
  };
  return s;
}
export function levyRetirementSource2026(simple = false, amount = 10000) {
  return claimEarlyExceptions2026(earlyRetirementSource2026(simple, amount), [{
    kind: "irs_levy",
    record_reference: "irs-levy-notice",
    payment_reference: "payment-one",
    levy_date: "2026-08-01",
    amount_paid_under_levy: amount,
    irs_levy_on_this_retirement_account_verified: true,
  }]);
}
export function exceptionRetirementGraph2026(s = levyRetirementSource2026()) {
  const graph = retirementGraph2026(s.claim.copies);
  graph.general.taxpayer_dob = s.taxpayer_dob;
  graph.f1099r.claim = s.claim;
  return graph;
}
