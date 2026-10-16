import { assertEquals, assertThrows } from "@std/assert";
import {
  type HsaLastMonth2025History,
  reconcileHsaLastMonth2025History as reconcile,
} from "./hsa-testing-history.ts";
import { hsaLastMonth2025History as fixture } from "./hsa-testing-history.fixture.ts";
import { hsaTestingPeriod2026 } from "./hsa-testing-period.fixture.ts";
import { calculateHsaTestingPeriod2026 as calculate } from "./hsa-testing-period.ts";
import { hsaExactAmount as exact } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
function annual(fails = true, funding = false) {
  const s = hsaTestingPeriod2026(funding),
    h = fixture(),
    owner = s.testing_review.owners[0];
  s.testing_review.prior_last_month_histories = [h];
  delete owner
    .no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified;
  owner.last_month_2025_history_reference = h.record_reference;
  owner.no_prior_qualified_funding_testing_obligations_verified = true;
  if (fails) {
    const e =
      s.excess_returns.contribution_sources.household_eligibility.owners[0];
    const resumed = structuredClone(e.plans[0]);
    e.plans[0].effective_through = "2026-06-30";
    resumed.effective_from = "2026-08-01";
    resumed.source_document_reference = "resumed-plan";
    e.plans.push(resumed);
    e.months[6].plan_references = [];
    for (const m of e.months.slice(7)) {
      m.plan_references = [resumed.source_document_reference];
    }
  }
  return s;
}
Deno.test("2025 HSA testing history replays actual annual limits and retains monthly fractions", () => {
  const s = fixture(), before = structuredClone(s), o = reconcile(s).owners[0];
  assertEquals(o.exact_elected_limit, exact(4300, 1));
  assertEquals(o.exact_monthly_limit, exact(1075, 3));
  assertEquals(o.exact_last_month_exposure, exact(11825, 3));
  assertEquals(o.testing_period, {
    starts_on: "2025-12-01",
    ends_on: "2026-12-31",
  });
  assertEquals(s, before);
});
Deno.test("2026 HSA prior last-month failure routes filed 2025 exposure into current Part III", () => {
  const r = calculate(annual()), o = r.owners[0];
  assertEquals(o.prior_last_month_testing!.status, "failed");
  assertEquals(o.prior_last_month_testing!.first_ineligible_on, "2026-07-01");
  assertEquals(o.filed_part_iii, {
    line18: 3942,
    line19: 0,
    line20: 3942,
    line21: 394,
  });
  assertEquals(r.schedule1_line8f_hsa_income, 5442);
  assertEquals(r.schedule2_line13d_hsa_testing_tax, 394);
});
Deno.test("2026 HSA completed prior testing period produces no recapture or future obligation", () => {
  const o = calculate(annual(false)).owners[0];
  assertEquals(o.prior_last_month_testing!.status, "completed");
  assertEquals(o.filed_part_iii.line20, 0);
  assertEquals(o.future_testing_obligations, []);
});
Deno.test("2026 HSA prior cash and current IRA funding failures remain separate contribution-year amounts", () => {
  const o = calculate(annual(true, true)).owners[0];
  assertEquals(o.filed_part_iii, {
    line18: 3942,
    line19: 1000,
    line20: 4942,
    line21: 494,
  });
  assertEquals(o.prior_last_month_testing!.contribution_year, 2025);
  assertEquals(o.qualified_funding_testing[0].testing.starts_on, "2026-06-01");
});
Deno.test("2025 HSA historical source rejects unsupported year rules, stale filings and invented line totals", () => {
  const edits: Array<(s: HsaLastMonth2025History) => void> = [
    (s) => {
      s.owners[0].eligibility.plans[0].annual_deductible = 1600;
    },
    (s) => {
      s.owners[0].eligibility.plans[0].annual_out_of_pocket_maximum = 8500;
    },
    (s) => {
      s.filed_forms[0].lines.line3 = 4400;
    },
    (s) => {
      s.filed_forms[0].lines.line13++;
    },
    (s) => {
      s.filed_forms[0].filed_on = "2025-12-31";
    },
    (s) => {
      s.reviewed_on = "2026-05-30";
    },
    (s) => {
      s.owners[0].eligibility.owner_tin = "400001038";
    },
    (s) => {
      s.filed_forms[0].contributions[0].received_on = "2024-12-31";
    },
    (s) => {
      s.filed_forms[0].contributions[1].received_on = "2026-04-16";
    },
    (s) => {
      s.filed_forms[0].contributions.push(
        structuredClone(s.filed_forms[0].contributions[0]),
      );
    },
    (s) => {
      delete s.filed_forms[0].contributions[1].employer_payroll_reference;
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => reconcile(s));
  }
});
Deno.test("2026 HSA historical bridge rejects missing or contradictory history and mismatched cross-year receipts", () => {
  const edits: Array<(s: ReturnType<typeof annual>) => void> = [
    (s) => {
      s.testing_review.owners[0]
        .no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified =
          true;
    },
    (s) => {
      s.testing_review.owners[0].last_month_2025_history_reference = "unknown";
    },
    (s) => {
      delete s.testing_review.owners[0]
        .no_prior_qualified_funding_testing_obligations_verified;
    },
    (s) => {
      s.testing_review.prior_last_month_histories!.push(
        structuredClone(s.testing_review.prior_last_month_histories![0]),
      );
    },
    (s) => {
      s.testing_review.prior_last_month_histories![0].owners[0].eligibility
        .owner_dob = "1981-01-01";
    },
    (s) => {
      s.testing_review.prior_last_month_histories![0].filed_forms[0]
        .contributions[1].custodian_transaction_identifier = "wrong-payment";
    },
  ];
  for (const edit of edits) {
    const s = annual();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2025 HSA paired family allocation conserves the historical pool and keeps fractional owner exposure", () => {
  const s = fixture(), first = s.owners[0], f = s.filed_forms[0];
  s.married_at_year_end = true;
  s.spouse_tin = "400001038";
  s.allocation = {
    record_reference: "2025-allocation",
    agreed_by_both_spouses_verified: true,
    taxpayer_share: { numerator: 1, denominator: 2 },
  };
  Object.assign(first.eligibility.plans[0], {
    coverage: C.Family,
    annual_deductible: 3300,
    annual_out_of_pocket_maximum: 16600,
  });
  f.contributions = [f.contributions[0]];
  f.contributions[0].amount = 4275;
  f.lines = {
    line2: 4275,
    line3: 8550,
    line4: 0,
    line5: 8550,
    line6: 4275,
    line7: 0,
    line8: 4275,
    line9: 0,
    line10: 0,
    line11: 0,
    line12: 4275,
    line13: 4275,
  };
  const spouse = structuredClone(first), spouseForm = structuredClone(f);
  spouse.eligibility.owner_tin = s.spouse_tin;
  spouse.eligibility.plans[0].covered_owner_tin = s.spouse_tin;
  spouse.eligibility.record_reference = "spouse-2025-eligibility";
  spouseForm.owner_tin = s.spouse_tin;
  spouseForm.form8889_source_reference = "spouse-2025-form";
  Object.assign(spouseForm.contributions[0], {
    owner_tin: s.spouse_tin,
    account_number: "spouse-hsa",
    record_reference: "spouse-personal",
    custodian_transaction_identifier: "spouse-txn",
  });
  s.owners.push(spouse);
  s.filed_forms.push(spouseForm);
  const r = reconcile(s);
  assertEquals(r.owners.map((o) => o.exact_elected_limit), [
    exact(4275, 1),
    exact(4275, 1),
  ]);
  assertEquals(r.owners.map((o) => o.exact_last_month_exposure), [
    exact(15675, 4),
    exact(15675, 4),
  ]);
  // Separate prior returns keep their actual references while sharing the
  // same historical family allocation workpaper.
  s.filed_forms[1].filed_return_reference = "spouse-separate-2025-return";
  assertEquals(
    reconcile(s).owners[1].filed_return_reference,
    "spouse-separate-2025-return",
  );
});

Deno.test("2025 HSA catch-up uses contribution-year age and preserves the partial-year baseline", () => {
  const s = fixture();
  s.owners[0].eligibility.owner_dob = "1970-01-01";
  Object.assign(s.filed_forms[0].lines, {
    line3: 5300,
    line5: 5300,
    line6: 5300,
    line8: 5300,
    line12: 4800,
  });
  const o = reconcile(s).owners[0];
  assertEquals(o.exact_monthly_limit, exact(1325, 3));
  assertEquals(o.exact_last_month_exposure, exact(11575, 3));
  const younger = fixture();
  younger.owners[0].eligibility.owner_dob = "1972-01-01";
  assertEquals(
    reconcile(younger).owners[0].exact_elected_limit,
    exact(4300, 1),
  );
});

Deno.test("2025 HSA a prior election with contributions below monthly capacity creates no recapture", () => {
  const s = fixture(), f = s.filed_forms[0];
  f.contributions = [f.contributions[0]];
  f.contributions[0].amount = 300;
  Object.assign(f.lines, {
    line2: 300,
    line9: 0,
    line11: 0,
    line12: 4300,
    line13: 300,
  });
  assertEquals(reconcile(s).owners[0].exact_last_month_exposure, exact(0, 1));
});

Deno.test("2025 HSA historical telehealth retains the earlier safe harbor for a 2024 plan year", () => {
  const s = fixture(), p = s.owners[0].eligibility.plans[0];
  p.plan_year_begins = "2024-12-01";
  p.telehealth_or_remote_care_before_deductible = true;
  assertEquals(reconcile(s).owners[0].exact_elected_limit, exact(4300, 1));
});
