import { assertEquals } from "@std/assert";
import { form8962 } from "./index.ts";

// ─── Constants ────────────────────────────────────────────────────────────────
// TY2025 FPL (2024 FPL per IRS rules):
//   size 1: $15,060
//   size 2: $20,440
//   size 4: $31,200

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

Deno.test("smoke — household_size only returns no outputs", () => {
  const result = compute({ household_size: 2 });
  assertEquals(result.outputs.length, 0);
});

// ─── PTC Calculation — Exact Values ──────────────────────────────────────────

Deno.test("PTC — FPL 150%, size=1, benchmark=$500/mo, no APTC → exact credit", () => {
  // FPL size 1 = $15,060; 150% FPL = $22,590
  // Bracket 150-200%: minContrib=4%, maxContrib=6%
  // Position = (150 - 150) / 50 = 0 → applicable % = 4.0%
  // Applicable premium = $22,590 × 4% = $903.60
  // SLCSP = $500 × 12 = $6,000
  // Max PTC = $6,000 - $903.60 = $5,096.40
  // Actual premium = $6,000, allowed = min($5,096.40, $6,000) = $5,096.40
  // Rounded → $5,096
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s3?.fields.line9_premium_tax_credit, 5_096);
  assertEquals(s2, undefined);
});

Deno.test("PTC — FPL 200%, size=1, no APTC → exact credit", () => {
  // FPL size 1 = $15,060; 200% FPL = $30,120
  // Bracket 200-250%: minContrib=6%, maxContrib=8.5%
  // Position = (200 - 200) / 50 = 0 → applicable % = 6.0%
  // Applicable premium = $30,120 × 6% = $1,807.20
  // SLCSP = $4,000, max PTC = $4,000 - $1,807.20 = $2,192.80
  // Actual premium = $4,000, allowed = min($2,192.80, $4,000) = $2,192.80
  // Rounded → $2,193
  const result = compute({
    household_size: 1,
    household_income: 30_120,
    annual_premium: 4_000,
    annual_slcsp: 4_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_193);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("PTC — FPL 300%, size=2, no APTC → exact credit", () => {
  // FPL size 2 = $20,440; 300% FPL = $61,320
  // Bracket 300-400%: minContrib=8.5%, maxContrib=8.5%
  // Applicable premium = $61,320 × 8.5% = $5,212.20
  // SLCSP = $7,000, max PTC = $7,000 - $5,212.20 = $1,787.80
  // Actual premium = $7,000, allowed = $1,787.80, rounded → $1,788
  const result = compute({
    household_size: 2,
    household_income: 61_320,
    annual_premium: 7_000,
    annual_slcsp: 7_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 1_788);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("PTC — FPL 400%+, size=1, ARP extension caps at 8.5% → exact credit", () => {
  // FPL size 1 = $15,060; 500% FPL = $75,300
  // Bracket 400%+: applicable % = 8.5%
  // Applicable premium = $75,300 × 8.5% = 6400.500000000001 (float)
  // SLCSP = $8,000, max PTC = $8,000 - 6400.500... = 1599.499...
  // Actual premium = $8,000, allowed = 1599.499..., Math.round → $1,599
  const result = compute({
    household_size: 1,
    household_income: 75_300,
    annual_premium: 8_000,
    annual_slcsp: 8_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 1_599);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("PTC — allowed capped at actual premium when premium < max PTC", () => {
  // FPL size 1 = $15,060; 150% FPL = $22,590, applicable % = 4%
  // Applicable premium = $903.60; SLCSP = $6,000; max PTC = $5,096.40
  // Actual premium = $1,000 (less than max PTC)
  // Allowed = min($5,096.40, $1,000) = $1,000
  // Rounded → $1,000
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 1_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 1_000);
});

// ─── Net PTC — APTC Offsets Credit ───────────────────────────────────────────

Deno.test("net PTC — APTC partially received, net credit goes to schedule3", () => {
  // FPL size 2 = $20,440; income = $40,880 = 200% FPL
  // Bracket 200-250%: applicable % = 6%
  // Applicable premium = $40,880 × 6% = $2,452.80
  // SLCSP = $6,000, max PTC = $6,000 - $2,452.80 = $3,547.20
  // Actual premium = $5,500, allowed = min($3,547.20, $5,500) = $3,547.20
  // APTC = $1,000; net = $3,547.20 - $1,000 = $2,547.20 → rounded $2,547
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    annual_premium: 5_500,
    annual_slcsp: 6_000,
    annual_aptc: 1_000,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_547);
  assertEquals(s2, undefined);
});

Deno.test("net PTC — zero APTC, full allowed credit routes to schedule3", () => {
  // FPL size 1 = $15,060; income $30,000 ≈ 199.2% FPL
  // Bracket 150-200%, position = (199.2 - 150)/50 = 0.984 → contrib ≈ 5.984% ≈ 5.98%
  // Income × contrib = $30,000 × ~5.98% = ~$1,794
  // SLCSP = $4,000; max PTC ≈ $4,000 - $1,794 = $2,206
  // Actual premium $3,500, allowed = min($2,206, $3,500) = $2,206
  // Rounded → $2,206, no APTC
  const result = compute({
    household_size: 1,
    household_income: 30_000,
    annual_premium: 3_500,
    annual_slcsp: 4_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(typeof s3?.fields.line9_premium_tax_credit, "number");
  assertEquals((s3?.fields.line9_premium_tax_credit as number) > 0, true);
  assertEquals(s2, undefined);
});

// ─── Excess APTC Repayment ───────────────────────────────────────────────────

Deno.test("excess APTC — APTC exceeds allowed credit → exact repayment to schedule2", () => {
  // FPL size 1 = $15,060; income $75,300 = 500% FPL → bracket 400%+, 8.5%
  // Applicable premium = $75,300 × 8.5% = $6,400.50
  // SLCSP = $7,000; max PTC = $7,000 - $6,400.50 = $599.50
  // Actual premium = $6,500; allowed = min($599.50, $6,500) = $599.50
  // APTC = $5,000; net = $599.50 - $5,000 = -$4,400.50 → excess = $4,401
  const result = compute({
    household_size: 1,
    household_income: 75_300,
    annual_premium: 6_500,
    annual_slcsp: 7_000,
    annual_aptc: 5_000,
  });
  const s2 = findOutput(result, "schedule2");
  const s3 = findOutput(result, "schedule3");
  assertEquals(s2?.fields.line2_excess_advance_premium, 4_401);
  assertEquals(s3, undefined);
});

Deno.test("excess APTC — APTC greater than allowed credit → repayment to schedule2", () => {
  // FPL size 2 = $20,440; income $40,880 = 200% FPL → 6% applicable
  // Applicable = $40,880 × 6% = $2,452.80
  // SLCSP = $6,000; max PTC = $3,547.20; premium = $5,500; allowed = $3,547.20
  // APTC = $4,000; net = $3,547.20 - $4,000 = -$452.80 → excess $452.80 → Math.round = $453
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    annual_premium: 5_500,
    annual_slcsp: 6_000,
    annual_aptc: 4_000,
  });
  const s2 = findOutput(result, "schedule2");
  const s3 = findOutput(result, "schedule3");
  assertEquals(s2?.fields.line2_excess_advance_premium, 453);
  assertEquals(s3, undefined);
});

// ─── Below 100% FPL — Full APTC Repayment ────────────────────────────────────

Deno.test("below 100% FPL — not eligible, full APTC repaid to schedule2", () => {
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
  assertEquals(s2?.fields.line2_excess_advance_premium, 1_200);
  assertEquals(s3, undefined);
});

Deno.test("below 100% FPL — no APTC, no outputs", () => {
  const result = compute({
    household_size: 1,
    household_income: 10_000,
    annual_premium: 3_000,
    annual_slcsp: 4_000,
    annual_aptc: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── QSEHRA Reduces Credit ────────────────────────────────────────────────────

Deno.test("QSEHRA — reduces PTC dollar-for-dollar, no credit below zero", () => {
  // FPL size 1, income $22,590 (150% FPL), applicable 4%
  // Applicable = $903.60; SLCSP = $6,000; max PTC = $5,096.40
  // Premium = $6,000; allowed = $5,096.40
  // QSEHRA $3,000 → after QSEHRA = $5,096.40 - $3,000 = $2,096.40 → $2,096
  // No APTC; net = $2,096 → schedule3
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
    qsehra_amount_offered: 3_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_096);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("QSEHRA — exceeds allowed PTC → no credit (floor at 0, not negative)", () => {
  // FPL size 1, income $22,590 (150% FPL), allowed PTC = $5,096.40
  // QSEHRA $10,000 > allowed → after QSEHRA = max(0, $5,096.40 - $10,000) = 0
  // No APTC; net = 0 → no output
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
    qsehra_amount_offered: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Monthly Detail Arrays ────────────────────────────────────────────────────

Deno.test("monthly arrays — totals match annual equivalents", () => {
  // 12 months × $500 premium, $600 SLCSP, $100 APTC → same as annual 6000/7200/1200
  // FPL size 2 = $20,440; income $40,880 = 200% FPL → 6% applicable
  // Applicable = $40,880 × 6% = $2,452.80; SLCSP = $7,200; max PTC = $4,747.20
  // Premium = $6,000; allowed = min($4,747.20, $6,000) = $4,747.20
  // APTC = $1,200; net = $4,747.20 - $1,200 = $3,547.20 → $3,547
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 3_547);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("routing — net PTC routes to schedule3 line9_premium_tax_credit", () => {
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.nodeType, "schedule3");
  assertEquals("line9_premium_tax_credit" in (s3?.fields ?? {}), true);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("routing — excess APTC routes to schedule2 line2_excess_advance_premium", () => {
  const result = compute({
    household_size: 1,
    household_income: 75_300,
    annual_premium: 4_000,
    annual_slcsp: 5_000,
    annual_aptc: 5_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.nodeType, "schedule2");
  assertEquals("line2_excess_advance_premium" in (s2?.fields ?? {}), true);
  assertEquals(findOutput(result, "schedule3"), undefined);
});
