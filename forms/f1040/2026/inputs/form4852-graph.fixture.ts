import { itemizedClaim2026 } from "../schedule-a.fixture.ts";
import { form4852Source2026 } from "./form4852.fixture.ts";
import {
  retirementCopy2026,
  retirementGraph2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
export function form4852Graph2026(retirement = false, ira = false) {
  const base = retirementGraph2026(), s = form4852Source2026(retirement);
  const c =
    retirementSource2026([retirementCopy2026("substitute-2026", ira)]).claim;
  c.copies = [];
  c.reviewed_on = "2027-03-15";
  const review = c.reviews[0];
  delete review.payer_determined_pension_taxability_verified;
  review.reviewed_on = "2027-03-15";
  review.form4852_taxability_review_reference = "substitute-2026";
  if (ira) {
    const r = s.claim.records[0];
    if (r.kind !== "1099r") throw Error();
    r.amounts.employee_contributions = 0;
    r.amounts.is_ira = true;
    r.amounts.taxable_amount_not_determined = true;
    delete r.amounts.taxable_amount;
    const p = r.distribution_sources[0];
    p.employee_contributions = 0;
    p.is_ira = true;
    p.account_type = "traditional_ira";
    p.taxable_amount_not_determined = true;
    delete p.taxable_amount;
  }
  return {
    general: base.general,
    schedule_a: structuredClone(itemizedClaim2026),
    w2s: [] as typeof base.w2s,
    f4852: { claim: s.claim },
    ...(retirement ? { f1099r: { claim: c } } : {}),
  };
}
