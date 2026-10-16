import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { hsaQualifiedFunding2026 } from "./hsa-qualified-funding.fixture.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaMedicalDistributions2026 as calculate,
  type HsaMedicalDistributions2026,
} from "./hsa-medical-distributions.ts";
import {
  hsaExcessReturns2026 as fixture,
  moveHsaExcessReturnTo2027 as postyear,
} from "./hsa-excess-returns.fixture.ts";
import { hsaExactAmount as exact } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
function rejects(
  edits: Array<(s: HsaMedicalDistributions2026) => void>,
  employer = false,
) {
  for (const edit of edits) {
    const s = fixture(employer);
    edit(s);
    assertThrows(() => calculate(s));
  }
}
Deno.test("2026 HSA returned personal excess joins actual funding and distribution sources without a second deduction", () => {
  const s = fixture(),
    before = structuredClone(s),
    r = calculate(s),
    o = r.owners[0],
    e = o.excess_return_settlement!;
  assertEquals(o.filed_part_ii, {
    line14a: 2630,
    line14b: 630,
    line14c: 2000,
    line15: 500,
    line16: 1500,
    line17a: false,
    line17b: 300,
  });
  assertEquals(e.exact_personal_principal_returned, exact(600, 1));
  assertEquals(e.exact_current_excess_after_returns, exact(0, 1));
  assertEquals(e.excess_earnings_income_2026, 30);
  assertEquals(e.following_year_income_records, []);
  assertEquals(
    r.excess_return_sources!.contribution_sources.owners[0]
      .current_contributions.filed_current_lines.line13_before_prior_excess,
    3400,
  );
  assertEquals(s, before);
});
Deno.test("2026 HSA following-year return reduces current excess but defers gross and earnings to its actual year", () => {
  const s = fixture();
  postyear(s);
  const r = calculate(s), e = r.owners[0].excess_return_settlement!;
  assertEquals(r.owners[0].filed_part_ii.line14a, 2000);
  assertEquals([
    r.owners[0].filed_part_ii.line14b,
    e.excess_earnings_income_2026,
  ], [0, 0]);
  assertEquals(e.exact_current_excess_after_returns, exact(0, 1));
  assertEquals(e.following_year_income_records, [{
    tax_year: 2027,
    owner_tin: s.taxpayer_ssn,
    payment_reference: "postyear-payment",
    paid_on: "2027-04-15",
    gross_amount: 630,
    principal: 600,
    earnings_other_income: 30,
    source_2026_excess_review: "excess-review",
  }]);
});
Deno.test("2026 HSA partial excess returns can span both years without reusing principal", () => {
  const s = fixture(),
    review = s.excess_returns!.review,
    current = review.withdrawals[0];
  current.contribution_allocations[0].principal = 300;
  s.claim.copies[1].box1_gross_distribution = 330;
  s.claim.accounts[0].payments[2].gross_amount = 330;
  const later = structuredClone(current);
  later.record_reference = "postyear-return";
  later.payment = {
    kind: "following_year",
    trustee_payment_reference: "later-payment",
    custodian_transaction_identifier: "later-txn",
    paid_on: "2027-02-01",
    received_on: "2027-02-01",
    amount_received: 315,
    owner_receipt_reference: "later-receipt",
    gross_amount: 315,
    earnings_on_excess: 15,
    paid_to: "hsa_owner",
    current_custodian_paid_record_after_corrections_verified: true,
  };
  review.withdrawals.push(later);
  const e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals(e.exact_current_excess_after_returns, exact(0, 1));
  assertEquals([
    e.gross_excluded_distributions_2026,
    e.excess_earnings_income_2026,
    e.following_year_income_records[0].earnings_other_income,
  ], [330, 30, 15]);
});
Deno.test("2026 HSA retained excess and employer income remain distinct after a timely owner withdrawal", () => {
  const s = fixture(true), e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals([
    e.exact_retained_personal_excess,
    e.exact_retained_employer_excess,
    e.exact_employer_excess_other_income_2026,
  ], [exact(700, 1), exact(0, 1), exact(600, 1)]);
  assertEquals(e.excess_earnings_income_2026, 30);
});
Deno.test("2026 HSA employer excess already included in actual W-2 box 1 is not taxed twice", () => {
  const s = fixture(true);
  s.excess_returns!.review.owners[0].w2_inclusions = [{
    source_document_reference: "w2-issued",
    employer_ein: "123456789",
    payroll_reconciliation_reference: "employer-wage-inclusion",
    box1_wages_before_hsa_excess_inclusion: 49800,
    amount_included_for_2026_hsa_excess: 200,
    complete_box1_reconciliation_verified: true,
  }];
  const e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals(e.exact_employer_excess_already_in_wages, exact(200, 1));
  assertEquals(e.filed_employer_excess_other_income_2026, 400);
  s.excess_returns!.contribution_sources.wage_sources[0].box1_wages++;
  assertThrows(() => calculate(s), Error, "W-2 box 1");
});
Deno.test("2026 HSA excess income cannot use another employer owner or excess amount as a wage inclusion", () => {
  for (
    const patch of [{ employer_ein: "333333333" }, {
      source_document_reference: "missing",
    }, {
      amount_included_for_2026_hsa_excess: 601,
      box1_wages_before_hsa_excess_inclusion: 49399,
    }, { box1_wages_before_hsa_excess_inclusion: 49801 }]
  ) {
    const s = fixture(true);
    s.excess_returns!.review.owners[0].w2_inclusions = [{
      source_document_reference: "w2-issued",
      employer_ein: "123456789",
      payroll_reconciliation_reference: "payroll",
      box1_wages_before_hsa_excess_inclusion: 49800,
      amount_included_for_2026_hsa_excess: 200,
      complete_box1_reconciliation_verified: true,
      ...patch,
    }];
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA extends the withdrawal deadline only with the actual timely accepted extension", () => {
  const s = fixture();
  postyear(s, "2027-10-15");
  assertThrows(() => calculate(s), Error, "deadline");
  const review = s.excess_returns!.review;
  review.reviewed_on = "2027-10-31";
  review.deadline = {
    kind: "form4868",
    record_reference: "extension",
    taxpayer_tin: s.taxpayer_ssn,
    accepted_extension_reference: "accepted-4868",
    filed_on: "2027-04-15",
    accepted_on: "2027-04-15",
    return_due_on: "2027-10-15",
    valid_six_month_extension_verified: true,
  };
  assertEquals(
    calculate(s).owners[0].excess_return_settlement!
      .exact_current_excess_after_returns,
    exact(0, 1),
  );
  review.deadline.filed_on = "2027-04-16";
  assertThrows(() => calculate(s), Error, "timely accepted");
});
Deno.test("2026 HSA ordinary deadline and following-year paid-source facts are enforced exactly", () => {
  for (
    const patch of [
      { paid_on: "2027-04-16", received_on: "2027-04-16" },
      { paid_on: "2026-12-31", received_on: "2026-12-31" },
      { amount_received: 629.99 },
      { received_on: "2027-04-14" },
      { owner_receipt_reference: "postyear-payment" },
    ]
  ) {
    const s = fixture();
    postyear(s);
    Object.assign(s.excess_returns!.review.withdrawals[0].payment, patch);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 HSA return sources must share actual return accounts owner birth and complete review dates", () => {
  rejects([
    (s) => {
      s.excess_returns!.contribution_sources.taxpayer_ssn = "400001038";
    },
    (s) => {
      s.taxpayer_dob = "1981-01-01";
    },
    (s) => {
      s.claim.accounts[0].opened_on = "2020-01-02";
    },
    (s) => {
      s.claim.accounts[0].account_number = "other-account";
    },
    (s) => {
      s.excess_returns!.review.reviewed_on = "2027-04-15";
    },
    (s) => {
      s.excess_returns!.review.owners[0].owner_tin = "400001038";
    },
    (s) => {
      s.excess_returns!.review.owners.push(
        structuredClone(s.excess_returns!.review.owners[0]),
      );
    },
  ]);
});
Deno.test("2026 HSA returned principal cannot exceed the exact personal excess or use a different contribution kind", () => {
  rejects([
    (s) => {
      s.excess_returns!.review.withdrawals[0].contribution_allocations[0]
        .receipt_reference = "payroll-current";
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].contribution_kind =
        "employer_cash";
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].contribution_allocations[0]
        .principal = 600.01;
      s.claim.copies[1].box1_gross_distribution = 630.01;
      s.claim.accounts[0].payments[2].gross_amount = 630.01;
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].contribution_allocations[0]
        .principal = 599.99;
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].account_number = "wrong";
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].owner_tin = "400001038";
    },
  ]);
});
Deno.test("2026 HSA excess records cannot omit or duplicate an actual code-2 withdrawal", () => {
  rejects([
    (s) => {
      s.excess_returns!.review.withdrawals = [];
    },
    (s) => {
      const w = structuredClone(s.excess_returns!.review.withdrawals[0]);
      w.record_reference = "renamed";
      s.excess_returns!.review.withdrawals.push(w);
    },
    (s) => {
      s.excess_returns!.review.withdrawals[0].payment = {
        kind: "current_year",
        distribution_payment_reference: "june-payment",
      };
    },
    (s) => {
      s.claim.copies[1].box3_distribution_code = "1";
      s.claim.copies[1].box2_earnings_on_excess = 0;
      s.claim.accounts[0].payments[2].earnings_on_excess = 0;
    },
  ]);
});
Deno.test("2026 HSA contribution receipts cannot be returned before deposit or spent twice", () => {
  const s = fixture();
  postyear(s, "2027-04-14");
  const f = s.excess_returns!.contribution_sources,
    a = f.claim.accounts[0],
    personal = a.receipts[2];
  personal.received_on = "2027-04-15";
  a.form5498sa.box2_calendar_year_contributions -= personal.amount;
  a.form5498sa.box3_following_year_contributions_for_2026 += personal.amount;
  assertThrows(() => calculate(s), Error, "paid before withdrawal");
  const p = s.excess_returns!.review.withdrawals[0].payment;
  if (p.kind !== "following_year") throw Error();
  p.paid_on = p.received_on = "2027-04-15";
  assertEquals(
    calculate(s).owners[0].excess_return_settlement!
      .exact_current_excess_after_returns,
    exact(0, 1),
  );
  const duplicate = structuredClone(s.excess_returns!.review.withdrawals[0]);
  duplicate.record_reference = "duplicate-return";
  if (duplicate.payment.kind !== "following_year") throw Error();
  duplicate.payment.trustee_payment_reference = "renamed-payment";
  s.excess_returns!.review.withdrawals.push(duplicate);
  assertThrows(() => calculate(s), Error, "distinct actual paid");
});
Deno.test("2026 HSA returned excess cannot also reimburse medical expenses", () => {
  const s = fixture();
  s.medical_expenses[0].allocations[0].distribution_payment_reference =
    "excess-payment";
  assertThrows(() => calculate(s), Error, "qualified expenses cannot exceed");
});
Deno.test("2026 HSA excess route requires matching absence declarations", () => {
  rejects([
    (s) => {
      s.treatment_review.owners[0]
        .no_rollover_excess_return_or_mistaken_distribution_in_payments_verified =
          true;
    },
    (s) => {
      delete s.treatment_review.owners[0]
        .no_rollover_or_mistaken_distribution_in_payments_verified;
    },
    (s) => {
      delete s.excess_returns;
    },
  ]);
});
Deno.test("2026 HSA a partial return retains remaining excess rather than assuming full correction", () => {
  const s = fixture();
  s.excess_returns!.review.withdrawals[0].contribution_allocations[0]
    .principal = 200;
  s.claim.copies[1].box1_gross_distribution = 230;
  s.claim.accounts[0].payments[2].gross_amount = 230;
  const e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals(e.exact_retained_personal_excess, exact(400, 1));
});

