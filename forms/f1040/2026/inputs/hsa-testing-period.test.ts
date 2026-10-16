import { hsaTestingPeriod2026 as fixture } from "./hsa-testing-period.fixture.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaTestingPeriod2026 as calculate,
  type HsaTestingPeriod2026,
} from "./hsa-testing-period.ts";
import { hsaExactAmount as exact } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { hsaDpc2026 } from "./hsa-eligibility.fixture.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";

function gap(s: HsaTestingPeriod2026, reachesJuly = true) {
  const e =
    s.excess_returns.contribution_sources.household_eligibility.owners[0];
  const second = structuredClone(e.plans[0]);
  e.plans[0].effective_through = "2026-06-15";
  second.source_document_reference = "renewed-plan";
  second.effective_from = reachesJuly ? "2026-07-02" : "2026-07-01";
  e.plans.push(second);
  if (reachesJuly) e.months[6].plan_references = [];
  for (const m of e.months.slice(reachesJuly ? 7 : 6)) {
    m.plan_references = [second.source_document_reference];
  }
}
function lastMonth(s: HsaTestingPeriod2026) {
  const f = s.excess_returns.contribution_sources,
    e = f.household_eligibility.owners[0];
  e.plans[0].effective_from = "2026-12-01";
  e.plans[0].effective_through = "2026-12-15";
  for (const m of e.months.slice(0, 11)) m.plan_references = [];
  f.limit_review.basis = "last_month";
  f.limit_review.last_month_testing_obligation_acknowledged = true;
}
function disability(s: HsaTestingPeriod2026, onset = "2026-06-16") {
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
}
Deno.test("2026 HSA funding testing preserves an unfinished 2027 obligation without inventing a failure", () => {
  const s = fixture(),
    before = structuredClone(s),
    r = calculate(s),
    o = r.owners[0];
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
  });
  assertEquals(o.qualified_funding_testing[0].testing.status, "pending_2027");
  assertEquals(o.qualified_funding_testing[0].testing.ends_on, "2027-06-30");
  assertEquals(o.future_testing_obligations.length, 1);
  assertEquals(r.schedule1_line8f_hsa_income, 1500);
  assertEquals(o.daily_coverage_review.length, 365);
  assertEquals(s, before);
});
Deno.test("2026 HSA a plan lapse extending through the next first day triggers funding recapture", () => {
  const s = fixture();
  gap(s);
  const r = calculate(s), o = r.owners[0];
  assertEquals(
    o.qualified_funding_testing[0].testing.first_ineligible_on,
    "2026-07-01",
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
  // Recapture does not reclassify the transfer as a personal contribution or
  // add it a second time to the separately computed Part VII excess.
  assertEquals(o.filed_part_vii.line47, 1367);
});
Deno.test("2026 HSA sourced Medicare enrollment identifies the first ineligible testing month", () => {
  const s = fixture(),
    owner = s.testing_review.owners[0],
    original = owner.periods[0];
  const middle = structuredClone(original);
  original.effective_through = "2026-07-31";
  Object.assign(middle, {
    record_reference: "medicare-period",
    effective_from: "2026-08-01",
    effective_through: "2026-12-31",
  });
  middle.medicare.enrolled = true;
  middle.medicare.source_document_reference = "actual-medicare-enrollment";
  owner.periods.push(middle);
  for (
    const m of s.excess_returns.contribution_sources.household_eligibility
      .owners[0].months.slice(7)
  ) m.medicare = structuredClone(middle.medicare);
  const o = calculate(s).owners[0];
  assertEquals(
    o.qualified_funding_testing[0].testing.first_ineligible_on,
    "2026-08-01",
  );
  assertEquals(
    o.qualified_funding_testing[0].testing.disqualification_reasons,
    ["medicare"],
  );
  assertEquals(o.filed_part_iii.line19, 1000);
});
Deno.test("2026 HSA sourced disability-caused coverage loss excepts testing income and tax", () => {
  const s = fixture();
  gap(s);
  disability(s);
  const o = calculate(s).owners[0];
  assertEquals(
    o.qualified_funding_testing[0].testing.status,
    "excepted_disability",
  );
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
  });
  assertEquals(o.future_testing_obligations, []);
});
Deno.test("2026 HSA disability arising after an ordinary lapse does not erase the earlier failure", () => {
  const s = fixture();
  gap(s);
  disability(s, "2026-06-20");
  const o = calculate(s).owners[0];
  assertEquals(o.qualified_funding_testing[0].testing.status, "failed");
  assertEquals(o.filed_part_iii.line19, 1000);
});
Deno.test("2026 HSA a December lapse after the first day retains the next-year last-month obligation", () => {
  const s = fixture(false);
  lastMonth(s);
  const r = calculate(s), o = r.owners[0];
  assertEquals(o.last_month_testing!.first_ineligible_on, undefined);
  assertEquals(o.last_month_testing!.exact_exposure, exact(12100, 3));
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
  });
  assertEquals(o.filed_part_vii.line47, 0);
  assertEquals(r.schedule1_line8f_hsa_income, 1500);
});
Deno.test("2026 HSA December eligibility retained through year-end carries the next-year testing record", () => {
  const s = fixture(false);
  lastMonth(s);
  s.excess_returns.contribution_sources.household_eligibility.owners[0].plans[0]
    .effective_through = "2026-12-31";
  const o = calculate(s).owners[0];
  assertEquals(o.last_month_testing!.status, "pending_2027");
  assertEquals(o.filed_part_iii.line18, 0);
  assertEquals(o.future_testing_obligations.length, 1);
});
Deno.test("2026 HSA testing rejects gaps overlaps stale reviews owner mismatch and contrary monthly sources", () => {
  const edits: Array<(s: HsaTestingPeriod2026) => void> = [
    (s) => {
      s.testing_review.reviewed_on = "2027-05-30";
    },
    (s) => {
      s.testing_review.owners[0].owner_tin = "400001038";
    },
    (s) => {
      s.testing_review.owners.push(structuredClone(s.testing_review.owners[0]));
    },
    (s) => {
      s.testing_review.owners[0].periods[0].effective_from = "2026-01-02";
    },
    (s) => {
      s.testing_review.owners[0].periods[0].effective_through = "2026-12-30";
    },
    (s) => {
      s.testing_review.owners[0].periods.push(
        structuredClone(s.testing_review.owners[0].periods[0]),
      );
    },
    (s) => {
      s.testing_review.owners[0].periods[0].medicare.enrolled = true;
    },
    (s) => {
      s.testing_review.owners[0].periods[0].other_coverage.disposition =
        "permitted_only";
    },
    (s) => {
      disability(s);
    },
    (s) => {
      gap(s);
      disability(s);
      const c = s.testing_review.owners[0].failure_cause;
      if (c.kind === "disability") {
        c.physician_record_reference = "wrong-physician";
      }
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => calculate(s));
  }
});

