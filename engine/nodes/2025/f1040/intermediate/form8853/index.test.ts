import { assertEquals, assertThrows } from "@std/assert";
import { form8853 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../schedule2/index.ts";

function compute(input: Record<string, unknown>) {
  return form8853.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Section A Part I: Archer MSA Deduction ──────────────────────────────────

Deno.test("archer_msa_deduction_taxpayer_contrib: deduction = min(contributions, limitation, compensation)", () => {
  const result = compute({
    taxpayer_archer_msa_contributions: 2_000,
    line3_limitation_amount: 2_795,
    compensation: 50_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line23_archer_msa_deduction, 2_000);
});

Deno.test("archer_msa_deduction_limited_by_limitation: line 3 caps the deduction", () => {
  const result = compute({
    taxpayer_archer_msa_contributions: 3_000,
    line3_limitation_amount: 2_000,
    compensation: 50_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line23_archer_msa_deduction, 2_000);
});

Deno.test("archer_msa_deduction_limited_by_compensation: compensation caps the deduction", () => {
  const result = compute({
    taxpayer_archer_msa_contributions: 3_000,
    line3_limitation_amount: 3_000,
    compensation: 1_500,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line23_archer_msa_deduction, 1_500);
});

Deno.test("archer_msa_deduction_employer_prevents_deduction: employer contributions block taxpayer deduction", () => {
  // If employer made contributions, taxpayer cannot deduct (per instructions)
  // employer_archer_msa present means no deduction allowed for taxpayer contributions
  const result = compute({
    employer_archer_msa: 1_000,
    taxpayer_archer_msa_contributions: 500,
    line3_limitation_amount: 2_000,
    compensation: 50_000,
  });
  const s1 = findOutput(result, "schedule1");
  // Deduction is 0 when employer contributed (per IRS instructions Part I note)
  assertEquals(fieldsOf(result.outputs, schedule1)?.line23_archer_msa_deduction ?? 0, 0);
});

Deno.test("archer_msa_deduction_zero_when_no_contributions: no output when nothing contributed", () => {
  const result = compute({});
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ─── Section A Part II: Archer MSA Distributions ─────────────────────────────

Deno.test("archer_msa_taxable_distribution: non-medical distribution is taxable", () => {
  const result = compute({
    archer_msa_distributions: 5_000,
    archer_msa_rollover: 0,
    archer_msa_qualified_expenses: 2_000,
  });
  const s1 = findOutput(result, "schedule1");
  // Line 8 = 5000 - 0 - 2000 = 3000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 3_000);
});

Deno.test("archer_msa_20pct_tax_on_taxable_distribution: 20% additional tax routes to schedule2", () => {
  const result = compute({
    archer_msa_distributions: 5_000,
    archer_msa_qualified_expenses: 2_000,
    archer_msa_exception: false,
  });
  const s2 = findOutput(result, "schedule2");
  // Line 9b = 3000 × 0.20 = 600
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17e_archer_msa_tax, 600);
});

Deno.test("archer_msa_no_20pct_tax_when_exception: exception waives 20% tax", () => {
  const result = compute({
    archer_msa_distributions: 5_000,
    archer_msa_qualified_expenses: 2_000,
    archer_msa_exception: true,
  });
  const s2 = findOutput(result, "schedule2");
  // Taxable income still flows to schedule1 but no penalty tax
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17e_archer_msa_tax ?? 0, 0);
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 3_000);
});

Deno.test("archer_msa_qualified_distribution_excluded: medical expenses eliminate taxable amount", () => {
  const result = compute({
    archer_msa_distributions: 3_000,
    archer_msa_qualified_expenses: 3_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8e_archer_msa_dist ?? 0, 0);
  const s2 = findOutput(result, "schedule2");
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17e_archer_msa_tax ?? 0, 0);
});

Deno.test("archer_msa_rollover_excluded_from_taxable: rollovers reduce gross distributions", () => {
  const result = compute({
    archer_msa_distributions: 5_000,
    archer_msa_rollover: 2_000,
    archer_msa_qualified_expenses: 1_000,
  });
  // Line 6c = 5000 - 2000 = 3000; line 8 = 3000 - 1000 = 2000
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 2_000);
});

// ─── Section B: Medicare Advantage MSA Distributions ─────────────────────────

Deno.test("medicare_advantage_msa_taxable_distribution: non-medical distribution is taxable", () => {
  const result = compute({
    medicare_advantage_distributions: 4_000,
    medicare_advantage_qualified_expenses: 1_000,
  });
  const s1 = findOutput(result, "schedule1");
  // Line 12 = 4000 - 1000 = 3000
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 3_000);
});

Deno.test("medicare_advantage_msa_50pct_tax: 50% penalty routes to schedule2 line 17f", () => {
  const result = compute({
    medicare_advantage_distributions: 4_000,
    medicare_advantage_qualified_expenses: 1_000,
    medicare_advantage_exception: false,
  });
  const s2 = findOutput(result, "schedule2");
  // Line 13b = 3000 × 0.50 = 1500
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17f_medicare_advantage_msa_tax, 1_500);
});

Deno.test("medicare_advantage_msa_no_50pct_tax_when_exception: exception waives 50% tax", () => {
  const result = compute({
    medicare_advantage_distributions: 4_000,
    medicare_advantage_qualified_expenses: 1_000,
    medicare_advantage_exception: true,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17f_medicare_advantage_msa_tax ?? 0, 0);
});

Deno.test("medicare_advantage_msa_fully_qualified: no taxable amount when all medical", () => {
  const result = compute({
    medicare_advantage_distributions: 2_500,
    medicare_advantage_qualified_expenses: 2_500,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8e_archer_msa_dist ?? 0, 0);
});

// ─── Section C: Long-Term Care Insurance Contracts ───────────────────────────

Deno.test("ltc_taxable_payments_per_diem_exceeds_limit: excess over $420/day is taxable", () => {
  // $500/day × 365 days = $182,500 paid; $420 × 365 = $153,300 limit; no reimbursements
  // taxable = 182500 - 153300 = 29200
  const result = compute({
    ltc_gross_payments: 182_500,
    ltc_qualified_contract_amount: 182_500,
    ltc_period_days: 365,
    ltc_actual_costs: 100_000,
    ltc_reimbursements: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 29_200);
});

Deno.test("ltc_fully_excluded_when_actual_costs_exceed_per_diem: actual costs used as exclusion", () => {
  // $420/day × 10 days = $4,200 per diem limit; actual costs = $5,000 > $4,200
  // exclusion = max(4200, 5000) = 5000; payments = 4500; taxable = 4500 - 5000 = 0
  const result = compute({
    ltc_gross_payments: 4_500,
    ltc_qualified_contract_amount: 4_500,
    ltc_period_days: 10,
    ltc_actual_costs: 5_000,
    ltc_reimbursements: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8e_archer_msa_dist ?? 0, 0);
});

Deno.test("ltc_reimbursements_reduce_exclusion: reimbursements reduce the per diem limitation", () => {
  // $420 × 10 days = $4,200 per diem limit; reimbursements = $3,000
  // per diem limitation = 4200 - 3000 = 1200; payments = 3000; taxable = 3000 - 1200 = 1800
  const result = compute({
    ltc_gross_payments: 3_000,
    ltc_qualified_contract_amount: 3_000,
    ltc_period_days: 10,
    ltc_actual_costs: 0,
    ltc_reimbursements: 3_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8e_archer_msa_dist, 1_800);
});

Deno.test("ltc_accelerated_death_benefits_included: ADB payments included in line 20", () => {
  // line 18 = 5000, line 19 = 3000; line 20 = 8000
  // per diem limit = 420 × 30 = 12600; actual_costs = 0; exclusion = 12600
  // taxable = max(0, 8000 - 12600) = 0
  const result = compute({
    ltc_qualified_contract_amount: 5_000,
    ltc_accelerated_death_benefits: 3_000,
    ltc_period_days: 30,
    ltc_actual_costs: 0,
    ltc_reimbursements: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8e_archer_msa_dist ?? 0, 0);
});

// ─── Combined Routing ─────────────────────────────────────────────────────────

Deno.test("combined_all_sections: all three sections produce correct combined output", () => {
  const result = compute({
    // Section A deduction
    taxpayer_archer_msa_contributions: 1_000,
    line3_limitation_amount: 2_000,
    compensation: 50_000,
    // Section A taxable dist (line 8 = 2000)
    archer_msa_distributions: 5_000,
    archer_msa_qualified_expenses: 3_000,
    archer_msa_exception: false,
    // Section B taxable dist (line 12 = 1000)
    medicare_advantage_distributions: 2_000,
    medicare_advantage_qualified_expenses: 1_000,
    medicare_advantage_exception: false,
    // Section C (line 26 = 500)
    ltc_gross_payments: 5_000,
    ltc_qualified_contract_amount: 5_000,
    ltc_period_days: 10,
    ltc_actual_costs: 0,
    ltc_reimbursements: 0,
  });

  const s1 = findOutput(result, "schedule1");
  const s2 = findOutput(result, "schedule2");
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  const s2Input = fieldsOf(result.outputs, schedule2)!;

  // Deduction: 1000
  assertEquals(s1Input.line23_archer_msa_deduction, 1_000);
  // Taxable: 2000 (archer) + 1000 (medicare adv) + 800 (ltc: 5000 - max(420×10=4200, 0) = 800) = 3800
  assertEquals(s1Input.line8e_archer_msa_dist, 3_800);
  // 20% tax on archer taxable: 2000 × 0.20 = 400
  assertEquals(s2Input.line17e_archer_msa_tax, 400);
  // 50% tax on medicare adv taxable: 1000 × 0.50 = 500
  assertEquals(s2Input.line17f_medicare_advantage_msa_tax, 500);
});

// ─── Smoke Test ───────────────────────────────────────────────────────────────

Deno.test("smoke_empty_input: no outputs for completely empty input", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke_nodeType: form8853 has correct nodeType", () => {
  assertEquals(form8853.nodeType, "form8853");
});

// ─── Input Validation ─────────────────────────────────────────────────────────

Deno.test("validation: negative employer_archer_msa throws", () => {
  assertThrows(() => compute({ employer_archer_msa: -1 }));
});

Deno.test("validation: negative taxpayer_archer_msa_contributions throws", () => {
  assertThrows(() => compute({ taxpayer_archer_msa_contributions: -100 }));
});

Deno.test("validation: negative line3_limitation_amount throws", () => {
  assertThrows(() => compute({ line3_limitation_amount: -500 }));
});

Deno.test("validation: negative archer_msa_distributions throws", () => {
  assertThrows(() => compute({ archer_msa_distributions: -1_000 }));
});

Deno.test("validation: negative archer_msa_qualified_expenses throws", () => {
  assertThrows(() => compute({ archer_msa_qualified_expenses: -200 }));
});

Deno.test("validation: negative medicare_advantage_distributions throws", () => {
  assertThrows(() => compute({ medicare_advantage_distributions: -500 }));
});

Deno.test("validation: negative ltc_gross_payments throws", () => {
  assertThrows(() => compute({ ltc_gross_payments: -1_000 }));
});

Deno.test("validation: negative ltc_period_days throws", () => {
  assertThrows(() => compute({ ltc_period_days: -1 }));
});