Deno.test("2026 HSA owner excess can be returned from another owned account without crossing owners", () => {
  const s = fixture(), f = s.excess_returns!.contribution_sources;
  const fundingAccount = structuredClone(f.claim.accounts[0]);
  fundingAccount.record_reference = "second-account-review";
  fundingAccount.account_number = "second-hsa";
  fundingAccount.receipts = [];
  Object.assign(fundingAccount.form5498sa, {
    source_document_reference: "second-5498sa",
    account_number: "second-hsa",
    box2_calendar_year_contributions: 0,
    box3_following_year_contributions_for_2026: 0,
  });
  f.claim.accounts.push(fundingAccount);
  const distributionAccount = structuredClone(s.claim.accounts[0]);
  distributionAccount.record_reference = "second-distribution-account";
  distributionAccount.account_number = "second-hsa";
  distributionAccount.payments = distributionAccount.payments.filter((p) =>
    p.record_reference === "excess-payment"
  );
  s.claim.accounts[0].payments = s.claim.accounts[0].payments.filter((p) =>
    p.record_reference !== "excess-payment"
  );
  s.claim.accounts.push(distributionAccount);
  s.claim.copies[1].account_number = "second-hsa";
  s.excess_returns!.review.withdrawals[0].account_number = "second-hsa";
  assertEquals(
    calculate(s).owners[0].excess_return_settlement!
      .exact_current_excess_after_returns,
    exact(0, 1),
  );
});
Deno.test("2026 HSA owner current excess is retained when no timely withdrawal occurred", () => {
  const s = fixture(true);
  s.claim.copies.pop();
  s.claim.accounts[0].payments.pop();
  s.excess_returns!.review.withdrawals = [];
  const e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals(e.exact_current_excess_after_returns, exact(1300, 1));
  assertEquals([
    e.gross_excluded_distributions_2026,
    e.filed_employer_excess_other_income_2026,
  ], [0, 600]);
});
Deno.test("2026 HSA exact monthly fractions survive timely partial returns", () => {
  const s = fixture(), f = s.excess_returns!.contribution_sources;
  f.household_eligibility.owners[0].plans[0].effective_from = "2026-12-01";
  for (const m of f.household_eligibility.owners[0].months.slice(0, 11)) {
    m.plan_references = [];
  }
  const e = calculate(s).owners[0].excess_return_settlement!;
  // Monthly limit 4400/12; employer 1000 uses it all, so personal excess
  // is 4000 before its 600 return, with 1900/3 employer excess retained.
  assertEquals(e.exact_retained_personal_excess, exact(3400, 1));
  assertEquals(e.exact_retained_employer_excess, exact(1900, 3));
});

