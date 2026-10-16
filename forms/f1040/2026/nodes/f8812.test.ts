import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { syntheticPabReview2026 } from "../inputs/investment.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { childCreditGraphFixture2026 } from "./f8812.fixture.ts";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
} from "./f8812.ts";
import { FilingStatus } from "../../nodes/types.ts";

function run(input: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
}
function complete(input: Record<string, unknown>) {
  const result = run(input);
  assertEquals(result.diagnostics, []);
  assert(result.pending.f1040.line37_amount_owed !== undefined);
  return result.pending;
}
function source(): ChildCreditInput2026 {
  return {
    ...childCreditGraphFixture2026().f8812,
    auto_qualifying_children: 1,
    auto_other_dependents: 0,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50000,
    auto_income_tax_liability: 2000,
    wage_income_from_agi: 50000,
    unsupported_earned_income_activity: false,
  };
}
Deno.test("2026 child credit completes source-derived CTC and ODC returns", () => {
  const input = childCreditGraphFixture2026();
  const p = complete(input);
  assertEquals(p.f1040.line19_child_tax_credit, 2200);
  assertEquals(p.f1040.line28_actc, 0);
  assertEquals(p.f1040.schedule8812_finalized, true);
  input.general.dependents[0].dob = "2009-06-01";
  const odc = complete(input);
  assertEquals(odc.f1040.line19_child_tax_credit, 500);
  assertEquals(odc.f1040.line28_actc, 0);
});
Deno.test("2026 ACTC uses the earned-income floor, cap and whole-dollar rounding", () => {
  assertEquals(
    complete(childCreditGraphFixture2026(10003)).f1040.line28_actc,
    1125,
  );
  assertEquals(
    complete(childCreditGraphFixture2026(10010)).f1040.line28_actc,
    1127,
  );
  assertEquals(
    complete(childCreditGraphFixture2026(15000)).f1040.line28_actc,
    1700,
  );
  assertEquals(
    complete(childCreditGraphFixture2026(2500)).f1040.line28_actc,
    0,
  );
  assertEquals(complete(childCreditGraphFixture2026(0)).f1040.line28_actc, 0);
});
Deno.test("2026 ACTC opt-out clears the refundable credit but preserves CTC", () => {
  const input = childCreditGraphFixture2026(20000);
  const original = complete(input);
  assert(Number(original.f1040.line19_child_tax_credit) > 0);
  assert(Number(original.f1040.line28_actc) > 0);
  input.f8812.do_not_claim_actc = true;
  const opted = complete(input);
  assertEquals(
    opted.f1040.line19_child_tax_credit,
    original.f1040.line19_child_tax_credit,
  );
  assertEquals(opted.f1040.line28_actc, 0);
  assertEquals(opted.f1040.line28_declines_actc, true);
});
Deno.test("2026 CTC phaseout rounds excess up and fully phased-out dependents finalize", () => {
  const original = { ...source(), auto_income_tax_liability: 10000 };
  for (
    const [agi, credit] of [[200000, 2200], [200001, 2150], [201000, 2150], [
      201001,
      2100,
    ], [244000, 0]]
  ) {
    assertEquals(
      calculateChildCredit2026({ ...original, auto_agi: agi }).lines?.line14 ??
        0,
      credit,
    );
  }
  assertEquals(
    calculateChildCredit2026({
      ...original,
      auto_filing_status: FilingStatus.MFJ,
      auto_agi: 400001,
    }).lines?.line14,
    2150,
  );
  const phased = complete(childCreditGraphFixture2026(250000));
  assertEquals(phased.f1040.line19_child_tax_credit, 0);
  assertEquals(phased.f1040.schedule8812_finalized, true);
});
Deno.test("2026 CTC includes AMT in the limit and excludes payroll taxes", () => {
  const calculated = calculateChildCredit2026({
    ...source(),
    auto_income_tax_liability: 100,
    schedule2_part1_tax: 3000,
  });
  assertEquals(calculated.lines?.line13, 3100);
  assertEquals(calculated.lines?.line14, 2200);
  const input = childCreditGraphFixture2026(20000);
  const withFica = complete({
    ...input,
    w2s: [{ ...input.w2s![0], box12_entries: [{ code: "A", amount: 1000 }] }],
  });
  assertEquals(
    withFica.f1040.line19_child_tax_credit,
    complete(input).f1040.line19_child_tax_credit,
  );
});
Deno.test("2026 ACTC includes nontaxable combat pay without adding it to AGI", () => {
  const input = childCreditGraphFixture2026(2500);
  const p = complete({
    ...input,
    w2s: [{ ...input.w2s![0], box12_entries: [{ code: "Q", amount: 10000 }] }],
  });
  assertEquals(p.f1040.line11b_agi, 2500);
  assertEquals(p.f1040.line28_actc, 1500);
});
Deno.test("2026 child-credit intake rejects asserted totals and missing reviews", () => {
  const input = childCreditGraphFixture2026();
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...input,
      f8812: { ...input.f8812, auto_qualifying_children: 9 },
    })
  );
  assert(
    run({ ...input, f8812: undefined }).diagnostics.some((d) =>
      d.nodeType === "f8812"
    ),
  );
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...source(),
        unsupported_earned_income_activity: true,
      }),
    Error,
    "worksheet owner",
  );
});
Deno.test("2026 ACTC stops when the three-child payroll method needs EIC and payroll owners", () => {
  const result = run(childCreditGraphFixture2026(10000, 3));
  assert(
    result.diagnostics.some((d) =>
      d.nodeType === "f8812" && d.message.includes("Part II-B")
    ),
  );
  assertEquals(
    complete(childCreditGraphFixture2026(50000, 3)).f1040
      .line19_child_tax_credit,
    3823,
  );
});

Deno.test("2026 graph waits for AMT before finalizing the child-credit tax limit", () => {
  const investments = investmentGraphInput2026(150000);
  Object.assign(investments.investment_income.f1099ints[0], {
    box1: 0,
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  investments.investment_income.f1099divs = [];
  const p = complete({
    ...investments,
    ...childCreditGraphFixture2026(150000),
  });
  assert(Number(p.f1040.line17_additional_taxes) > 0);
  assertEquals(p.f8812.schedule2_part1_tax, p.f1040.line17_additional_taxes);
  assertEquals(p.f1040.line19_child_tax_credit, 2200);
  const c = p.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.lines?.line13, p.f1040.line18_total_tax_before_credits);
});

Deno.test("2026 ACTC rounds the earned method before deciding whether Part II-B is needed", () => {
  const base = {
    ...source(),
    auto_qualifying_children: 3,
    auto_income_tax_liability: 0,
    auto_agi: 36499,
    wage_income_from_agi: 36499,
  };
  const lines = calculateChildCredit2026(base).lines!;
  assertEquals(lines.line20, 5100);
  assertEquals(lines.needsPartIIB, false);
  assertEquals(lines.line27, 5100);
  assertThrows(
    () => calculateChildCredit2026({ ...base, wage_income_from_agi: 36496 }),
    Error,
    "Part II-B",
  );
});
