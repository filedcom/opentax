import { assertEquals } from "@std/assert";
import { f6765, ResearchMethod } from "./index.ts";

function compute(input: Parameters<typeof f6765.compute>[0]) {
  return f6765.compute(input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_missing_method", () => {
  const result = f6765.inputSchema.safeParse({ regular_wages: 100000 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_regular_method", () => {
  const result = f6765.inputSchema.safeParse({ method: ResearchMethod.Regular });
  assertEquals(result.success, true);
});

// ── Zero Cases ────────────────────────────────────────────────────────────────

Deno.test("regular_method_no_qre_produces_no_output", () => {
  const result = compute({ method: ResearchMethod.Regular });
  assertEquals(result.outputs.length, 0);
});

Deno.test("regular_method_qre_equal_to_base_produces_no_output", () => {
  // QRE = base → 0 excess → 0 credit
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 100000,
    regular_base_amount: 100000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("asc_method_no_qre_produces_no_output", () => {
  const result = compute({ method: ResearchMethod.AlternativeSimplified });
  assertEquals(result.outputs.length, 0);
});

// ── Regular Method (Section A) ───────────────────────────────────────────────

Deno.test("regular_method_wages_only_20pct_of_excess", () => {
  // QRE = $200k, base = $100k → excess = $100k × 20% = $20k
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 200000,
    regular_base_amount: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20000);
});

Deno.test("regular_method_contract_research_at_65pct", () => {
  // Contract: $100k × 65% = $65k QRE, no base → $65k × 20% = $13k
  const result = compute({
    method: ResearchMethod.Regular,
    regular_contract_research: 100000,
    regular_base_amount: 0,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 13000);
});

Deno.test("regular_method_supplies_count_as_qre", () => {
  // Supplies $50k + wages $50k = $100k QRE, base $40k → $60k × 20% = $12k
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 50000,
    regular_supplies: 50000,
    regular_base_amount: 40000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 12000);
});

Deno.test("regular_method_energy_consortium_100pct", () => {
  // Energy consortium $50k = $50k QRE (100%), base $0 → $50k × 20% = $10k
  const result = compute({
    method: ResearchMethod.Regular,
    energy_consortium_payments: 50000,
    regular_base_amount: 0,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 10000);
});

Deno.test("regular_method_no_negative_credit_when_base_exceeds_qre", () => {
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 50000,
    regular_base_amount: 100000,
  });
  assertEquals(result.outputs.length, 0);
});

// ── ASC Method (Section B) ───────────────────────────────────────────────────

Deno.test("asc_method_14pct_of_excess_over_half_prior_avg", () => {
  // Current $100k, prior avg $60k → base = $30k → excess $70k × 14% = $9,800
  const result = compute({
    method: ResearchMethod.AlternativeSimplified,
    asc_current_qre: 100000,
    asc_prior_avg_qre: 60000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 9800);
});

Deno.test("asc_method_current_less_than_half_prior_gives_zero", () => {
  // Current $20k, prior avg $60k → base $30k > current → 0 credit
  const result = compute({
    method: ResearchMethod.AlternativeSimplified,
    asc_current_qre: 20000,
    asc_prior_avg_qre: 60000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("asc_method_zero_prior_avg_14pct_of_current", () => {
  // Prior avg = 0 → base = 0 → full current $100k × 14% = $14k
  const result = compute({
    method: ResearchMethod.AlternativeSimplified,
    asc_current_qre: 100000,
    asc_prior_avg_qre: 0,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 14000);
});

// ── Payroll Tax Election ──────────────────────────────────────────────────────

Deno.test("payroll_election_reduces_schedule3_amount", () => {
  // Credit $20k, elect $10k for payroll → $10k to schedule3
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 200000,
    regular_base_amount: 100000,
    payroll_tax_election: true,
    payroll_tax_credit_elected: 10000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 10000);
});

Deno.test("payroll_election_all_elected_no_schedule3_output", () => {
  // Credit $20k, elect full $20k → $0 to schedule3
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 200000,
    regular_base_amount: 100000,
    payroll_tax_election: true,
    payroll_tax_credit_elected: 20000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("payroll_election_capped_at_500k", () => {
  // Huge credit, elect $600k → capped at $500k → remainder goes to schedule3
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 4000000,
    regular_base_amount: 1000000,
    payroll_tax_election: true,
    payroll_tax_credit_elected: 600000,
  });
  // Full credit = $3M × 20% = $600k. Elected limited to $500k → remainder = $100k
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 100000);
});

Deno.test("no_payroll_election_full_credit_to_schedule3", () => {
  const result = compute({
    method: ResearchMethod.Regular,
    regular_wages: 200000,
    regular_base_amount: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20000);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({
    method: ResearchMethod.AlternativeSimplified,
    asc_current_qre: 100000,
    asc_prior_avg_qre: 0,
  });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
