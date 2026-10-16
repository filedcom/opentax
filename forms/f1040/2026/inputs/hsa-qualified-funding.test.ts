import { assertEquals, assertThrows } from "@std/assert";
import {
  type HsaQualifiedFunding2026,
  reconcileHsaQualifiedFunding2026 as reconcile,
} from "./hsa-qualified-funding.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import { hsaQualifiedFunding2026 as fixture } from "./hsa-qualified-funding.fixture.ts";
import { calculateHsaCurrentContributions2026 as calculate } from "./hsa-current-contributions.ts";
import { hsaExactAmount } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { DistributionCode as D } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
function setAmount(s: HsaQualifiedFunding2026, value: number) {
  const receipt = s.claim.accounts[0].receipts[5],
    a = s.qualified_funding_review!.ira_accounts[0];
  s.claim.accounts[0].form5498sa.box2_calendar_year_contributions += value -
    receipt.amount;
  receipt.amount = value;
  a.payments[0].gross_amount = value;
  a.form1099r.box1_gross_distribution = value;
  a.form1099r.box2a_taxable_amount = value;
}
function twoTransfers() {
  const s = fixture(),
    o = s.household_eligibility.owners[0],
    a = s.qualified_funding_review!.ira_accounts[0];
  o.plans[0].effective_through = "2026-07-31";
  const family = structuredClone(o.plans[0]);
  if (family.kind !== "ordinary_health_plan") throw Error();
  Object.assign(family, {
    source_document_reference: "family-plan",
    policy_identifier: "family-policy",
    effective_from: "2026-08-01",
    effective_through: "2026-12-31",
    coverage: C.Family,
    annual_deductible: 3400,
    annual_out_of_pocket_maximum: 17000,
  });
  o.plans.push(family);
  for (const m of o.months.slice(7)) m.plan_references = ["family-plan"];
  const r = structuredClone(s.claim.accounts[0].receipts[5]);
  Object.assign(r, {
    record_reference: "second-hsa-receipt",
    custodian_transaction_identifier: "tx-second",
    received_on: "2026-08-15",
    amount: 2000,
    source_account_or_payment_reference: "second-ira-payment",
  });
  s.claim.accounts[0].receipts.push(r);
  s.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 2000;
  const p = structuredClone(a.payments[0]);
  Object.assign(p, {
    record_reference: "second-ira-payment",
    custodian_transaction_identifier: "ira-tx-2",
    paid_on: "2026-08-15",
    gross_amount: 2000,
    hsa_receipt_reference: "second-hsa-receipt",
  });
  p.transfer_election!.record_reference = "second-election";
  a.payments.push(p);
  a.form1099r.box1_gross_distribution += 2000;
  a.form1099r.box2a_taxable_amount! += 2000;
  return s;
}
Deno.test("2026 qualified HSA funding matches issued IRA and HSA sources and consumes capacity without a deduction", () => {
  const s = fixture(), before = structuredClone(s), r = calculate(s);
  assertEquals(r.qualified_funding[0].amount, hsaExactAmount(1000, 1));
  assertEquals(r.owners[0].current_contributions.filed_current_lines, {
    line2: 1500,
    line8: 4400,
    line9: 1250,
    line10: 1000,
    line11: 2250,
    line12: 2150,
    line13_before_prior_excess: 1500,
  });
  assertEquals(r.qualified_funding[0].transfers[0].testing_period, {
    starts_on: "2026-06-01",
    ends_on: "2027-06-30",
    contribution_year: 2026,
    amount: 1000,
    election_reference: "ira-election",
  });
  assertEquals(s, before);
});
Deno.test("2026 qualified HSA funding reduces personal capacity before any personal deduction", () => {
  const s = fixture();
  setAmount(s, 3000);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 150);
  assertEquals(
    r.before_withdrawals_and_prior_excess.personalExcess,
    hsaExactAmount(1350, 1),
  );
  setAmount(s, 4000);
  assertEquals(
    calculate(s).owners[0].current_contributions
      .before_withdrawals_and_prior_excess.employerExcess,
    hsaExactAmount(850, 1),
  );
});
Deno.test("2026 funding ledger permits separately retained ordinary payments but reconciles the whole IRA statement", () => {
  const s = fixture(), a = s.qualified_funding_review!.ira_accounts[0];
  a.payments.push({
    record_reference: "ordinary-payment",
    custodian_transaction_identifier: "ira-tx-ordinary",
    paid_on: "2026-09-01",
    gross_amount: 250,
    federal_withheld: 25,
  });
  a.form1099r.box1_gross_distribution = 1250;
  a.form1099r.box2a_taxable_amount = 1250;
  a.form1099r.box4_federal_withheld = 25;
  assertEquals(
    reconcile(s).qualified_funding[0].amount,
    hsaExactAmount(1000, 1),
  );
  a.payments[1].gross_amount++;
  assertThrows(() => reconcile(s), Error, "entire issued gross");
});
Deno.test("2026 HSA funding uses the self-to-family second transfer exception and retains separate testing periods", () => {
  const r = reconcile(twoTransfers()).qualified_funding[0];
  assertEquals(r.amount, hsaExactAmount(3000, 1));
  assertEquals(r.transfers.map((t) => t.testing_period.ends_on), [
    "2027-06-30",
    "2027-08-31",
  ]);
});
Deno.test("2026 HSA second transfer cannot use two self-only months or two same-month payments", () => {
  for (const date of ["2026-06-02", "2026-07-15"]) {
    const s = twoTransfers();
    s.claim.accounts[0].receipts[6].received_on = date;
    s.qualified_funding_review!.ira_accounts[0].payments[1].paid_on = date;
    assertThrows(() => reconcile(s), Error, "later family-coverage");
  }
});
Deno.test("2026 HSA funding rejects past lifetime elections and missing or repeated owner inventories", () => {
  const edits: Array<(s: HsaQualifiedFunding2026) => void> = [
    (s) => {
      s.qualified_funding_review!.owners[0].prior_qualified_transfers.push({
        tax_year: 2025,
        filed_return_reference: "2025-return",
        amount: 1,
      });
    },
    (s) => {
      s.qualified_funding_review!.owners.push(
        structuredClone(s.qualified_funding_review!.owners[0]),
      );
    },
    (s) => {
      s.qualified_funding_review!.owners[0].owner_tin = "400001038";
    },
    (s) => {
      delete s.qualified_funding_review;
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => reconcile(s));
  }
});
Deno.test("2026 HSA funding requires matching owner, trustee, account, receipt and payment amounts", () => {
  const edits: Array<(s: HsaQualifiedFunding2026) => void> = [
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].form1099r.recipient_tin =
        "400001038";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].form1099r.account_number =
        "wrong";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].trustee_tin = "999999999";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].payments[0].gross_amount++;
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].payments[0]
        .hsa_receipt_reference = "absent";
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].payments[0].federal_withheld =
        1;
    },
    (s) => {
      delete s.qualified_funding_review!.ira_accounts[0].payments[0]
        .transfer_election;
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts[0].payments.push(
        structuredClone(
          s.qualified_funding_review!.ira_accounts[0].payments[0],
        ),
      );
    },
    (s) => {
      s.qualified_funding_review!.ira_accounts.push(
        structuredClone(s.qualified_funding_review!.ira_accounts[0]),
      );
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => reconcile(s));
  }
});
Deno.test("2026 HSA funding refuses backdated designations, unsettled cross-month transfers and late elections", () => {
  for (const date of ["2025-12-31", "2026-05-31", "2026-06-02", "2027-01-01"]) {
    const s = fixture();
    s.qualified_funding_review!.ira_accounts[0].payments[0].paid_on = date;
    assertThrows(() => reconcile(s));
  }
  const s = fixture();
  s.qualified_funding_review!.ira_accounts[0].payments[0].transfer_election!
    .requested_on = "2026-06-02";
  assertThrows(() => reconcile(s));
});
Deno.test("2026 HSA funding checks actual transfer-month eligibility rather than elected December coverage", () => {
  const s = fixture();
  s.household_eligibility.owners[0].months[5].medicare.enrolled = true;
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  assertThrows(() => reconcile(s), Error, "eligibility in its transfer month");
  const t = fixture();
  setAmount(t, 4400.01);
  assertThrows(() => reconcile(t), Error, "coverage limit");
});
Deno.test("2026 HSA funding refuses a continuity claim contradicted by dated policy termination", () => {
  const s = fixture();
  s.claim.accounts[0].receipts[5].received_on = "2026-06-20";
  s.qualified_funding_review!.ira_accounts[0].payments[0].paid_on =
    "2026-06-20";
  s.household_eligibility.owners[0].plans[0].effective_through = "2026-06-10";
  for (const m of s.household_eligibility.owners[0].months.slice(6)) {
    m.plan_references = [];
  }
  assertThrows(() => reconcile(s), Error, "coverage changed");
});
Deno.test("2026 HSA funding permits non-ongoing SEP and SIMPLE plans but checks the actual employer plan year", () => {
  for (const kind of ["sep", "simple"] as const) {
    const s = fixture(),
      a = s.qualified_funding_review!.ira_accounts[0],
      r = s.claim.accounts[0].receipts[5];
    if (r.kind !== "ira_funding_transfer") throw Error();
    r.originating_ira_type = kind;
    a.ira_type = kind;
    assertThrows(() => reconcile(s), Error, "plan-year contribution inventory");
    a.employer_plan_year_review = {
      record_reference: "plan-review",
      plan_year_ends_on: "2026-12-31",
      employer_contributions_for_that_plan_year: 0,
      complete_plan_year_employer_contribution_inventory_verified: true,
    };
    assertEquals(
      reconcile(s).qualified_funding[0].amount,
      hsaExactAmount(1000, 1),
    );
    a.employer_plan_year_review.employer_contributions_for_that_plan_year = .01;
    assertThrows(() => reconcile(s), Error, "ongoing SEP or SIMPLE");
  }
});
Deno.test("2026 HSA funding accepts a sourced Roth IRA transfer without inventing annual IRA basis treatment", () => {
  const s = fixture(),
    a = s.qualified_funding_review!.ira_accounts[0],
    receipt = s.claim.accounts[0].receipts[5];
  if (receipt.kind !== "ira_funding_transfer") throw Error();
  receipt.originating_ira_type = "roth";
  a.ira_type = "roth";
  a.form1099r.box7a_distribution_codes = [D.CodeJ];
  a.form1099r.box7b_ira_sep_simple = false;
  delete a.form1099r.box2a_taxable_amount;
  const r = reconcile(s);
  assertEquals(r.qualified_funding[0].amount, hsaExactAmount(1000, 1));
  assertEquals("ira_taxable_income" in r, false);
  a.form1099r.box7a_distribution_codes = [D.CodeG];
  assertThrows(() => reconcile(s), Error, "ordinary IRA distribution");
});
Deno.test("2026 HSA funding retains correction evidence and rejects an obsolete or unrelated statement", () => {
  const s = fixture(), a = s.qualified_funding_review!.ira_accounts[0];
  a.form1099r.corrected = true;
  assertThrows(() => reconcile(s), Error, "correction evidence");
  a.form1099r.supersedes_document_reference = "old-copy";
  assertEquals(reconcile(s).qualified_funding.length, 1);
  a.form1099r.source_document_reference = "unlinked-copy";
  assertThrows(() => reconcile(s), Error, "actual owner receipt");
});
Deno.test("2026 HSA last-month and qualified funding exposures stay separate and cap last-month exposure at cash contributions", () => {
  const s = fixture();
  // Eligibility begins in December; the full-year election is sourced.
  const o = s.household_eligibility.owners[0];
  o.plans[0].effective_from = "2026-12-01";
  for (const m of o.months.slice(0, 11)) m.plan_references = [];
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  s.claim.accounts[0].receipts[5].received_on = "2026-12-15";
  s.qualified_funding_review!.ira_accounts[0].payments[0].paid_on =
    "2026-12-15";
  const r = calculate(s), c = r.owners[0].current_contributions;
  assertEquals(c.exact_qualified_funding, hsaExactAmount(1000, 1));
  assertEquals(
    c.gross_contribution_last_month_exposure,
    hsaExactAmount(2750, 1),
  );
  assertEquals(
    r.qualified_funding[0].transfers[0].testing_period.ends_on,
    "2027-12-31",
  );
  assertEquals(
    c.monthly_baseline_before_withdrawals_and_prior_excess
      .currentPersonalDeduction,
    hsaExactAmount(0, 1),
  );
});

