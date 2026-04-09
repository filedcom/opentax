import { assertEquals, assertThrows } from "@std/assert";
import { form8960, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8960.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Basic threshold gate ──────────────────────────────────────────────────────

Deno.test("MAGI below threshold → no output (Single)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 150_000,
    line1_taxable_interest: 10_000,
    line2_ordinary_dividends: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("MAGI exactly at threshold → no output (Single)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 200_000,
    line1_taxable_interest: 50_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── NII is the smaller factor ─────────────────────────────────────────────────

Deno.test("NII < MAGI excess → NIIT = NII × 3.8%", () => {
  // MAGI = $300k → excess over $200k = $100k
  // NII = $10k (interest) — NII is smaller
  // NIIT = $10,000 × 0.038 = $380
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 10_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

// ─── MAGI excess is the smaller factor ────────────────────────────────────────

Deno.test("MAGI excess < NII → NIIT = MAGI excess × 3.8%", () => {
  // MAGI = $210k → excess = $10k
  // NII = $50k — MAGI excess is smaller
  // NIIT = $10,000 × 0.038 = $380
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 210_000,
    line1_taxable_interest: 50_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

// ─── Filing status thresholds ──────────────────────────────────────────────────

Deno.test("MFJ threshold $250,000 → no output below", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 249_999,
    line1_taxable_interest: 20_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("MFJ threshold $250,000 → NIIT above threshold", () => {
  // MAGI = $260k → excess = $10k; NII = $50k → NIIT = $380
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 260_000,
    line1_taxable_interest: 50_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

Deno.test("MFS threshold $125,000 → NIIT above threshold", () => {
  // MAGI = $135k → excess = $10k; NII = $50k → NIIT = $380
  const result = compute({
    filing_status: FilingStatus.MFS,
    magi: 135_000,
    line1_taxable_interest: 50_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

Deno.test("HOH threshold $200,000 → NIIT above threshold", () => {
  const result = compute({
    filing_status: FilingStatus.HOH,
    magi: 210_000,
    line1_taxable_interest: 50_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

Deno.test("QSS threshold $250,000 → no output below", () => {
  const result = compute({
    filing_status: FilingStatus.QSS,
    magi: 249_999,
    line1_taxable_interest: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── NII components ────────────────────────────────────────────────────────────

Deno.test("NII components: interest + dividends + capital gains + passive rental", () => {
  // line1=5k, line2=5k, line4b=5k, line5a=5k → NII=20k
  // MAGI excess = $300k - $200k = $100k; NIIT = $20k × 0.038 = $760
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 5_000,
    line2_ordinary_dividends: 5_000,
    line4b_rental_net: 5_000,
    line5a_net_gain: 5_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 760);
});

Deno.test("NII annuities included (line3)", () => {
  // line3=10k; MAGI excess=$100k; NIIT=$10k × 0.038 = $380
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line3_annuities: 10_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

Deno.test("line4a passive income included", () => {
  // line4a=10k; MAGI excess=$100k; NIIT=$10k × 0.038 = $380
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line4a_passive_income: 10_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 380);
});

Deno.test("line5b adjustment reduces NII (excludes non-NIIT gains)", () => {
  // line5a=50k; line5b=-20k; NII gross from gains=30k
  // MAGI excess=$100k; NIIT=$30k × 0.038 = $1,140
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line5a_net_gain: 50_000,
    line5b_net_gain_adjustment: -20_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 1_140);
});

Deno.test("line7 other modifications can reduce NII (NOL)", () => {
  // line1=20k; line7=-5k (NOL); NII=15k
  // MAGI excess=$100k; NIIT=$15k × 0.038 = $570
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 20_000,
    line7_other_modifications: -5_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 570);
});

// ─── Deductions offset NII ─────────────────────────────────────────────────────

Deno.test("investment interest expense (line9a) reduces NII", () => {
  // NII gross=20k; line9a=5k; NII net=15k; MAGI excess=$100k
  // NIIT = $15k × 0.038 = $570
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 20_000,
    line9a_investment_interest_expense: 5_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 570);
});

Deno.test("state/local tax (line9b) reduces NII", () => {
  // NII gross=20k; line9b=5k; NII net=15k → NIIT=$570
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 20_000,
    line9b_state_local_tax: 5_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 570);
});

Deno.test("line10 additional modifications reduces NII", () => {
  // NII gross=20k; line10=5k; NII net=15k → NIIT=$570
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 20_000,
    line10_additional_modifications: 5_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 570);
});

Deno.test("deductions exceeding NII gross → NII = 0, no output", () => {
  // NII gross=5k; deductions=10k; NII=max(0,...)=0 → no output
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 5_000,
    line9a_investment_interest_expense: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Zero NII ──────────────────────────────────────────────────────────────────

Deno.test("zero NII (no income fields) → no output even with MAGI above threshold", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 500_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output routing ────────────────────────────────────────────────────────────

Deno.test("output routes to schedule2 with correct nodeType", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 10_000,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
});

// ─── Rounding ──────────────────────────────────────────────────────────────────

Deno.test("NIIT rounds to cents", () => {
  // NII=1k; MAGI excess=$100k; NIIT=$1,000 × 0.038 = $38.00 (exact)
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 1_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 38);
});

Deno.test("NIIT fractional cents rounded correctly", () => {
  // NII=$1,001; MAGI excess=$100k; NIIT = $1,001 × 0.038 = $38.038 → $38.04
  const result = compute({
    filing_status: FilingStatus.Single,
    magi: 300_000,
    line1_taxable_interest: 1_001,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 38.04);
});

// ─── Schema validation ─────────────────────────────────────────────────────────

Deno.test("invalid filing_status throws", () => {
  assertThrows(() => {
    compute({
      filing_status: "invalid",
      magi: 300_000,
    });
  });
});

Deno.test("missing filing_status throws", () => {
  assertThrows(() => {
    compute({
      magi: 300_000,
      line1_taxable_interest: 10_000,
    });
  });
});

Deno.test("missing magi throws", () => {
  assertThrows(() => {
    compute({
      filing_status: FilingStatus.Single,
      line1_taxable_interest: 10_000,
    });
  });
});

Deno.test("negative magi throws", () => {
  assertThrows(() => {
    compute({
      filing_status: FilingStatus.Single,
      magi: -1,
    });
  });
});

// ─── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("smoke: MFJ with all NII components and deductions", () => {
  // line1=10k, line2=5k, line3=2k, line4a=8k, line4b=6k, line5a=20k, line5b=-5k, line7=-1k
  // NII gross = 10+5+2+8+6+20+(-5)+(-1) = 45k
  // deductions: line9a=3k, line9b=2k, line10=1k = 6k
  // NII net = 45-6 = 39k
  // MAGI = $300k → excess over $250k = $50k
  // line16 = min(39k, 50k) = 39k
  // NIIT = 39k × 0.038 = $1,482
  const result = compute({
    filing_status: FilingStatus.MFJ,
    magi: 300_000,
    line1_taxable_interest: 10_000,
    line2_ordinary_dividends: 5_000,
    line3_annuities: 2_000,
    line4a_passive_income: 8_000,
    line4b_rental_net: 6_000,
    line5a_net_gain: 20_000,
    line5b_net_gain_adjustment: -5_000,
    line7_other_modifications: -1_000,
    line9a_investment_interest_expense: 3_000,
    line9b_state_local_tax: 2_000,
    line10_additional_modifications: 1_000,
  });
  const sch2 = findOutput(result, "schedule2");
  assertEquals(sch2?.fields.line12_niit, 1_482);
});
