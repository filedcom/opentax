import { ableDistribution2026, ableSource2026 } from "./able.fixture.ts";
import { saverGraph2026 } from "./savers-credit-graph.fixture.ts";
export function ableGraph2026(distribution = false, wages = 24000) {
  const b = saverGraph2026(wages), a = ableSource2026();
  a.claim = JSON.parse(
    JSON.stringify(a.claim).replaceAll(a.taxpayer_ssn, b.general.taxpayer_ssn),
  );
  a.taxpayer_ssn = b.general.taxpayer_ssn;
  const c = b.form8880.claim;
  delete c.no_able_contributions_or_current_able_distributions;
  c.able_inventory_reference = a.claim.record_reference;
  if (distribution) {
    delete a.claim.accounts[0].no_current_year_able_distributions_confirmed;
    a.claim.accounts[0].current_year_distributions = ableDistribution2026(a);
    a.claim.accounts[0].current_distribution_copy_after_corrections_verified =
      true;
  }
  return {
    ...b,
    general: { ...b.general, taxpayer_dob: a.taxpayer_dob },
    w2s: b.w2s.map((w) => ({
      ...w,
      box12_entries: [],
      box3_ss_wages: Math.min(wages, 184500),
      box4_ss_withheld: Math.round(Math.min(wages, 184500) * .062 * 100) / 100,
    })),
    able_accounts: { claim: a.claim },
  };
}
