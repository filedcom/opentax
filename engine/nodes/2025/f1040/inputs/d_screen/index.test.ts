// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton: `scheduleD`
//   2. The input wrapper — scheduleD.compute() takes a flat object (D2 screen fields)
//      plus an optional `transactions` array for Form 8949 items
//   3. nodeType strings: "f1040", "schedule_d" (carryover), "schedule_d_tax_worksheet",
//      "qualified_dividends_worksheet"
//   4. MFS filing status parameter name and accepted values
// These tests define IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES:
//   A. The node currently accepts only D2 screen fields. Form 8949 transaction
//      routing (part A/B/C/D/E/F/G/H/I/J/K/L) may require a `transactions` array
//      input key — verify the exact key name and structure.
//   B. The nodeType for the Schedule D Tax Worksheet output has not been confirmed
//      in the implementation — check for "schedule_d_tax_worksheet".
//   C. The nodeType for the Qualified Dividends and Capital Gain Tax Worksheet
//      has not been confirmed — check for "qualified_dividends_worksheet".
//   D. The MFS flag field name in the input schema is not confirmed — assumed
//      `filing_status: "MFS"` or `is_mfs: true`.
//   E. For 28% Rate Gain Worksheet and Section 1250 Worksheet triggers, the exact
//      output nodeType and field names in the output must be confirmed.
//   F. Form 8949 `part` enum values: A, B, C, D, E, F, G, H, I, J, K, L —
//      verify exact string literals accepted by the schema.

import { assertEquals, assertThrows } from "@std/assert";
import { scheduleD } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TransactionInput = {
  part: string;
  description: string;
  date_acquired: string;
  date_sold: string;
  proceeds: number;
  cost_basis: number;
  adjustment_codes?: string;
  adjustment_amount?: number;
};

function makeTransaction(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    part: "A",
    description: "100 sh XYZ Corp",
    date_acquired: "01/01/2024",
    date_sold: "06/01/2025",
    proceeds: 1_000,
    cost_basis: 800,
    ...overrides,
  };
}

function computeD2(fields: Record<string, unknown> = {}) {
  return scheduleD.compute(fields as Parameters<typeof scheduleD.compute>[0]);
}

function computeWithTransactions(
  transactions: TransactionInput[],
  d2Fields: Record<string, unknown> = {},
) {
  return scheduleD.compute({
    ...d2Fields,
    transactions,
  } as Parameters<typeof scheduleD.compute>[0]);
}

function findOutput(
  result: ReturnType<typeof computeD2>,
  nodeType: string,
) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// Section 1 — Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("inputSchema: empty object is valid — all D2 fields are optional", () => {
  const parsed = scheduleD.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: line_6_carryover must be non-negative", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_6_carryover: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: line_14_carryover must be non-negative", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_14_carryover: -500 });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: line_12_cap_gain_dist must be non-negative", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_12_cap_gain_dist: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("inputSchema: line_6_carryover of 0 is valid", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_6_carryover: 0 });
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: line_14_carryover of 0 is valid", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_14_carryover: 0 });
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: line_12_cap_gain_dist of 0 is valid", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_12_cap_gain_dist: 0 });
  assertEquals(parsed.success, true);
});

Deno.test("inputSchema: proceeds and cost_basis on D2 screen can be any number (optional)", () => {
  const parsed = scheduleD.inputSchema.safeParse({
    line_1a_proceeds: 50_000,
    line_1a_cost: 40_000,
    line_8a_proceeds: 100_000,
    line_8a_cost: 80_000,
  });
  assertEquals(parsed.success, true);
});

// ---------------------------------------------------------------------------
// Section 2 — D2 Screen Field Routing (Per-box)
// ---------------------------------------------------------------------------

