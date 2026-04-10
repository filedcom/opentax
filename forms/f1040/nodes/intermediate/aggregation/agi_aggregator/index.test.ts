import { assertEquals } from "@std/assert";
import { agi_aggregator } from "./index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

const ctx: NodeContext = { taxYear: 2025, formType: "f1040" };

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

Deno.test("agi_aggregator: deductions exceeding income produce negative AGI (NOL scenario per IRC §172)", () => {
  const result = compute({ line1a_wages: 5_000, line15_se_deduction: 10_000 });
  assertEquals(agi(result), -5_000);
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

Deno.test("agi_aggregator: wages-only produces exactly 10 outputs (no Schedule 1 items)", () => {
  // With wages only, line8=0 and line10=0 so no extra f1040 fields beyond line11_agi
  // Outputs: f1040 + standard_deduction + schedule_a + eitc + f8812 + f2441 + form8995 + form8960 + form8962 + form8880
  const result = compute({ line1a_wages: 50_000 });
  assertEquals(result.outputs.length, 10);
});

Deno.test("agi_aggregator: cap gain distributions included in AGI", () => {
  const result = compute({ line1a_wages: 50_000, line7a_cap_gain_distrib: 5_000 });
  assertEquals(agi(result), 55_000);
});

Deno.test("agi_aggregator: routes line8_additional_income to f1040 when Schedule 1 Part I present", () => {
  const result = compute({ line1a_wages: 50_000, line3_schedule_c: 20_000 });
  const f1040Out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals((f1040Out!.fields as Record<string, number>).line8_additional_income, 20_000);
});

Deno.test("agi_aggregator: routes line10_adjustments to f1040 when above-line deductions present", () => {
  const result = compute({ line1a_wages: 60_000, line13_hsa_deduction: 4_000 });
  const f1040Out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals((f1040Out!.fields as Record<string, number>).line10_adjustments, 4_000);
});

Deno.test("agi_aggregator: line8_additional_income nets exclusions against income (Schedule 1 Part I net)", () => {
  // state refund 1000, foreign exclusion 800 → line8 = 200
  const result = compute({ line1_state_refund: 1_000, line8d_foreign_earned_income_exclusion: 800 });
  const f1040Out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals((f1040Out!.fields as Record<string, number>).line8_additional_income, 200);
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

// ─── All income types simultaneously ──────────────────────────────────────────

Deno.test("agi_aggregator: all income types simultaneously sum correctly", () => {
  const result = compute({
    // F1040 income lines
    line1a_wages: 50_000,
    line1c_unreported_tips: 500,
    line1e_taxable_dep_care: 200,
    line2b_taxable_interest: 1_000,
    line3b_ordinary_dividends: 800,
    line4b_ira_taxable: 5_000,
    line5b_pension_taxable: 3_000,
    line6b_ss_taxable: 2_000,
    line7_capital_gain: 4_000,
    // Schedule 1 Part I additions
    line1_state_refund: 300,
    line3_schedule_c: 10_000,
    line5_schedule_e: 6_000,
    line7_unemployment: 2_500,
    // Above-the-line deductions
    line13_hsa_deduction: 3_650,
    line15_se_deduction: 707,
    line20_ira_deduction: 7_000,
  });
  // Total income = 50000+500+200+1000+800+5000+3000+2000+4000+300+10000+6000+2500 = 85_300
  // Deductions = 3650+707+7000 = 11_357
  // AGI = 85_300 - 11_357 = 73_943
  assertEquals(agi(result), 73_943);
});

// ─── Multiple sources of same income type ─────────────────────────────────────

Deno.test("agi_aggregator: two schedule_c profit entries sum into AGI", () => {
  // Schedule_c sends one aggregated amount; test that two separate compute calls
  // with different values produce correct AGI (upstream aggregation contract)
  const result1 = compute({ line3_schedule_c: 40_000 });
  const result2 = compute({ line3_schedule_c: 60_000 });
  assertEquals(agi(result1), 40_000);
  assertEquals(agi(result2), 60_000);
});

Deno.test("agi_aggregator: schedule_e rental income and schedule_c profit both included", () => {
  const result = compute({ line3_schedule_c: 30_000, line5_schedule_e: 20_000 });
  assertEquals(agi(result), 50_000);
});

Deno.test("agi_aggregator: schedule_c net loss reduces AGI from other sources", () => {
  // Negative schedule_c (net loss) reduces AGI — loss offsets wages
  const result = compute({ line1a_wages: 80_000, line3_schedule_c: -15_000 });
  assertEquals(agi(result), 65_000);
});

// ─── Deduction coverage: untested deductions ──────────────────────────────────

Deno.test("agi_aggregator: student loan interest deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line19_student_loan_interest: 2_500 });
  assertEquals(agi(result), 57_500);
});

Deno.test("agi_aggregator: SEP/SIMPLE/qualified plan deduction reduces AGI", () => {
  const result = compute({ line3_schedule_c: 100_000, line16_sep_simple: 20_000 });
  assertEquals(agi(result), 80_000);
});

Deno.test("agi_aggregator: educator expenses deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 55_000, line11_educator_expenses: 300 });
  assertEquals(agi(result), 54_700);
});

Deno.test("agi_aggregator: employee business expenses deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 70_000, line12_business_expenses: 5_000 });
  assertEquals(agi(result), 65_000);
});

Deno.test("agi_aggregator: Archer MSA deduction reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line23_archer_msa_deduction: 2_000 });
  assertEquals(agi(result), 58_000);
});