Deno.test("2026 HSA separate December obligations exclude retained excess from allowed cash exposure", () => {
  const s = fixture();
  lastMonth(s);
  const f = s.excess_returns.contribution_sources;
  f.claim.accounts[0].receipts.at(-1)!.received_on = "2026-12-01";
  f.qualified_funding_review!.ira_accounts[0].payments[0].paid_on =
    "2026-12-01";
  const o = calculate(s).owners[0];
  assertEquals(o.filed_part_vii.line47, 1000);
  assertEquals(o.last_month_testing!.exact_exposure, exact(3400, 1));
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
  });
});

Deno.test("2026 HSA direct-care disqualification uses the same fee and first-day classification", () => {
  const s = fixture(), dpc = hsaDpc2026();
  Object.assign(dpc, {
    effective_from: "2026-07-15",
    effective_through: "2026-08-20",
    fixed_periodic_fee: 151,
    billing_period_months: 1,
  });
  s.excess_returns.contribution_sources.household_eligibility.owners[0]
    .direct_primary_care_arrangements.push(dpc);
  s.excess_returns.contribution_sources.household_eligibility.owners[0]
    .months[7].direct_primary_care_references = [dpc.source_document_reference];
  const o = calculate(s).owners[0];
  assertEquals(
    o.qualified_funding_testing[0].testing.first_ineligible_on,
    "2026-08-01",
  );
  assertEquals(
    o.qualified_funding_testing[0].testing.disqualification_reasons,
    ["direct_primary_care"],
  );
  assertEquals(o.filed_part_iii.line19, 1000);
});

Deno.test("2026 HSA second qualified funding transfer has its own period after an earlier lapse", () => {
  const s = fixture();
  gap(s);
  const f = s.excess_returns.contribution_sources,
    e = f.household_eligibility.owners[0];
  e.plans[1].effective_through = "2026-07-31";
  const family = structuredClone(e.plans[1]);
  if (family.kind !== "ordinary_health_plan") throw Error();
  Object.assign(family, {
    source_document_reference: "family-plan",
    policy_identifier: "family-policy",
    effective_from: "2026-08-01",
    effective_through: "2026-12-31",
    coverage: CoverageType.Family,
    annual_deductible: 3400,
    annual_out_of_pocket_maximum: 17000,
  });
  e.plans.push(family);
  for (const m of e.months.slice(7)) {
    m.plan_references = [family.source_document_reference];
  }
  const r = structuredClone(f.claim.accounts[0].receipts.at(-1)!);
  Object.assign(r, {
    record_reference: "second-hsa-receipt",
    custodian_transaction_identifier: "second-hsa-transaction",
    received_on: "2026-08-15",
    amount: 2000,
    source_account_or_payment_reference: "second-ira-payment",
  });
  f.claim.accounts[0].receipts.push(r);
  f.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 2000;
  const account = f.qualified_funding_review!.ira_accounts[0],
    p = structuredClone(account.payments[0]);
  Object.assign(p, {
    record_reference: "second-ira-payment",
    custodian_transaction_identifier: "second-ira-transaction",
    paid_on: "2026-08-15",
    gross_amount: 2000,
    hsa_receipt_reference: "second-hsa-receipt",
  });
  p.transfer_election!.record_reference = "second-election";
  account.payments.push(p);
  account.form1099r.box1_gross_distribution += 2000;
  account.form1099r.box2a_taxable_amount! += 2000;
  const o = calculate(s).owners[0];
  assertEquals(
    o.qualified_funding_testing.map((
      t,
    ) => [t.testing.status, t.testing.ends_on]),
    [["failed", "2027-06-30"], ["pending_2027", "2027-08-31"]],
  );
  assertEquals(o.filed_part_iii.line19, 1000);
  assertEquals(o.future_testing_obligations.length, 1);
});

Deno.test("2026 HSA temporary plan lapse between eligible first days does not invent testing income", () => {
  const s = fixture();
  gap(s, false);
  const o = calculate(s).owners[0];
  assertEquals(o.qualified_funding_testing[0].testing.status, "pending_2027");
  assertEquals(
    o.qualified_funding_testing[0].testing.first_ineligible_on,
    undefined,
  );
  assertEquals(o.filed_part_iii, {
    line18: 0,
    line19: 0,
    line20: 0,
    line21: 0,
  });
  assertEquals(
    o.daily_coverage_review.find((d) => d.day === "2026-06-16")!
      .eligible_coverage,
    null,
  );
  assertEquals(
    o.testing_months.every((m) => m.eligible_coverage !== null),
    true,
  );
});
