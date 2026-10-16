import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  adoptionCareFixture2026,
  phasedAdoptionCareFixture2026,
} from "./adoption-care.fixture.ts";
import { socialSecurityGraphFixture2026 } from "./social-security.fixture.ts";
import { calculateCareCredit2026 } from "../nodes/f2441.ts";
import type { calculateAdoptionExclusion2026 } from "./adoption-settlement.ts";
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
    adoption: r.pending.agi_aggregator.adoption_exclusion_2026 as ReturnType<
      typeof calculateAdoptionExclusion2026
    >,
  };
}

Deno.test("2026 coordinated adoption and care settle income before credits and retain the finalized benefit source", () => {
  const input = adoptionCareFixture2026(20000, 0, true, 5000),
    before = structuredClone(input);
  const { p, care, adoption } = complete(input);
  assertEquals(input, before);
  assertEquals(care.lines!.line18, 2330);
  assertEquals(care.lines!.line25, 2330);
  assertEquals(care.lines!.line26, 2670);
  assertEquals(care.lines!.line4, 5000);
  assertEquals(care.lines!.line6, 670);
  assertEquals(p.f1040.line1e_taxable_dep_care, 2670);
  assertEquals(p.f1040.line1f_taxable_adoption_benefits, -17670);
  assertEquals(p.f1040.line11b_agi, 5000);
  assertEquals(p.f8812.wage_income_from_agi, 5000);
  assertEquals(p.f1040.line28_actc, 375);
  assertEquals(adoption.income.wages_if_all_line23_benefits_excluded, 22670);
  assertEquals(p.form2441.calculation_2026, care.benefit);
  assertThrows(
    () =>
      calculateCareCredit2026({
        ...care.source_input,
        taxable_care_benefits_from_agi: 0,
      }),
    Error,
    "executed pre-AGI line 1e",
  );
});
Deno.test("2026 care taxable income participates in adoption phaseout and the final exclusion feeds care again", () => {
  const { p, care, adoption } = complete(phasedAdoptionCareFixture2026());
  assertEquals(adoption.lines.line25, 272078);
  assertEquals(adoption.lines.line27, .175);
  assertEquals(adoption.lines.line30, 14578);
  assertEquals(care.lines!.line19, 5422);
  assertEquals(care.lines!.line25, 5422);
  assertEquals(care.lines!.line26, 2078);
  assertEquals(p.f1040.line11b_agi, 257500);
  assertEquals(p.f1040.line1e_taxable_dep_care, 2078);
  assertEquals(care.lines!.line5, 5422);
});
Deno.test("2026 coordinated care recomputes taxable Social Security with adoption added back", () => {
  const input = adoptionCareFixture2026(20000, 0, true, 5000),
    ssa = socialSecurityGraphFixture2026(20000).ssa1099;
  const { no_adoption_benefit_exclusion: _old, ...review } =
    ssa.worksheet_scope_review;
  const { p, adoption } = complete({
    ...input,
    ssa1099: {
      ...ssa,
      worksheet_scope_review: {
        ...review,
        adoption_inventory_reference: input.form8839.claim.record_reference,
      },
    },
  });
  assertEquals(p.f1040.line6b_ss_taxable, 1335);
  assertEquals(adoption.income.taxable_social_security, 1335);
  assertEquals(p.f1040.line11b_agi, 6335);
  const worksheet = p.agi_aggregator.social_security_worksheet_2026 as {
    other_income: number;
    adoption_benefits_exclusion: number;
  };
  assertEquals(worksheet.other_income, 5000);
  assertEquals(worksheet.adoption_benefits_exclusion, 17670);
});
Deno.test("2026 monthly source allocations bind only after coordinated benefit income settles", () => {
  const input = adoptionCareFixture2026(20000, 0, true, 5000);
  input.form2441.claim.earned_income = {
    method: "monthly",
    taxpayer: {
      record_reference: "payroll-months",
      school_meets_full_time_student_definition: false,
      adoption_allocation_review: {
        record_reference: "adoption-months",
        actual_months_of_adoption_wage_adjustment_reviewed: true,
      },
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        w2_wages: i === 0 ? 20000 : 0,
        adoption_wage_adjustment: i === 0 ? -17670 : 0,
        taxable_care_benefits: i === 0 ? 2670 : 0,
        nontaxable_combat_pay: 0,
        full_time_student: false,
        incapable_of_self_care: false,
      })),
    },
    both_eligible_month_choices: [],
  };
  const { care } = complete(input);
  assertEquals(care.lines!.line26, 2670);
  assertEquals(
    care.benefit.earned_income_worksheets!.credit.monthly![0].taxpayer_actual,
    5000,
  );
  const monthly = input.form2441.claim.earned_income;
  assert(monthly.method === "monthly");
  monthly.taxpayer.months[0].taxable_care_benefits = 2671;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("Monthly taxable care benefits disagree")
    ),
  );
  monthly.taxpayer.months[0].taxable_care_benefits = 2670;
  monthly.taxpayer.months[0].adoption_wage_adjustment = -17669;
  assert(
    run(input).diagnostics.some((d) =>
      d.message.includes("matching the actual owner adjustment")
    ),
  );
});
Deno.test("2026 coordinated income rejects a rounding gap instead of emitting an inconsistent return", () => {
  const r = run(phasedAdoptionCareFixture2026(250039));
  assert(
    r.diagnostics.some((d) =>
      d.nodeType === "agi_aggregator" &&
      d.message.includes("no consistent whole-dollar settlement")
    ),
  );
});
Deno.test("2026 coordinated worksheets retain extra allowed phaseout digits when three places cannot settle", () => {
  const { p, care, adoption } = complete(phasedAdoptionCareFixture2026(250030));
  assertEquals(adoption.income.phaseout_decimal_places, 4);
  assertEquals(adoption.lines.line27, .1755);
  assertEquals(adoption.lines.line25, 272099);
  assertEquals(adoption.lines.line30, 14569);
  assertEquals(care.lines!.line26, 2069);
  assertEquals(p.f1040.line11b_agi, 257530);
});
