import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  businessChildFixture2026,
  capitalBusinessChildFixture2026,
} from "./business-child.fixture.ts";
import { resolveChildTax2026 } from "./child-tax.ts";
import { businessEducationFixture2026 } from "./business-education.fixture.ts";
import type { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import { statutoryBusinessCreditGraphFixture2026 } from "./business-earned.fixture.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    child: r.pending.f8615.calculation_2026 as ReturnType<
      typeof resolveChildTax2026
    >,
  };
}
Deno.test("Business child tax separates gross support earnings, line-1 business net and dependent net after SE", () => {
  const f = businessChildFixture2026(20000, 10000);
  const { p, child } = complete(f);
  assertEquals(child.eligibility?.earned_income_for_support, 20000);
  assertEquals(child.eligibility?.line1_unearned_income, 5000);
  assertEquals(
    child.eligibility?.business_workpaper?.earned_income_for_line1,
    10000,
  );
  assertEquals(p.f1040.line11b_agi, 14293);
  assertEquals(p.f1040.line12e_standard_or_itemized, 9743);
  assertEquals(p.form8615.line1_child_unearned_income, 5000);
  assertEquals(p.form6251.regular_tax, p.f1040.line16_income_tax);
  assertEquals(p.f8863.regular_tax, p.f1040.line16_income_tax);
  f.general.taxpayer_dob = "2005-06-01";
  f.f8615.claim.support_records[0].amount = 39999.99;
  assertEquals(complete(f).child.eligibility?.applies, false);
  f.f8615.claim.support_records[0].amount = 40000;
  assertEquals(complete(f).child.eligibility?.applies, true);
});
Deno.test("Business losses restore unearned income with and without wages", () => {
  for (const wages of [0, 10000]) {
    const { child, p } = complete(businessChildFixture2026(1000, 5000, wages));
    assertEquals(child.eligibility?.business_workpaper?.worksheet, "alternate");
    assertEquals(child.eligibility?.business_workpaper?.loss_addback, 4000);
    assertEquals(child.eligibility?.gross_unearned_income, 5000);
    assertEquals(child.eligibility?.line1_unearned_income, 5000);
    assertEquals(p.form8615.line1_child_unearned_income, 5000);
    assertEquals(p.f1040.line11b_agi, wages + 1000);
  }
});
Deno.test("Capital business child earnings retain the actual half-SE cap and uncapped no-profit allowance", () => {
  const profit = complete(capitalBusinessChildFixture2026());
  assertEquals(profit.child.eligibility?.earned_income_for_support, 2787.9);
  assertEquals(profit.child.eligibility?.line1_unearned_income, 12212);
  const limited = complete(capitalBusinessChildFixture2026(10000, 0, 400));
  assertEquals(limited.child.eligibility?.earned_income_for_support, 400);
  assertEquals(limited.child.eligibility?.line1_unearned_income, 14600);
  for (const expenses of [1000, 2000]) {
    const { child } = complete(
      capitalBusinessChildFixture2026(1000, expenses, 400),
    );
    assertEquals(child.eligibility?.earned_income_for_support, 400);
    assertEquals(
      child.eligibility?.business_workpaper?.rows[0].child_tax_capital_limit,
      null,
    );
    assertEquals(child.eligibility?.line1_unearned_income, 4600);
  }
});
Deno.test("Zero service allowance with no earned income uses actual AGI for line 1", () => {
  const { child, p } = complete(capitalBusinessChildFixture2026(10000, 0, 0));
  assertEquals(child.eligibility?.line1_unearned_income, 14293);
  assertEquals(p.form8615.line1_child_unearned_income, 14293);
});
Deno.test("Child statutory wages are counted once through business gross and net, with no SE tax", () => {
  const f = businessChildFixture2026(),
    stat = statutoryBusinessCreditGraphFixture2026();
  f.schedule_c.claim.businesses = stat.schedule_c.claim.businesses;
  f.schedule_c.claim.earned_income_review!.activities[0] = {
    kind: "statutory_employee",
    business_reference: "consulting",
    record_reference: "statutory-record",
  };
  const { child, p } = complete({ ...f, w2s: stat.w2s });
  assertEquals(child.eligibility?.earned_income_for_support, 10000);
  assertEquals(
    child.eligibility?.business_workpaper?.earned_income_for_line1,
    1000,
  );
  assertEquals(child.eligibility?.line1_unearned_income, 5000);
  assertEquals(p.f1040.line12e_standard_or_itemized, 1450);
});
Deno.test("Child business inventory references and retained deduction sources must reconcile", () => {
  const f = businessChildFixture2026();
  const { child, p } = complete(f);
  const input = structuredClone(child.source_input);
  input.claim!.business_inventory_reference = "wrong";
  assertThrows(() => resolveChildTax2026(input), Error, "business inventory");
  delete input.claim!.business_inventory_reference;
  assertThrows(() => resolveChildTax2026(input), Error, "business inventory");
  delete f.schedule_c.claim.earned_income_review;
  assert(
    run(f).diagnostics.some((d) => d.message.includes("income-character")),
  );
  const deduction = structuredClone(
    p.standard_deduction.calculation_input_2026,
  ) as Parameters<typeof calculateDeductionSelection2026>[0];
  deduction.child_tax_source_2026!.business_sources_2026!.businesses[0]
    .receipts[0].amount += 1;
  assertThrows(
    () => calculateDeductionSelection2026(deduction),
    Error,
    "reconcile",
  );
});
Deno.test("Education and child tax share source facts while retaining distinct service-income tests", () => {
  const f = businessChildFixture2026(10000, 0, 0, 5000),
    e = businessEducationFixture2026();
  f.general.taxpayer_dob = "2005-06-01";
  f.general.taxpayer_can_be_claimed_as_dependent = false;
  f.f8615.claim.support_records[0].amount = 19000;
  e.f8863.claim.business_inventory_reference =
    f.schedule_c.claim.record_reference;
  assert(e.f8863.claim.refundable_review.kind === "under24_nonjoint");
  e.f8863.claim.refundable_review.support_records[0].amount = 19000;
  const { child, p } = complete({ ...f, f8863: e.f8863 });
  assertEquals(child.eligibility?.earned_income_for_support, 10000);
  assertEquals(child.eligibility?.applies, false);
  const education = p.f8863.calculation_2026 as ReturnType<
    typeof calculateEducationCredit2026
  >;
  assertEquals(
    education.earned_income_workpaper?.earned_income_for_support,
    9293,
  );
  assertEquals(education.lines?.line8, 0);
});
Deno.test("Business source filing evidence includes gross receipts and the actual SE requirement", () => {
  const nondependent = businessChildFixture2026(20000, 19000);
  nondependent.general.taxpayer_can_be_claimed_as_dependent = false;
  const n = complete(nondependent).child.eligibility!;
  assertEquals(n.gross_income_for_filing, 25000);
  assertEquals(n.filing_required_proven, true);
  assertEquals(n.applies, true);
  const blind = businessChildFixture2026(1000, 0, 0, 2800);
  blind.general.taxpayer_blind = true;
  const b = complete(blind).child.eligibility!;
  assertEquals(b.business_workpaper?.self_employment_filing_required, true);
  assertEquals(b.applies, true);
});
Deno.test("Business alternate worksheet retains multiple activity losses, positive services and a savings penalty", () => {
  const f = businessChildFixture2026(10000, 0, 0, 5000);
  const loss = structuredClone(f.schedule_c.claim.businesses[0]);
  loss.business_reference = "loss-business";
  loss.receipts = [];
  loss.expenses = [{
    record_reference: "loss-expense",
    date: "2026-10-01",
    amount: 4000,
    description: "Advertising",
    category: "advertising",
  }];
  f.schedule_c.claim.businesses.push(loss);
  f.schedule_c.claim.qbi_review.businesses.push({
    ...f.schedule_c.claim.qbi_review.businesses[0],
    business_reference: loss.business_reference,
  });
  f.schedule_c.claim.earned_income_review!.activities.push({
    kind: "owner_services_only",
    business_reference: loss.business_reference,
    record_reference: "loss-services",
    capital_not_an_income_producing_factor: true,
  });
  f.investment_income.f1099ints[0].box2 = 1000;
  const { child, p } = complete(f);
  assertEquals(child.eligibility?.business_workpaper?.schedule1_line3, 6000);
  assertEquals(child.eligibility?.business_workpaper?.loss_addback, 4000);
  assertEquals(
    child.eligibility?.business_workpaper?.earned_income_for_line1,
    10000,
  );
  assertEquals(child.eligibility?.line1_unearned_income, 4000);
  assertEquals(p.form8615.line1_child_unearned_income, 4000);
});
