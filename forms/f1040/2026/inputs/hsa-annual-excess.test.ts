import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaAnnualExcess2026 as calculate,
  type HsaAnnualExcess2026,
} from "./hsa-annual-excess.ts";
import {
  hsaExcessReturns2026,
  moveHsaExcessReturnTo2027,
} from "./hsa-excess-returns.fixture.ts";
import { hsaExactAmount as exact } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";

function fixture(prior = true): HsaAnnualExcess2026 {
  const s = hsaExcessReturns2026();
  const a = s.excess_returns!.contribution_sources.claim.accounts[0];
  return {
    ...s,
    excess_returns: s.excess_returns!,
    history_review: {
      record_reference: "annual-history",
      reviewed_on: "2027-05-31",
      owners: [{
        owner_tin: s.taxpayer_ssn,
        prior_excess: prior
          ? {
            kind: "filed_2025",
            tax_year: 2025,
            owner_tin: s.taxpayer_ssn,
            filed_return_reference: "filed-2025-return",
            filed_on: "2026-04-15",
            latest_original_or_amended_return_verified: true,
            no_pending_prior_year_corrections_verified: true,
            complete_2025_owner_account_inventory_verified: true,
            no_timely_returned_2025_contributions_in_2026_receipts_verified:
              true,
            part_vii: {
              line42: 0,
              line43: 0,
              line44: 0,
              line45: 0,
              line46: 0,
              line47: 6000,
              line48: 6000,
              line49: 360,
            },
            accounts: [{
              owner_tin: s.taxpayer_ssn,
              trustee_tin: a.trustee_tin,
              account_number: a.account_number,
              value_statement_reference: "2025-value",
              valued_on: "2025-12-31",
              fair_market_value: 8000,
              current_value_after_corrections_verified: true,
            }],
          }
          : {
            kind: "none",
            history_review_reference: "no-prior-history",
            no_unresolved_prior_hsa_excess_verified: true,
          },
      }],
    },
  };
}
function removeReturns(s: HsaAnnualExcess2026) {
  s.excess_returns.review.withdrawals = [];
  s.claim.copies = s.claim.copies.filter((f) =>
    f.box3_distribution_code !== "2"
  );
  s.claim.accounts[0].payments = s.claim.accounts[0].payments.filter((p) =>
    p.record_reference !== "excess-payment"
  );
}
function filed(s: HsaAnnualExcess2026) {
  const p = s.history_review.owners[0].prior_excess;
  if (p.kind !== "filed_2025") throw Error();
  return p;
}
Deno.test("2026 HSA annual excess replays filed history, taxable distributions and returned current principal", () => {
  const s = fixture(),
    before = structuredClone(s),
    r = calculate(s),
    o = r.owners[0];
  assertEquals(o.prior_account_value_cap, 8500);
  assertEquals(o.filed_part_vii, {
    line42: 6000,
    line43: 0,
    line44: 1500,
    line45: 1500,
    line46: 4500,
    line47: 0,
    line48: 4500,
    line49: 270,
  });
  assertEquals(o.filed_form8889_line13, 3400);
  assertEquals(o.carryforward_for_2027, 4500);
  assertEquals(r.schedule2_line18_hsa_excess_tax, 270);
  assertEquals(s, before);
});
Deno.test("2026 HSA unused personal room absorbs prior excess and increases deduction once", () => {
  const s = fixture();
  removeReturns(s);
  const a = s.excess_returns.contribution_sources.claim.accounts[0];
  a.receipts[2].amount = 1000;
  a.form5498sa.box2_calendar_year_contributions = 2500;
  const o = calculate(s).owners[0];
  assertEquals(o.filed_part_vii, {
    line42: 6000,
    line43: 2400,
    line44: 1500,
    line45: 3900,
    line46: 2100,
    line47: 0,
    line48: 2100,
    line49: 126,
  });
  assertEquals(o.filed_form8889_line13, 3400);
  assertEquals(o.exact_form8889_line13, exact(3400, 1));
  assertEquals(o.exact_prior_excess.priorYearDeduction, exact(2400, 1));
});
Deno.test("2026 HSA zero prior filed tax does not activate a positive prior balance", () => {
  const s = fixture(), p = filed(s);
  p.part_vii.line47 = p.part_vii.line48 = 1;
  p.part_vii.line49 = 0;
  const o = calculate(s).owners[0];
  assertEquals([
    o.filed_part_vii.line42,
    o.filed_part_vii.line49,
    o.carryforward_for_2027,
  ], [0, 0, 0]);
  assertEquals(o.form5329_part_vii_required, false);
});
Deno.test("2026 HSA current excess survives with no prior history and year-end value caps its tax", () => {
  const s = fixture(false);
  removeReturns(s);
  s.excess_returns.contribution_sources.claim.accounts[0].form5498sa
    .box5_year_end_fmv = 100;
  const o = calculate(s).owners[0];
  assertEquals([
    o.filed_part_vii.line47,
    o.filed_part_vii.line49,
    o.carryforward_for_2027,
  ], [600, 6, 600]);
  assertEquals(o.exact_excise_tax_base, exact(100, 1));
  assertEquals(o.form5329_part_vii_required, true);
});
Deno.test("2026 HSA zero account value requires excess disclosure without producing tax or carryforward", () => {
  const s = fixture(false);
  removeReturns(s);
  s.excess_returns.contribution_sources.claim.accounts[0].form5498sa
    .box5_year_end_fmv = 0;
  const o = calculate(s).owners[0];
  assertEquals([
    o.filed_part_vii.line48,
    o.filed_part_vii.line49,
    o.carryforward_for_2027,
  ], [600, 0, 0]);
  assertEquals(o.form5329_part_vii_required, true);
});
Deno.test("2026 HSA following-year receipts increase the actual account-value cap", () => {
  const s = fixture(false);
  removeReturns(s);
  const a = s.excess_returns.contribution_sources.claim.accounts[0],
    r = a.receipts[2];
  r.received_on = "2027-04-15";
  a.form5498sa.box2_calendar_year_contributions = 1500;
  a.form5498sa.box3_following_year_contributions_for_2026 = 4000;
  a.form5498sa.box5_year_end_fmv = 0;
  const o = calculate(s).owners[0];
  assertEquals(o.current_account_value_cap, 4000);
  assertEquals(o.filed_part_vii.line49, 36);
});
Deno.test("2026 HSA returned following-year principal is removed from added contributions, not year-end value", () => {
  const s = fixture();
  moveHsaExcessReturnTo2027(s);
  const a = s.excess_returns.contribution_sources.claim.accounts[0];
  a.receipts[2].received_on = "2027-04-01";
  a.form5498sa.box2_calendar_year_contributions = 1500;
  a.form5498sa.box3_following_year_contributions_for_2026 = 4000;
  a.form5498sa.box5_year_end_fmv = 100;
  const o = calculate(s).owners[0];
  assertEquals(o.current_account_value_cap, 3500);
  assertEquals([o.filed_part_vii.line48, o.filed_part_vii.line49], [4500, 210]);
  assertEquals(
    o.current_account_value_sources[0].following_year_contributions[0]
      .timely_returned_principal,
    600,
  );
});
Deno.test("2026 HSA employer and personal retained excess are combined after separate timely returns", () => {
  const s = fixture(false), employer = hsaExcessReturns2026(true);
  Object.assign(s, employer);
  const o = calculate(s).owners[0];
  assertEquals([o.filed_part_vii.line47, o.filed_part_vii.line49], [700, 42]);
  assertEquals(o.filed_form8889_line13, 0);
});
Deno.test("2026 HSA history rejects wrong owners, incomplete accounts, stale dates and inconsistent filed lines", () => {
  const edits: Array<(s: HsaAnnualExcess2026) => void> = [
    (s) => {
      s.history_review.owners[0].owner_tin = "400001038";
    },
    (s) => {
      s.history_review.owners.push(structuredClone(s.history_review.owners[0]));
    },
    (s) => {
      s.history_review.reviewed_on = "2027-05-30";
    },
    (s) => {
      filed(s).owner_tin = "400001038";
    },
    (s) => {
      filed(s).filed_on = "2027-06-01";
    },
    (s) => {
      filed(s).filed_on = "2025-12-31";
    },
    (s) => {
      filed(s).part_vii.line45 = 1;
    },
    (s) => {
      filed(s).part_vii.line46 = 1;
    },
    (s) => {
      filed(s).part_vii.line48 = 5999;
    },
    (s) => {
      filed(s).part_vii.line49 = 359;
    },
    (s) => {
      filed(s).accounts[0].owner_tin = "400001038";
    },
    (s) => {
      filed(s).accounts[0].account_number = "missing-account";
    },
    (s) => {
      filed(s).accounts.push(structuredClone(filed(s).accounts[0]));
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA prior filed value cap includes actual 2026 contributions designated for 2025", () => {
  const s = fixture(), p = filed(s);
  p.accounts[0].fair_market_value = 0;
  p.part_vii.line49 = 30;
  const o = calculate(s).owners[0];
  assertEquals(o.prior_account_value_cap, 500);
  assertEquals(o.filed_part_vii.line42, 6000);
});

Deno.test("2026 HSA annual workpaper retains fractional monthly excess beside replayed filed lines", () => {
  const s = fixture(false), f = s.excess_returns.contribution_sources;
  f.household_eligibility.owners[0].plans[0].effective_from = "2026-12-01";
  for (const m of f.household_eligibility.owners[0].months.slice(0, 11)) {
    m.plan_references = [];
  }
  const o = calculate(s).owners[0];
  assertEquals(o.exact_prior_excess.line48, exact(12100, 3));
  assertEquals(o.filed_part_vii.line48, 4033);
  assertEquals(o.filed_part_vii.line49, 242);
});

Deno.test("2026 HSA returned source excess can leave a rounded filed excess that still needs disclosure", () => {
  const s = fixture(false),
    f = s.excess_returns.contribution_sources,
    a = f.claim.accounts[0];
  a.receipts[1].amount = 1000.50;
  a.receipts[2].amount = 4000.50;
  a.form5498sa.box2_calendar_year_contributions = 5501;
  f.wage_sources[0].box12_entries![0].amount = 1500.50;
  s.excess_returns.review.withdrawals[0].contribution_allocations[0].principal =
    601;
  s.claim.copies[1].box1_gross_distribution = 631;
  s.claim.accounts[0].payments[2].gross_amount = 631;
  const o = calculate(s).owners[0];
  assertEquals(o.exact_prior_excess.line48, exact(0, 1));
  assertEquals([o.filed_part_vii.line47, o.filed_part_vii.line49], [1, 0]);
  assertEquals(o.form5329_part_vii_required, true);
});

Deno.test("2026 HSA joint histories keep each owner's excess, deduction and rounded tax separate", () => {
  const s = fixture(),
    joint = hsaLimits2026(true),
    old = s.excess_returns.contribution_sources;
  joint.claim.accounts[0] = old.claim.accounts[0];
  joint.wage_sources = old.wage_sources;
  s.excess_returns.contribution_sources = joint;
  s.filing_status = joint.filing_status;
  s.spouse_ssn = joint.spouse_ssn;
  s.spouse_dob = joint.household_eligibility.owners[1].owner_dob;
  const account = structuredClone(s.claim.accounts[0]);
  account.record_reference = "spouse-distribution-account";
  account.owner_tin = s.spouse_ssn!;
  account.account_number = joint.claim.accounts[1].account_number;
  account.payments = [];
  s.claim.accounts.push(account);
  s.excess_returns.review.owners.push({
    owner_tin: account.owner_tin,
    payroll_review_reference: "spouse-payroll",
    all_2026_w2_excess_inclusions_reviewed: true,
    w2_inclusions: [],
  });
  const treatment = structuredClone(s.treatment_review.owners[0]);
  treatment.owner_tin = account.owner_tin;
  s.treatment_review.owners.push(treatment);
  const p = structuredClone(filed(s));
  p.owner_tin = account.owner_tin;
  p.filed_return_reference = "spouse-filed-2025";
  p.accounts[0].owner_tin = account.owner_tin;
  p.accounts[0].account_number = account.account_number;
  p.accounts[0].value_statement_reference = "spouse-2025-value";
  s.history_review.owners.push({
    owner_tin: account.owner_tin,
    prior_excess: p,
  });
  const r = calculate(s);
  assertEquals(
    r.owners.map((
      o,
    ) => [
      o.filed_part_vii.line48,
      o.filed_part_vii.line49,
      o.filed_form8889_line13,
    ]),
    [[4525, 272, 3375], [1625, 98, 4375]],
  );
  assertEquals(r.schedule2_line18_hsa_excess_tax, 370);
  assertEquals(r.schedule1_line13_before_testing_period_review, 7750);
});