Deno.test("2026 HSA funding detects a renamed duplicate custodian transaction across two claimed transfers", () => {
  const s = twoTransfers(), a = s.qualified_funding_review!.ira_accounts[0];
  a.payments[1].custodian_transaction_identifier =
    a.payments[0].custodian_transaction_identifier;
  assertThrows(() => reconcile(s), Error, "repeats a custodian transaction");
});
Deno.test("2026 HSA two-transfer exception cannot exceed the combined family maximum", () => {
  const s = twoTransfers(), a = s.qualified_funding_review!.ira_accounts[0];
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  setAmount(s, 4400);
  s.claim.accounts[0].receipts[6].amount = 4350;
  s.claim.accounts[0].form5498sa.box2_calendar_year_contributions = 11250;
  a.payments[1].gross_amount = 4350;
  a.form1099r.box1_gross_distribution = 8750;
  a.form1099r.box2a_taxable_amount = 8750;
  assertEquals(
    reconcile(s).qualified_funding[0].amount,
    hsaExactAmount(8750, 1),
  );
  s.claim.accounts[0].receipts[6].amount += .01;
  s.claim.accounts[0].form5498sa.box2_calendar_year_contributions += .01;
  a.payments[1].gross_amount += .01;
  a.form1099r.box1_gross_distribution += .01;
  a.form1099r.box2a_taxable_amount += .01;
  assertThrows(
    () => reconcile(s),
    Error,
    "exceeds its eligible contribution limit",
  );
});
Deno.test("2026 HSA qualified funding preserves cents through line 10 and checks the owner's exact annual capacity", () => {
  const s = fixture();
  setAmount(s, 1000.49);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.exact_qualified_funding, hsaExactAmount(100049, 100));
  assertEquals(r.filed_current_lines.line10, 1000);
  assertEquals(
    r.before_withdrawals_and_prior_excess.remainingPersonalLimit,
    hsaExactAmount(214951, 100),
  );
  const o = s.household_eligibility.owners[0];
  o.plans[0].effective_from = "2026-06-01";
  for (const m of o.months.slice(0, 5)) m.plan_references = [];
  setAmount(s, 3000);
  assertThrows(
    () => reconcile(s),
    Error,
    "separate annual-limit reconciliation",
  );
});

