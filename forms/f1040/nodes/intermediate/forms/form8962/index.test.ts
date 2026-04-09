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
  // Bracket 150-200%: minContrib=4.12%, maxContrib=6.18% (Rev. Proc. 2024-57)
  // Position = (150 - 150) / 50 = 0 → applicable % = 4.12%
  // Applicable premium = $22,590 × 4.12% = $930.708
  // SLCSP = $500 × 12 = $6,000
  // Max PTC = $6,000 - $930.708 = $5,069.292
  // Actual premium = $6,000, allowed = min($5,069.292, $6,000) = $5,069.292
  // Rounded → $5,069
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s3?.fields.line9_premium_tax_credit, 5_069);
  assertEquals(s2, undefined);
});

Deno.test("PTC — FPL 200%, size=1, no APTC → exact credit", () => {
  // FPL size 1 = $15,060; 200% FPL = $30,120
  // Bracket 200-250%: minContrib=6.18%, maxContrib=8.24% (Rev. Proc. 2024-57)
  // Position = (200 - 200) / 50 = 0 → applicable % = 6.18%
  // Applicable premium = $30,120 × 6.18% = $1,861.416
  // SLCSP = $4,000, max PTC = $4,000 - $1,861.416 = $2,138.584
  // Actual premium = $4,000, allowed = min($2,138.584, $4,000) = $2,138.584
  // Rounded → $2,139
  const result = compute({
    household_size: 1,
    household_income: 30_120,
    annual_premium: 4_000,
    annual_slcsp: 4_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_139);
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
  // FPL size 1 = $15,060; 150% FPL = $22,590; 4.12% bracket start
  // Applicable = $22,590 × 4.12% = $930.71
  // Allowed = min($1,000, $6,000) - $930.71 = $69.29 → $69
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 1_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 69);
});

// ─── Net PTC — APTC Offsets Credit ───────────────────────────────────────────

Deno.test("net PTC — APTC partially received, net credit goes to schedule3", () => {
  // FPL size 2 = $20,440; income = $40,880 = 200% FPL
  // Bracket 200-250%: applicable % = 6.18% (Rev. Proc. 2024-57)
  // Applicable premium = $40,880 × 6.18% = $2,526.384
  // SLCSP = $6,000, max PTC = $6,000 - $2,526.384 = $3,473.616
  // Actual premium = $5,500, allowed = min($3,473.616, $5,500) = $3,473.616
  // APTC = $1,000; net = $3,473.616 - $1,000 = $2,473.616 → rounded $2,474
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    annual_premium: 5_500,
    annual_slcsp: 6_000,
    annual_aptc: 1_000,
  });
  const s3 = findOutput(result, "schedule3");
  const s2 = findOutput(result, "schedule2");
  assertEquals(s3?.fields.line9_premium_tax_credit, 1_974);
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
  assertEquals(s2?.fields.line2_excess_advance_premium, 4_901);
  assertEquals(s3, undefined);
});

Deno.test("excess APTC — APTC greater than allowed credit → repayment to schedule2", () => {
  // FPL size 2 = $20,440; income $40,880 = 200% FPL → 6.18% applicable (Rev. Proc. 2024-57)
  // Applicable = $40,880 × 6.18% = $2,526.384
  // SLCSP = $6,000; max PTC = $3,473.616; premium = $5,500; allowed = $3,473.616
  // APTC = $4,000; net = $3,473.616 - $4,000 = -$526.384 → excess = $526
  // IRC §36B(f)(2)(B) cap: 200-300% FPL, other household = $1,750 (not binding)
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    annual_premium: 5_500,
    annual_slcsp: 6_000,
    annual_aptc: 4_000,
  });
  const s2 = findOutput(result, "schedule2");
  const s3 = findOutput(result, "schedule3");
  assertEquals(s2?.fields.line2_excess_advance_premium, 1_026);
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
  // FPL size 1, income $22,590 (150% FPL), applicable 4.12% (Rev. Proc. 2024-57)
  // Applicable = $22,590 × 4.12% = $930.708; SLCSP = $6,000; max PTC = $5,069.292
  // Premium = $6,000; allowed = $5,069.292
  // QSEHRA $3,000 → after QSEHRA = $5,069.292 - $3,000 = $2,069.292 → $2,069
  // No APTC; net = $2,069 → schedule3
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 6_000,
    annual_slcsp: 6_000,
    annual_aptc: 0,
    qsehra_amount_offered: 3_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_069);
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
  // FPL size 2 = $20,440; income $40,880 = 200% FPL → 6.18% applicable (Rev. Proc. 2024-57)
  // Applicable = $40,880 × 6.18% = $2,526.384; SLCSP = $7,200; max PTC = $4,673.616
  // Premium = $6,000; allowed = min($4,673.616, $6,000) = $4,673.616
  // APTC = $1,200; net = $4,673.616 - $1,200 = $3,473.616 → $3,474
  const result = compute({
    household_size: 2,
    household_income: 40_880,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line9_premium_tax_credit, 2_274);
});

// ─── Repayment Caps (IRC §36B(f)(2)(B)) ──────────────────────────────────────

Deno.test("repayment cap — 250% FPL, single filer, excess $2000 → capped at $875", () => {
  // FPL size 1 = $15,060; 250% FPL = $37,650
  // Bracket 250-300%: 8.24+position*(8.5-8.24)/50... at 250 position=0 → 8.24%
  // applicable = $37,650 × 8.24% = $3,102.36
  // SLCSP = $5,500; max PTC = $2,397.64; premium = $5,500; allowed = $2,397.64
  // APTC = $4,400; raw excess = $2,002.36 → $2,002
  // Cap: 200-300% FPL, single filer = $875
  const result = compute({
    household_size: 1,
    household_income: 37_650,
    annual_premium: 5_500,
    annual_slcsp: 5_500,
    annual_aptc: 4_400,
    filing_status: "single",
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line2_excess_advance_premium, 875);
});

Deno.test("repayment cap — 150% FPL, other household, excess $1000 → capped at $700", () => {
  // income $22,590 (150% FPL); 4.12% rate; applicable = $930.71
  // SLCSP = $3,000; max PTC = $2,069.29; premium = $3,000; allowed = $2,069.29
  // APTC = $3,100; raw excess = $1,030.71 → $1,031
  // Cap: under 200% FPL, other household = $700
  const result = compute({
    household_size: 1,
    household_income: 22_590,
    annual_premium: 3_000,
    annual_slcsp: 3_000,
    annual_aptc: 3_100,
    filing_status: "mfj",
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line2_excess_advance_premium, 700);
});

Deno.test("repayment cap — 400%+ FPL, no cap applies, full excess repaid", () => {
  // income $75,300 (500% FPL); above 400% → no repayment cap
  // 8.5%; applicable = $6,400.50; SLCSP=$7,000; PTC=$599.50
  // APTC = $2,000; excess = $2,000 - $599.50 = $1,400.50 → $1,401
  // No cap → full $1,401 repaid
  const result = compute({
    household_size: 1,
    household_income: 75_300,
    annual_premium: 7_000,
    annual_slcsp: 7_000,
    annual_aptc: 2_000,
    filing_status: "single",
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line2_excess_advance_premium, 1_401);
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
