import { assertEquals } from "@std/assert";
import { schedule_se, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_se.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// Round to cents for SE tax assertions
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── TY2025 constants ──────────────────────────────────────────────────────────
const SS_WAGE_BASE = 176_100;
const NE_MULTIPLIER = 0.9235;
const SS_RATE = 0.124;
const MEDICARE_RATE = 0.029;
const SE_DEDUCTION_RATE = 0.50;

// W-2 wages do NOT offset the SE SS wage base (per CCH ground truth).
// Only unreported tips (Form 4137) and Form 8919 wages reduce the base.
function computeExpectedSeTax(
  netProfit: number,
  unreportedTips = 0,
  wages8919 = 0,
): { seTax: number; seDeduction: number } {
  const line3 = netProfit;
  const line4a = line3 > 0 ? line3 * NE_MULTIPLIER : line3;
  const line6 = line4a;
  const line9 = Math.max(0, SS_WAGE_BASE - unreportedTips - wages8919);
  const line10 = Math.min(line6, line9) * SS_RATE;
  const line11 = line6 * MEDICARE_RATE;
  const line12 = line10 + line11;
  const line13 = line12 * SE_DEDUCTION_RATE;
  return { seTax: line12, seDeduction: line13 };
}

// ── Input validation ─────────────────────────────────────────────────────────

Deno.test("input_validation_empty: all fields absent → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("input_validation_zero_profit: net_profit_schedule_c=0 → no outputs", () => {
  const result = compute({ net_profit_schedule_c: 0 });
  assertEquals(result.outputs.length, 0);
});

// ── SE threshold ─────────────────────────────────────────────────────────────

Deno.test("threshold_below_400: net_profit_schedule_c=399 → no SE tax (below $400 threshold)", () => {
  const result = compute({ net_profit_schedule_c: 399 });
  assertEquals(result.outputs.length, 0);
});

