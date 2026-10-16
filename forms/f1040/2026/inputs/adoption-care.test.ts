import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  adoptionCareFixture2026,
  jointAdoptionCareFixture2026,
  mixedOwnerAdoptionCareFixture2026,
} from "./adoption-care.fixture.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { adoptionCareIncome2026 } from "./adoption-care.ts";
function run(raw: Record<string, unknown>) {
  return execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    raw,
    { taxYear: 2026, formType: "f1040" },
  );
}
function complete(raw: Record<string, unknown>) {
  const r = run(raw);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    care: r.pending.f2441.calculation_2026 as ReturnType<
      typeof calculateCareCredit2026
    >,
  };
}
Deno.test("2026 care uses signed taxable adoption income without gross support compensation", () => {
  const input = adoptionCareFixture2026(), before = structuredClone(input);
  assertEquals(complete(input).care.lines!.line4, 50000);
  assertEquals(input, before);
  input.form8839.claim.children[0].origin = "foreign";
  input.form8839.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "foreign-pending",
  };
  const { p, care } = complete(input);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 4000);
  assertEquals(care.lines!.line4, 54000);
  assertEquals(care.benefit.adoption_income_workpaper?.adjustments, {
    taxpayer: 4000,
    spouse: 0,
  });
});
Deno.test("2026 negative adoption income limits care credit and retains unchanged benefit exclusion", () => {
  const { p, care } = complete(adoptionCareFixture2026(20000, 0, true, 1000));
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, -17670);
  assertEquals(p.f1040.line1e_taxable_dep_care, 0);
  assertEquals(care.lines!.line18, 2330);
  assertEquals(care.lines!.line25, 1000);
  assertEquals(care.lines!.line4, 2330);
  assertEquals(care.lines!.line6, 2000);
  const changed = complete(adoptionCareFixture2026(20000, 0, true, 5000));
  assertEquals(changed.p.f1040.line1e_taxable_dep_care, 2670);
  assertEquals(changed.p.f1040.line11b_agi, 5000);
});
Deno.test("2026 joint care assigns special-needs exclusion to the actual employer-program owner", () => {
  const { p, care } = complete(jointAdoptionCareFixture2026());
  assertEquals(p.f1040.line1z_total_wages, 52330);
  assertEquals(care.lines!.line4, 50000);
  assertEquals(care.lines!.line5, 2330);
  assertEquals(care.lines!.line6, 2330);
  assertEquals(care.benefit.adoption_income_workpaper?.adjustments, {
    taxpayer: 0,
    spouse: -17670,
  });
});
Deno.test("2026 monthly care applies reviewed adoption adjustment before the student floor", () => {
  const input = jointAdoptionCareFixture2026();
  const months = (spouse: boolean) =>
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      w2_wages: spouse ? (i === 0 ? 9000 : 1000) : (i === 0 ? 50000 : 0),
      taxable_care_benefits: 0,
      nontaxable_combat_pay: 0,
      full_time_student: spouse && i < 5,
      incapable_of_self_care: false,
      ...(spouse ? { adoption_wage_adjustment: i === 0 ? -17670 : 0 } : {}),
    }));
  input.form2441.claim.earned_income = {
    method: "monthly",
    taxpayer: {
      record_reference: "taxpayer-payroll",
      school_meets_full_time_student_definition: false,
      months: months(false),
    },
    spouse: {
      record_reference: "spouse-payroll",
      school_meets_full_time_student_definition: true,
      enrollment_record_reference: "spouse-school",
      adoption_allocation_review: {
        record_reference: "adoption-service-months",
        actual_months_of_adoption_wage_adjustment_reviewed: true,
      },
      months: months(true),
    },
    both_eligible_month_choices: [],
  };
  const { care } = complete(input);
  assertEquals(care.lines!.line5, 11250);
  assertEquals(
    care.benefit.earned_income_worksheets!.credit.monthly![0].spouse_actual,
    -8670,
  );
  assertEquals(
    care.benefit.earned_income_worksheets!.credit.monthly![0].spouse,
    250,
  );
  const review = input.form2441.claim.earned_income;
  assert(review.method === "monthly");
  review.spouse!.months[0].adoption_wage_adjustment = -17669;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("matching the actual owner")
    ),
  );
  review.spouse!.months[0].adoption_wage_adjustment = -17670;
  delete review.spouse!.adoption_allocation_review;
  assert(
    run(input).diagnostics.some((d) => d.message.includes("reviewed months")),
  );
});
Deno.test("2026 care adoption bridge rejects changed wage sources, owners and inventory references", () => {
  const input = adoptionCareFixture2026(),
    { care } = complete(input),
    w = care.benefit.adoption_income_workpaper!;
  const bridge = { source: w.adoption.source_input, income: w.adoption.income };
  assertThrows(
    () =>
      adoptionCareIncome2026(
        bridge,
        { ...w.adoption.source_input, taxpayer_ssn: "987654321" },
        input.w2s,
        input.form8839.claim.record_reference,
      ),
    Error,
    "actual return owners",
  );
  const wages = structuredClone(input.w2s);
  wages[0].box1_wages += 1;
  assertThrows(
    () =>
      adoptionCareIncome2026(
        bridge,
        w.adoption.source_input,
        wages,
        input.form8839.claim.record_reference,
      ),
    Error,
    "same issued W-2",
  );
  input.form2441.claim.adoption_inventory_reference = "other-adoption";
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("actual adoption inventory")
    ),
  );
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...input,
      form2441: { ...input.form2441, adoption_income_2026: bridge },
    })
  );
});
Deno.test("2026 offsetting adoption adjustments remain separate when joint line 1f is zero", () => {
  const input = jointAdoptionCareFixture2026(),
    other = adoptionCareFixture2026(50000, 17670);
  const program = structuredClone(other.form8839.claim.programs[0]);
  program.record_reference = "other-employer-program";
  const child = JSON.parse(
    JSON.stringify(other.form8839.claim.children[0]),
    (key, value) =>
      typeof value === "string" && key.includes("reference")
        ? `other-${value}`
        : value,
  ) as typeof other.form8839.claim.children[number];
  child.identifying_number = "333445555";
  child.origin = "foreign";
  child.finalization = {
    kind: "not_final",
    status_record_reference: "other-foreign-pending",
  };
  child.current_benefits[0].program_reference = program.record_reference;
  input.form8839.claim.programs.push(program);
  input.form8839.claim.children.push(child);
  input.w2s[0].box12_entries = other.w2s[0].box12_entries;
  const { p, care } = complete(input);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 0);
  assertEquals(care.lines!.line4, 67670);
  assertEquals(care.lines!.line5, 2330);
  assertEquals(care.benefit.adoption_income_workpaper?.adjustments, {
    taxpayer: 17670,
    spouse: -17670,
  });
});
Deno.test("2026 care rejects unresolved mixed-owner child exclusions instead of choosing a spouse", () => {
  const input = jointAdoptionCareFixture2026(),
    other = adoptionCareFixture2026();
  const program = structuredClone(other.form8839.claim.programs[0]);
  program.record_reference = "primary-adoption-program";
  const payment = structuredClone(
    other.form8839.claim.children[0].current_benefits[0],
  );
  payment.program_reference = program.record_reference;
  input.form8839.claim.programs.push(program);
  input.form8839.claim.children[0].current_benefits.push(payment);
  input.w2s[0].box12_entries = other.w2s[0].box12_entries;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("reconciled per-spouse exclusion allocation")
    ),
  );
  // A joint zero does not prove that both spouses have zero adjustments when
  // the special-needs exclusion belongs to a different employer-program owner.
  payment.amount = 17670;
  payment.expense_allocations[0].amount = 17670;
  input.w2s[0].box12_entries[0].amount = 17670;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("reconciled per-spouse exclusion allocation")
    ),
  );
});

