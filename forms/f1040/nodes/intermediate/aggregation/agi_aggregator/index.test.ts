import { assertEquals } from "@std/assert";
import { agi_aggregator } from "./index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

const ctx: NodeContext = { taxYear: 2025 };

function compute(input: Parameters<typeof agi_aggregator.compute>[1]) {
  return agi_aggregator.compute(ctx, input);
}

function agi(result: ReturnType<typeof compute>): number {
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  return (out!.fields as Record<string, number>).line11_agi;
}

// ─── Basic AGI computation ────────────────────────────────────────────────────

Deno.test("agi_aggregator: wages only", () => {
  const result = compute({ line1a_wages: 60_000 });
  assertEquals(agi(result), 60_000);
});

Deno.test("agi_aggregator: wages + taxable interest", () => {
  const result = compute({ line1a_wages: 50_000, line2b_taxable_interest: 1_000 });
  assertEquals(agi(result), 51_000);
});

Deno.test("agi_aggregator: all fields zero → AGI is 0", () => {
  const result = compute({});
  assertEquals(agi(result), 0);
});

Deno.test("agi_aggregator: AGI floors at 0 when deductions exceed income", () => {
  const result = compute({ line1a_wages: 5_000, line15_se_deduction: 10_000 });
  assertEquals(agi(result), 0);
});

// ─── Income components ────────────────────────────────────────────────────────

Deno.test("agi_aggregator: Schedule C net loss reduces AGI", () => {
  const result = compute({ line1a_wages: 50_000, line3_schedule_c: -10_000 });
  assertEquals(agi(result), 40_000);
});

Deno.test("agi_aggregator: capital loss reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line7_capital_gain: -3_000 });
  assertEquals(agi(result), 57_000);
});

Deno.test("agi_aggregator: unemployment compensation added to AGI", () => {
  const result = compute({ line1a_wages: 30_000, line7_unemployment: 5_000 });
  assertEquals(agi(result), 35_000);
});

Deno.test("agi_aggregator: ordinary dividends included", () => {
  const result = compute({ line3b_ordinary_dividends: 2_000 });
  assertEquals(agi(result), 2_000);
});

Deno.test("agi_aggregator: IRA taxable distribution included", () => {
  const result = compute({ line4b_ira_taxable: 10_000 });
  assertEquals(agi(result), 10_000);
});

Deno.test("agi_aggregator: pension taxable included", () => {
  const result = compute({ line5b_pension_taxable: 20_000 });
  assertEquals(agi(result), 20_000);
});

Deno.test("agi_aggregator: social security taxable included", () => {
  const result = compute({ line6b_ss_taxable: 8_500 });
  assertEquals(agi(result), 8_500);
});

Deno.test("agi_aggregator: state tax refund (Schedule 1 line 1) included", () => {
  const result = compute({ line1_state_refund: 800 });
  assertEquals(agi(result), 800);
});

Deno.test("agi_aggregator: Schedule E rental income included", () => {
  const result = compute({ line5_schedule_e: 12_000 });
  assertEquals(agi(result), 12_000);
});

Deno.test("agi_aggregator: Schedule F farm income included", () => {
  const result = compute({ line6_schedule_f: 15_000 });
  assertEquals(agi(result), 15_000);
});

Deno.test("agi_aggregator: COD income included", () => {
  const result = compute({ line8c_cod_income: 3_000 });
  assertEquals(agi(result), 3_000);
});

Deno.test("agi_aggregator: at-risk add-back increases AGI", () => {
  const result = compute({ line1a_wages: 40_000, at_risk_disallowed_add_back: 5_000 });
  assertEquals(agi(result), 45_000);
});

Deno.test("agi_aggregator: §163(j) biz interest add-back increases AGI", () => {
  const result = compute({ line1a_wages: 40_000, biz_interest_disallowed_add_back: 2_000 });
  assertEquals(agi(result), 42_000);
});

// ─── Exclusions ───────────────────────────────────────────────────────────────

