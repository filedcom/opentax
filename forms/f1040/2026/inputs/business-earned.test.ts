import { educationFixture2026 } from "./education.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { capitalFixture2026 } from "./capital.fixture.ts";
import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  businessCreditGraphFixture2026,
  jointBusinessCreditGraphFixture2026,
  statutoryBusinessCreditGraphFixture2026,
} from "./business-earned.fixture.ts";
import { wage } from "./business.fixture.ts";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
} from "../nodes/f8812.ts";
import { assertThrows } from "@std/assert";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("Business profits reach published EIC and ACTC after the own SE deduction", () => {
  const p = complete(businessCreditGraphFixture2026());
  assertEquals(p.f1040.line11b_agi, 9293);
  assertEquals(p.f1040.line27a_eic, 3154); // Published 2026 table: $9,250-$9,300, one child.
  assertEquals(p.f1040.line28_actc, 1019); // (9,293 - 2,500) * 15%, rounded.
  const e = p.eitc.calculation_2026 as { earned_income_for_eic: number };
  assertEquals(e.earned_income_for_eic, 9293);
  const c = p.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.earned_income_worksheet?.nonfarm_schedule_c_and_k1_net, 10000);
  assertEquals(c.earned_income_worksheet?.schedule1_line15_se_deduction, 707);
});
Deno.test("Statutory gross wages enter the credit worksheets once while expenses still reduce AGI and QBI", () => {
  const p = complete(statutoryBusinessCreditGraphFixture2026());
  assertEquals(p.f1040.line11b_agi, 1000);
  assertEquals(p.f1040.line27a_eic, 3409); // Published $10,000-$10,050 row.
  assertEquals(p.f1040.line28_actc, 1125);
  assertEquals(p.schedule2.line4_self_employment_tax, 0);
  const c = p.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(
    c.earned_income_worksheet?.schedule_c_statutory_employee_income,
    10000,
  );
  assertEquals(c.earned_income_worksheet?.nonfarm_schedule_c_and_k1_net, 0);
});
Deno.test("Business losses reduce credit wages and are not discarded at the source boundary", () => {
  const f = businessCreditGraphFixture2026(-4000);
  f.w2s = [wage()];
  const p = complete(f);
  assertEquals(p.f1040.line11b_agi, 6000);
  assertEquals(p.f1040.line27a_eic, 2049);
  assertEquals(p.f1040.line28_actc, 525);
});
Deno.test("Subthreshold regular businesses still count for credits without inventing SE tax", () => {
  const p = complete(businessCreditGraphFixture2026(432));
  assertEquals(p.schedule2.line4_self_employment_tax, 0);
  assertEquals(
    (p.eitc.calculation_2026 as { earned_income_for_eic: number })
      .earned_income_for_eic,
    432,
  );
  assert(Number(p.f1040.line27a_eic) > 0);
  assertEquals(p.f1040.line28_actc, 0);
});
Deno.test("Three-child payroll method includes half SE tax and finalized EIC", () => {
  const f = businessCreditGraphFixture2026(1000, 3);
  f.general.do_not_claim_eic = true;
  const p = complete(f),
    c = p.f8812.calculation_2026 as ReturnType<typeof calculateChildCredit2026>;
  assertEquals(c.lines?.partIIBLines?.line21, 0);
  assertEquals(c.lines?.partIIBLines?.line22, 71);
  assertEquals(c.lines?.partIIBLines?.line24, 0);
  assertEquals(p.f1040.line28_actc, 71);
  f.general.do_not_claim_eic = false;
  assertEquals(complete(f).f1040.line28_actc, 0);
});
Deno.test("Joint losses reduce credit income without erasing the spouse's SE and Additional Medicare payroll", () => {
  const p = complete(jointBusinessCreditGraphFixture2026());
  assertEquals(p.schedule1.line15_se_deduction, 16126);
  assertEquals(p.f1040.line11b_agi, 33874);
  const c = p.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.lines?.partIIBLines?.line21, 330); // Half of $659 Additional Medicare tax.
  assertEquals(c.lines?.partIIBLines?.line22, 16126);
  assertEquals(c.lines?.partIIBLines?.line24, p.f1040.line27a_eic);
  assertEquals(p.f1040.line28_actc, 5100);
  const source = c.source_input as ChildCreditInput2026;
  assertThrows(
    () =>
      calculateChildCredit2026({
        ...source,
        medicare_payroll_2026: {
          ...source.medicare_payroll_2026!,
          self_employment_earnings: 1,
        },
      }),
    Error,
    "matching",
  );
});
Deno.test("Business credit reviews cannot assert absence, mismatch inventory or inject earned totals", () => {
  const f = businessCreditGraphFixture2026();
  for (
    const [key, patch] of [
      ["eitc", {
        no_business_farm_rental_passive_or_capital_disposition_sources: true,
      }],
      ["eitc", { business_inventory_reference: "wrong" }],
      ["f8812", { no_self_employment_or_statutory_employee_income: true }],
      ["f8812", { business_inventory_reference: "wrong" }],
      ["eitc", { earned_income: 99999 }],
      ["f8812", { auto_se_earned_income: 99999 }],
    ] as const
  ) {
    assert(
      run({ ...f, [key]: { ...f[key], ...patch } }).diagnostics.length > 0,
    );
  }
});
Deno.test("Business credit review cannot be supplied without its actual source claim", () => {
  const f = businessCreditGraphFixture2026();
  f.w2s = [wage()];
  const r = run({ ...f, schedule_c: undefined });
  assert(r.diagnostics.some((d) => d.nodeType === "eitc"));
  assert(r.diagnostics.some((d) => d.nodeType === "f8812"));
});

Deno.test("Business EIC cannot conceal an actual capital disposition behind a no-other-sources review", () => {
  const f = businessCreditGraphFixture2026();
  const r = run({ ...f, capital_gains: capitalFixture2026(0).capital_gains });
  assert(
    r.diagnostics.some((d) =>
      d.nodeType === "eitc" && d.message.includes("capital-disposition")
    ),
  );
});

Deno.test("Business credit combat elections alter EIC but ACTC includes all combat pay once", () => {
  const f = businessCreditGraphFixture2026();
  f.w2s = [{
    ...wage("123456789", 0),
    box12_entries: [{ code: Box12Code.Q, amount: 10000 }],
  }];
  const p = complete(f);
  const e = p.eitc.calculation_2026 as {
    earned_income_for_eic: number;
    combat_pay_elected: { taxpayer: boolean };
  };
  assertEquals(e.earned_income_for_eic, 19293);
  assertEquals(e.combat_pay_elected.taxpayer, true);
  assertEquals(p.f1040.line11b_agi, 9293);
  assertEquals(p.f1040.line1i_combat_pay, 10000);
  assertEquals(p.f1040.line28_actc, 1700);
});

Deno.test("Opening EIC and ACTC business income does not bypass care or education source owners", () => {
  const f = businessCreditGraphFixture2026();
  const education = run({ ...f, f8863: educationFixture2026().f8863 });
  assert(
    education.diagnostics.some((d) =>
      d.nodeType === "f8863" && d.message.includes("business")
    ),
  );
  const care = dependentCareFixture2026();
  const result = run({
    ...f,
    general: { ...f.general, dependents: care.general.dependents },
    w2s: [wage("123456789", 50000)],
    form2441: care.form2441,
  });
  assert(
    result.diagnostics.some((d) =>
      d.nodeType === "form2441" && d.message.includes("business inventory")
    ),
    JSON.stringify(result.diagnostics),
  );
});
