import { assertEquals, assertThrows } from "@std/assert";
import { hsaFunding2025History as fixture } from "./hsa-funding-history.fixture.ts";
import {
  type HsaContribution2025History,
  reconcileHsaContribution2025History as reconcile,
} from "./hsa-testing-history.ts";
import { hsaTestingPeriod2026 } from "./hsa-testing-period.fixture.ts";
import { calculateHsaTestingPeriod2026 as calculate } from "./hsa-testing-period.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { hsaExactAmount as exact } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
function annual(failureMonth?: number) {
  const s = hsaTestingPeriod2026(false),
    h = fixture(),
    o = s.testing_review.owners[0];
  s.testing_review.prior_contribution_histories = [h];
  delete o
    .no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified;
  o.funding_2025_history_reference = h.record_reference;
  o.no_prior_last_month_testing_obligations_verified = true;
  if (failureMonth) {
    const e =
      s.excess_returns.contribution_sources.household_eligibility.owners[0];
    const resumed = structuredClone(e.plans[0]);
    e.plans[0].effective_through = new Date(Date.UTC(2026, failureMonth - 1, 0))
      .toISOString().slice(0, 10);
    resumed.effective_from = `2026-${
      String(failureMonth + 1).padStart(2, "0")
    }-01`;
    resumed.source_document_reference = "resumed-plan";
    e.plans.push(resumed);
    e.months[failureMonth - 1].plan_references = [];
    for (const m of e.months.slice(failureMonth)) {
      m.plan_references = [resumed.source_document_reference];
    }
  }
  return s;
}
function withLastMonth(s: ReturnType<typeof annual>) {
  const h = s.testing_review.prior_contribution_histories![0],
    o = s.testing_review.owners[0],
    e = h.owners[0].eligibility;
  h.last_month_rule_elected = true;
  h.election_reference = "2025-last-month-election";
  e.plans[0].effective_from = "2025-06-01";
  for (const m of e.months.slice(0, 5)) m.plan_references = [];
  o.last_month_2025_history_reference = h.record_reference;
  delete o.no_prior_last_month_testing_obligations_verified;
}
Deno.test("2025 HSA funding history reuses actual transfer sources and the prior annual limits", () => {
  const s = fixture(), before = structuredClone(s), o = reconcile(s).owners[0];
  assertEquals(o.exact_qualified_funding, exact(1000, 1));
  assertEquals(o.exact_monthly_limit, exact(4300, 1));
  assertEquals(o.exact_last_month_exposure, exact(0, 1));
  assertEquals(o.qualified_funding_transfers[0].testing_period, {
    starts_on: "2025-06-01",
    ends_on: "2026-06-30",
    contribution_year: 2025,
    amount: 1000,
    election_reference: "ira-election",
  });
  assertEquals(s, before);
});
Deno.test("2026 HSA prior funding failure uses line 19 and the 10 percent testing tax", () => {
  const r = calculate(annual(5)), o = r.owners[0];
  assertEquals(o.prior_qualified_funding_testing[0].testing.status, "failed");
  assertEquals(
    o.prior_qualified_funding_testing[0].testing.first_ineligible_on,
    "2026-05-01",
  );
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 1000,
    line20: 1000,
    line21: 100,
  });
  assertEquals(r.schedule1_line8f_hsa_income, 2500);
  assertEquals(r.schedule2_line13d_hsa_testing_tax, 100);
  assertEquals(o.future_testing_obligations, []);
});
Deno.test("2026 HSA funding testing includes its final month but excludes a later lapse", () => {
  assertEquals(calculate(annual(6)).owners[0].filed_part_iii.line19, 1000);
  for (const month of [undefined, 7]) {
    const o = calculate(annual(month)).owners[0];
    assertEquals(
      o.prior_qualified_funding_testing[0].testing.status,
      "completed",
    );
    assertEquals(o.filed_part_iii.line20, 0);
  }
});
Deno.test("2026 HSA independent cash and funding windows retain the Notice 2008-51 exposure cap", () => {
  for (const month of [5, 7]) {
    const s = annual(month);
    withLastMonth(s);
    const o = calculate(s).owners[0];
    assertEquals(o.prior_last_month_testing!.exact_exposure, exact(5375, 3));
    assertEquals(o.filed_part_iii.line18, 1792);
    assertEquals(o.filed_part_iii.line19, month === 5 ? 1000 : 0);
    assertEquals(o.filed_part_iii.line21, month === 5 ? 279 : 179);
  }
});
Deno.test("2026 HSA funding cannot be recaptured again after a sourced 2025 failure", () => {
  const s = annual(5);
  withLastMonth(s);
  const h = s.testing_review.prior_contribution_histories![0],
    e = h.owners[0].eligibility;
  const resumed = structuredClone(e.plans[0]);
  e.plans[0].effective_through = "2025-06-30";
  resumed.effective_from = "2025-08-01";
  resumed.source_document_reference = "2025-resumed";
  e.plans.push(resumed);
  e.months[6].plan_references = [];
  for (const m of e.months.slice(7)) {
    m.plan_references = [resumed.source_document_reference];
  }
  Object.assign(h.filed_forms[0].filed_part_iii!, {
    line19: 1000,
    line20: 1000,
    line21: 100,
  });
  const o = calculate(s).owners[0];
  assertEquals(
    o.prior_qualified_funding_testing[0].testing.status,
    "failed_2025",
  );
  assertEquals(
    o.prior_qualified_funding_testing[0].testing.first_ineligible_on,
    "2025-07-01",
  );
  assertEquals(o.filed_part_iii.line19, 0);
  assertEquals(o.filed_part_iii.line18, 2150);
  h.filed_forms[0].filed_part_iii!.line19 = 0;
  assertThrows(() => calculate(s), Error, "prior testing income");
});
Deno.test("2025 HSA history rejects wrong years, invented transfers, stale reviews and filed exclusions", () => {
  const edits: Array<(s: HsaContribution2025History) => void> = [
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].payments[0].paid_on =
        "2026-06-01";
    },
    (s) => {
      s.filed_forms[0].funding_receipts![0].received_on = "2026-06-01";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].form1099r
        .box1_gross_distribution = 999;
    },
    (s) => {
      s.filed_forms[0].funding_receipts![0].amount = 999;
    },
    (s) => {
      s.filed_forms[0].funding_receipts![0].owner_tin = "400001038";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].form1099r.recipient_tin =
        "400001038";
    },
    (s) => {
      s.filed_forms[0].lines.line10 = 999;
    },
    (s) => {
      s.filed_forms[0].filed_part_iii!.excluded_qualified_funding_amount = 999;
    },
    (s) => {
      s.filed_forms[0].filed_part_iii!.line21 = 100;
    },
    (s) => {
      delete s.filed_forms[0].filed_part_iii;
    },
    (s) => {
      s.qualified_funding_review!.reviewed_on = "2026-06-01";
    },
    (s) => {
      s.no_archer_msa_or_qualified_ira_funding_contributions_verified = true;
    },
    (s) => {
      s.qualified_funding_review!.owners[0].prior_qualified_transfers = [{
        tax_year: 2024,
        filed_return_reference: "earlier-election",
        amount: 500,
      }];
    },
    (s) => {
      s.filed_forms[0].funding_receipts![0].custodian_transaction_identifier =
        s.filed_forms[0].contributions[0].custodian_transaction_identifier;
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => reconcile(s));
  }
});
Deno.test("2026 HSA funding history cannot be omitted, contradicted or assigned to another owner", () => {
  const edits: Array<(s: ReturnType<typeof annual>) => void> = [
    (s) => {
      s.testing_review.owners[0].funding_2025_history_reference = "missing";
    },
    (s) => {
      s.testing_review.owners[0]
        .no_prior_qualified_funding_testing_obligations_verified = true;
    },
    (s) => {
      delete s.testing_review.owners[0]
        .no_prior_last_month_testing_obligations_verified;
    },
    (s) => {
      s.testing_review.prior_contribution_histories![0].owners[0].eligibility
        .owner_dob = "1981-01-01";
    },
    (s) => {
      s.testing_review.prior_contribution_histories!.push(
        structuredClone(s.testing_review.prior_contribution_histories![0]),
      );
    },
    (s) => {
      const o = s.testing_review.owners[0];
      delete o.funding_2025_history_reference;
      delete o.no_prior_last_month_testing_obligations_verified;
      o.no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified =
        true;
    },
  ];
  for (const edit of edits) {
    const s = annual();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA current funding cannot contradict a filed lifetime election", () => {
  const s = annual(), current = hsaTestingPeriod2026(true);
  s.excess_returns.contribution_sources =
    current.excess_returns.contribution_sources;
  assertThrows(
    () => calculate(s),
    Error,
    "already used in the filed prior year",
  );
});
Deno.test("2025 HSA funding limits do not substitute the larger 2026 limits", () => {
  const s = fixture(),
    f = s.filed_forms[0],
    q = s.qualified_funding_review!.ira_accounts[0];
  q.payments[0].gross_amount = 4400;
  q.form1099r.box1_gross_distribution = 4400;
  q.form1099r.box2a_taxable_amount = 4400;
  f.funding_receipts![0].amount = 4400;
  assertThrows(() => reconcile(s), Error, "coverage limit");
});
Deno.test("2025 HSA second transfer keeps its own later family testing window", () => {
  const s = annual(7),
    h = s.testing_review.prior_contribution_histories![0],
    e = h.owners[0].eligibility,
    f = h.filed_forms[0];
  const family = structuredClone(e.plans[0]);
  e.plans[0].effective_through = "2025-07-31";
  Object.assign(family, {
    effective_from: "2025-08-01",
    source_document_reference: "2025-family",
    coverage: C.Family,
    annual_deductible: 3300,
    annual_out_of_pocket_maximum: 16600,
  });
  e.plans.push(family);
  for (const m of e.months.slice(7)) {
    m.plan_references = [family.source_document_reference];
  }
  const q = h.qualified_funding_review!.ira_accounts[0],
    p = structuredClone(q.payments[0]);
  Object.assign(p, {
    record_reference: "second-ira-payment",
    custodian_transaction_identifier: "second-ira-txn",
    paid_on: "2025-08-01",
    gross_amount: 2000,
    hsa_receipt_reference: "second-hsa-receipt",
  });
  Object.assign(p.transfer_election!, {
    record_reference: "second-election",
    requested_on: "2025-07-28",
  });
  q.payments.push(p);
  q.form1099r.box1_gross_distribution = 3000;
  q.form1099r.box2a_taxable_amount = 3000;
  const r = structuredClone(f.funding_receipts![0]);
  Object.assign(r, {
    record_reference: "second-hsa-receipt",
    custodian_transaction_identifier: "second-hsa-txn",
    received_on: "2025-08-01",
    amount: 2000,
    source_account_or_payment_reference: "second-ira-payment",
  });
  f.funding_receipts!.push(r);
  f.contributions[0].amount = 2500;
  Object.assign(f.lines, {
    line2: 2500,
    line3: 6071,
    line5: 6071,
    line6: 6071,
    line8: 6071,
    line10: 3000,
    line11: 3500,
    line12: 2571,
    line13: 2500,
  });
  f.filed_part_iii!.excluded_qualified_funding_amount = 3000;
  const o = calculate(s).owners[0];
  assertEquals(o.prior_qualified_funding_testing.map((t) => t.testing.status), [
    "completed",
    "failed",
  ]);
  assertEquals(o.filed_part_iii.line19, 2000);
  assertEquals(o.filed_part_iii.line21, 200);
});

Deno.test("2025 HSA funding catch-up eligibility uses age in the contribution year", () => {
  const s = fixture(),
    f = s.filed_forms[0],
    q = s.qualified_funding_review!.ira_accounts[0];
  s.owners[0].eligibility.owner_dob = "1971-01-01";
  f.contributions = [f.contributions[1]];
  q.payments[0].gross_amount = 4800;
  q.form1099r.box1_gross_distribution = 4800;
  q.form1099r.box2a_taxable_amount = 4800;
  f.funding_receipts![0].amount = 4800;
  f.filed_part_iii!.excluded_qualified_funding_amount = 4800;
  Object.assign(f.lines, {
    line2: 0,
    line3: 5300,
    line5: 5300,
    line6: 5300,
    line8: 5300,
    line10: 4800,
    line11: 5300,
    line12: 0,
    line13: 0,
  });
  assertEquals(reconcile(s).owners[0].exact_qualified_funding, exact(4800, 1));
  s.owners[0].eligibility.owner_dob = "1972-01-01";
  assertThrows(() => reconcile(s), Error, "coverage limit");
});
Deno.test("2026 HSA prior funding accepts the sourced disability exception without erasing ordinary failures", () => {
  for (const onset of ["2026-05-01", "2026-05-02"]) {
    const s = annual(5);
    s.treatment_review.owners[0].disability = {
      kind: "permanent_total",
      review_reference: "disability-review",
      patient_tin: s.taxpayer_ssn,
      physician_record_reference: "physician-record",
      physician_determination_signed_on: "2026-12-20",
      disability_onset_date: onset,
      unable_to_perform_any_substantial_gainful_activity_verified: true,
      disability_caused_by_physical_or_mental_condition_verified: true,
      physician_expected_duration: "long_continued_indefinite",
      medical_evidence_covers_all_post_onset_payments_verified: true,
    };
    s.testing_review.owners[0].failure_cause = {
      kind: "disability",
      review_reference: "causal-review",
      eligibility_lost_on: onset,
      physician_record_reference: "physician-record",
      disability_caused_loss_of_eligibility_verified: true,
    };
    const o = calculate(s).owners[0];
    assertEquals(
      o.prior_qualified_funding_testing[0].testing.status,
      onset.endsWith("01") ? "excepted_disability" : "failed",
    );
    assertEquals(o.filed_part_iii.line19, onset.endsWith("01") ? 0 : 1000);
  }
});
Deno.test("2026 HSA prior funding retains source cents until the combined line 19 is filed", () => {
  for (const amount of [1000.49, 1000.50]) {
    const s = annual(5),
      h = s.testing_review.prior_contribution_histories![0],
      f = h.filed_forms[0],
      q = h.qualified_funding_review!.ira_accounts[0];
    q.payments[0].gross_amount = amount;
    q.form1099r.box1_gross_distribution = amount;
    q.form1099r.box2a_taxable_amount = amount;
    f.funding_receipts![0].amount = amount;
    f.filed_part_iii!.excluded_qualified_funding_amount = amount;
    f.contributions[0].amount = 2799;
    Object.assign(f.lines, {
      line2: 2799,
      line10: Math.round(amount),
      line11: 500 + Math.round(amount),
      line12: 3800 - Math.round(amount),
      line13: 2799,
    });
    const o = calculate(s).owners[0];
    assertEquals(o.exact_part_iii_income, exact(Math.round(amount * 100), 100));
    assertEquals(o.filed_part_iii.line19, Math.round(amount));
  }
});

Deno.test("2025 HSA non-ongoing SEP funding reviews the actual 2025 employer plan year", () => {
  const s = fixture(), q = s.qualified_funding_review!.ira_accounts[0];
  q.ira_type = "sep";
  s.filed_forms[0].funding_receipts![0].originating_ira_type = "sep";
  q.employer_plan_year_review = {
    record_reference: "2025-sep-employer-record",
    plan_year_ends_on: "2025-12-31",
    employer_contributions_for_that_plan_year: 0,
    complete_plan_year_employer_contribution_inventory_verified: true,
  };
  assertEquals(reconcile(s).owners[0].exact_qualified_funding, exact(1000, 1));
  q.employer_plan_year_review.plan_year_ends_on = "2026-12-31";
  assertThrows(() => reconcile(s), Error, "ongoing SEP");
  q.employer_plan_year_review.plan_year_ends_on = "2025-12-31";
  q.employer_plan_year_review.employer_contributions_for_that_plan_year = 1;
  assertThrows(() => reconcile(s), Error, "ongoing SEP");
});