Deno.test("2026 HSA qualified IRA funding reduces capacity before excess-return settlement", () => {
  const s = fixture(),
    f = s.excess_returns!.contribution_sources,
    q = hsaQualifiedFunding2026();
  f.qualified_funding_review = q.qualified_funding_review;
  f.claim.accounts[0].receipts.push(q.claim.accounts[0].receipts.at(-1)!);
  f.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 1000;
  const e = calculate(s).owners[0].excess_return_settlement!;
  assertEquals(e.exact_retained_personal_excess, exact(1000, 1));
  f.qualified_funding_review!.reviewed_on = "2027-06-01";
  assertThrows(() => calculate(s), Error, "completed source/deadline reviews");
});

Deno.test("2026 HSA filed line 16 follows its zero floor when medical and returned-excess lines round up", () => {
  const s = fixture();
  s.schedule_a_medical_sources = [];
  s.claim.accounts[0].payments.splice(1, 1);
  s.claim.accounts[0].payments[0].gross_amount = .51;
  s.claim.copies[0].box1_gross_distribution = .51;
  s.claim.accounts[0].payments[1].gross_amount = .51;
  s.claim.accounts[0].payments[1].earnings_on_excess = .01;
  s.claim.copies[1].box1_gross_distribution = .51;
  s.claim.copies[1].box2_earnings_on_excess = .01;
  s.excess_returns!.review.withdrawals[0].contribution_allocations[0]
    .principal = .50;
  s.medical_expenses[0].allocations = [{
    distribution_payment_reference: "june-payment",
    amount: .51,
    reimbursement_trace_reference: "trace-1",
  }];
  const o = calculate(s).owners[0];
  assertEquals(o.taxable_distributions, 0);
  assertEquals(o.filed_part_ii, {
    line14a: 1,
    line14b: 1,
    line14c: 0,
    line15: 1,
    line16: 0,
    line17a: false,
    line17b: 0,
  });
});

