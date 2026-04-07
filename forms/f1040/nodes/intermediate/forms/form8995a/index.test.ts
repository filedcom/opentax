import { assertEquals, assertThrows } from "@std/assert";
import { form8995a, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8995a.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: accepts negative qbi (net loss — produces no deduction)", () => {
  // Negative QBI = net loss; no deduction but not a validation error
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: -1000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("validation: rejects negative w2_wages", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      taxable_income: 300_000,
      qbi: 50_000,
      w2_wages: -100,
    })
  );
});

Deno.test("validation: rejects positive qbi_loss_carryforward", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      taxable_income: 300_000,
      qbi: 50_000,
      qbi_loss_carryforward: 5000,
    })
  );
});

Deno.test("validation: accepts all-absent inputs — no outputs", () => {
  const result = compute({ filing_status: FilingStatus.Single, taxable_income: 300_000 });
  assertEquals(result.outputs.length, 0);
});

// ── Below-threshold: no wage limitation ──────────────────────────────────────

Deno.test("below threshold: 20% × QBI, no wage limit (single < $197,300)", () => {
  // taxable_income = 100,000 (below $197,300 single threshold)
  // QBI = 50,000 → 20% = 10,000; income cap = 20% × 100,000 = 20,000
  // No wage limitation below threshold
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
    w2_wages: 5_000, // very low wages — would limit if applicable
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("below threshold MFJ: no wage limit (MFJ < $394,600)", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxable_income: 200_000,
    qbi: 80_000,
    w2_wages: 1_000,
  });
  const out = findOutput(result, "f1040");
  // 20% × 80,000 = 16,000; income cap = 20% × 200,000 = 40,000 → 16,000
  assertEquals(out?.fields.line13_qbi_deduction, 16_000);
});

// ── W-2 wages limitation ─────────────────────────────────────────────────────

Deno.test("W-2 limit: 50% of wages applies (above threshold, 50% wages < 20% QBI)", () => {
  // taxable_income = $250,000 single (above $197,300 → reduction_ratio = 1.0 → full limit)
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 30,000 → 50% = 15,000; UBIA = 0 → limit = max(15,000, 7,500) = 15,000
  // deduction = min(40,000, 15,000) = 15,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 30_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 15_000);
});

Deno.test("W-2 limit: UBIA alternative applies (25% wages + 2.5% UBIA > 50% wages)", () => {
  // taxable_income = $300,000 single (above threshold → full limit)
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 20,000 → 50% = 10,000; UBIA = 1,000,000 → 25%×20,000 + 2.5%×1,000,000 = 5,000 + 25,000 = 30,000
  // limit = max(10,000, 30,000) = 30,000
  // deduction = min(40,000, 30,000) = 30,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 20_000,
    unadjusted_basis: 1_000_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 30_000);
});

Deno.test("W-2 limit: zero wages, zero UBIA → deduction is zero above threshold", () => {
  // Full wage limit applies, both zero → deduction = 0
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 200_000,
    w2_wages: 0,
    unadjusted_basis: 0,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Phase-in of limitation (partial) ─────────────────────────────────────────

Deno.test("phase-in: 50% through range — partial wage limitation applied", () => {
  // Single threshold $197,300; TI = $247,300 → excess = $50,000 → ratio = 0.5
  // QBI = 200,000 → 20% = 40,000
  // W-2 wages = 30,000 → 50% = 15,000; UBIA = 0 → limit = 15,000
  // phase_in_amount = 0.5 × (40,000 - 15,000) = 12,500
  // qbi_component = 40,000 - 12,500 = 27,500
  // income cap = 20% × 247,300 = 49,460 → not binding
  // deduction = 27,500
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 247_300,
    qbi: 200_000,
    w2_wages: 30_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 27_500);
});

Deno.test("phase-in: exactly at threshold — no limitation, full 20%", () => {
  // TI = $197,300 exactly → reduction_ratio = 0 → no wage limitation
  // QBI = 100,000 → 20% = 20,000; income cap = 20% × 197,300 = 39,460 → not binding
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 197_300,
    qbi: 100_000,
    w2_wages: 5_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 20_000);
});

Deno.test("phase-in: MFJ 50% through range ($444,600) — partial limitation", () => {
  // MFJ threshold $394,600; TI = $444,600 → excess = $50,000 → ratio = 0.5
  // QBI = 300,000 → 20% = 60,000
  // W-2 wages = 40,000 → 50% = 20,000; UBIA = 0 → limit = 20,000
  // phase_in_amount = 0.5 × (60,000 - 20,000) = 20,000
  // qbi_component = 60,000 - 20,000 = 40,000
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxable_income: 444_600,
    qbi: 300_000,
    w2_wages: 40_000,
    unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 40_000);
});

// ── SSTB phase-out ────────────────────────────────────────────────────────────

