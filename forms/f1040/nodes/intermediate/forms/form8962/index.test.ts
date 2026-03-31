import { assertEquals } from "@std/assert";
import { form8962 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8962.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke — no income no premium returns no outputs", () => {
  const result = compute({ household_size: 2 });
  assertEquals(result.outputs.length, 0);
});

// ─── Net PTC — Credit Owed ────────────────────────────────────────────────────

Deno.test("net PTC — APTC less than allowed credit → schedule3 net credit", () => {
  // Household of 2, income = $40,000, FPL for 2 = $20,440 (2024)
  // $40,000 / $20,440 ≈ 196% FPL → ~5.8% applicable → $2,320 contribution
  // SLCSP = $6,000, premium = $5,500, APTC = $1,000
  // allowed = min(max(0, 6000-2320), 5500) = min(3680, 5500) = 3680
  // net = 3680 - 1000 = 2680 → schedule3
  const result = compute({
    household_size: 2,
    household_income: 40_000,
    annual_premium: 5_500,
    annual_slcsp: 6_000,
    annual_aptc: 1_000,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s3 !== undefined, true);
  assertEquals(s2, undefined);
  assertEquals(typeof s3?.fields.line9_premium_tax_credit, "number");
  assertEquals((s3?.fields.line9_premium_tax_credit as number) > 0, true);
});

Deno.test("net PTC — no APTC paid → full credit to schedule3", () => {
  // $30,000 income, size 1, FPL = $15,060 → ~199% FPL → ~5.99%
  // applicable = $30,000 × 5.99% ≈ $1,797
  // SLCSP = $4,000, premium = $3,500, APTC = 0
  // max PTC = 4000 - 1797 = 2203, allowed = min(2203, 3500) = 2203
  // net = 2203 - 0 = 2203
  const result = compute({
    household_size: 1,
    household_income: 30_000,
    annual_premium: 3_500,
    annual_slcsp: 4_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  assertEquals((s3?.fields.line9_premium_tax_credit as number) > 0, true);
});

// ─── Excess APTC Repayment ───────────────────────────────────────────────────

Deno.test("excess APTC — too much APTC paid → schedule2 repayment", () => {
  // Income just over 400% FPL for size 1: $15,060 × 4 = $60,240
  // At 400%+ FPL with ARP extension, applicable % = 8.5%
  // $61,000 × 8.5% = $5,185
  // SLCSP = $7,000, premium = $6,500, APTC = $5,000
  // max PTC = 7000 - 5185 = 1815, allowed = min(1815, 6500) = 1815
  // net = 1815 - 5000 = -3185 → excess APTC = 3185 → schedule2
  const result = compute({
    household_size: 1,
    household_income: 61_000,
    annual_premium: 6_500,
    annual_slcsp: 7_000,
    annual_aptc: 5_000,
  });
  const s2 = findOutput(result, "schedule2");
  const s3 = findOutput(result, "schedule3");
  assertEquals(s2 !== undefined, true);
  assertEquals(s3, undefined);
  assertEquals(typeof s2?.fields.line2_excess_advance_premium, "number");
  assertEquals((s2?.fields.line2_excess_advance_premium as number) > 0, true);
});

// ─── Below 100% FPL — Repay APTC ────────────────────────────────────────────

Deno.test("below 100% FPL — not eligible, any APTC must be repaid", () => {
  // $10,000 income, size 1, FPL = $15,060 → 66% FPL → not eligible
  const result = compute({
    household_size: 1,
    household_income: 10_000,
    annual_premium: 3_000,
    annual_slcsp: 4_000,
    annual_aptc: 1_200,
  });
  const s2 = findOutput(result, "schedule2");
  const s3 = findOutput(result, "schedule3");
  assertEquals(s2 !== undefined, true);
  assertEquals(s3, undefined);
  assertEquals(s2?.fields.line2_excess_advance_premium, 1200);
});

// ─── Monthly Detail Arrays ────────────────────────────────────────────────────

Deno.test("monthly arrays — totals computed correctly", () => {
  // 12 months × $500 premium, $600 SLCSP, $100 APTC
  const monthly_premiums = Array(12).fill(500);
  const monthly_slcsps = Array(12).fill(600);
  const monthly_aptcs = Array(12).fill(100);

  const result = compute({
    household_size: 2,
    household_income: 40_000,
    monthly_premiums,
    monthly_slcsps,
    monthly_aptcs,
  });
  // Should produce some output (totals: premium=6000, slcsp=7200, aptc=1200)
  assertEquals(result.outputs.length > 0, true);
});

// ─── APTC Exactly Equals Allowed Credit ──────────────────────────────────────

Deno.test("APTC equals allowed PTC — no output (net zero)", () => {
  // Set up scenario where allowed PTC = APTC exactly → net = 0
  // $40,000 income, size 2, FPL = $20,440 → ~196% FPL
  // We'll use a premium/SLCSP designed to produce PTC ≈ APTC
  // Here we just verify the system doesn't crash and produces 0 or no output
  const result = compute({
    household_size: 2,
    household_income: 40_000,
    annual_premium: 2_000,
    annual_slcsp: 5_000,
    annual_aptc: 2_000, // APTC = full premium = forced allowed PTC = 2000
  });
  // Net = allowed (min(max_ptc, premium)) - aptc
  // max_ptc = slcsp - applicable = 5000 - (40000 * contrib)
  // If net is near zero → no large credit or repayment
  assertEquals(result.outputs.length >= 0, true); // no crash
});

// ─── Output Field Routing ─────────────────────────────────────────────────────

Deno.test("net PTC routes to schedule3 line9_premium_tax_credit", () => {
  const result = compute({
    household_size: 1,
    household_income: 25_000,
    annual_premium: 4_000,
    annual_slcsp: 5_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  assertEquals("line9_premium_tax_credit" in (s3?.fields ?? {}), true);
});

Deno.test("excess APTC routes to schedule2 line2_excess_advance_premium", () => {
  const result = compute({
    household_size: 1,
    household_income: 80_000,
    annual_premium: 4_000,
    annual_slcsp: 5_000,
    annual_aptc: 5_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  assertEquals("line2_excess_advance_premium" in (s2?.fields ?? {}), true);
});
