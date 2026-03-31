import { assertEquals } from "@std/assert";
import { schedule1 } from "./index.ts";

const ctx = {} as Parameters<typeof schedule1.compute>[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function compute(input: Parameters<typeof schedule1.compute>[1]) {
  return schedule1.compute(ctx, input);
}

function fields(input: Parameters<typeof schedule1.compute>[1]): Record<string, unknown> {
  const result = compute(input);
  return result.outputs[0].fields as Record<string, unknown>;
}

// ─── Node identity ────────────────────────────────────────────────────────────

Deno.test("schedule1: nodeType is schedule1", () => {
  assertEquals(schedule1.nodeType, "schedule1");
});

Deno.test("schedule1: outputNodeTypes is empty (no downstream routing)", () => {
  assertEquals(schedule1.outputNodeTypes.length, 0);
});

// ─── Self-emit ────────────────────────────────────────────────────────────────

Deno.test("schedule1: compute returns one self-referencing output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
});

Deno.test("schedule1: empty input emits zero totals", () => {
  const f = fields({});
  assertEquals(f.line10_total_additional_income, 0);
  assertEquals(f.line26_total_adjustments, 0);
});

// ─── Part I — Additional Income ───────────────────────────────────────────────

Deno.test("schedule1: state tax refund included in additional income", () => {
  const f = fields({ line1_state_refund: 400 });
  assertEquals(f.line10_total_additional_income, 400);
});

Deno.test("schedule1: schedule C income included", () => {
  const f = fields({ line3_schedule_c: 15_000 });
  assertEquals(f.line10_total_additional_income, 15_000);
});

Deno.test("schedule1: schedule C loss included (negative)", () => {
  const f = fields({ line3_schedule_c: -5_000 });
  assertEquals(f.line10_total_additional_income, -5_000);
});

Deno.test("schedule1: other gains from form 4797 included", () => {
  const f = fields({ line4_other_gains: 3_000 });
  assertEquals(f.line10_total_additional_income, 3_000);
});

Deno.test("schedule1: rental income from schedule E included", () => {
  const f = fields({ line5_schedule_e: 12_000 });
  assertEquals(f.line10_total_additional_income, 12_000);
});

Deno.test("schedule1: farm income from schedule F included", () => {
  const f = fields({ line6_schedule_f: 8_000 });
  assertEquals(f.line10_total_additional_income, 8_000);
});

Deno.test("schedule1: unemployment compensation included", () => {
  const f = fields({ line7_unemployment: 5_200 });
  assertEquals(f.line10_total_additional_income, 5_200);
});

Deno.test("schedule1: prizes and awards in line 8z", () => {
  const f = fields({ line8i_prizes_awards: 1_000 });
  assertEquals(f.line10_total_additional_income, 1_000);
});

Deno.test("schedule1: cancellation of debt income in line 8c", () => {
  const f = fields({ line8c_cod_income: 2_500 });
  assertEquals(f.line10_total_additional_income, 2_500);
});

Deno.test("schedule1: foreign earned income exclusion offsets income", () => {
  const f = fields({
    line3_schedule_c: 50_000,
    line8d_foreign_earned_income_exclusion: 40_000,
  });
  assertEquals(f.line10_total_additional_income, 10_000);
});

Deno.test("schedule1: savings bond exclusion offsets income", () => {
  const f = fields({ line8b_savings_bond_exclusion: 500 });
  assertEquals(f.line10_total_additional_income, -500);
});

Deno.test("schedule1: at_risk_disallowed_add_back adds to income", () => {
  const f = fields({ at_risk_disallowed_add_back: 1_000 });
  assertEquals(f.line10_total_additional_income, 1_000);
});

// ─── Part II — Adjustments ────────────────────────────────────────────────────

Deno.test("schedule1: HSA deduction included in adjustments", () => {
  const f = fields({ line13_hsa_deduction: 3_850 });
  assertEquals(f.line26_total_adjustments, 3_850);
});

Deno.test("schedule1: moving expenses (military) included", () => {
  const f = fields({ line14_moving_expenses: 2_000 });
  assertEquals(f.line26_total_adjustments, 2_000);
});

Deno.test("schedule1: SE tax deduction included", () => {
  const f = fields({ line15_se_deduction: 4_500 });
  assertEquals(f.line26_total_adjustments, 4_500);
});

Deno.test("schedule1: self-employed health insurance deduction included", () => {
  const f = fields({ line17_se_health_insurance: 6_000 });
  assertEquals(f.line26_total_adjustments, 6_000);
});

Deno.test("schedule1: student loan interest deduction included", () => {
  const f = fields({ line19_student_loan_interest: 2_500 });
  assertEquals(f.line26_total_adjustments, 2_500);
});

Deno.test("schedule1: IRA deduction included", () => {
  const f = fields({ line20_ira_deduction: 7_000 });
  assertEquals(f.line26_total_adjustments, 7_000);
});

Deno.test("schedule1: Archer MSA deduction included", () => {
  const f = fields({ line23_archer_msa_deduction: 2_000 });
  assertEquals(f.line26_total_adjustments, 2_000);
});

Deno.test("schedule1: SEP/SIMPLE plan contributions included", () => {
  const f = fields({ line16_sep_simple: 10_000 });
  assertEquals(f.line26_total_adjustments, 10_000);
});

Deno.test("schedule1: educator expenses included", () => {
  const f = fields({ line11_educator_expenses: 300 });
  assertEquals(f.line26_total_adjustments, 300);
});

// ─── Combined scenarios ───────────────────────────────────────────────────────

Deno.test("schedule1: combined Part I and Part II inputs", () => {
  const f = fields({
    line3_schedule_c: 80_000,
    line7_unemployment: 5_000,
    line15_se_deduction: 5_652,
    line17_se_health_insurance: 8_000,
    line20_ira_deduction: 7_000,
  });
  assertEquals(f.line10_total_additional_income, 85_000);
  assertEquals(f.line26_total_adjustments, 20_652);
});

Deno.test("schedule1: multiple line 8z items aggregated", () => {
  const f = fields({
    line8z_rtaa: 500,
    line8z_taxable_grants: 1_000,
    line8z_nqdc: 10_000,
    line8z_golden_parachute: 5_000,
  });
  assertEquals(f.line10_total_additional_income, 16_500);
});

Deno.test("schedule1: early withdrawal penalty in adjustments", () => {
  const f = fields({ line18_early_withdrawal: 150 });
  assertEquals(f.line26_total_adjustments, 150);
});
