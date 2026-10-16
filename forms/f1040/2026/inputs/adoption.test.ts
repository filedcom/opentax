import { adoptionAccountReview2026 } from "./adoption.fixture.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  adoptionCreditContext2026 as context,
  adoptionExclusionIncome2026 as income,
  adoptionSource2026 as fixture,
} from "./adoption.fixture.ts";
import { prepareAdoptionSources2026 as prepare } from "./adoption-source.ts";
import {
  calculateAdoptionExclusion2026 as exclude,
  settleAdoptionCredit2026 as settle,
} from "./adoption-settlement.ts";
import { FilingStatus } from "../../nodes/types.ts";
Deno.test("2026 adoption receipt ledger separates employer benefits from refundable and nonrefundable credit", () => {
  const s = fixture(),
    before = structuredClone(s),
    p = prepare(s),
    b = exclude(s, income()),
    c = settle(s, context());
  assertEquals(p.children[0].partII, {
    line2: 17670,
    line3: 0,
    line4: 17670,
    line5: 16000,
    line6: 16000,
  });
  assertEquals(
    [b.lines.line23, b.lines.line25, b.lines.line30, b.lines.line31],
    [4000, 104000, 4000, 0],
  );
  assertEquals([
    c.lines.line13,
    c.lines.line14,
    c.lines.line18a,
    c.lines.line18b,
  ], [5120, 10880, 7800, 3080]);
  assertEquals(c.carryforward_allocations[0].last_usable_year, 2031);
  assertEquals(s, before);
  const fractional = income();
  fractional.magi_additions.form2555_line45 = 0.1;
  assertThrows(() => exclude(s, fractional));
});
Deno.test("2026 adoption domestic payment timing includes prior-year prefinal expenses and defers current pending expenses", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.finalization = { kind: "not_final", status_record_reference: "pending" };
  const old = structuredClone(ch.expenses[0]);
  Object.assign(old, {
    record_reference: "expense-2025",
    receipt_reference: "invoice-2025",
    payment_reference: "paid-2025",
    incurred_on: "2025-10-01",
    paid_on: "2025-10-02",
    amount: 5000,
  });
  ch.expenses.push(old);
  const p = prepare(s).children[0];
  assertEquals(p.partII.line5, 5000);
  assertEquals(p.expense_rows.map((r) => r.credit_year), [2027, 2026]);
  if (s.claim.children[0].finalization.kind !== "not_final") throw Error();
  assertEquals(exclude(s, income()).lines.line31, 0);
});
Deno.test("2026 adoption foreign finality releases earlier expenses and keeps prior benefits out of current taxable benefits", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.origin = "foreign";
  if (ch.finalization.kind !== "final") throw Error();
  ch.finalization.foreign_finality_election_reference = "foreign-finality";
  ch.expenses[0].incurred_on = "2024-03-01";
  ch.expenses[0].paid_on = "2024-03-02";
  ch.prior_foreign_benefits = [{
    record_reference: "prior-benefits",
    paid_on: "2024-04-01",
    amount: 6000,
    expense_allocations: [{ expense_reference: "expense-1", amount: 6000 }],
    tax_year: 2024,
    filed_return_reference: "filed-2024",
    wage_statement_reference: "w2-2024",
    actual_return_owner_tin: s.taxpayer_ssn,
    benefits_previously_included_in_taxable_wages_and_not_excluded_verified:
      true,
    qualified_employer_program_verified: true,
  }];
  assertEquals(prepare(s).children[0].partII.line5, 10000);
  const r = exclude(s, income());
  assertEquals([r.lines.line23, r.lines.line30, r.lines.line31], [
    10000,
    10000,
    0,
  ]);
  assertEquals(r.prior_benefit_worksheet?.line9, 6000);
  assertEquals(r.requires_prior_benefit_recovery_reconciliation, true);
  ch.finalization = {
    kind: "not_final",
    status_record_reference: "pending-foreign",
  };
  ch.prior_foreign_benefits = [];
  assertEquals(prepare(s).children[0].partII.line6, 0);
  assertEquals(exclude(s, income()).line1f_taxable_adoption_benefits, 4000);
});
Deno.test("2026 special-needs finalization can produce full credit and a signed employer benefit exclusion", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.special_needs = {
    record_reference: "tribal-determination",
    authority: "indian_tribal_government",
    determined_on: "2026-06-01",
    cannot_or_should_not_return_to_birth_parents_verified: true,
    cannot_be_placed_without_assistance_verified: true,
  };
  ch.special_needs_program_reference = "adoption-program";
  ch.expenses = [];
  ch.current_benefits = [];
  s.wage_sources[0].box12_entries = [];
  const b = exclude(s, income()), c = settle(s, context());
  assertEquals(b.lines.line31, -17670);
  assertEquals(c.source.children[0].partII.line5, 17670);
  assertEquals([c.lines.line13, c.lines.line14], [5120, 12550]);
  delete ch.special_needs_program_reference;
  assertEquals(exclude(s, income()).lines.line31, 0);
});
Deno.test("2026 special-needs employer program is established by actual benefit payments without a duplicate election", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.special_needs = {
    record_reference: "state-determination",
    authority: "state",
    determined_on: "2026-06-01",
    cannot_or_should_not_return_to_birth_parents_verified: true,
    cannot_be_placed_without_assistance_verified: true,
  };
  assertEquals(exclude(s, income()).lines.line31, -13670);
  assertEquals(prepare(s).children[0].partIII.line24, 17670);
});
Deno.test("2026 direct employer payments bind the actual expense payment date and never become personal credit", () => {
  const s = fixture(), e = s.claim.children[0].expenses[0];
  e.amount = 4000;
  e.paid_by = "employer";
  assertThrows(() => prepare(s));
  e.paid_on = "2026-04-01";
  assertEquals(prepare(s).children[0].partII.line5, 0);
  assertEquals(exclude(s, income()).lines.line30, 4000);
});
Deno.test("2026 adoption phaseout boundaries preserve refundable credit at zero tax capacity", () => {
  const s = fixture();
  s.claim.children[0].expenses[0].amount = 25000;
  for (
    const [agi, total, refundable] of [
      [265080, 17670, 5120],
      [285080, 8835, 5120],
      [305080, 0, 0],
      [-1000, 17670, 5120],
    ]
  ) {
    const c = context();
    c.form1040_line11b_agi = agi;
    c.form1040_line18_tax_before_credits = 0;
    const r = settle(s, c);
    assertEquals([r.lines.line12, r.lines.line13, r.lines.line18a], [
      total,
      refundable,
      0,
    ]);
  }
});
Deno.test("2026 adoption carryforwards use oldest years first, expire after five years and never become refundable", () => {
  const s = fixture();
  s.claim.children = [];
  s.claim.programs = [];
  s.wage_sources = [];
  s.claim.carryforward = {
    filed_2025_return_reference: "2025-return",
    parent_tin: s.taxpayer_ssn,
    irs_2025_account_review: adoptionAccountReview2026(),
    current_filed_2025_nonrefundable_carryforward_total: 6000,
    complete_origin_history_and_no_intervening_use_verified: true,
    origins: [2021, 2023, 2025].map((tax_year) => ({
      tax_year,
      amount: 2000,
      origin_return_reference: `return-${tax_year}`,
      eligible_joint_return_when_married_verified: true,
    })),
  };
  const c = context();
  c.form1040_line11b_agi = 500000;
  c.form1040_line18_tax_before_credits = 3200;
  const r = settle(s, c);
  assertEquals([r.lines.line13, r.lines.line18a, r.lines.line18b], [
    0,
    1000,
    4000,
  ]);
  assertEquals(r.carryforward_allocations[0], {
    origin_tax_year: 2021,
    amount: 2000,
    used: 1000,
    expired: 1000,
    carryforward_2027: 0,
    last_usable_year: 2026,
  });
});
Deno.test("2026 adoption prior filed history reduces credit and exclusion maximums separately", () => {
  const s = fixture(), ch = s.claim.children[0];
  delete ch.no_prior_form8839_claim_verified;
  ch.prior_form8839 = {
    source_document_reference: "prior-8839",
    tax_year: 2025,
    parent_tin: s.taxpayer_ssn,
    child_tin: ch.identifying_number,
    latest_filed_current_copy_and_no_intervening_claim_verified: true,
    line3: 1000,
    line6: 2000,
    line20: 1000,
    line24: 2000,
  };
  const r = prepare(s).children[0];
  assertEquals([
    r.partII.line3,
    r.partII.line4,
    r.partIII.line20,
    r.partIII.line21,
  ], [3000, 14670, 3000, 14670]);
});
Deno.test("2026 adoption reimbursement and code T mismatches cannot change credit or exclusion silently", () => {
  const edits: Array<(s: ReturnType<typeof fixture>) => void> = [
    (s) => s.wage_sources[0].box12_entries![0].amount++,
    (s) =>
      s.claim.children[0].current_benefits[0].expense_allocations[0].amount++,
    (s) => s.claim.children[0].expenses[0].amount = 3000,
    (s) => s.claim.children[0].expenses[0].paid_by = "employer",
    (s) => s.claim.programs[0].owner_tin = "400001099",
    (s) =>
      s.claim.children[0].prior_foreign_benefits.push({
        record_reference: "invalid-prior",
        paid_on: "2025-04-01",
        amount: 1,
        expense_allocations: [{ expense_reference: "expense-1", amount: 1 }],
        tax_year: 2025,
        filed_return_reference: "2025",
        wage_statement_reference: "2025-w2",
        actual_return_owner_tin: s.taxpayer_ssn,
        benefits_previously_included_in_taxable_wages_and_not_excluded_verified:
          true,
        qualified_employer_program_verified: true,
      }),
    (s) => {
      delete s.claim.children[0].no_prior_form8839_claim_verified;
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => prepare(s));
  }
});
Deno.test("2026 adoption separate-return current claims need residence and household evidence but can retain carryforwards", () => {
  const s = fixture();
  s.filing_status = FilingStatus.MFS;
  assertEquals(settle(s, context()).lines.line13, 0);
  assertEquals(exclude(s, income()).line1f_taxable_adoption_benefits, 4000);
  s.claim.separate_return_review = {
    record_reference: "separate-review",
    lived_apart_since: "2026-07-01",
    annual_home_cost: 20000,
    taxpayer_paid_home_cost: 15000,
    child_residence: [{ child_reference: "child-1", days_in_home: 183 }],
  };
  assertEquals(settle(s, context()).lines.line13, 5120);
  s.claim.separate_return_review.taxpayer_paid_home_cost = 10000;
  assertThrows(() => prepare(s));
});
Deno.test("2026 adoption age eligibility uses the expense date or established disability", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.date_of_birth = "2008-02-01";
  assertThrows(() => prepare(s));
  ch.disability = {
    record_reference: "disability",
    unable_to_care_for_self_since: "2026-02-01",
    physical_or_mental_incapacity_verified: true,
  };
  assertEquals(prepare(s).children[0].partII.line5, 16000);
});
Deno.test("2026 adoption combines receipt cents before rounding a child's qualified expense line", () => {
  const s = fixture(), ch = s.claim.children[0];
  ch.current_benefits = [];
  s.wage_sources[0].box12_entries = [];
  ch.expenses[0].amount = 100.25;
  ch.expenses.push({
    ...ch.expenses[0],
    record_reference: "expense-2",
    receipt_reference: "receipt-2",
    payment_reference: "payment-2",
  });
  assertEquals(prepare(s).children[0].partII.line5, 201);
});
Deno.test("2026 adoption more than three children keep separate refundable caps and a common tax limit", () => {
  const s = fixture(), base = structuredClone(s.claim.children[0]);
  s.wage_sources = [];
  s.claim.programs = [];
  s.claim.children = [25000, 6000, 1000, 500].map((amount, i) => {
    const child = structuredClone(base);
    child.record_reference = `child-${i}`;
    child.identifying_number = `40000105${i}`;
    child.identity_document_reference = `birth-${i}`;
    if (child.finalization.kind !== "final") throw Error();
    child.finalization.decree_reference = `decree-${i}`;
    child.current_benefits = [];
    Object.assign(child.expenses[0], {
      record_reference: `expense-${i}`,
      receipt_reference: `receipt-${i}`,
      payment_reference: `payment-${i}`,
      amount,
    });
    return child;
  });
  const c = context();
  c.form1040_line18_tax_before_credits = 0;
  const r = settle(s, c);
  assertEquals(r.children.map((r) => r.line11b), [5120, 5120, 1000, 500]);
  assertEquals([r.lines.line12, r.lines.line13, r.lines.line18b], [
    25170,
    11740,
    13430,
  ]);
});
Deno.test("2026 joint adoption uses the actual spouse benefit and expense records", () => {
  const s = fixture();
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = "400001038";
  s.wage_sources[0].employee_ssn = s.spouse_ssn;
  s.claim.programs[0].owner_tin = s.spouse_ssn;
  s.claim.children[0].expenses[0].owner_tin = s.spouse_ssn;
  assertEquals(exclude(s, income()).lines.line31, 0);
  assertEquals(settle(s, context()).lines.line13, 5120);
  s.filing_status = FilingStatus.Single;
  assertThrows(() => prepare(s));
});