Deno.test("2026 HSA qualified transfers keep spouses' lifetime records, receipts and annual shares separate", () => {
  const initial = fixture(), joint = hsaLimits2026(true);
  const s: HsaQualifiedFunding2026 = {
    ...joint,
    qualified_funding_review: initial.qualified_funding_review,
  };
  const r = structuredClone(initial.claim.accounts[0].receipts[5]);
  s.claim.accounts[0].receipts.push(r);
  s.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 1000;
  if (r.kind !== "ira_funding_transfer") throw Error();
  s.claim.accounts[1].receipts.push({
    ...r,
    record_reference: "spouse-hsa-receipt",
    custodian_transaction_identifier: "spouse-hsa-tx",
    originating_owner_tin: s.spouse_ssn!,
    ira_distribution_source_reference: "spouse-ira-copy",
    source_account_or_payment_reference: "spouse-ira-payment",
  });
  s.claim.accounts[1].form5498sa.box2_calendar_year_contributions = 1000;
  const review = s.qualified_funding_review!;
  review.owners.push({
    ...review.owners[0],
    owner_tin: s.spouse_ssn!,
    lifetime_history_reference: "spouse-lifetime",
  });
  const a = structuredClone(review.ira_accounts[0]);
  a.record_reference = "spouse-ira-account";
  a.owner_tin = s.spouse_ssn!;
  a.account_number = "spouse-ira";
  Object.assign(a.form1099r, {
    source_document_reference: "spouse-ira-copy",
    statement_identifier: "spouse-ira-copy",
    recipient: "spouse",
    recipient_tin: s.spouse_ssn!,
    account_number: a.account_number,
  });
  Object.assign(a.payments[0], {
    record_reference: "spouse-ira-payment",
    hsa_receipt_reference: "spouse-hsa-receipt",
  });
  a.payments[0].transfer_election!.record_reference = "spouse-election";
  review.ira_accounts.push(a);
  const computed = calculate(s);
  assertEquals(computed.qualified_funding.map((o) => o.owner_tin), [
    s.taxpayer_ssn,
    s.spouse_ssn!,
  ]);
  assertEquals(
    computed.owners.map((o) =>
      o.current_contributions.filed_current_lines.line10
    ),
    [1000, 1000],
  );
  s.limit_review.allocation!.taxpayer_share = { numerator: 1, denominator: 10 };
  assertThrows(() => reconcile(s), Error, "current owner allocation");
});
Deno.test("2026 HSA qualified funding adds only the source owner's age-55 catch-up", () => {
  const s = fixture();
  s.household_eligibility.owners[0].owner_dob = "1972-01-01";
  setAmount(s, 5400);
  assertEquals(
    calculate(s).owners[0].current_contributions.filed_current_lines.line10,
    5400,
  );
  s.household_eligibility.owners[0].owner_dob = "1972-01-02";
  assertThrows(() => reconcile(s), Error, "coverage limit");
});
Deno.test("2026 HSA funding alone creates no last-month cash exposure", () => {
  const s = fixture(),
    o = s.household_eligibility.owners[0],
    a = s.claim.accounts[0];
  o.plans[0].effective_from = "2026-06-01";
  for (const m of o.months.slice(0, 5)) m.plan_references = [];
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  a.receipts = a.receipts.filter((r) => r.kind === "ira_funding_transfer");
  a.form5498sa.box2_calendar_year_contributions = 1000;
  a.form5498sa.box3_following_year_contributions_for_2026 = 0;
  s.wage_sources[0].box12_entries = [];
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.gross_contribution_last_month_exposure, hsaExactAmount(0, 1));
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 0);
  assertEquals(r.qualified_funding_transfers[0].testing_period.amount, 1000);
});
