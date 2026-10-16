import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import {
  monthlyCareCreditOnlyFixture2026,
  monthlyCareFixture2026,
} from "./dependent-care-earned.fixture.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
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
    c: r.pending.f2441.calculation_2026 as ReturnType<
      typeof calculateCareCredit2026
    >,
  };
}
Deno.test("Monthly spouse income changes care exclusion before AGI and the credit before CTC", () => {
  const { p, c } = complete(monthlyCareFixture2026());
  assertEquals(c.lines!.line18, 50000);
  assertEquals(c.lines!.line19, 1800);
  assertEquals(c.lines!.line25, 1800);
  assertEquals(c.lines!.line26, 1200);
  assertEquals(p.f1040.line11b_agi, 52000);
  assertEquals(c.lines!.line4, 51200);
  assertEquals(c.lines!.line5, 1800);
  assertEquals(c.lines!.line3, 1200);
  assertEquals(c.lines!.line11, 420);
  assertEquals(p.schedule3.line2_childcare_credit, 420);
  assertEquals(p.f8812.finalized_dependent_care_credit, 420);
  assertEquals(p.f1040.line19_child_tax_credit, 1563);
  assertEquals(p.f1040.line28_actc, 637);
  assertEquals(c.benefit.details!.student_or_disabled_deemed_income_used, true);
  assertEquals(p.f1040.line1i_combat_pay ?? 0, 0);
  assertEquals(p.f1040.line1a_wages, 50800);
});
Deno.test("Care combat elections are separate for exclusion and credit and never become an EIC election", () => {
  const base = dependentCareFixture2026(500, 1000, 3000);
  const i = {
    ...base,
    w2s: base.w2s.map((w) => ({
      ...w,
      box12_entries: [{ code: "Q" as const, amount: 5000 }],
    })),
  };
  i.form2441.claim.combat_pay_elections.credit.taxpayer = true;
  const a = complete(i);
  assertEquals(a.c.lines!.line18, 500);
  assertEquals(a.c.lines!.line25, 500);
  assertEquals(a.c.lines!.line26, 500);
  assertEquals(a.c.lines!.line4, 6000);
  assertEquals(a.c.lines!.line6, 2500);
  assertEquals(a.p.f1040.line1a_wages, 500);
  assertEquals(a.p.f1040.line11b_agi, 1000);
  assertEquals(a.p.f1040.line1i_combat_pay ?? 0, 0);
  i.form2441.claim.combat_pay_elections.benefits.taxpayer = true;
  i.form2441.claim.combat_pay_elections.credit.taxpayer = false;
  const b = complete(i);
  assertEquals(b.c.lines!.line18, 5500);
  assertEquals(b.c.lines!.line25, 1000);
  assertEquals(b.c.lines!.line26, 0);
  assertEquals(b.c.lines!.line4, 500);
  assertEquals(b.c.lines!.line6, 500);
  assertEquals(b.p.f1040.line11b_agi, 500);
});
Deno.test("Joint care assigns taxable benefits to the spouse who received them", () => {
  const i = monthlyCareFixture2026();
  i.form2441.claim.earned_income = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  i.w2s[0].box10_dep_care = 0;
  i.w2s[1].box10_dep_care = 3000;
  i.form2441.claim.benefits!.w2_box10_reviews = [{
    source_document_reference: "spouse-care-w2",
    amount_already_in_box1: 0,
  }];
  const { c, p } = complete(i);
  assertEquals(c.lines!.line25, 800);
  assertEquals(c.lines!.line26, 2200);
  assertEquals(c.lines!.line4, 50000);
  assertEquals(c.lines!.line5, 3000);
  assertEquals(p.f1040.line11b_agi, 53000);
});
Deno.test("Care monthly ledgers cannot override annual wages or move taxable benefits between spouses", () => {
  const i = monthlyCareFixture2026();
  const r = i.form2441.claim.earned_income;
  assert(r.method === "monthly");
  r.taxpayer.months[5].taxable_care_benefits = 0;
  r.spouse!.months[5].taxable_care_benefits = 1200;
  assert(
    run(i).diagnostics.some((d) =>
      JSON.stringify(d).includes("calculated benefits and owner")
    ),
  );
  r.taxpayer.months[5].taxable_care_benefits = 1200;
  r.spouse!.months[5].taxable_care_benefits = 0;
  r.spouse!.months[4].w2_wages = 1000;
  assert(
    run(i).diagnostics.some((d) => JSON.stringify(d).includes("issued W-2")),
  );
});

Deno.test("Care checkbox B only reflects deemed amounts entered on the applicable printed parts", () => {
  const { c, p } = complete(monthlyCareCreditOnlyFixture2026());
  assertEquals(c.part3, false);
  assertEquals(c.lines!.line4, 50300);
  assertEquals(
    c.benefit.earned_income_worksheets!.benefits.deemed_income_used,
    true,
  );
  assertEquals(
    c.benefit.earned_income_worksheets!.credit.deemed_income_used,
    false,
  );
  assertEquals(
    c.benefit.details!.student_or_disabled_deemed_income_used,
    false,
  );
  assertEquals(p.f1040.line11b_agi, 50000);
  assertEquals(p.f1040.line1i_combat_pay ?? 0, 0);
});

Deno.test("Joint care carryover needs an identified plan owner and mixed taxable benefits remain explicit", () => {
  const i = monthlyCareFixture2026();
  i.form2441.claim.earned_income = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  i.w2s.forEach((w) => {
    w.box10_dep_care = 0;
  });
  const b = i.form2441.claim.benefits!;
  b.w2_box10_reviews = [];
  b.carryover_used_in_2026 = 3000;
  assert(
    run(i).diagnostics.some((d) =>
      JSON.stringify(d).includes("source plan owner")
    ),
  );
  b.carryover_owner = "spouse";
  const { c } = complete(i);
  assertEquals(c.lines!.line12, 0);
  assertEquals(c.lines!.line13, 3000);
  assertEquals(c.lines!.line26, 2200);
  assertEquals(c.lines!.line5, 3000);
  b.carryover_used_in_2026 = 0;
  i.w2s.forEach((w) => {
    w.box10_dep_care = 1500;
  });
  b.w2_box10_reviews = i.w2s.map((w) => ({
    source_document_reference: w.source_document_reference,
    amount_already_in_box1: 0,
  }));
  assert(
    run(i).diagnostics.some((d) =>
      JSON.stringify(d).includes("multiple spouses")
    ),
  );
});
