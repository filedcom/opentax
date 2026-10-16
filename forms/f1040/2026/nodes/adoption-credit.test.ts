import { adoptionAccountReview2026 } from "../inputs/adoption.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  adoptionCreditContext2026,
  adoptionSource2026,
} from "../inputs/adoption.fixture.ts";
import { childCreditGraphFixture2026 } from "./f8812.fixture.ts";
import { energyClaimFixture2026 } from "../inputs/energy.fixture.ts";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
  f8812_2026,
} from "./f8812.ts";
import { agi_2026 } from "./agi.ts";
import { schedule3_final_2026 } from "./schedule3-final.ts";
import { f1040_2026_node } from "./f1040.ts";
import { form1062TaxFixture2026 } from "../inputs/form1062-tax.fixture.ts";
import { calculateForm1062Tax2026 } from "../inputs/form1062-tax.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
function source(wages = 50000, expenses = 16000) {
  const a = adoptionSource2026();
  a.taxpayer_ssn = "123456789";
  a.wage_sources[0].employee_ssn = a.taxpayer_ssn;
  a.wage_sources[0].box1_wages = wages;
  a.wage_sources[0].box12_entries = [];
  a.claim.programs[0].owner_tin = a.taxpayer_ssn;
  a.claim.children[0].expenses[0].owner_tin = a.taxpayer_ssn;
  a.claim.children[0].expenses[0].amount = expenses;
  a.claim.children[0].current_benefits = [];
  return a;
}
function child(expenses = 16000): ChildCreditInput2026 {
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _old,
    ...review
  } = childCreditGraphFixture2026().f8812;
  const a = source(50000, expenses);
  return {
    ...review,
    taxpayer_ssn: a.taxpayer_ssn,
    auto_filing_status: FilingStatus.Single,
    auto_qualifying_children: 1,
    auto_other_dependents: 0,
    auto_agi: 50000,
    auto_income_tax_liability: 4000,
    wage_income_from_agi: 50000,
    unsupported_earned_income_activity: false,
    adoption_sources_2026: a,
    adoption_magi_additions_from_agi:
      adoptionCreditContext2026().magi_additions,
    adoption_inventory_reference: a.claim.record_reference,
    no_nonrefundable_credits_other_than_reviewed_sources: true,
  };
}
function withEnergy(input: ChildCreditInput2026) {
  const {
    no_nonrefundable_credits_other_than_child_dependent_care_and_education:
      _old,
    ...claim
  } = energyClaimFixture2026().claim;
  input.energy_sources_2026 = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    claim: {
      ...claim,
      adoption_inventory_reference:
        input.adoption_sources_2026!.claim.record_reference,
      no_nonrefundable_credits_other_than_reviewed_sources: true,
    },
  };
  input.energy_inventory_reference = claim.record_reference;
  return input;
}
Deno.test("2026 adoption participates in Worksheet B before final child credit without an energy claim", () => {
  const input = child(), before = structuredClone(input);
  const r = calculateChildCredit2026(input);
  assertEquals(r.credit_limit_worksheet_b?.line14, 500);
  assertEquals(r.credit_limit_worksheet_b?.line15, 3500);
  assertEquals(r.adoption_credit?.finalized_return.child_credit_priority, {
    basis: "schedule8812_worksheet_b_line14",
    amount: 500,
  });
  assertEquals(r.adoption_credit?.lines.line13, 5120);
  assertEquals(r.adoption_credit?.lines.line18a, 3500);
  assertEquals(r.adoption_credit?.lines.line18b, 7380);
  assertEquals(r.lines?.line14, 500);
  assertEquals(r.lines?.line27, 1700);
  assertEquals(input, before);
});
Deno.test("2026 adoption uses available tax before energy carryforward and combines Worksheet B line 15", () => {
  const full = calculateChildCredit2026(withEnergy(child()));
  assertEquals(full.adoption_credit?.lines.line18a, 3500);
  assertEquals(full.energy_credit?.lines.line3, 0);
  assertEquals(full.energy_credit?.lines.line4, 8000);
  const limited = calculateChildCredit2026(withEnergy(child(6000)));
  assertEquals(limited.adoption_credit?.lines.line18a, 880);
  assertEquals(limited.energy_credit?.lines.line3, 2620);
  assertEquals(limited.energy_credit?.tax_limit_worksheet.earlier_credits, 880);
  assertEquals(limited.credit_limit_worksheet_b?.line15, 3500);
  assertEquals(limited.lines?.line14, 500);
  const highTax = calculateChildCredit2026({
    ...withEnergy(child()),
    auto_income_tax_liability: 25000,
  });
  assertEquals(highTax.adoption_credit?.lines.line18a, 10880);
  assertEquals(highTax.energy_credit?.lines.line3, 8000);
  assertEquals(highTax.lines?.line14, 2200);
  assertEquals(highTax.lines?.line27, 0);
});
Deno.test("2026 adoption preserves ODC priority, no-dependent credit and refunds at zero tax", () => {
  for (
    const [children, others, tax, reserved, adoption] of [
      [0, 1, 4000, 500, 3500],
      [0, 0, 4000, 0, 4000],
      [1, 0, 0, 500, 0],
    ]
  ) {
    const r = calculateChildCredit2026({
      ...child(),
      auto_qualifying_children: children,
      auto_other_dependents: others,
      auto_income_tax_liability: tax,
    });
    assertEquals(
      r.adoption_credit?.finalized_return.child_credit_priority.amount,
      reserved,
    );
    assertEquals(r.adoption_credit?.lines.line18a, adoption);
    assertEquals(r.adoption_credit?.lines.line13, 5120);
  }
});
Deno.test("2026 adoption capacity includes preceding care, education, saver and Schedule R credits", () => {
  const r = calculateChildCredit2026({
    ...child(),
    finalized_dependent_care_credit: 200,
    finalized_education_credit: 300,
    finalized_savers_credit: 100,
    savers_inventory_reference: "saver-source",
    savers_inventory_reference_from_source: "saver-source",
    finalized_schedule_r_credit: 150,
    schedule_r_inventory_reference: "r-source",
    schedule_r_inventory_reference_from_source: "r-source",
  });
  assertEquals(r.adoption_credit?.credit_limit_worksheet.line3, 1250);
  assertEquals(r.adoption_credit?.lines.line18a, 2750);
  assertEquals(r.lines?.line14, 500);
});
Deno.test("2026 internal adoption AGI and credit outputs reconcile Schedule 3 and refundable Form 1040", () => {
  const input = child();
  const agi = agi_2026.compute(ctx, {
    filing_status: FilingStatus.Single,
    line1a_wages: 50000,
    adoption_sources_2026: input.adoption_sources_2026,
  }).outputs;
  const fields = (rows: typeof agi, node: string): Record<string, unknown> =>
    Object.assign(
      {},
      ...rows.filter((o) => o.nodeType === node).map((o) => o.fields),
    );
  const upstream = fields(agi, "f8812");
  assertEquals(upstream.adoption_sources_2026, input.adoption_sources_2026);
  const credit = f8812_2026.compute(ctx, { ...input, ...upstream }).outputs;
  const schedule =
    schedule3_final_2026.compute(ctx, fields(credit, "schedule3_final"))
      .outputs;
  const result = f1040_2026_node.compute(ctx, {
    filing_status: FilingStatus.Single,
    deduction_method: "standard",
    line1a_wages: 50000,
    line9_total_income: 50000,
    line16_income_tax: 4000,
    wants_federal_public_benefit: true,
    eligible_for_federal_public_benefit: true,
    ...fields(agi, "f1040"),
    ...fields(credit, "f1040"),
    ...fields(schedule, "f1040"),
  });
  const form = fields(result.outputs, "f1040");
  assertEquals(form.line20_nonrefundable_credits, 3500);
  assertEquals(form.line19_child_tax_credit, 500);
  assertEquals(form.line30_refundable_adoption, 5120);
  assertEquals(form.line28_actc, 1700);
  assertEquals(form.line24a_total_tax, 0);
  assertEquals(form.line33_total_payments, 6820);
});
Deno.test("2026 adoption and energy require matching retained inventory reviews", () => {
  const missing = child();
  delete missing.adoption_magi_additions_from_agi;
  assertThrows(() => calculateChildCredit2026(missing), Error, "AGI addbacks");
  assertThrows(
    () => calculateChildCredit2026({ ...child(), taxpayer_ssn: "400001037" }),
    Error,
    "return owners",
  );
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...child(),
        adoption_inventory_reference: "other",
      }),
    Error,
    "actual adoption inventory",
  );
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...child(),
        no_nonrefundable_credits_other_than_dependent_care_and_education: true,
      }),
    Error,
    "updated other-credit review",
  );
  const energy = withEnergy(child());
  energy.energy_sources_2026!.claim.adoption_inventory_reference = "other";
  assertThrows(
    () => calculateChildCredit2026(energy),
    Error,
    "actual adoption inventory",
  );
  const foreign = child();
  foreign.adoption_magi_additions_from_agi!.form2555_line45 = 1;
  assertThrows(
    () => calculateChildCredit2026(foreign),
    Error,
    "foreign-income worksheet owner",
  );
});
Deno.test("2026 Form 1062 replays nonrefundable adoption against hypothetical tax without subtracting its refund", () => {
  const { input } = form1062TaxFixture2026();
  const a = source(40000, 9000);
  input.child.adoption_sources_2026 = a;
  input.child.adoption_magi_additions_from_agi =
    adoptionCreditContext2026().magi_additions;
  input.review = {
    record_reference: "adoption-1062-review",
    no_other_regular_tax_additions_or_tax_methods: true,
    no_credits_other_than_reviewed_sources: true,
    adoption_inventory_reference: a.claim.record_reference,
  };
  input.return_lines.line20_nonrefundable_credits = 3880;
  input.return_lines.line30_refundable_adoption = 5120;
  const before = structuredClone(input), r = calculateForm1062Tax2026(input);
  assertEquals(r.actual.credits.child.adoption_credit?.lines.line18a, 3880);
  assertEquals(
    r.without_elected_gain.credits.child.adoption_credit?.lines.line18a,
    2503,
  );
  assertEquals(r.lines.line4b, 3880);
  assertEquals(r.lines.line12b, 2503);
  assertEquals(r.lines.line14, 1991);
  assertEquals(r.unchanged_return_facts.refundable_adoption, 5120);
  assertEquals(
    r.without_elected_gain.credits.child.adoption_credit?.lines.line13,
    5120,
  );
  assertEquals(input, before);
  input.return_lines.line30_refundable_adoption = 5121;
  assertThrows(
    () => calculateForm1062Tax2026(input),
    Error,
    "actual credits do not reconcile",
  );
  input.return_lines.line30_refundable_adoption = 5120;
  input.review.adoption_inventory_reference = "unrelated";
  assertThrows(
    () => calculateForm1062Tax2026(input),
    Error,
    "reviewed saver/adoption",
  );
  assert(r.lines.line15 > 0);
});

