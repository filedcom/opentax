import { assertEquals } from "@std/assert";
import { f1040 } from "./index.ts";

const ctx = {} as Parameters<typeof f1040.compute>[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function compute(input: Parameters<typeof f1040.compute>[1]) {
  return f1040.compute(ctx, input);
}

function fields(input: Parameters<typeof f1040.compute>[1]): Record<string, unknown> {
  const result = compute(input);
  return result.outputs[0].fields as Record<string, unknown>;
}

// ─── Node identity ────────────────────────────────────────────────────────────

Deno.test("f1040: nodeType is f1040", () => {
  assertEquals(f1040.nodeType, "f1040");
});

Deno.test("f1040: outputNodeTypes is empty (no downstream routing)", () => {
  assertEquals(f1040.outputNodeTypes.length, 0);
});

// ─── Self-emit ────────────────────────────────────────────────────────────────

Deno.test("f1040: compute returns one self-referencing output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("f1040: empty input emits zeros for computed lines", () => {
  const f = fields({});
  assertEquals(f.line9_total_income, 0);
  assertEquals(f.line11_agi, 0);
  assertEquals(f.line15_taxable_income, 0);
  assertEquals(f.line24_total_tax, 0);
  assertEquals(f.line33_total_payments, 0);
  assertEquals(f.line35a_refund, 0);
});

// ─── Line computations ────────────────────────────────────────────────────────

Deno.test("f1040: computes taxable income from agi and standard deduction", () => {
  const f = fields({ line11_agi: 80_000, line12a_standard_deduction: 15_000 });
  assertEquals(f.line15_taxable_income, 65_000);
});

Deno.test("f1040: taxable income cannot go below zero", () => {
  const f = fields({ line11_agi: 5_000, line12a_standard_deduction: 30_000 });
  assertEquals(f.line15_taxable_income, 0);
});

Deno.test("f1040: itemized deductions override standard deduction", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 15_000,
    line12e_itemized_deductions: 25_000,
  });
  assertEquals(f.line15_taxable_income, 75_000);
});

Deno.test("f1040: computes refund when payments exceed tax", () => {
  const f = fields({
    line11_agi: 50_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 4_000,
    line25a_w2_withheld: 6_000,
  });
  assertEquals(f.line24_total_tax, 4_000);
  assertEquals(f.line33_total_payments, 6_000);
  assertEquals(f.line35a_refund, 2_000);
});

Deno.test("f1040: computes amount owed when tax exceeds payments", () => {
  const f = fields({
    line11_agi: 120_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 20_000,
    line25a_w2_withheld: 15_000,
  });
  assertEquals(f.line24_total_tax, 20_000);
  assertEquals(f.line37_amount_owed, 5_000);
});

Deno.test("f1040: AMT added to line16 for total tax before credits", () => {
  const f = fields({ line16_income_tax: 10_000, line17_additional_taxes: 2_000 });
  assertEquals(f.line18_total_tax_before_credits, 12_000);
  assertEquals(f.line24_total_tax, 12_000);
});

Deno.test("f1040: child tax credit reduces tax", () => {
  const f = fields({ line16_income_tax: 5_000, line19_child_tax_credit: 2_000 });
  assertEquals(f.line22_tax_after_credits, 3_000);
  assertEquals(f.line24_total_tax, 3_000);
});

Deno.test("f1040: credits cannot make tax negative", () => {
  const f = fields({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 500,
  });
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(f.line24_total_tax, 0);
});

Deno.test("f1040: EITC included in total payments", () => {
  const f = fields({
    line16_income_tax: 500,
    line27_eitc: 3_600,
    line25a_w2_withheld: 1_000,
  });
  assertEquals(f.line33_total_payments, 4_600);
  assertEquals(f.line35a_refund, 4_100);
});

Deno.test("f1040: ACTC and refundable AOC included in payments", () => {
  const f = fields({ line28_actc: 1_500, line29_refundable_aoc: 1_000 });
  assertEquals(f.line33_total_payments, 2_500);
  assertEquals(f.line35a_refund, 2_500);
});

Deno.test("f1040: withholding from multiple sources aggregated", () => {
  const f = fields({
    line25a_w2_withheld: 10_000,
    line25b_withheld_1099: 2_000,
    line25c_additional_medicare_withheld: 500,
  });
  assertEquals(f.line33_total_payments, 12_500);
});

Deno.test("f1040: wage lines summed to line 1z", () => {
  const f = fields({
    line1a_wages: 60_000,
    line1c_unreported_tips: 500,
    line1g_wages_8919: 1_000,
  });
  assertEquals(f.line1z_total_wages, 61_500);
  assertEquals(f.line9_total_income, 61_500);
});

Deno.test("f1040: total income includes capital gains and interest", () => {
  const f = fields({
    line1a_wages: 50_000,
    line2b_taxable_interest: 500,
    line3b_ordinary_dividends: 1_000,
    line7_capital_gain: 5_000,
  });
  assertEquals(f.line9_total_income, 56_500);
});

Deno.test("f1040: QBI deduction reduces taxable income", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 15_000,
    line13_qbi_deduction: 5_000,
  });
  assertEquals(f.line15_taxable_income, 80_000);
});

Deno.test("f1040: accepts explicit line9 total income override", () => {
  const f = fields({
    line9_total_income: 200_000,
    line11_agi: 180_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 40_000,
  });
  assertEquals(f.line9_total_income, 200_000);
  assertEquals(f.line15_taxable_income, 165_000);
});
