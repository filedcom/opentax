import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import {
  businessEducationFixture2026,
  capitalServicesEducationFixture2026,
} from "./business-education.fixture.ts";
import { statutoryBusinessCreditGraphFixture2026 } from "./business-earned.fixture.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import { syntheticInvestmentClaim2026 } from "./investment.fixture.ts";
import { businessCareFixture2026 } from "./business-care.fixture.ts";

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
    education: r.pending.f8863.calculation_2026 as ReturnType<
      typeof calculateEducationCredit2026
    >,
  };
}
Deno.test("Business AOTC compares actual service earnings after SE deduction at the half-support boundary", () => {
  const f = businessEducationFixture2026(),
    { pending: p, education: e } = complete(f);
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 9293);
  assertEquals(e.lines?.line8, 1000);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  assertEquals(p.standard_deduction.form8615_screened_unearned_income, 0);
  assert(f.f8863.claim.refundable_review.kind === "under24_nonjoint");
  f.f8863.claim.refundable_review.support_records[0].amount = 18586.01;
  assertEquals(complete(f).education.lines?.line8, 0);
});
Deno.test("Capital-and-services earnings use the smaller of reasonable compensation and the 30% cap", () => {
  const f = capitalServicesEducationFixture2026();
  let e = complete(f).education;
  assertEquals(
    e.earned_income_workpaper?.business?.rows[0].allocated_se_deduction,
    212,
  );
  assertEquals(
    e.earned_income_workpaper?.business?.rows[0].capital_limit,
    836.4,
  );
  assertEquals(e.lines?.line8, 1000);
  const row = f.schedule_c.claim.earned_income_review!.activities[0];
  assert(row.kind === "services_and_capital");
  row.reasonable_compensation_for_owner_services = 400;
  e = complete(f).education;
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 50400);
  assertEquals(e.lines?.line8, 0);
});
Deno.test("Dependent deduction uses business net while education uses statutory gross compensation", () => {
  const f = businessEducationFixture2026(1000, 5000),
    s = statutoryBusinessCreditGraphFixture2026();
  f.schedule_c.claim.businesses = s.schedule_c.claim.businesses;
  f.schedule_c.claim.earned_income_review!.activities[0] = {
    kind: "statutory_employee",
    business_reference: "consulting",
    record_reference: "statutory-review",
  };
  const combined = { ...f, w2s: [...f.w2s, ...s.w2s] };
  assertEquals(
    complete(combined).education.earned_income_workpaper
      ?.earned_income_for_support,
    15000,
  );
  const dependent = complete({
    ...combined,
    f8863: undefined,
    general: {
      ...combined.general,
      taxpayer_can_be_claimed_as_dependent: true,
      dependents: [],
    },
  });
  assertEquals(dependent.pending.f1040.line12e_standard_or_itemized, 6450);
  assertEquals(
    dependent.pending.standard_deduction.form8615_screened_unearned_income,
    0,
  );
});
Deno.test("Service business loss reduces actual education earnings without deemed care or combat pay", () => {
  const f = businessEducationFixture2026(-4000, 10000);
  const { education: e } = complete(f);
  assertEquals(e.earned_income_workpaper?.earned_income_for_support, 6000);
  assertEquals(e.lines?.line8, 0);
});
Deno.test("Dependent business deduction includes the actual half-SE deduction and shared annual add-on", () => {
  const f = businessEducationFixture2026();
  const { pending: p } = complete({
    ...f,
    f8863: undefined,
    general: {
      ...f.general,
      taxpayer_can_be_claimed_as_dependent: true,
      dependents: [],
    },
  });
  assertEquals(p.f1040.line12e_standard_or_itemized, 9743);
  const raw = p.standard_deduction.calculation_input_2026 as Parameters<
    typeof calculateDeductionSelection2026
  >[0];
  assertThrows(
    () =>
      calculateDeductionSelection2026({
        ...raw,
        dependent_earned_income: 10000,
      }),
    Error,
    "reconcile",
  );
});
Deno.test("Business income-character review cannot be missing, duplicated or contradict statutory sources", () => {
  for (const kind of ["missing", "duplicate", "wrong", "statutory"] as const) {
    const f = businessEducationFixture2026();
    const rows = f.schedule_c.claim.earned_income_review!.activities;
    if (kind === "missing") delete f.schedule_c.claim.earned_income_review;
    if (kind === "duplicate") rows.push(rows[0]);
    if (kind === "wrong") rows[0].business_reference = "unknown";
    if (kind === "statutory") {
      rows[0] = {
        kind: "statutory_employee",
        business_reference: "consulting",
        record_reference: "wrong-kind",
      };
    }
    assert(run(f).diagnostics.length > 0);
  }
});
Deno.test("Education business review and actual filer identities must match retained sources", () => {
  const f = businessEducationFixture2026(10000, 50000, false);
  const raw = complete(f).education.source_input;
  assertThrows(
    () =>
      calculateEducationCredit2026({
        ...raw,
        claim: { ...raw.claim!, business_inventory_reference: "wrong" },
      }),
    Error,
    "inventory reference",
  );
  const changed = structuredClone(raw);
  changed.education_context.students[0].tin = "111223333";
  assertThrows(
    () => calculateEducationCredit2026(changed),
    Error,
    "return owners",
  );
});

