import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { calculateDependentCareBenefits2026 } from "./dependent-care.ts";
import {
  businessCareFixture2026,
  monthlyBusinessCareFixture2026,
} from "./business-care.fixture.ts";
import {
  jointBusinessCreditGraphFixture2026,
  statutoryBusinessCreditGraphFixture2026,
} from "./business-earned.fixture.ts";
import { wage } from "./business.fixture.ts";

const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return {
    pending: r.pending,
    care: r.pending.f2441.calculation_2026 as ReturnType<
      typeof calculateCareCredit2026
    >,
  };
}

Deno.test("Care uses source business profit less actual SE deduction before applying credit and tax limits", () => {
  const { pending: p, care: c } = complete(businessCareFixture2026());
  assertEquals(c.lines?.line4, 59293);
  assertEquals(c.lines?.line8, .35);
  assertEquals(c.lines?.line11, 1050);
  assertEquals(p.f1040.line11b_agi, 59293);
  assertEquals(p.schedule3.line2_childcare_credit, 1050);
  assertEquals(p.f1040.line20_nonrefundable_credits, 1050);
});

Deno.test("Care business losses reduce the benefit exclusion before taxable benefits reach AGI", () => {
  const { pending: p, care: c } = complete(
    businessCareFixture2026(-9000, 10000, 7500, 9000),
  );
  assertEquals(c.lines?.line18, 1000);
  assertEquals(c.lines?.line25, 1000);
  assertEquals(c.lines?.line26, 6500);
  assertEquals(c.lines?.line4, 7500);
  assertEquals(c.lines?.line29, 2000);
  assertEquals(p.f1040.line1e_taxable_dep_care, 6500);
  assertEquals(p.f1040.line11b_agi, 7500);
});

Deno.test("Care statutory gross income is counted once, without deducting statutory expenses", () => {
  const f = businessCareFixture2026();
  const s = statutoryBusinessCreditGraphFixture2026();
  const { care: c, pending: p } = complete({
    ...f,
    schedule_c: s.schedule_c,
    w2s: [...f.w2s, ...s.w2s],
  });
  assertEquals(c.lines?.line4, 60000);
  assertEquals(p.f1040.line11b_agi, 51000);
  assertEquals(c.benefit.expected_wage_income, 50000);
  assertEquals(
    c.benefit.business_earned_income_workpaper?.owners[0]
      .statutory_gross_income,
    10000,
  );
});

Deno.test("A spouse's profitable business cannot replace the other spouse's lost care earnings", () => {
  const f = businessCareFixture2026();
  const j = jointBusinessCreditGraphFixture2026();
  j.schedule_c.claim.businesses[0].expenses[0].amount = 4000;
  j.schedule_c.claim.businesses[1].receipts[0].amount = 10000;
  const { care: c } = complete({
    ...f,
    general: { ...j.general, dependents: f.general.dependents },
    schedule_c: j.schedule_c,
    eitc: { ...j.eitc, child_reviews: f.eitc.child_reviews },
    w2s: [wage("123456789", 1000), wage("987654321", 50000)],
  });
  assertEquals(c.lines?.line4, 0);
  assertEquals(c.lines?.line5, 59293);
  assertEquals(c.lines?.line11, 0);
});

Deno.test("Subthreshold care business income counts without an invented SE deduction", () => {
  const { care: c } = complete(businessCareFixture2026(432));
  assertEquals(c.lines?.line4, 50432);
  assertEquals(c.benefit.business_earned_income_workpaper?.se_deduction, 0);
});

Deno.test("Monthly care business allocation preserves student floors and separates taxable-benefit stages", () => {
  const { care: c, pending: p } = complete(monthlyBusinessCareFixture2026());
  assertEquals(c.lines?.line18, 1929);
  assertEquals(c.lines?.line25, 1929);
  assertEquals(c.lines?.line26, 71);
  assertEquals(c.lines?.line4, 2000);
  assertEquals(p.f1040.line11b_agi, 1000);
  assertEquals(
    c.benefit.earned_income_worksheets?.benefits.monthly?.[0].taxpayer_actual,
    929,
  );
  assertEquals(
    c.benefit.earned_income_worksheets?.credit.monthly?.[0].taxpayer_actual,
    1000,
  );
  assert(c.benefit.details?.student_or_disabled_deemed_income_used);
});

Deno.test("Care rejects unreconciled monthly business components, missing months and unsupported annual methods", () => {
  const source =
    complete(monthlyBusinessCareFixture2026()).care.benefit.source_input;
  for (
    const field of [
      "regular_net_profit",
      "statutory_gross_income",
      "se_deduction",
    ] as const
  ) {
    const changed = structuredClone(source);
    const review = changed.claim!.earned_income;
    assert(review.method === "monthly");
    review.taxpayer.months[0].business![field] += 1;
    assertThrows(
      () => calculateDependentCareBenefits2026(changed),
      Error,
      "disagree",
    );
  }
  const missing = structuredClone(source);
  const review = missing.claim!.earned_income;
  assert(review.method === "monthly");
  delete review.taxpayer.business_allocation_review;
  assertThrows(
    () => calculateDependentCareBenefits2026(missing),
    Error,
    "allocation review",
  );
  const missingMonth = structuredClone(source);
  const incomplete = missingMonth.claim!.earned_income;
  assert(incomplete.method === "monthly");
  delete incomplete.taxpayer.months[0].business;
  assertThrows(
    () => calculateDependentCareBenefits2026(missingMonth),
    Error,
    "all twelve months",
  );
  const annual = structuredClone(source);
  annual.claim!.earned_income = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  assertThrows(
    () => calculateDependentCareBenefits2026(annual),
    Error,
    "method must match",
  );
});

Deno.test("Care replays the same business and W-2 inventory at benefits and final AGI", () => {
  const { care: c } = complete(businessCareFixture2026());
  const agi = structuredClone(c.source_input);
  agi.business_sources_2026!.businesses[0].receipts[0].amount += 1;
  assertThrows(
    () => calculateCareCredit2026(agi),
    Error,
    "same business sources",
  );
  const wages = structuredClone(c.benefit.source_input);
  wages.wage_sources[0].box1_wages += 1;
  assertThrows(
    () => calculateDependentCareBenefits2026(wages),
    Error,
    "same issued W-2",
  );
  const ref = structuredClone(c.benefit.source_input);
  ref.claim!.business_inventory_reference = "other-inventory";
  assertThrows(
    () => calculateDependentCareBenefits2026(ref),
    Error,
    "actual business inventory",
  );
  const owner = structuredClone(c.benefit.source_input);
  owner.taxpayer_ssn = "111223333";
  assertThrows(
    () => calculateDependentCareBenefits2026(owner),
    Error,
    "return owners",
  );
});
