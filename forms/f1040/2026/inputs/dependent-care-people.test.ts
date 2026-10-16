import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  custodialCareFixture2026,
  disabledCarePersonFixture2026,
  disabledCareSpouseFixture2026,
  newbornCareFixture2026,
} from "./dependent-care-people.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { carePerson2026Schema } from "./dependent-care-people.ts";
import {
  careDependentSourceEligible,
  educationDependentSourceEligible,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { dependentRules2026 } from "./dependents.ts";

const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  const care = r.pending.f2441.calculation_2026 as ReturnType<
    typeof calculateCareCredit2026
  >;
  return { pending: r.pending, care };
}
Deno.test("Disabled adult with excess gross income qualifies for care without becoming a 1040 dependent", () => {
  const { pending, care } = complete(disabledCarePersonFixture2026());
  assertEquals(care.lines!.line11, 1050);
  assertEquals(
    care.benefit.details!.qualifying_people[0].over_12_and_disabled,
    true,
  );
  assertEquals(pending.f1040.line19_child_tax_credit, 0);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 1050);
  assertEquals(pending.f1040.dependent_details ?? [], []);
});
Deno.test("Disabled-person joint-return and dependent-filer exceptions remain source-specific", () => {
  const f = disabledCarePersonFixture2026();
  const person = f.general.dependents[0],
    review = f.form2441.claim.qualifying_people[0];
  assert(review.kind === "disabled_person");
  person.filed_joint_return_except_refund_only = true;
  assert(run(f).diagnostics.length > 0);
  review.dependency_exceptions.joint_return = true;
  assertEquals(complete(f).care.lines!.line11, 1050);
  f.general.taxpayer_can_be_claimed_as_dependent = true;
  assert(run(f).diagnostics.length > 0);
  review.dependency_exceptions.filer_claimable_as_dependent = true;
  assertEquals(complete(f).care.lines!.line11, 1050);
  assertEquals(complete(f).pending.f1040.line19_child_tax_credit, 0);
});
Deno.test("Care reuses dependency tests without changing education/ODC income or TIN gates", () => {
  const f = disabledCarePersonFixture2026(), person = f.general.dependents[0];
  const rules = dependentRules2026(f.general.taxpayer_dob);
  assertEquals(educationDependentSourceEligible(person, rules), false);
  assertEquals(careDependentSourceEligible(person, rules), false);
  assert(
    careDependentSourceEligible(person, rules, {
      disregardJointReturn: false,
      disregardGrossIncome: true,
    }),
  );
  person.gross_income = 0;
  person.tin_issued_by_due_date = false;
  assertEquals(educationDependentSourceEligible(person, rules), false);
  assert(careDependentSourceEligible(person, rules));
});
Deno.test("Disabled joint spouse uses reviewed monthly income and the spouse's real identity", () => {
  const { care, pending } = complete(disabledCareSpouseFixture2026());
  assertEquals(care.benefit.details!.qualifying_people[0].ssn, "444556666");
  assertEquals(
    care.benefit.details!.qualifying_people[0].over_12_and_disabled,
    true,
  );
  assertEquals(care.lines!.line5, 3300);
  assertEquals(care.lines!.line11, 1050);
  assertEquals(
    care.benefit.details!.student_or_disabled_deemed_income_used,
    true,
  );
  assertEquals(pending.f1040.dependent_details ?? [], []);
  const f = disabledCareSpouseFixture2026(),
    c = f.form2441.claim.qualifying_people[0];
  assert(c.kind === "disabled_spouse");
  c.tin = "999887777";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Part-year incapacity controls receipt dates and the spouse's deemed-income months", () => {
  const f = disabledCareSpouseFixture2026(),
    c = f.form2441.claim.qualifying_people[0];
  assert(c.kind === "disabled_spouse");
  c.incapacity.periods[0].from = "2026-07-01";
  const earned = f.form2441.claim.earned_income;
  assert(earned.method === "monthly");
  earned.spouse!.months.forEach((m) => {
    m.incapable_of_self_care = m.month >= 7;
  });
  f.form2441.claim.expenses[0].incurred_start_date = "2026-07-01";
  const { care } = complete(f);
  assertEquals(
    care.benefit.qualifying_person_workpaper!.qualifying_people_by_month,
    [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  );
  assertEquals(care.lines!.line5, 2300);
  assertEquals(care.lines!.line11, 805);
  f.form2441.claim.expenses[0].incurred_start_date = "2026-06-30";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Spouse incapacity records cannot contradict monthly income or home evidence", () => {
  const a = disabledCareSpouseFixture2026(),
    earned = a.form2441.claim.earned_income;
  assert(earned.method === "monthly");
  earned.spouse!.months[0].incapable_of_self_care = false;
  assert(run(a).diagnostics.length > 0);
  const b = disabledCareSpouseFixture2026();
  b.form2441.claim.earned_income = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  assert(run(b).diagnostics.length > 0);
  const c = disabledCareSpouseFixture2026(),
    review = c.form2441.claim.qualifying_people[0];
  assert(review.kind === "disabled_spouse");
  review.residence.months_in_home =
    review.residence
      .months_lived_with_you_in_us =
      6;
  review.residence.residency_2026_review.periods[0].through = "2026-06-30";
  assert(run(c).diagnostics.length > 0);
});
Deno.test("Custodial parent receives care credit without claiming the released dependent", () => {
  const { care, pending } = complete(custodialCareFixture2026());
  assertEquals(care.lines!.line11, 1050);
  assertEquals(pending.f1040.line19_child_tax_credit, 0);
  assertEquals(pending.f1040.dependent_details ?? [], []);
  const f = custodialCareFixture2026(),
    person = f.form2441.claim.qualifying_people[0];
  assert(person.kind === "custodial_child");
  person.custody.nights_with_other_parent = 201;
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Equal-night custody compares the other parent's AGI with final calculated AGI", () => {
  const f = custodialCareFixture2026(true),
    review = f.form2441.claim.qualifying_people[0];
  assert(review.kind === "custodial_child");
  assertEquals(complete(f).care.lines!.line11, 1050);
  review.custody.other_parent_agi = 50000;
  assert(
    run(f).diagnostics.some((d) =>
      JSON.stringify(d).includes("calculated AGI greater")
    ),
  );
  review.custody.other_parent_agi = undefined;
  assert(run(f).diagnostics.length > 0);
  const g = custodialCareFixture2026(),
    ordinary = g.form2441.claim.qualifying_people[0];
  assert(ordinary.kind === "custodial_child");
  ordinary.custody.other_parent_agi = 1;
  assert(run(g).diagnostics.length > 0);
});
Deno.test("Birth and death care eligibility uses the shared lifetime home calendar", () => {
  const f = newbornCareFixture2026();
  const c = complete(f).care;
  assertEquals(c.lines!.line11, 1050);
  assertEquals(
    c.benefit.qualifying_person_workpaper!.qualifying_people_by_month,
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  );
  f.form2441.claim.expenses[0].incurred_start_date = "2026-09-30";
  assert(run(f).diagnostics.length > 0);
  f.form2441.claim.expenses[0].incurred_start_date = "2026-10-01";
  f.general.dependents[0].death_date = "2026-11-30";
  f.general.dependents[0].months_in_home =
    f.general.dependents[0]
      .months_lived_with_you_in_us =
      2;
  f.general.dependents[0].residency_2026_review!.death_record_reference =
    "death-record";
  f.general.dependents[0].residency_2026_review!.periods[0].through =
    "2026-11-30";
  f.form2441.claim.expenses[0].incurred_end_date = "2026-11-30";
  assertEquals(complete(f).care.lines!.line11, 1050);
  f.form2441.claim.expenses[0].incurred_end_date = "2026-12-01";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Care age and payment-date boundaries reject nonqualifying days and other years", () => {
  const f = dependentCareFixture2026();
  f.general.dependents[0].dob = "2013-09-16";
  f.form2441.claim.expenses[0].incurred_end_date = "2026-09-15";
  assertEquals(complete(f).care.lines!.line11, 1050);
  f.form2441.claim.expenses[0].incurred_end_date = "2026-09-16";
  assert(run(f).diagnostics.length > 0);
  f.form2441.claim.expenses[0].incurred_end_date = "2026-09-15";
  f.form2441.claim.expenses[0].paid_date = "2027-01-01";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Care resolves ITIN identity without granting a child tax credit", () => {
  const f = dependentCareFixture2026(), original = f.general.dependents[0];
  const { ssn: _ssn, ...rest } = original;
  const input = {
    ...f,
    general: { ...f.general, dependents: [{ ...rest, itin: "900887777" }] },
  };
  input.form2441.claim.qualifying_people[0].tin = "900-88-7777";
  input.form2441.claim.expenses[0].person_tin = "900887777";
  const { care, pending } = complete(input);
  assertEquals(care.lines!.line11, 1050);
  assertEquals(care.benefit.details!.qualifying_people[0].ssn, "900887777");
  assertEquals(pending.f1040.line19_child_tax_credit, 500);
});
Deno.test("Care rejects overlapping incapacity, source contradictions and caller eligibility overrides", () => {
  const f = disabledCarePersonFixture2026(),
    person = f.form2441.claim.qualifying_people[0];
  assert(person.kind === "disabled_person");
  person.incapacity.periods.push({ from: "2026-12-01", through: "2026-12-31" });
  assert(run(f).diagnostics.length > 0);
  person.incapacity.periods.pop();
  f.general.dependents[0].taxpayer_provided_over_half_support = false;
  assert(run(f).diagnostics.length > 0);
  assertThrows(() =>
    carePerson2026Schema.parse({ ...person, qualifies: true })
  );
  const g = disabledCarePersonFixture2026();
  g.form2441.claim.qualifying_people.push(
    g.form2441.claim.qualifying_people[0],
  );
  assert(run(g).diagnostics.length > 0);
  const h = custodialCareFixture2026(), child = h.general.dependents[0];
  child.provided_over_half_own_support = true;
  assert(run(h).diagnostics.length > 0);
});

Deno.test("Two people qualifying at any time use the annual 500-dollar monthly floor", () => {
  const f = disabledCareSpouseFixture2026();
  const newborn = newbornCareFixture2026();
  f.form2441.claim.qualifying_people.push(
    newborn.form2441.claim.qualifying_people[0],
  );
  const input = {
    ...f,
    general: { ...f.general, dependents: newborn.general.dependents },
  };
  const { care } = complete(input);
  assertEquals(
    care.benefit.qualifying_person_workpaper!.qualifying_people_by_month,
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  );
  assertEquals(care.lines!.line5, 6000);
  assertEquals(care.lines!.line27, 6000);
  assertEquals(care.lines!.line9a, 2100);
});

Deno.test("Dependent filer standard deduction uses actual wages, not care income elections", () => {
  const f = disabledCarePersonFixture2026(),
    review = f.form2441.claim.qualifying_people[0];
  assert(review.kind === "disabled_person");
  f.general.taxpayer_can_be_claimed_as_dependent = true;
  review.dependency_exceptions.filer_claimable_as_dependent = true;
  f.w2s[0].box1_wages = 1000;
  const input = {
    ...f,
    w2s: f.w2s.map((w) => ({
      ...w,
      box12_entries: [{ code: "Q" as const, amount: 10000 }],
    })),
  };
  f.form2441.claim.combat_pay_elections.credit.taxpayer = true;
  const { care, pending } = complete(input);
  assertEquals(care.lines!.line4, 11000);
  const deduction = pending.standard_deduction.calculation_input_2026 as {
    dependent_earned_income: number;
  };
  assertEquals(deduction.dependent_earned_income, 1000);
  assertEquals(pending.f1040.standard_deduction, 1450);
});

Deno.test("Dependent wage bridge does not bypass young-filer unearned-income tax review", async () => {
  const { investmentGraphInput2026 } = await import(
    "../investment-assembly.fixture.ts"
  );
  for (const claimed of [false, true]) {
    const f = investmentGraphInput2026(50000);
    f.investment_income.f1099ints[0].box1 = 3000;
    f.general.taxpayer_can_be_claimed_as_dependent = claimed;
    f.general.taxpayer_dob = "2003-01-02";
    assert(
      run(f).diagnostics.some((d) =>
        JSON.stringify(d).includes("Form 8615 source eligibility")
      ),
    );
    f.general.taxpayer_dob = "2003-01-01";
    assert(
      !run(f).diagnostics.some((d) =>
        JSON.stringify(d).includes("Form 8615 source eligibility")
      ),
    );
  }
});