Deno.test("2026 adoption uses the corrected IRS 2025 carryforward and consumes expiring 2020 credit first", () => {
  const s = fixture();
  s.claim.children = [];
  s.claim.programs = [];
  s.wage_sources = [];
  s.claim.carryforward = {
    filed_2025_return_reference: "filed-2025",
    parent_tin: s.taxpayer_ssn,
    current_filed_2025_nonrefundable_carryforward_total: 6000,
    complete_origin_history_and_no_intervening_use_verified: true,
    origins: [[2021, 1000], [2025, 5000]].map(([tax_year, amount]) => ({
      tax_year,
      amount,
      origin_return_reference: `return-${tax_year}`,
      eligible_joint_return_when_married_verified: true,
    })),
    irs_2025_account_review: {
      ...adoptionAccountReview2026(),
      outcome: {
        kind: "adjusted",
        notice_reference: "IRS-adjustment-notice",
        corrected_carryforward_worksheet_reference: "corrected-2025-worksheet",
        refundable_adoption_credit_increase: 2500,
        original_form8839_line18_nonrefundable_used: 1000,
        available_2025_by_origin: [[2020, 2000], [2021, 1000], [2025, 5000]]
          .map(([tax_year, amount]) => ({
            tax_year,
            amount,
            origin_return_reference: `return-${tax_year}`,
            eligible_joint_return_when_married_verified: true,
          })),
        corrected_2026_carryforward_total: 4500,
      },
    },
  };
  const before = structuredClone(s), p = prepare(s), c = context();
  assertEquals(p.carryforward_origins.map((r) => [r.tax_year, r.amount]), [[
    2025,
    4500,
  ]]);
  assertEquals(
    p.carryforward_2025_adjustment?.original_allocations[0].expired,
    1000,
  );
  assertEquals(
    p.carryforward_2025_adjustment?.corrected_allocations[0].expired,
    0,
  );
  c.form1040_line11b_agi = 500000;
  c.form1040_line18_tax_before_credits = 4200;
  const r = settle(s, c);
  assertEquals([
    r.lines.line15,
    r.lines.line13,
    r.lines.line18a,
    r.lines.line18b,
  ], [4500, 0, 2000, 2500]);
  assertEquals(s, before);
  const review = s.claim.carryforward.irs_2025_account_review;
  if (review.outcome.kind !== "adjusted") throw Error();
  review.outcome.refundable_adoption_credit_increase = 3500;
  assertThrows(() => prepare(s), Error, "corrected carryforward worksheet");
  review.outcome.refundable_adoption_credit_increase = 2500;
  review.outcome.original_form8839_line18_nonrefundable_used = 2500;
  assertThrows(() => prepare(s), Error, "filed carryforward origins");
  review.outcome.original_form8839_line18_nonrefundable_used = 7000;
  assertThrows(() => prepare(s), Error, "cannot exceed available credit");
  review.outcome.original_form8839_line18_nonrefundable_used = 1000;
  review.reviewed_on = "2026-12-31";
  assertThrows(() => prepare(s), Error, "completed-year inventory review");
  review.reviewed_on = "2027-04-01";
  assertThrows(() => prepare(s), Error, "completed-year inventory review");
});