Deno.test("2026 care attributes both spouses' taxable pending-foreign benefits to their actual payments", () => {
  const input = mixedOwnerAdoptionCareFixture2026();
  input.form8839.claim.children[0].origin = "foreign";
  input.form8839.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "foreign-pending",
  };
  const before = structuredClone(input), { p, care } = complete(input);
  assertEquals(input, before);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 10000);
  assertEquals(p.f1040.line11b_agi, 80000);
  assertEquals(care.lines!.line4, 54000);
  assertEquals(care.lines!.line5, 26000);
  const workpaper = care.benefit.adoption_income_workpaper!;
  assertEquals(workpaper.adjustments, { taxpayer: 4000, spouse: 6000 });
  assertEquals(
    workpaper.children[0].owner_allocations.map((a) => ({
      owner: a.owner,
      payments: a.payment_references,
      source: a.source_current_benefits,
      exclusion: a.exclusion,
      adjustment: a.wage_adjustment,
    })).sort((a, b) => a.owner.localeCompare(b.owner)),
    [
      {
        owner: "spouse",
        payments: ["spouse-benefit-payment"],
        source: 6000,
        exclusion: 0,
        adjustment: 6000,
      },
      {
        owner: "taxpayer",
        payments: ["benefit-payment"],
        source: 4000,
        exclusion: 0,
        adjustment: 4000,
      },
    ],
  );
  input.w2s.reverse();
  input.form8839.claim.programs.reverse();
  input.form8839.claim.children[0].current_benefits.reverse();
  assertEquals(
    complete(input).care.benefit.adoption_income_workpaper!.adjustments,
    workpaper.adjustments,
  );
});