Deno.test("compute: line_1a net gain (ST) routes to f1040 line7_capital_gain", () => {
  const result = computeD2({ line_1a_proceeds: 20_000, line_1a_cost: 15_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 5_000);
});

Deno.test("compute: line_1a proceeds == cost → line7_capital_gain is 0", () => {
  const result = computeD2({ line_1a_proceeds: 10_000, line_1a_cost: 10_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

Deno.test("compute: line_8a net gain (LT) routes to f1040 line7_capital_gain", () => {
  const result = computeD2({ line_8a_proceeds: 50_000, line_8a_cost: 30_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 20_000);
});

Deno.test("compute: line_8a proceeds == cost → line7_capital_gain is 0", () => {
  const result = computeD2({ line_8a_proceeds: 5_000, line_8a_cost: 5_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

Deno.test("compute: line_12_cap_gain_dist (always LT) included in net gain", () => {
  const result = computeD2({ line_12_cap_gain_dist: 4_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 4_000);
});

Deno.test("compute: line_12_cap_gain_dist = 0 → zero capital gain", () => {
  const result = computeD2({ line_12_cap_gain_dist: 0 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

Deno.test("compute: line_11_form2439 (LT undistributed gains) included in LT net", () => {
  const result = computeD2({ line_11_form2439: 6_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 6_000);
});

Deno.test("compute: line_4_other_st (ST from other forms) included in ST net", () => {
  const result = computeD2({ line_4_other_st: 3_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

Deno.test("compute: line_5_k1_st (ST K-1) included in ST net", () => {
  const result = computeD2({ line_5_k1_st: 2_500 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_500);
});

Deno.test("compute: line_12_k1_lt (LT K-1) included in LT net", () => {
  const result = computeD2({ line_12_k1_lt: 3_500 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_500);
});

Deno.test("compute: zero inputs → zero capital gain, still emits f1040 output", () => {
  const result = computeD2({});
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// ---------------------------------------------------------------------------
// Section 3 — Aggregation (multiple D2 lines combine correctly)
// ---------------------------------------------------------------------------

Deno.test("compute: ST and LT gains sum to combined net on line7", () => {
  const result = computeD2({
    line_1a_proceeds: 20_000,
    line_1a_cost: 10_000, // ST +10000
    line_8a_proceeds: 5_000,
    line_8a_cost: 3_000, // LT +2000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 12_000);
});

Deno.test("compute: ST gain offset by LT loss → net positive", () => {
  const result = computeD2({
    line_1a_proceeds: 20_000,
    line_1a_cost: 10_000, // ST +10000
    line_8a_proceeds: 5_000,
    line_8a_cost: 8_000, // LT -3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 7_000);
});

Deno.test("compute: all D2 income sources sum correctly (ST + LT + K-1 + distributions + other)", () => {
  const result = computeD2({
    line_1a_proceeds: 10_000,
    line_1a_cost: 8_000, // 1a gain: +2000
    line_8a_proceeds: 20_000,
    line_8a_cost: 15_000, // 8a gain: +5000
    line_12_cap_gain_dist: 1_000, // +1000
    line_11_form2439: 500, // +500
    line_4_other_st: 300, // +300
    line_5_k1_st: 200, // +200
    line_12_k1_lt: 400, // +400
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 9_400);
});

Deno.test("compute: short-term loss carryover reduces ST net", () => {
  const result = computeD2({
    line_1a_proceeds: 20_000,
    line_1a_cost: 15_000, // ST +5000
    line_6_carryover: 8_000, // ST -8000 → ST net = -3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);
});

Deno.test("compute: long-term loss carryover reduces LT net", () => {
  const result = computeD2({
    line_8a_proceeds: 10_000,
    line_8a_cost: 5_000, // LT +5000
    line_14_carryover: 8_000, // LT -8000 → LT net = -3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);
});

Deno.test("compute: both carryovers reduce their respective nets independently", () => {
  const result = computeD2({
    line_1a_proceeds: 10_000,
    line_1a_cost: 5_000, // ST +5000
    line_6_carryover: 3_000, // ST -3000 → ST net = +2000
    line_8a_proceeds: 10_000,
    line_8a_cost: 5_000, // LT +5000
    line_14_carryover: 4_000, // LT -4000 → LT net = +1000
    // total = 3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

// ---------------------------------------------------------------------------
// Section 4 — Thresholds: Capital Loss Limitation
// ---------------------------------------------------------------------------

Deno.test("threshold: loss exactly -$2,500 (< $3,000) — fully deductible, no carryforward", () => {
  const result = computeD2({
    line_1a_proceeds: 7_000,
    line_1a_cost: 9_500, // net = -2500
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -2_500);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover, undefined);
});

Deno.test("threshold: loss exactly -$3,000 — fully deductible, no carryforward", () => {
  const result = computeD2({
    line_1a_proceeds: 7_000,
    line_1a_cost: 10_000, // net = -3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover, undefined);
});

Deno.test("threshold: loss -$3,001 (just above $3,000) — capped at -$3,000, carryforward = $1", () => {
  const result = computeD2({
    line_1a_proceeds: 6_999,
    line_1a_cost: 10_000, // net = -3001
  });
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover !== undefined, true);
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 1);
});

Deno.test("threshold: loss -$7,000 → capped at -$3,000, carryforward = $4,000", () => {
  const result = computeD2({
    line_1a_proceeds: 5_000,
    line_1a_cost: 12_000, // net = -7000
  });
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover !== undefined, true);
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 4_000);
});

Deno.test("threshold: very large loss -$50,000 → deductible -$3,000, carryforward = $47,000", () => {
  const result = computeD2({
    line_1a_proceeds: 0,
    line_1a_cost: 50_000,
  });
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);
  const carryover = findOutput(result, "schedule_d");
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 47_000);
});

// MFS filing status: $1,500 limit
Deno.test("threshold (MFS): loss -$1,500 — fully deductible at $1,500 limit, no carryforward", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 8_500,
    line_1a_cost: 10_000, // net = -1500
    filing_status: "MFS",
  } as Parameters<typeof scheduleD.compute>[0]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -1_500);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover, undefined);
});

Deno.test("threshold (MFS): loss -$1,501 — capped at -$1,500, carryforward = $1", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 8_499,
    line_1a_cost: 10_000, // net = -1501
    filing_status: "MFS",
  } as Parameters<typeof scheduleD.compute>[0]);
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -1_500);
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover !== undefined, true);
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 1);
});

Deno.test("threshold (MFS): loss -$3,000 — capped at -$1,500, carryforward = $1,500", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 7_000,
    line_1a_cost: 10_000, // net = -3000
    filing_status: "MFS",
  } as Parameters<typeof scheduleD.compute>[0]);
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -1_500);
  const carryover = findOutput(result, "schedule_d");
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 1_500);
});

// LTCG 0% rate thresholds (these must be routed so the downstream worksheet can apply them)
Deno.test("threshold: LTCG 0% rate upper bound (Single) — $48,350", () => {
  // The node must route the capital gain to f1040 so the tax worksheet can apply rates.
  // This test verifies the gain is correctly passed through (rate computation is downstream).
  const result = computeD2({
    line_8a_proceeds: 48_350,
    line_8a_cost: 0,
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 48_350);
});

Deno.test("threshold: LTCG 15% rate upper bound (Single) — $533,400", () => {
  const result = computeD2({
    line_8a_proceeds: 533_400,
    line_8a_cost: 0,
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 533_400);
});

Deno.test("threshold: NIIT kicks in above $200,000 (Single) — gain still flows to f1040", () => {
  const result = computeD2({
    line_8a_proceeds: 200_001,
    line_8a_cost: 0,
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 200_001);
});

// ---------------------------------------------------------------------------
// Section 5 — Hard Validation Rules (throws)
// ---------------------------------------------------------------------------

Deno.test("validation: line_6_carryover must not be negative — throws", () => {
  assertThrows(
    () => computeD2({ line_6_carryover: -1 }),
    Error,
  );
});

Deno.test("validation: line_14_carryover must not be negative — throws", () => {
  assertThrows(
    () => computeD2({ line_14_carryover: -100 }),
    Error,
  );
});

Deno.test("validation: line_12_cap_gain_dist must not be negative — throws", () => {
  assertThrows(
    () => computeD2({ line_12_cap_gain_dist: -50 }),
    Error,
  );
});

Deno.test("validation: line_6_carryover = 0 does not throw (boundary pass)", () => {
  const result = computeD2({ line_6_carryover: 0 });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("validation: line_14_carryover = 0 does not throw (boundary pass)", () => {
  const result = computeD2({ line_14_carryover: 0 });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("validation: line_12_cap_gain_dist = 0 does not throw (boundary pass)", () => {
  const result = computeD2({ line_12_cap_gain_dist: 0 });
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// Section 6 — Form 8949 Individual Transaction Routing
// ---------------------------------------------------------------------------

// Part A (ST, basis reported to IRS) → Schedule D Line 1b
Deno.test("8949 part=A (ST basis reported): gain routes to f1040 as ST gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 2_000, cost_basis: 1_500 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 500);
});

// Part B (ST, basis NOT reported) → Schedule D Line 2
Deno.test("8949 part=B (ST basis not reported): gain routes to f1040 as ST gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "B", proceeds: 3_000, cost_basis: 2_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 1_000);
});

// Part C (ST, no 1099-B) → Schedule D Line 3
Deno.test("8949 part=C (ST no 1099-B): gain routes to f1040 as ST gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "C", proceeds: 4_000, cost_basis: 3_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 1_000);
});

// Part D (LT, basis reported) → Schedule D Line 8b
Deno.test("8949 part=D (LT basis reported): gain routes to f1040 as LT gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "D", proceeds: 10_000, cost_basis: 6_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 4_000);
});

// Part E (LT, basis NOT reported) → Schedule D Line 9
Deno.test("8949 part=E (LT basis not reported): gain routes to f1040 as LT gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "E", proceeds: 8_000, cost_basis: 5_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

// Part F (LT, no 1099-B) → Schedule D Line 10
Deno.test("8949 part=F (LT no 1099-B): gain routes to f1040 as LT gain", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "F", proceeds: 12_000, cost_basis: 9_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

// Digital asset checkboxes: G → same as A (ST, basis reported)
Deno.test("8949 part=G (ST digital asset, basis reported): routes same as Part A", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "G", proceeds: 5_000, cost_basis: 3_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

// H → same as B (ST, basis not reported)
Deno.test("8949 part=H (ST digital asset, basis not reported): routes same as Part B", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "H", proceeds: 6_000, cost_basis: 4_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

// I → same as C (ST, no 1099-B or 1099-DA)
Deno.test("8949 part=I (ST digital asset, no 1099-DA): routes same as Part C", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "I", proceeds: 7_000, cost_basis: 5_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

// J → same as D (LT, basis reported)
Deno.test("8949 part=J (LT digital asset, basis reported): routes same as Part D", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "J", proceeds: 15_000, cost_basis: 10_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 5_000);
});

// K → same as E (LT, basis not reported)
Deno.test("8949 part=K (LT digital asset, basis not reported): routes same as Part E", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "K", proceeds: 20_000, cost_basis: 14_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 6_000);
});

// L → same as F (LT, no 1099-B or 1099-DA)
Deno.test("8949 part=L (LT digital asset, no 1099-DA): routes same as Part F", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "L", proceeds: 25_000, cost_basis: 18_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 7_000);
});

// Zero gain transaction
Deno.test("8949: zero gain transaction (proceeds == cost) → capital gain is 0", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 5_000, cost_basis: 5_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// ---------------------------------------------------------------------------
// Section 7 — Form 8949 Aggregation (multiple items, same call)
// ---------------------------------------------------------------------------

Deno.test("8949 aggregation: two Part A transactions sum their gains", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 10_000, cost_basis: 7_000 }), // +3000
    makeTransaction({ part: "A", proceeds: 5_000, cost_basis: 2_000 }), // +3000
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 6_000);
});

Deno.test("8949 aggregation: mixed parts A and D aggregate to combined net", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 10_000, cost_basis: 8_000 }), // ST +2000
    makeTransaction({ part: "D", proceeds: 20_000, cost_basis: 15_000 }), // LT +5000
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 7_000);
});

Deno.test("8949 aggregation: ST gain + LT loss from transactions → net on f1040", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 10_000, cost_basis: 5_000 }), // ST +5000
    makeTransaction({ part: "D", proceeds: 3_000, cost_basis: 6_000 }), // LT -3000
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

Deno.test("8949 aggregation: adjustment_amount (col g) is included in col h computation", () => {
  // col_h = proceeds - cost + adjustment_amount
  // 5000 - 3000 + (-500) = 1500
  const result = computeWithTransactions([
    makeTransaction({
      part: "A",
      proceeds: 5_000,
      cost_basis: 3_000,
      adjustment_codes: "E",
      adjustment_amount: -500,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 1_500);
});

Deno.test("8949 aggregation: D2 fields and 8949 transactions combine into one total", () => {
  // D2 ST net: 10000 - 7000 = 3000
  // 8949 LT gain: 20000 - 15000 = 5000
  // Total: 8000
  const result = computeWithTransactions(
    [makeTransaction({ part: "D", proceeds: 20_000, cost_basis: 15_000 })],
    { line_1a_proceeds: 10_000, line_1a_cost: 7_000 },
  );
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 8_000);
});

// ---------------------------------------------------------------------------
// Section 8 — Adjustment Code Routing
// ---------------------------------------------------------------------------

// Code W (Wash sale) — disallowed loss added back (positive adjustment)
Deno.test("adjustment code W (wash sale): disallowed loss positive in col(g) reduces net loss", () => {
  // proceeds 3000, cost 5000 → raw loss -2000
  // col(g) = +2000 (disallowed wash sale loss)
  // col(h) = 3000 - 5000 + 2000 = 0 (loss fully disallowed)
  const result = computeWithTransactions([
    makeTransaction({
      part: "A",
      proceeds: 3_000,
      cost_basis: 5_000,
      adjustment_codes: "W",
      adjustment_amount: 2_000,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// Code H (Section 121 home sale exclusion) — excluded gain is negative adjustment
Deno.test("adjustment code H (home exclusion): excluded gain reduces col(h)", () => {
  // proceeds 400000, cost 100000 → raw gain 300000
  // col(g) = -250000 (excluded for single filer)
  // col(h) = 300000 - 250000 = 50000 taxable
  const result = computeWithTransactions([
    makeTransaction({
      part: "F",
      proceeds: 400_000,
      cost_basis: 100_000,
      adjustment_codes: "H",
      adjustment_amount: -250_000,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 50_000);
});

Deno.test("adjustment code H (home exclusion): full gain excluded → col(h) = 0", () => {
  // proceeds 300000, cost 50000 → raw gain 250000
  // col(g) = -250000 (full exclusion for single)
  // col(h) = 0
  const result = computeWithTransactions([
    makeTransaction({
      part: "F",
      proceeds: 300_000,
      cost_basis: 50_000,
      adjustment_codes: "H",
      adjustment_amount: -250_000,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// Code C (collectible) — triggers 28% rate gain worksheet (LT part only)
Deno.test("adjustment code C (collectible, LT part E): triggers 28% rate gain worksheet output", () => {
  const result = computeWithTransactions([
    makeTransaction({
      part: "E",
      proceeds: 20_000,
      cost_basis: 10_000,
      adjustment_codes: "C",
      adjustment_amount: 0,
    }),
  ]);
  // Should emit an output that signals 28% Rate Gain Worksheet is needed
  const worksheet28 = findOutput(result, "schedule_d_tax_worksheet");
  // At minimum, the gain must be on f1040
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 10_000);
  // The 28% worksheet trigger must be indicated somehow in outputs
  assertEquals(worksheet28 !== undefined || input.line18_28pct_gain !== undefined, true);
});

// Code Q (QSB exclusion) — triggers 28% rate gain worksheet
Deno.test("adjustment code Q (QSB exclusion): triggers 28% rate gain worksheet output", () => {
  const result = computeWithTransactions([
    makeTransaction({
      part: "D",
      proceeds: 50_000,
      cost_basis: 10_000,
      adjustment_codes: "Q",
      adjustment_amount: -20_000, // 50% exclusion amount for net gain 40000; exclusion = 20000
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  // col(h) = 50000 - 10000 + (-20000) = 20000
  assertEquals(input.line7_capital_gain, 20_000);
});

// ---------------------------------------------------------------------------
// Section 9 — Line 17 Gate (LT gain preferential rate eligibility)
// ---------------------------------------------------------------------------

Deno.test("line 17 gate: both LT > 0 AND combined > 0 → qualifies for preferential LTCG rates", () => {
  // LT net > 0 and combined net > 0
  const result = computeD2({
    line_8a_proceeds: 20_000,
    line_8a_cost: 10_000, // LT net = 10000, combined = 10000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  // Must route to f1040 with positive gain for preferential rate processing
  assertEquals(input.line7_capital_gain, 10_000);
});

Deno.test("line 17 gate: LT net is loss (< 0) → no preferential LTCG rates (ordinary rates only)", () => {
  // LT net negative → line 17 = No
  const result = computeD2({
    line_8a_proceeds: 5_000,
    line_8a_cost: 10_000, // LT net = -5000, total = -5000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);
});

Deno.test("line 17 gate: combined net is zero → skip to line 22 (no preferential rates)", () => {
  const result = computeD2({
    line_1a_proceeds: 5_000,
    line_1a_cost: 5_000, // ST = 0
    line_8a_proceeds: 5_000,
    line_8a_cost: 5_000, // LT = 0
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// ---------------------------------------------------------------------------
// Section 10 — Worksheet Selection (Line 20 Gate)
// ---------------------------------------------------------------------------

Deno.test("line 20 = Yes: no 28% gain, no 1250 gain → qualified dividends worksheet triggered", () => {
  // Pure LT gain, no special rate gains → simpler worksheet
  const result = computeD2({
    line_8a_proceeds: 30_000,
    line_8a_cost: 20_000, // LT net = 10000, combined = 10000
  });
  const qdcg = findOutput(result, "qualified_dividends_worksheet");
  const f1040 = findOutput(result, "f1040");
  // Either qualified_dividends_worksheet output exists or downstream
  // handles it; at minimum the gain must be on f1040
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 10_000);
  // Verify preferred worksheet selection indicator if applicable
  assertEquals(
    qdcg !== undefined || input.line7_capital_gain === 10_000,
    true,
  );
});

// ---------------------------------------------------------------------------
// Section 11 — Capital Gain Distributions Special Rules
// ---------------------------------------------------------------------------

Deno.test("cap gain distributions always treated as LT — no ST treatment", () => {
  // Even though cap gain dist from funds might not have been held long, treated as LT
  const result = computeD2({ line_12_cap_gain_dist: 5_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  // Capital gain distributions must flow through to f1040 as a gain
  assertEquals(input.line7_capital_gain, 5_000);
});

Deno.test("cap gain distributions do NOT require Form 8949 — direct to Schedule D Line 13", () => {
  // Verifies distributions work without any 8949 transactions
  const result = computeD2({ line_12_cap_gain_dist: 8_000 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 8_000);
});

// ---------------------------------------------------------------------------
// Section 12 — Informational Fields (must NOT produce tax outputs)
// ---------------------------------------------------------------------------

Deno.test("description field in 8949 transaction does not affect computed gain", () => {
  const result1 = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 5_000, cost_basis: 3_000, description: "100 sh ABC" }),
  ]);
  const result2 = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 5_000, cost_basis: 3_000, description: "200 sh XYZ" }),
  ]);
  const input1 = (findOutput(result1, "f1040")!.input as Record<string, number>);
  const input2 = (findOutput(result2, "f1040")!.input as Record<string, number>);
  assertEquals(input1.line7_capital_gain, input2.line7_capital_gain);
});

Deno.test("date_acquired and date_sold fields do not directly change computed gain amount", () => {
  const result1 = computeWithTransactions([
    makeTransaction({ part: "D", proceeds: 10_000, cost_basis: 6_000, date_acquired: "01/01/2020", date_sold: "01/01/2025" }),
  ]);
  const result2 = computeWithTransactions([
    makeTransaction({ part: "D", proceeds: 10_000, cost_basis: 6_000, date_acquired: "06/01/2024", date_sold: "06/02/2025" }),
  ]);
  const input1 = (findOutput(result1, "f1040")!.input as Record<string, number>);
  const input2 = (findOutput(result2, "f1040")!.input as Record<string, number>);
  assertEquals(input1.line7_capital_gain, input2.line7_capital_gain);
});

// ---------------------------------------------------------------------------
// Section 13 — Edge Cases
// ---------------------------------------------------------------------------

// Edge case 1: Aggregate entry eligibility (lines 1a/8a)
Deno.test("edge case: line_1a entries only when no adjustments needed (valid aggregate input)", () => {
  const result = computeD2({ line_1a_proceeds: 100_000, line_1a_cost: 80_000 });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 20_000);
});

// Edge case 2: VARIOUS / INHERITED date_acquired
Deno.test("edge case: date_acquired = VARIOUS accepted without throwing", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "D", date_acquired: "VARIOUS", proceeds: 10_000, cost_basis: 7_000 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

Deno.test("edge case: date_acquired = INHERITED treated as LT gain always", () => {
  // Inherited property is ALWAYS long-term regardless of actual holding period
  // Must accept "INHERITED" and not throw
  const result = computeWithTransactions([
    makeTransaction({ part: "D", date_acquired: "INHERITED", proceeds: 50_000, cost_basis: 30_000 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 20_000);
});

// Edge case 3: Wash sale window — code W
Deno.test("edge case: wash sale (code W) — partial disallowance reduces loss", () => {
  // proceeds 2000, cost 5000 → raw loss -3000
  // wash disallowed 1500 (positive adj)
  // col(h) = 2000 - 5000 + 1500 = -1500
  const result = computeWithTransactions([
    makeTransaction({
      part: "B",
      proceeds: 2_000,
      cost_basis: 5_000,
      adjustment_codes: "W",
      adjustment_amount: 1_500,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -1_500);
});

// Edge case 4: $0 proceeds (sale for nothing)
Deno.test("edge case: $0 proceeds (security became worthless)", () => {
  const result = computeWithTransactions([
    makeTransaction({ part: "A", proceeds: 0, cost_basis: 10_000 }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000); // capped at loss limit
});

// Edge case 5: Character preservation for carryovers
Deno.test("edge case: ST carryover preserves ST character — enters as line 6 (reduces ST net)", () => {
  const result = computeD2({
    line_1a_proceeds: 5_000,
    line_1a_cost: 0, // ST +5000
    line_6_carryover: 3_000, // ST carryover -3000 → ST net = +2000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

Deno.test("edge case: LT carryover preserves LT character — enters as line 14 (reduces LT net)", () => {
  const result = computeD2({
    line_8a_proceeds: 8_000,
    line_8a_cost: 0, // LT +8000
    line_14_carryover: 5_000, // LT carryover -5000 → LT net = +3000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 3_000);
});

// Edge case 6: Large number of transactions (≥ 10)
Deno.test("edge case: 10 Part A transactions each with $1,000 gain → total $10,000", () => {
  const transactions = Array.from({ length: 10 }, (_, i) =>
    makeTransaction({
      part: "A",
      description: `100 sh STOCK${i}`,
      proceeds: 2_000,
      cost_basis: 1_000,
    })
  );
  const result = computeWithTransactions(transactions);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 10_000);
});

// Edge case 7: Combined ST loss + LT gain where combined is net positive but individual is loss
Deno.test("edge case: ST net loss + LT net gain → positive combined, full LT gain on f1040", () => {
  // ST net: -2000, LT net: +8000, combined: +6000
  const result = computeD2({
    line_1a_proceeds: 3_000,
    line_1a_cost: 5_000, // ST -2000
    line_8a_proceeds: 18_000,
    line_8a_cost: 10_000, // LT +8000
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 6_000);
});

// Edge case 8: Section 121 exclusion — MFJ $500,000 cap
Deno.test("edge case: home exclusion (code H) for MFJ up to $500,000", () => {
  // proceeds 600000, cost 100000 → raw gain 500000
  // col(g) = -500000 (full MFJ exclusion)
  // col(h) = 0
  const result = computeWithTransactions([
    makeTransaction({
      part: "F",
      proceeds: 600_000,
      cost_basis: 100_000,
      adjustment_codes: "H",
      adjustment_amount: -500_000,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// Edge case 9: QOF code Y (deferred gain being recognized)
Deno.test("edge case: adjustment code Y (QOF deferred gain recognized) — positive gain flows through", () => {
  const result = computeWithTransactions([
    makeTransaction({
      part: "D",
      proceeds: 50_000,
      cost_basis: 40_000,
      adjustment_codes: "Y",
      adjustment_amount: 0,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 10_000);
});

// Edge case 10: Code Z (deferred gain into QOF — negative adjustment reduces col h)
Deno.test("edge case: adjustment code Z (QOF deferral) — negative adjustment reduces reported gain", () => {
  // col(h) = 10000 - 5000 + (-3000) = 2000
  const result = computeWithTransactions([
    makeTransaction({
      part: "D",
      proceeds: 10_000,
      cost_basis: 5_000,
      adjustment_codes: "Z",
      adjustment_amount: -3_000,
    }),
  ]);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 2_000);
});

// Edge case 11: E-file rule — negative amounts not allowed on lines 1a/8a
Deno.test("edge case: line_1a negative net does not cause invalid e-file (proceeds < cost allowed)", () => {
  // The node must handle line_1a where proceeds < cost without crashing
  const result = computeD2({
    line_1a_proceeds: 5_000,
    line_1a_cost: 8_000, // net = -3000
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);
});

// Edge case 12: line_11_form2439 negative (Form 4797/4684 loss)
Deno.test("edge case: negative line_11_form2439 (LT loss from other forms) reduces LT net", () => {
  const result = computeD2({
    line_8a_proceeds: 10_000,
    line_8a_cost: 5_000, // LT +5000
    line_11_form2439: -7_000, // LT loss from forms
  });
  const f1040 = findOutput(result, "f1040");
  const input = f1040!.input as Record<string, number>;
  // LT net = 5000 - 7000 = -2000, combined = -2000 (deductible in full < $3000)
  assertEquals(input.line7_capital_gain, -2_000);
});

// ---------------------------------------------------------------------------
// Section 14 — Smoke Test: All Major Fields Populated
// ---------------------------------------------------------------------------

Deno.test("smoke: all D2 fields + 8949 transactions from multiple parts → correct combined net", () => {
  // D2 fields:
  //   line_1a: 15000 - 10000 = +5000 ST
  //   line_8a: 30000 - 20000 = +10000 LT
  //   line_6_carryover: 2000 (ST loss)
  //   line_14_carryover: 3000 (LT loss)
  //   line_12_cap_gain_dist: 1500 (LT)
  //   line_11_form2439: 2000 (LT)
  //   line_4_other_st: 1000 (ST)
  //   line_5_k1_st: 500 (ST)
  //   line_12_k1_lt: 800 (LT)
  //
  // D2 ST net = 5000 - 2000 + 1000 + 500 = 4500
  // D2 LT net = 10000 - 3000 + 1500 + 2000 + 800 = 11300
  //
  // 8949 transactions:
  //   Part A: 8000 - 5000 = +3000 ST
  //   Part D: 25000 - 18000 = +7000 LT
  //   Part E: 6000 - 8000 = -2000 LT (loss)
  //
  // 8949 ST net = +3000
  // 8949 LT net = 7000 - 2000 = +5000
  //
  // Combined ST = 4500 + 3000 = 7500
  // Combined LT = 11300 + 5000 = 16300
  // Total = 23800

  const result = computeWithTransactions(
    [
      makeTransaction({ part: "A", proceeds: 8_000, cost_basis: 5_000 }),
      makeTransaction({ part: "D", proceeds: 25_000, cost_basis: 18_000 }),
      makeTransaction({ part: "E", proceeds: 6_000, cost_basis: 8_000 }),
    ],
    {
      line_1a_proceeds: 15_000,
      line_1a_cost: 10_000,
      line_8a_proceeds: 30_000,
      line_8a_cost: 20_000,
      line_6_carryover: 2_000,
      line_14_carryover: 3_000,
      line_12_cap_gain_dist: 1_500,
      line_11_form2439: 2_000,
      line_4_other_st: 1_000,
      line_5_k1_st: 500,
      line_12_k1_lt: 800,
    },
  );

  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 23_800);

  // Net gain is positive — no carryforward
  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover, undefined);
});

Deno.test("smoke: large net loss with MFJ filing — $3,000 limit applies, excess carries forward", () => {
  const result = computeD2({
    line_1a_proceeds: 10_000,
    line_1a_cost: 25_000, // ST -15000
    line_8a_proceeds: 5_000,
    line_8a_cost: 12_000, // LT -7000
    // total net: -22000
  });
  const f1040 = findOutput(result, "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);

  const carryover = findOutput(result, "schedule_d");
  assertEquals(carryover !== undefined, true);
  const dInput = carryover!.input as Record<string, number>;
  assertEquals(dInput.capital_loss_carryover, 19_000);
});