Deno.test("agi_aggregator: foreign earned income exclusion reduces AGI", () => {
  const result = compute({ line1a_wages: 130_000, line8d_foreign_earned_income_exclusion: 126_500 });
  assertEquals(agi(result), 3_500);
});

Deno.test("agi_aggregator: foreign housing deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 50_000, line8d_foreign_housing_deduction: 5_000 });
  assertEquals(agi(result), 45_000);
});

Deno.test("agi_aggregator: savings bond exclusion reduces AGI", () => {
  const result = compute({ line2b_taxable_interest: 2_000, line8b_savings_bond_exclusion: 1_000 });
  assertEquals(agi(result), 1_000);
});

// ─── Above-the-line deductions ────────────────────────────────────────────────

Deno.test("agi_aggregator: HSA deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line13_hsa_deduction: 4_000 });
  assertEquals(agi(result), 56_000);
});

Deno.test("agi_aggregator: SE tax deduction reduces AGI", () => {
  const result = compute({ line3_schedule_c: 80_000, line15_se_deduction: 5_651 });
  assertEquals(agi(result), 74_349);
});

Deno.test("agi_aggregator: SE health insurance deduction reduces AGI", () => {
  const result = compute({ line3_schedule_c: 100_000, line17_se_health_insurance: 12_000 });
  assertEquals(agi(result), 88_000);
});

Deno.test("agi_aggregator: IRA deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line20_ira_deduction: 7_000 });
  assertEquals(agi(result), 53_000);
});

Deno.test("agi_aggregator: moving expense deduction (military) reduces AGI", () => {
  const result = compute({ line1a_wages: 50_000, line14_moving_expenses: 3_000 });
  assertEquals(agi(result), 47_000);
});

Deno.test("agi_aggregator: early withdrawal penalty reduces AGI", () => {
  const result = compute({ line1a_wages: 50_000, line4b_ira_taxable: 5_000, line18_early_withdrawal: 500 });
  assertEquals(agi(result), 54_500);
});

Deno.test("agi_aggregator: §501(c)(18)(D) deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 50_000, line24f_501c18d: 500 });
  assertEquals(agi(result), 49_500);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("agi_aggregator: routes line11_agi to f1040", () => {
  const result = compute({ line1a_wages: 75_000 });
  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals((f1040!.fields as Record<string, number>).line11_agi, 75_000);
});

Deno.test("agi_aggregator: routes agi to standard_deduction", () => {
  const result = compute({ line1a_wages: 75_000 });
  const sdOut = result.outputs.find((o) => o.nodeType === "standard_deduction");
  assertEquals((sdOut!.fields as Record<string, number>).agi, 75_000);
});

Deno.test("agi_aggregator: routes agi to schedule_a", () => {
  const result = compute({ line1a_wages: 75_000 });
  const schA = result.outputs.find((o) => o.nodeType === "schedule_a");
  assertEquals((schA!.fields as Record<string, number>).agi, 75_000);
});

Deno.test("agi_aggregator: always produces exactly 7 outputs", () => {
  const result = compute({ line1a_wages: 50_000 });
  assertEquals(result.outputs.length, 7);
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("agi_aggregator: smoke — typical W-2 employee with HSA and IRA deductions", () => {
  const result = compute({
    line1a_wages: 85_000,
    line2b_taxable_interest: 500,
    line3b_ordinary_dividends: 1_200,
    line13_hsa_deduction: 4_150,
    line20_ira_deduction: 7_000,
  });
  // AGI = 85_000 + 500 + 1_200 - 4_150 - 7_000 = 75_550
  assertEquals(agi(result), 75_550);
});

Deno.test("agi_aggregator: smoke — self-employed with SE tax and health insurance deductions", () => {
  const result = compute({
    line3_schedule_c: 120_000,
    line15_se_deduction: 8_479,
    line17_se_health_insurance: 18_000,
    line20_ira_deduction: 7_000,
  });
  // AGI = 120_000 - 8_479 - 18_000 - 7_000 = 86_521
  assertEquals(agi(result), 86_521);
});