Deno.test("2026 adoption Worksheet B uses the three-child payroll branch before nonrefundable settlement", () => {
  const input = child();
  input.adoption_sources_2026 = source(10000);
  Object.assign(input, {
    auto_qualifying_children: 3,
    wage_income_from_agi: 10000,
    auto_income_tax_liability: 6000,
    finalized_eic: 0,
    finalized_excess_social_security: 0,
    excess_social_security_from_w2: 0,
    payroll_sources_2026: [{
      source_reference: "adoption-w2",
      social_security_withheld: 620,
      medicare_withheld: 145,
      rrta: false,
    }],
    medicare_payroll_2026: {
      wage_tax: 0,
      additional_wage_withheld: 0,
      has_rrta_or_self_employment: false,
    },
    schedule2_line16c: 0,
    schedule2_line17c: 0,
  });
  const r = calculateChildCredit2026(input);
  assertEquals(r.credit_limit_worksheet_b?.usesPayrollBranch, true);
  assertEquals(r.credit_limit_worksheet_b?.line7, 765);
  assertEquals(r.credit_limit_worksheet_b?.line14, 5475);
  assertEquals(r.adoption_credit?.lines.line18a, 525);
  assertEquals(r.lines?.line14, 5475);
  assertEquals(r.lines?.line27, 1125);
  delete input.medicare_payroll_2026;
  assertThrows(() => calculateChildCredit2026(input), Error, "finalized EIC");
});
Deno.test("2026 adoption carryforward stays nonrefundable above phaseout and expires unused oldest balances", () => {
  const input = child(), a = input.adoption_sources_2026!;
  a.claim.children = [];
  a.claim.carryforward = {
    filed_2025_return_reference: "filed-2025-adoption",
    parent_tin: a.taxpayer_ssn,
    irs_2025_account_review: adoptionAccountReview2026(),
    current_filed_2025_nonrefundable_carryforward_total: 3000,
    complete_origin_history_and_no_intervening_use_verified: true,
    origins: [2021, 2025].map((tax_year) => ({
      tax_year,
      amount: 1500,
      origin_return_reference: `origin-${tax_year}`,
      eligible_joint_return_when_married_verified: true,
    })),
  };
  input.auto_agi = 500000;
  input.auto_income_tax_liability = 1000;
  const r = calculateChildCredit2026(input);
  assertEquals(r.adoption_credit?.lines.line13, 0);
  assertEquals(r.adoption_credit?.lines.line18a, 1000);
  assertEquals(r.adoption_credit?.lines.line18b, 1500);
  assertEquals(r.adoption_credit?.carryforward_allocations[0].expired, 500);
});
Deno.test("2026 special-needs signed wages preserve the child earned-income worksheet floor", () => {
  const input = child(), a = source(10000), ch = a.claim.children[0];
  ch.special_needs = {
    record_reference: "state-special-needs",
    authority: "state",
    determined_on: "2026-06-01",
    cannot_or_should_not_return_to_birth_parents_verified: true,
    cannot_be_placed_without_assistance_verified: true,
  };
  ch.special_needs_program_reference = a.claim.programs[0].record_reference;
  ch.expenses = [];
  const outputs = agi_2026.compute(ctx, {
    filing_status: FilingStatus.Single,
    line1a_wages: 10000,
    adoption_sources_2026: a,
  }).outputs;
  const fields = Object.assign(
    {},
    ...outputs.filter((o) => o.nodeType === "f8812").map((o) => o.fields),
  );
  const r = calculateChildCredit2026({
    ...input,
    ...fields,
    auto_income_tax_liability: 0,
  });
  assertEquals(r.source_input.wage_income_from_agi, -7670);
  assertEquals(r.earned_income_worksheet?.form1040_line1z_wages, -7670);
  assertEquals(r.credit_limit_worksheet_b?.line3, 0);
  assertEquals(r.lines?.line27, 0);
  assertEquals(r.adoption_credit?.lines.line13, 5120);
});
