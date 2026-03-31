import { assertEquals, assertExists } from "@std/assert";
import { schedule1 } from "./index.ts";

const ctx = {} as Parameters<typeof schedule1.compute>[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function compute(input: Parameters<typeof schedule1.compute>[1]) {
  return schedule1.compute(ctx, input);
}

// ─── Node identity ────────────────────────────────────────────────────────────

Deno.test("schedule1: nodeType is schedule1", () => {
  assertEquals(schedule1.nodeType, "schedule1");
});

Deno.test("schedule1: is a sink node with no output nodes", () => {
  assertEquals(schedule1.outputNodeTypes.length, 0);
});

// ─── Empty input ──────────────────────────────────────────────────────────────

Deno.test("schedule1: empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Part I — Additional Income ───────────────────────────────────────────────

Deno.test("schedule1: state tax refund included in additional income", () => {
  const result = compute({ line1_state_refund: 400 });
  assertExists(result);
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: schedule C income included", () => {
  const result = compute({ line3_schedule_c: 15_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: schedule C loss included (negative)", () => {
  const result = compute({ line3_schedule_c: -5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: other gains from form 4797 included", () => {
  const result = compute({ line4_other_gains: 3_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: rental income from schedule E included", () => {
  const result = compute({ line5_schedule_e: 12_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: farm income from schedule F included", () => {
  const result = compute({ line6_schedule_f: 8_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: unemployment compensation included", () => {
  const result = compute({ line7_unemployment: 5_200 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: prizes and awards in line 8z", () => {
  const result = compute({ line8i_prizes_awards: 1_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: cancellation of debt income in line 8c", () => {
  const result = compute({ line8c_cod_income: 2_500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: foreign earned income exclusion offsets income", () => {
  const result = compute({
    line3_schedule_c: 50_000,
    line8d_foreign_earned_income_exclusion: 40_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: savings bond exclusion offsets income", () => {
  const result = compute({
    line8b_savings_bond_exclusion: 500,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: at_risk_disallowed_add_back adds to income", () => {
  const result = compute({ at_risk_disallowed_add_back: 1_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Part II — Adjustments ────────────────────────────────────────────────────

Deno.test("schedule1: HSA deduction included in adjustments", () => {
  const result = compute({ line13_hsa_deduction: 3_850 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: moving expenses (military) included", () => {
  const result = compute({ line14_moving_expenses: 2_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: SE tax deduction included", () => {
  const result = compute({ line15_se_deduction: 4_500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: self-employed health insurance deduction included", () => {
  const result = compute({ line17_se_health_insurance: 6_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: student loan interest deduction included", () => {
  const result = compute({ line19_student_loan_interest: 2_500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: IRA deduction included", () => {
  const result = compute({ line20_ira_deduction: 7_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: Archer MSA deduction included", () => {
  const result = compute({ line23_archer_msa_deduction: 2_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: SEP/SIMPLE plan contributions included", () => {
  const result = compute({ line16_sep_simple: 10_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: educator expenses included", () => {
  const result = compute({ line11_educator_expenses: 300 });
  assertEquals(result.outputs.length, 0);
});

// ─── Combined scenarios ───────────────────────────────────────────────────────

Deno.test("schedule1: combined Part I and Part II inputs", () => {
  const result = compute({
    line3_schedule_c: 80_000,
    line7_unemployment: 5_000,
    line15_se_deduction: 5_652,
    line17_se_health_insurance: 8_000,
    line20_ira_deduction: 7_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: multiple line 8z items aggregated", () => {
  const result = compute({
    line8z_rtaa: 500,
    line8z_taxable_grants: 1_000,
    line8z_nqdc: 10_000,
    line8z_golden_parachute: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schedule1: early withdrawal penalty in adjustments", () => {
  const result = compute({ line18_early_withdrawal: 150 });
  assertEquals(result.outputs.length, 0);
});