Deno.test("2026 HSA joint excess settlement keeps spouses' contribution capacity and returned principal separate", () => {
  const s = fixture(),
    joint = hsaLimits2026(true),
    original = s.excess_returns!.contribution_sources;
  joint.claim.accounts[0] = original.claim.accounts[0];
  joint.wage_sources = original.wage_sources;
  s.excess_returns!.contribution_sources = joint;
  s.filing_status = joint.filing_status;
  s.spouse_ssn = joint.spouse_ssn;
  s.spouse_dob = joint.household_eligibility.owners[1].owner_dob;
  const a = structuredClone(s.claim.accounts[0]);
  a.record_reference = "spouse-distribution-account";
  a.owner_tin = s.spouse_ssn!;
  a.account_number = joint.claim.accounts[1].account_number;
  a.payments = [];
  s.claim.accounts.push(a);
  s.excess_returns!.review.owners.push({
    owner_tin: a.owner_tin,
    payroll_review_reference: "spouse-payroll",
    all_2026_w2_excess_inclusions_reviewed: true,
    w2_inclusions: [],
  });
  const treatment = structuredClone(s.treatment_review.owners[0]);
  treatment.owner_tin = a.owner_tin;
  s.treatment_review.owners.push(treatment);
  const r = calculate(s);
  assertEquals(
    r.owners.map((o) =>
      o.excess_return_settlement!.exact_current_excess_after_returns
    ),
    [exact(25, 1), exact(0, 1)],
  );
  const w = s.excess_returns!.review.withdrawals[0];
  w.owner_tin = a.owner_tin;
  w.account_number = a.account_number;
  w.payment = {
    kind: "following_year",
    trustee_payment_reference: "spouse-return",
    custodian_transaction_identifier: "spouse-txn",
    paid_on: "2027-04-15",
    received_on: "2027-04-15",
    amount_received: 630,
    owner_receipt_reference: "spouse-receipt",
    gross_amount: 630,
    earnings_on_excess: 30,
    paid_to: "hsa_owner",
    current_custodian_paid_record_after_corrections_verified: true,
  };
  assertThrows(() => calculate(s), Error, "same-kind 2026 contributions");
});
