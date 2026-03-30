import { assertEquals } from "@std/assert";
import { form7206 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form7206.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no premiums → no deduction", () => {
  const result = compute({ se_net_profit: 50_000 });
  assertEquals(result.outputs.length, 0);
});

// ─── Basic Health Insurance Deduction ────────────────────────────────────────

Deno.test("health premiums within SE profit → full deduction", () => {
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 10_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 10_000);
});

Deno.test("health premiums exceed SE profit → capped at SE profit", () => {
  // $30k premiums but only $20k SE profit
  const result = compute({
    se_net_profit: 20_000,
    health_insurance_premiums: 30_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 20_000);
});

Deno.test("zero SE profit → no deduction even with premiums", () => {
  const result = compute({
    se_net_profit: 0,
    health_insurance_premiums: 10_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── LTC Premium Age-Based Limits ────────────────────────────────────────────

Deno.test("LTC premiums — age 35 (≤40): $480 limit", () => {
  // $2,000 LTC premiums, age 35 → capped at $480
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 2_000,
    taxpayer_age: 35,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 480);
});

Deno.test("LTC premiums — age 45 (41-50): $900 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 2_000,
    taxpayer_age: 45,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 900);
});

Deno.test("LTC premiums — age 55 (51-60): $1,800 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 5_000,
    taxpayer_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 1_800);
});

Deno.test("LTC premiums — age 65 (61-70): $4,810 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 10_000,
    taxpayer_age: 65,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 4_810);
});

Deno.test("LTC premiums — age 71 (>70): $6,020 limit", () => {
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 10_000,
    taxpayer_age: 71,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 6_020);
});

Deno.test("LTC premiums — below age limit → full amount allowed", () => {
  // $400 LTC, age 45 → limit is $900 → full $400 allowed
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums: 400,
    taxpayer_age: 45,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 400);
});

// ─── LTC for Spouse ───────────────────────────────────────────────────────────

Deno.test("LTC for spouse uses spouse age limit", () => {
  // Spouse age 55: limit $1,800; $3,000 premiums → capped at $1,800
  const result = compute({
    se_net_profit: 50_000,
    ltc_premiums_spouse: 3_000,
    spouse_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 1_800);
});

Deno.test("health + LTC taxpayer + LTC spouse combined", () => {
  // Health: $5,000
  // LTC taxpayer age 45: min($2,000, $900) = $900
  // LTC spouse age 55: min($3,000, $1,800) = $1,800
  // Total: $7,700 (within SE profit $50,000)
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 5_000,
    ltc_premiums: 2_000,
    taxpayer_age: 45,
    ltc_premiums_spouse: 3_000,
    spouse_age: 55,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 7_700);
});

// ─── PTC Reduction ────────────────────────────────────────────────────────────

Deno.test("PTC received reduces deduction", () => {
  // $10,000 premiums - $3,000 PTC = $7,000 deductible
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 10_000,
    premium_tax_credit: 3_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 7_000);
});

Deno.test("PTC exceeds premiums → no deduction", () => {
  // $5,000 premiums - $6,000 PTC → $0 deduction
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 5_000,
    premium_tax_credit: 6_000,
  });
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// ─── Profit Cap Combined with PTC Reduction ───────────────────────────────────

Deno.test("profit cap applies after PTC reduction", () => {
  // $20,000 premiums - $5,000 PTC = $15,000, capped at $12,000 SE profit
  const result = compute({
    se_net_profit: 12_000,
    health_insurance_premiums: 20_000,
    premium_tax_credit: 5_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line17_se_health_insurance, 12_000);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule1 line17_se_health_insurance", () => {
  const result = compute({
    se_net_profit: 50_000,
    health_insurance_premiums: 8_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals("line17_se_health_insurance" in (s1?.fields ?? {}), true);
});