// The $400 threshold is applied to line 4a (post-92.35% multiplier), not raw net profit.
// min raw profit for SE tax: 400 / 0.9235 ≈ 433.24 → use 434 as "at threshold"
Deno.test("threshold_at_multiplied_400: raw profit 434 → line4a=400.60 ≥ $400 → SE tax computed", () => {
  // 434 × 0.9235 = 400.60 ≥ 400 → SE tax owed
  const result = compute({ net_profit_schedule_c: 434 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
});

Deno.test("threshold_just_below_multiplied_400: raw profit 433 → line4a=399.88 < $400 → no SE tax", () => {
  // 433 × 0.9235 = 399.88 < 400 → below threshold
  const result = compute({ net_profit_schedule_c: 433 });
  assertEquals(result.outputs.length, 0);
});

// ── Per-field calculation — Schedule C ──────────────────────────────────────

Deno.test("calc_schedule_c_basic: net_profit_schedule_c=10000 → correct SE tax", () => {
  const profit = 10_000;
  const result = compute({ net_profit_schedule_c: profit });
  const s2 = findOutput(result, "schedule2");
  const s1 = findOutput(result, "schedule1");

  const { seTax, seDeduction } = computeExpectedSeTax(profit);
  assertEquals(s2 !== undefined, true);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
  assertEquals(s1 !== undefined, true);
  assertEquals(round2(s1!.fields.line15_se_deduction as number), round2(seDeduction));
});

Deno.test("calc_schedule_c_large: net_profit_schedule_c=200000 → SE tax uses full wage base", () => {
  const profit = 200_000;
  const result = compute({ net_profit_schedule_c: profit });
  const s2 = findOutput(result, "schedule2");
  const s1 = findOutput(result, "schedule1");

  const { seTax, seDeduction } = computeExpectedSeTax(profit);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
  assertEquals(round2(s1!.fields.line15_se_deduction as number), round2(seDeduction));
});

// ── Per-field calculation — Schedule F (farm) ────────────────────────────────

Deno.test("calc_schedule_f_basic: net_profit_schedule_f=5000 → SE tax computed from farm income", () => {
  const profit = 5_000;
  const result = compute({ net_profit_schedule_f: profit });
  const s2 = findOutput(result, "schedule2");
  const s1 = findOutput(result, "schedule1");

  const { seTax, seDeduction } = computeExpectedSeTax(profit);
  assertEquals(s2 !== undefined, true);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
  assertEquals(round2(s1!.fields.line15_se_deduction as number), round2(seDeduction));
});

Deno.test("calc_schedule_f_below_400: net_profit_schedule_f=300 → no SE tax", () => {
  const result = compute({ net_profit_schedule_f: 300 });
  assertEquals(result.outputs.length, 0);
});

// ── Per-field calculation — combined Schedule C + F ──────────────────────────

Deno.test("calc_combined_c_and_f: schedule_c + schedule_f profits are summed", () => {
  const cProfit = 3_000;
  const fProfit = 2_000;
  const result = compute({
    net_profit_schedule_c: cProfit,
    net_profit_schedule_f: fProfit,
  });
  const s2 = findOutput(result, "schedule2");

  const { seTax } = computeExpectedSeTax(cProfit + fProfit);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
});

Deno.test("calc_combined_c_below_f_above: c=200 + f=300 = 500 ≥ $400 → SE tax computed", () => {
  const result = compute({ net_profit_schedule_c: 200, net_profit_schedule_f: 300 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
});

// ── SE deduction (line 13 = line 12 × 50%) ───────────────────────────────────

Deno.test("calc_se_deduction_is_half: deduction = SE tax × 0.50", () => {
  const result = compute({ net_profit_schedule_c: 50_000 });
  const s2 = findOutput(result, "schedule2");
  const s1 = findOutput(result, "schedule1");

  const seTax = s2!.fields.line4_se_tax as number;
  const seDeduction = s1!.fields.line15_se_deduction as number;
  assertEquals(round2(seDeduction), round2(seTax * SE_DEDUCTION_RATE));
});

// ── SS wage base threshold ────────────────────────────────────────────────────
// W-2 wages do NOT reduce the SE SS wage base. The W2/SE overlap creates an
// excess SS credit on Schedule 3 line 11 — NOT a reduction in SE tax itself.

Deno.test("threshold_wage_base_full: no tip/8919 offsets → full SS rate on full base", () => {
  const profit = 50_000;
  const result = compute({ net_profit_schedule_c: profit });
  const s2 = findOutput(result, "schedule2");

  const { seTax } = computeExpectedSeTax(profit);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
});

Deno.test("threshold_wage_base_partial_offset: unreported_tips reduce SS portion, w2 wages do not", () => {
  const profit = 100_000;
  const tips = 100_000;
  const result = compute({ net_profit_schedule_c: profit, unreported_tips_4137: tips });
  const s2 = findOutput(result, "schedule2");

  const { seTax } = computeExpectedSeTax(profit, tips);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
});

Deno.test("threshold_wage_base_fully_consumed: tips >= 176100 → only Medicare tax", () => {
  const profit = 50_000;
  const result = compute({ net_profit_schedule_c: profit, unreported_tips_4137: SS_WAGE_BASE });
  const s2 = findOutput(result, "schedule2");

  // line9 = 0, line10 = 0, only Medicare = line6 × 2.9%
  const line6 = profit * NE_MULTIPLIER;
  const expectedSeTax = line6 * MEDICARE_RATE; // no SS portion
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(expectedSeTax));
});

Deno.test("threshold_wage_base_exceeded: tips > base → still only Medicare", () => {
  const profit = 50_000;
  const result = compute({ net_profit_schedule_c: profit, unreported_tips_4137: 200_000 });
  const s2 = findOutput(result, "schedule2");

  const line6 = profit * NE_MULTIPLIER;
  const expectedSeTax = line6 * MEDICARE_RATE;
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(expectedSeTax));
});

// ── unreported_tips_4137 offsets wage base ───────────────────────────────────

Deno.test("offset_unreported_tips: unreported_tips_4137 reduces available SS wage base", () => {
  const profit = 50_000;
  const tips = 10_000;
  const result = compute({ net_profit_schedule_c: profit, unreported_tips_4137: tips });
  const s2 = findOutput(result, "schedule2");

  const { seTax } = computeExpectedSeTax(profit, tips);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
});

// ── wages_8919 offsets wage base ─────────────────────────────────────────────

Deno.test("offset_wages_8919: wages_8919 reduces available SS wage base", () => {
  const profit = 50_000;
  const wages8919 = 20_000;
  const result = compute({ net_profit_schedule_c: profit, wages_8919: wages8919 });
  const s2 = findOutput(result, "schedule2");

  const { seTax } = computeExpectedSeTax(profit, 0, wages8919);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(seTax));
});

// ── Output routing ───────────────────────────────────────────────────────────

Deno.test("routing_schedule2: SE tax routes to schedule2 with field line4_se_tax", () => {
  const result = compute({ net_profit_schedule_c: 10_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  assertEquals(typeof s2!.fields.line4_se_tax, "number");
});

Deno.test("routing_schedule1: SE deduction routes to schedule1 with field line15_se_deduction", () => {
  const result = compute({ net_profit_schedule_c: 10_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(typeof s1!.fields.line15_se_deduction, "number");
});

Deno.test("routing_exactly_two_outputs: exactly schedule2, schedule1, agi_aggregator, and form8959 for standard case", () => {
  const result = compute({ net_profit_schedule_c: 10_000 });
  assertEquals(result.outputs.length, 4);
});

// ── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("edge_negative_net_profit: negative Schedule C profit → no SE tax", () => {
  const result = compute({ net_profit_schedule_c: -5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("edge_combined_loss_nets_below_threshold: c=1000 + f=-800 = 200 < $400 → no SE tax", () => {
  const result = compute({ net_profit_schedule_c: 1_000, net_profit_schedule_f: -800 });
  assertEquals(result.outputs.length, 0);
});

// Combined = 434 (= 1000 + (-566)); 434 × 0.9235 = 400.60 ≥ $400 → SE tax computed
Deno.test("edge_combined_nets_above_multiplied_threshold: c=1000 + f=-566 = 434 → line4a ≥ $400 → SE tax", () => {
  const result = compute({ net_profit_schedule_c: 1_000, net_profit_schedule_f: -566 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
});

Deno.test("edge_all_offsets: tips + 8919 fully consume wage base → only Medicare", () => {
  const profit = 80_000;
  const result = compute({
    net_profit_schedule_c: profit,
    unreported_tips_4137: 100_000,
    wages_8919: 100_000, // total offsets = 200,000 > 176,100
  });
  const s2 = findOutput(result, "schedule2");

  const line6 = profit * NE_MULTIPLIER;
  const expectedSeTax = line6 * MEDICARE_RATE;
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(expectedSeTax));
});

// ── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke_all_fields: full scenario with C+F profit, tips, 8919 (w2 wages do not offset)", () => {
  const cProfit = 60_000;
  const fProfit = 10_000;
  const tips = 5_000;
  const wages8919 = 3_000;

  const result = compute({
    net_profit_schedule_c: cProfit,
    net_profit_schedule_f: fProfit,
    unreported_tips_4137: tips,
    wages_8919: wages8919,
  });

  const s2 = findOutput(result, "schedule2");
  const s1 = findOutput(result, "schedule1");

  // Compute expected — w2 wages excluded from offset per IRS SE tax rules
  const line3 = cProfit + fProfit;
  const line6 = line3 * NE_MULTIPLIER;
  const line9 = Math.max(0, SS_WAGE_BASE - tips - wages8919);
  const line10 = Math.min(line6, line9) * SS_RATE;
  const line11 = line6 * MEDICARE_RATE;
  const expectedSeTax = line10 + line11;
  const expectedDeduction = expectedSeTax * SE_DEDUCTION_RATE;

  assertEquals(s2 !== undefined, true);
  assertEquals(s1 !== undefined, true);
  assertEquals(round2(s2!.fields.line4_se_tax as number), round2(expectedSeTax));
  assertEquals(round2(s1!.fields.line15_se_deduction as number), round2(expectedDeduction));
  assertEquals(result.outputs.length, 4);
});