Deno.test("2026 care reconciles mixed-owner benefits when the exclusion phases out completely", () => {
  const input = mixedOwnerAdoptionCareFixture2026();
  input.w2s[0].box1_wages = 300000;
  const { p, care } = complete(input);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 10000);
  assertEquals(care.lines!.line4, 304000);
  assertEquals(care.lines!.line5, 26000);
  assertEquals(
    care.benefit.adoption_income_workpaper!.adoption.lines.line30,
    0,
  );
});

Deno.test("2026 care retains each owner's fully excluded ordinary benefits but blocks partial allocations", () => {
  const input = mixedOwnerAdoptionCareFixture2026();
  const { p, care } = complete(input);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 0);
  assertEquals(care.lines!.line4, 50000);
  assertEquals(care.lines!.line5, 20000);
  const allocations =
    care.benefit.adoption_income_workpaper!.children[0].owner_allocations;
  assertEquals(
    allocations.find((a) => a.owner === "taxpayer")!.exclusion,
    4000,
  );
  assertEquals(allocations.find((a) => a.owner === "spouse")!.exclusion, 6000);
  input.w2s[0].box1_wages = 250000;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("reconciled per-spouse exclusion allocation")
    ),
  );
});

Deno.test("2026 care sums an owner's adoption payment cents before rounding and rejects an unreconciled split", () => {
  const input = mixedOwnerAdoptionCareFixture2026(),
    child = input.form8839.claim.children[0];
  child.origin = "foreign";
  child.finalization = {
    kind: "not_final",
    status_record_reference: "foreign-pending",
  };
  child.current_benefits[0].amount = 1000.25;
  child.current_benefits[0].expense_allocations[0].amount = 1000.25;
  child.current_benefits.push({
    ...structuredClone(child.current_benefits[0]),
    record_reference: "second-primary-payment",
  });
  child.current_benefits[1].amount = 3000.10;
  child.current_benefits[1].expense_allocations[0].amount = 3000.10;
  input.w2s[0].box12_entries[0].amount = 2000.50;
  input.w2s[1].box12_entries[0].amount = 3000.10;
  const { p, care } = complete(input);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, 5001);
  assertEquals(care.benefit.adoption_income_workpaper!.adjustments, {
    taxpayer: 2001,
    spouse: 3000,
  });
  child.current_benefits[1].amount = 3000.50;
  child.current_benefits[1].expense_allocations[0].amount = 3000.50;
  input.w2s[1].box12_entries[0].amount = 3000.50;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes(
        "owner totals need whole-dollar rounding reconciliation",
      )
    ),
  );
});