Deno.test("SSTB: fully phased out above range (single > $297,300)", () => {
  // TI = $350,000 (above $297,300) → SSTB entirely excluded
  // Only SSTB income provided → no QBI deduction
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 350_000,
    sstb_qbi: 200_000,
    sstb_w2_wages: 50_000,
    sstb_unadjusted_basis: 500_000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("SSTB: partially phased out in range (single at $247,300 — 50% through)", () => {
  // ratio = 0.5 → adjusted_sstb_qbi = 100,000 × 0.5 = 50,000
  // adjusted_sstb_w2 = 30,000 × 0.5 = 15,000
  // net_qbi = 50,000; 20% = 10,000
  // W-2 limit (full limit since ratio=1 after SSTB adjustment? no — phase-in of limitation):
  // ratio=0.5, wage_limit = 50% × 15,000 = 7,500
  // phase_in_amount = 0.5 × (10,000 - 7,500) = 1,250
  // qbi_component = 10,000 - 1,250 = 8,750
  // income cap = 20% × 247,300 = 49,460 → not binding
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 247_300,
    sstb_qbi: 100_000,
    sstb_w2_wages: 30_000,
    sstb_unadjusted_basis: 0,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 8_750);
});

Deno.test("SSTB: below threshold — not phased out, treated like regular QBI", () => {
  // Below threshold → no SSTB phase-out, no wage limitation
  // sstb_qbi = 50,000 → 20% = 10,000; income cap = 20% × 100,000 = 20,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    sstb_qbi: 50_000,
    sstb_w2_wages: 500,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

// ── Non-SSTB not affected by SSTB rules ──────────────────────────────────────

Deno.test("non-SSTB unaffected: SSTB fully phased out but non-SSTB QBI remains", () => {
  // TI = $350,000 (above single $297,300) → SSTB phased out entirely
  // Non-SSTB QBI = 100,000 → 20% = 20,000
  // W-2 wages (non-SSTB) = 50,000 → 50% = 25,000; full limit applies
  // deduction = min(20,000, 25,000) = 20,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 350_000,
    qbi: 100_000,
    w2_wages: 50_000,
    sstb_qbi: 200_000,
    sstb_w2_wages: 80_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 20_000);
});

// ── QBI loss carryforward ─────────────────────────────────────────────────────

Deno.test("carryforward: qbi_loss_carryforward reduces net QBI", () => {
  // TI = $300,000 (above threshold → full limit)
  // QBI = 100,000; loss_carryforward = -20,000 → net = 80,000
  // 20% = 16,000; W-2 wages = 60,000 → 50% = 30,000 → limit = 30,000
  // deduction = min(16,000, 30,000) = 16,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 100_000,
    w2_wages: 60_000,
    qbi_loss_carryforward: -20_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 16_000);
});

Deno.test("carryforward: loss exceeds current QBI — no deduction", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    qbi: 30_000,
    w2_wages: 60_000,
    qbi_loss_carryforward: -50_000,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ── Taxable income overall cap ────────────────────────────────────────────────

Deno.test("income cap: 20% × (TI - cap_gain) limits deduction", () => {
  // TI = $300,000 (above threshold); cap_gain = $250,000
  // income_cap_base = 300,000 - 250,000 = 50,000; cap = 20% × 50,000 = 10,000
  // QBI = 200,000; wages = 100,000; 50% wages = 50,000; 20% QBI = 40,000
  // deduction = min(40,000, 10,000) = 10,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    net_capital_gain: 250_000,
    qbi: 200_000,
    w2_wages: 100_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

// ── REIT dividends ────────────────────────────────────────────────────────────

Deno.test("REIT: section 199A dividends — 20% applied, not subject to wage limit", () => {
  // Above threshold; no QBI — only REIT dividends
  // REIT = 50,000 → 20% = 10,000; income cap = 20% × 300,000 = 60,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    line6_sec199a_dividends: 50_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("REIT: reit_loss_carryforward reduces dividends", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
    line6_sec199a_dividends: 30_000,
    reit_loss_carryforward: -10_000,
  });
  const out = findOutput(result, "f1040");
  // net REIT = 20,000 → 20% = 4,000
  assertEquals(out?.fields.line13_qbi_deduction, 4_000);
});

// ── Output routing ────────────────────────────────────────────────────────────

Deno.test("routing: positive deduction → routes to f1040 with line13_qbi_deduction", () => {
  // Below threshold → no wage limit; 20% × 50,000 = 10,000; income cap = 20% × 100,000 = 20,000
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 100_000,
    qbi: 50_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line13_qbi_deduction, 10_000);
});

Deno.test("routing: no QBI activity — no outputs", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxable_income: 300_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("smoke: mixed QBI + SSTB + REIT, above threshold, partial phase-in MFJ", () => {
  // MFJ threshold = $394,600; TI = $444,600 → ratio = 0.5
  //
  // Non-SSTB: qbi = 80,000; w2 = 40,000; ubia = 200,000
  // SSTB: sstb_qbi = 60,000; sstb_w2 = 20,000; sstb_ubia = 0
  //   → adjusted_sstb_qbi = 60,000 × 0.5 = 30,000
  //   → adjusted_sstb_w2 = 20,000 × 0.5 = 10,000
  //
  // total_qbi = 80,000 + 30,000 = 110,000 (no carryforward)
  // 20% × 110,000 = 22,000
  // total_w2 = 40,000 + 10,000 = 50,000
  // total_ubia = 200,000 + 0 = 200,000
  // wage_limit_a = 50% × 50,000 = 25,000
  // wage_limit_b = 25% × 50,000 + 2.5% × 200,000 = 12,500 + 5,000 = 17,500
  // applicable_limit = max(25,000, 17,500) = 25,000
  // phase_in_amount = 0.5 × (22,000 - 25,000) = 0.5 × (-3,000) = -1,500 → max(0, -1500) = 0
  // qbi_component = 22,000 - 0 = 22,000
  //
  // REIT: 20,000 + (-5,000) = 15,000 → 20% = 3,000
  //
  // total_before_cap = 22,000 + 3,000 = 25,000
  // income_cap = 20% × (444,600 - 0) = 88,920 → not binding
  // final_deduction = 25,000
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxable_income: 444_600,
    qbi: 80_000,
    w2_wages: 40_000,
    unadjusted_basis: 200_000,
    sstb_qbi: 60_000,
    sstb_w2_wages: 20_000,
    sstb_unadjusted_basis: 0,
    line6_sec199a_dividends: 20_000,
    reit_loss_carryforward: -5_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line13_qbi_deduction, 25_000);
  assertEquals(result.outputs.length, 1);
});
