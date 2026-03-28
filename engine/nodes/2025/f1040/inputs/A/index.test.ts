import { assertEquals } from "@std/assert";
import { scheduleA } from "./index.ts";

// ---- Unit: medical deduction ----

Deno.test("scheduleA.compute: medical deduction applies 7.5% AGI floor", () => {
  const result = scheduleA.compute({
    line_1_medical: 10_000,
    agi: 80_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // deduction = 10000 - (80000 * 0.075) = 10000 - 6000 = 4000
  assertEquals(input.line12e_itemized_deductions, 4_000);
});

Deno.test("scheduleA.compute: medical deduction floors at zero when expenses < AGI floor", () => {
  const result = scheduleA.compute({
    line_1_medical: 3_000,
    agi: 80_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // deduction = max(0, 3000 - 6000) = 0
  assertEquals(input.line12e_itemized_deductions, 0);
});

// ---- Unit: SALT cap ----

Deno.test("scheduleA.compute: SALT below $40,000 cap passes through unchanged", () => {
  const result = scheduleA.compute({
    line_5a_tax_amount: 10_000,
    line_5b_real_estate_tax: 5_000,
    line_5c_personal_property_tax: 2_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line12e_itemized_deductions, 17_000);
});

Deno.test("scheduleA.compute: SALT above $40,000 is capped at $40,000", () => {
  const result = scheduleA.compute({
    line_5a_tax_amount: 30_000,
    line_5b_real_estate_tax: 15_000,
    line_5c_personal_property_tax: 5_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // saltTotal = 50000, capped at 40000
  assertEquals(input.line12e_itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: taxes > 0 emits form6251 AMT addback", () => {
  const result = scheduleA.compute({
    line_5a_tax_amount: 15_000,
    line_6_other_taxes: 2_000,
  });

  const form6251 = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(form6251 !== undefined, true);
  const input = form6251!.input as Record<string, number>;
  // saltCapped = 15000, taxesTotal = 15000 + 2000 = 17000
  assertEquals(input.line2a_taxes_paid, 17_000);
});

Deno.test("scheduleA.compute: no taxes means no form6251 output", () => {
  const result = scheduleA.compute({
    line_11_cash_contributions: 500,
  });

  const form6251 = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(form6251, undefined);
});

// ---- Unit: interest ----

Deno.test("scheduleA.compute: all interest lines sum correctly", () => {
  const result = scheduleA.compute({
    line_8a_mortgage_interest_1098: 10_000,
    line_8b_mortgage_interest_no_1098: 2_000,
    line_8c_points_no_1098: 500,
    line_9_investment_interest: 1_500,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line12e_itemized_deductions, 14_000);
});

// ---- Unit: charitable contributions AGI limit ----

Deno.test("scheduleA.compute: contributions below 60% AGI limit pass through", () => {
  const result = scheduleA.compute({
    line_11_cash_contributions: 5_000,
    agi: 100_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line12e_itemized_deductions, 5_000);
});

Deno.test("scheduleA.compute: contributions capped at 60% of AGI", () => {
  const result = scheduleA.compute({
    line_11_cash_contributions: 80_000,
    agi: 100_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // cap = 100000 * 0.60 = 60000
  assertEquals(input.line12e_itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: carryover contributions count toward AGI limit", () => {
  const result = scheduleA.compute({
    line_11_cash_contributions: 40_000,
    line_13_contribution_carryover: 30_000,
    agi: 100_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // raw = 70000, cap = 60000 → capped at 60000
  assertEquals(input.line12e_itemized_deductions, 60_000);
});

// ---- Unit: combined deductions ----

Deno.test("scheduleA.compute: full deduction scenario sums all categories", () => {
  const result = scheduleA.compute({
    line_1_medical: 12_000,
    agi: 100_000,
    line_5a_tax_amount: 12_000,
    line_5b_real_estate_tax: 6_000,
    line_8a_mortgage_interest_1098: 15_000,
    line_11_cash_contributions: 3_000,
    line_15_casualty_theft_loss: 2_000,
    line_16_other_deductions: 500,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // medical = 12000 - 7500 = 4500
  // salt = 12000 + 6000 = 18000 (under cap)
  // interest = 15000
  // contributions = 3000 (under cap)
  // casualty = 2000
  // other = 500
  // total = 4500 + 18000 + 15000 + 3000 + 2000 + 500 = 43000
  assertEquals(input.line12e_itemized_deductions, 43_000);
});

// ---- Unit: inputSchema validation ----

Deno.test("scheduleA.inputSchema: empty object is valid (all optional fields)", () => {
  const parsed = scheduleA.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.inputSchema: negative medical expenses fail validation", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: force_itemized boolean is valid", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: true });
  assertEquals(parsed.success, true);
});

// ---- Unit: zero-input behavior ----

Deno.test("scheduleA.compute: zero inputs produce zero itemized deduction", () => {
  const result = scheduleA.compute({});
  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line12e_itemized_deductions, 0);
});
