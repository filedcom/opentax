import { assertEquals, assertThrows } from "@std/assert";
import { form4972, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../schedule2/index.ts";

function compute(input: Record<string, unknown>) {
  return form4972.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

Deno.test("form4972.compute: no output when born_before_1936 = false", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    born_before_1936: false,
    elect_10yr_averaging: true,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form4972.compute: no output when born_before_1936 absent", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    elect_10yr_averaging: true,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form4972.compute: no output when no election made", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    born_before_1936: true,
    elect_capital_gain: false,
    elect_10yr_averaging: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Part II: Capital Gain Election (20%) ─────────────────────────────────────

Deno.test("form4972.compute: Part II only — 20% on capital gain amount", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    capital_gain_amount: 30_000,
    born_before_1936: true,
    elect_capital_gain: true,
    elect_10yr_averaging: false,
  });
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule2)!;
  // 30,000 × 20% = 6,000
  assertEquals(input.lump_sum_tax, 6_000);
});

Deno.test("form4972.compute: Part II — zero tax when capital_gain_amount = 0", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    capital_gain_amount: 0,
    born_before_1936: true,
    elect_capital_gain: true,
    elect_10yr_averaging: false,
  });
  // No tax from Part II (zero capital gain), and no Part III → no output
  assertEquals(result.outputs.length, 0);
});

Deno.test("form4972.compute: Part II — no capital_gain_amount defaults to 0", () => {
  const result = compute({
    lump_sum_amount: 100_000,
    born_before_1936: true,
    elect_capital_gain: true,
    elect_10yr_averaging: false,
  });
  // No capital gain specified → no Part II tax → no output
  assertEquals(result.outputs.length, 0);
});

// ─── Part III: 10-Year Averaging ──────────────────────────────────────────────

Deno.test("form4972.compute: Part III only — 10-year averaging on small distribution", () => {
  // $10,000 lump sum, no capital gain
  // 1/10 = $1,000
  // 1986 rate on $1,000: $1,000 × 11% = $110
  // × 10 = $1,100 tentative tax
  // MDA: min($10,000, 50% × $10,000) = $5,000; no phase-out since $10,000 ≤ $20,000
  // Tax reduction from MDA: need tax on $5,000 × 1/10 = $500 → $500 × 11% = $55 → × 10 = $550
  // Actually MDA reduction = 20% × MDA = 20% × 5,000 = 1,000?
  // No — MDA reduces tax differently. Let me use the actual form line math:
  // Line 13 = $1,100 (tentative)
  // Line 14 = 1/10 × MDA = 1/10 × $5,000 = $500
  // Line 15 = tax on line 14 using 1986 rate = $500 × 11% = $55
  // Line 16 = line 15 × 10 = $550
  // Line 17 = line 13 - line 16 = $1,100 - $550 = $550
  const result = compute({
    lump_sum_amount: 10_000,
    born_before_1936: true,
    elect_10yr_averaging: true,
    elect_capital_gain: false,
  });
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.lump_sum_tax, 550);
});

Deno.test("form4972.compute: Part III — large distribution, MDA phases out", () => {
  // $100,000 lump sum — MDA should be 0 (since 100,000 > 70,000)
  // 1/10 = $10,000
  // Tax on $10,000 using 1986 brackets:
  //   $2,480 × 11% = $272.80
  //   ($3,670-$2,480)=$1,190 × 12% = $142.80
  //   ($5,940-$3,670)=$2,270 × 14% = $317.80
  //   ($8,200-$5,940)=$2,260 × 15% = $339.00
  //   ($10,000-$8,200)=$1,800 × 16% = $288.00
  //   Total = $272.80+$142.80+$317.80+$339.00+$288.00 = $1,360.40 → floor = $1,360
  // × 10 = $13,600 (no MDA reduction)
  const result = compute({
    lump_sum_amount: 100_000,
    born_before_1936: true,
    elect_10yr_averaging: true,
    elect_capital_gain: false,
  });
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.lump_sum_tax, 13_600);
});

Deno.test("form4972.compute: Part III — death benefit exclusion reduces ordinary income", () => {
  // $20,000 lump sum, $5,000 death benefit exclusion
  // Ordinary income = $20,000 − $5,000 = $15,000
  // 1/10 = $1,500
  // Tax on $1,500:
  //   $1,500 × 11% = $165
  // × 10 = $1,650 tentative tax
  // MDA: min($10,000, 50% × $15,000) = min($10,000, $7,500) = $7,500
  //   Phase-out: $20,000 ≤ $20,000 → no phase-out?
  //   Wait: the taxable amount here is the ORDINARY income = $15,000 ≤ $20,000
  //   So MDA = min($10,000, $7,500) = $7,500
  // Line 14 = $7,500 / 10 = $750
  // Tax on $750 = $750 × 11% = $82.50 → floor = $82
  // Line 16 = $82 × 10 = $820
  // Line 17 = $1,650 - $820 = $830
  const result = compute({
    lump_sum_amount: 20_000,
    born_before_1936: true,
    elect_10yr_averaging: true,
    elect_capital_gain: false,
    death_benefit_exclusion: 5_000,
  });
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.lump_sum_tax, 830);
});

// ─── Parts II + III combined ──────────────────────────────────────────────────

Deno.test("form4972.compute: Part II + Part III combined", () => {
  // $100,000 total, $10,000 capital gain (Part II elected)
  // Part II: $10,000 × 20% = $2,000
  // Part III: ordinary income = $100,000 − $10,000 = $90,000
  //   1/10 = $9,000
  //   Tax on $9,000:
  //     $2,480 × 11% = $272.80
  //     $1,190 × 12% = $142.80
  //     $2,270 × 14% = $317.80
  //     $2,260 × 15% = $339.00
  //     ($9,000-$8,200)=$800 × 16% = $128.00
  //     Total = $1,200.40 → floor = $1,200
  //   × 10 = $12,000
  //   MDA: $90,000 > $70,000 → MDA = 0
  //   Part III tax = $12,000
  // Total = $2,000 + $12,000 = $14,000
  const result = compute({
    lump_sum_amount: 100_000,
    capital_gain_amount: 10_000,
    born_before_1936: true,
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  const schedule2Out = findOutput(result, "schedule2");
  assertEquals(schedule2Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(input.lump_sum_tax, 14_000);
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("form4972.compute: throws on negative lump_sum_amount", () => {
  assertThrows(() => {
    compute({
      lump_sum_amount: -1,
      born_before_1936: true,
      elect_10yr_averaging: true,
    });
  });
});

Deno.test("form4972.compute: throws on capital_gain_amount exceeding lump_sum_amount", () => {
  assertThrows(() => {
    compute({
      lump_sum_amount: 10_000,
      capital_gain_amount: 15_000,
      born_before_1936: true,
      elect_capital_gain: true,
    });
  });
});

Deno.test("form4972.compute: throws on death_benefit_exclusion exceeding $5,000", () => {
  assertThrows(() => {
    compute({
      lump_sum_amount: 50_000,
      born_before_1936: true,
      elect_10yr_averaging: true,
      death_benefit_exclusion: 6_000,
    });
  });
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("form4972.compute: smoke test — minimal eligible input produces schedule2 output", () => {
  const result = compute({
    lump_sum_amount: 50_000,
    born_before_1936: true,
    elect_10yr_averaging: true,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
  const input = fieldsOf(result.outputs, schedule2)!;
  assertEquals(typeof input.lump_sum_tax, "number");
  assertEquals((input.lump_sum_tax as number) > 0, true);
});