// ─── SSA taxability worksheet ─────────────────────────────────────────────────

Deno.test("agi_aggregator: SSA worksheet — provisional income below base threshold → $0 taxable SS", () => {
  // Single filer: base threshold = $25,000
  // provisional income = wages + 50% × SSA gross = 10_000 + 0.5 × 20_000 = 20_000 < 25_000
  const result = compute({ line1a_wages: 10_000, line6a_ss_gross: 20_000, filing_status: "single" });
  // SSA taxable = 0; AGI = wages only = 10_000
  assertEquals(agi(result), 10_000);
});

Deno.test("agi_aggregator: SSA worksheet — provisional income above upper threshold → 85% taxable", () => {
  // Single filer: upper threshold = $34,000
  // provisional income = 40_000 + 0.5 × 20_000 = 50_000 > 34_000
  // tier2 = 0.5 × min(34000 - 25000, 20000) = 0.5 × 9000 = 4500
  // tier1 = 0.85 × (50000 - 34000) = 0.85 × 16000 = 13600
  // taxable = min(0.85 × 20000, 4500 + 13600) = min(17000, 18100) = 17000
  const result = compute({ line1a_wages: 40_000, line6a_ss_gross: 20_000, filing_status: "single" });
  assertEquals(agi(result), 57_000); // 40_000 wages + 17_000 SSA taxable
});

Deno.test("agi_aggregator: pre-computed line6b_ss_taxable bypasses worksheet", () => {
  // If line6b_ss_taxable is provided directly, it should be used as-is
  const result = compute({ line1a_wages: 30_000, line6b_ss_taxable: 5_000 });
  assertEquals(agi(result), 35_000);
});

// ─── Negative adjustment / loss from one source reduces AGI ──────────────────

Deno.test("agi_aggregator: rental real estate passive loss reduces AGI", () => {
  const result = compute({ line1a_wages: 100_000, line17_schedule_e: -25_000 });
  assertEquals(agi(result), 75_000);
});

Deno.test("agi_aggregator: schedule_f farm net loss reduces AGI", () => {
  const result = compute({ line1a_wages: 60_000, line6_schedule_f: -8_000 });
  assertEquals(agi(result), 52_000);
});

// ─── Tax-exempt interest in provisional income (IRC §86(b)(1)) ───────────────

Deno.test("agi_aggregator: tax_exempt_interest raises provisional income for SSA taxability", () => {
  // Single filer: base threshold = $25,000
  // Without tax-exempt interest: provisional = 8_000 + 0.5 × 20_000 = 18_000 < 25_000 → $0 taxable SS
  // With tax-exempt interest $8,000: provisional = 8_000 + 8_000 + 10_000 = 26_000 > 25_000
  // taxable = min(0.85 × 20_000, 0.5 × (26_000 - 25_000)) = min(17_000, 500) = 500
  // AGI = 8_000 wages + 500 SS = 8_500
  const result = compute({
    line1a_wages: 8_000,
    line6a_ss_gross: 20_000,
    tax_exempt_interest: 8_000,
    filing_status: "single",
  });
  assertEquals(agi(result), 8_500);
});

Deno.test("agi_aggregator: tax_exempt_interest absent → provisional income excludes it", () => {
  // Without tax-exempt interest, provisional = 8_000 + 10_000 = 18_000 < 25_000 → $0 SS taxable
  const result = compute({
    line1a_wages: 8_000,
    line6a_ss_gross: 20_000,
    filing_status: "single",
  });
  assertEquals(agi(result), 8_000);
});

// ─── MFS lived-with-spouse rule (IRC §86(c)(2)) ───────────────────────────────

Deno.test("agi_aggregator: MFS lived-with-spouse → 85% of SS always taxable", () => {
  // IRC §86(c)(2): 85% taxable regardless of provisional income level
  // Wages $5_000 (well below any threshold without the rule)
  // SSA gross $20_000 → taxable = 0.85 × 20_000 = 17_000
  // AGI = 5_000 + 17_000 = 22_000
  const result = compute({
    line1a_wages: 5_000,
    line6a_ss_gross: 20_000,
    filing_status: "mfs",
    mfs_lived_with_spouse: true,
  });
  assertEquals(agi(result), 22_000);
});

Deno.test("agi_aggregator: MFS not-lived-with-spouse → normal worksheet applies", () => {
  // No mfs_lived_with_spouse flag → uses normal $25k/$34k thresholds
  // provisional = 5_000 + 10_000 = 15_000 < 25_000 → $0 taxable
  const result = compute({
    line1a_wages: 5_000,
    line6a_ss_gross: 20_000,
    filing_status: "mfs",
  });
  assertEquals(agi(result), 5_000);
});

// ─── AGI can be negative in NOL scenarios (IRC §172) ─────────────────────────

Deno.test("agi_aggregator: large schedule_c loss can produce negative AGI", () => {
  // Large business loss exceeds wages → negative AGI allowed
  const result = compute({ line1a_wages: 50_000, line3_schedule_c: -150_000 });
  assertEquals(agi(result), -100_000);
});