Deno.test("Business child-tax screening excludes SE adjustments but restores losses before testing actual investment income", () => {
  for (const [profit, wages] of [[10000, 0], [-4000, 10000]]) {
    const f = businessEducationFixture2026(profit, wages);
    const investment = syntheticInvestmentClaim2026();
    investment.f1099divs = [];
    investment.f1099ints[0].box1 = 2700;
    const source = { ...f, investment_income: investment };
    assertEquals(
      complete(source).pending.standard_deduction
        .form8615_screened_unearned_income,
      2700,
    );
    investment.f1099ints[0].box1 = 2701;
    assert(
      run(source).diagnostics.some((d) =>
        d.nodeType === "standard_deduction" && d.message.includes("8615")
      ),
    );
  }
});

Deno.test("Material capital income cannot bypass the unfinished Form 8615 tax owner", () => {
  const f = capitalServicesEducationFixture2026();
  f.schedule_c.claim.businesses[0].receipts[0].amount = 5000;
  assert(
    run(f).diagnostics.some((d) =>
      d.nodeType === "standard_deduction" && d.message.includes("8615")
    ),
  );
});

Deno.test("Capital-produced child income rounds once at the Form 8615 line-1 threshold", () => {
  const f = capitalServicesEducationFixture2026();
  f.schedule_c.claim.businesses[0].receipts[0].amount = 3744;
  assertEquals(
    complete(f).pending.standard_deduction.form8615_screened_unearned_income,
    2700,
  );
  f.schedule_c.claim.businesses[0].receipts[0].amount = 3745;
  assert(
    run(f).diagnostics.some((d) =>
      d.nodeType === "standard_deduction" && d.message.includes("8615")
    ),
  );
});

Deno.test("Adult education credits do not demand an inapplicable student support review", () => {
  const f = businessEducationFixture2026(10000, 50000, false);
  delete f.schedule_c.claim.earned_income_review;
  assertEquals(complete(f).education.lines?.line8, 1000);
});

Deno.test("Business care and education credits consume tax capacity before the child-credit worksheet", () => {
  const care = businessCareFixture2026();
  const education = businessEducationFixture2026(10000, 50000, false);
  const p = complete({ ...care, f8863: education.f8863 }).pending;
  assertEquals(p.schedule3.line2_childcare_credit, 1050);
  assertEquals(p.schedule3.line3_education_credit, 1500);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  assertEquals(p.f1040.line19_child_tax_credit, 2161);
  assertEquals(p.f1040.line28_actc, 39);
});
