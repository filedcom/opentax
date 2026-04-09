import { assertEquals } from "@std/assert";
import { form8959, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";

function compute(input: Record<string, unknown>) {
  return form8959.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Threshold: no tax owed ────────────────────────────────────────────────────

Deno.test("below_threshold_single: wages below $200k → no schedule2 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 150_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

Deno.test("at_threshold_single: wages exactly $200k → no schedule2 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 200_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

Deno.test("below_threshold_mfj: wages below $250k → no schedule2 output", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    medicare_wages: 200_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

Deno.test("below_threshold_mfs: wages below $125k → no schedule2 output", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    medicare_wages: 100_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// ─── Part I: Medicare Wages above threshold ────────────────────────────────────

Deno.test("part1_single_above: Single $220k wages → 0.9% on $20k = $180", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 220_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 180);
});

Deno.test("part1_mfj_above: MFJ $325k wages → 0.9% on $75k = $675", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    medicare_wages: 325_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 675);
});

Deno.test("part1_mfs_above: MFS $200k wages → 0.9% on $75k = $675", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    medicare_wages: 200_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 675);
});

Deno.test("part1_hoh_above: HOH $210k wages → 0.9% on $10k = $90", () => {
  const result = compute({
    filing_status: FilingStatus.HOH,
    medicare_wages: 210_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 90);
});

// QSS uses MFJ threshold ($250k) per IRC §3101(b)(2) — NOT the OTHER threshold ($200k)
Deno.test("part1_qss_below_mfj_threshold: QSS $205k wages → below $250k → no AMT", () => {
  const result = compute({
    filing_status: FilingStatus.QSS,
    medicare_wages: 205_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

Deno.test("part1_qss_above_mfj_threshold: QSS $280k wages → 0.9% on $30k = $270", () => {
  const result = compute({
    filing_status: FilingStatus.QSS,
    medicare_wages: 280_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 270);
});

// ─── Part II: SE Income combined with wages ────────────────────────────────────

// Example 1: SE $130k, no wages → SE < $200k threshold → no tax (Ann example from instructions)
Deno.test("part2_se_below_threshold: SE $130k single, no wages → no AMT", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    se_income: 130_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// Example 2: SE $220k, no wages → 0.9% on $20k = $180 (Bob example)
Deno.test("part2_se_above_threshold: SE $220k single, no wages → $180 AMT", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    se_income: 220_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 180);
});

// Example 3: SE $145k + wages $130k single → reduced SE threshold = $200k - $130k = $70k
// SE excess = $145k - $70k = $75k, AMT = $75k × 0.9% = $675
// Plus wages portion: wages $130k < $200k threshold → no Part I tax
// Total = $675
Deno.test("part2_wages_reduce_se_threshold: SE $145k + wages $130k single → $675", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 130_000,
    se_income: 145_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 675);
});

// Wages exceed threshold → SE threshold reduced to zero → all SE subject to AMT
Deno.test("part2_wages_exceed_threshold: wages $250k + SE $50k single → wages AMT + full SE AMT", () => {
  // Part I: ($250k - $200k) × 0.009 = $50k × 0.009 = $450
  // Part II: threshold reduced to 0 → all $50k SE taxed → $50k × 0.009 = $450
  // Total = $900
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 250_000,
    se_income: 50_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 900);
});

// Negative SE income → treated as zero for Part II
Deno.test("part2_negative_se_ignored: negative SE income → no Part II AMT", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 210_000,
    se_income: -50_000,
  });
  // Only Part I: ($210k - $200k) × 0.009 = $90
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 90);
});

// ─── Part III: RRTA Compensation ──────────────────────────────────────────────

// Example 7: MFJ, SE $160k + RRTA $140k — RRTA not reduced by wages, not combined with SE
// RRTA $140k < $250k MFJ threshold → no Part III AMT
Deno.test("part3_rrta_below_mfj_threshold: RRTA $140k MFJ → no AMT", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    se_income: 160_000,
    rrta_wages: 140_000,
  });
  // SE: threshold reduced by 0 wages = $250k; $160k < $250k → no Part II AMT
  // RRTA: $140k < $250k → no Part III AMT
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

Deno.test("part3_rrta_above_single: RRTA $220k single → 0.9% on $20k = $180", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    rrta_wages: 220_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 180);
});

// RRTA threshold NOT reduced by wages (unlike SE income)
Deno.test("part3_rrta_threshold_not_reduced: wages $150k + RRTA $220k single → wages no tax, RRTA $180 tax", () => {
  // Part I: $150k < $200k → $0
  // Part II: no SE → $0
  // Part III: RRTA $220k - $200k = $20k × 0.009 = $180 (not reduced by wages)
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 150_000,
    rrta_wages: 220_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 180);
});

// ─── Part I+II+III combined ────────────────────────────────────────────────────

Deno.test("combined_all_parts: wages + SE + RRTA all contributing AMT", () => {
  // Single, $200k threshold
  // Part I: wages $210k → excess $10k × 0.009 = $90
  // Part II: SE $30k, threshold reduced to $200k - $210k = 0 → all $30k × 0.009 = $270
  // Part III: RRTA $250k → excess $50k × 0.009 = $450
  // Total = $90 + $270 + $450 = $810
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 210_000,
    se_income: 30_000,
    rrta_wages: 250_000,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 810);
});

// ─── Part V: Withholding ──────────────────────────────────────────────────────
//
// Form 8959 Part V line 24 routes to Form 1040 line 25c ONLY when additional Medicare Tax
// applies (line18 > 0). Below threshold, Form 8959 is not filed; line 25c = 0.

Deno.test("withholding_routes_to_f1040: wages above threshold + withheld → f1040 line25c", () => {
  // Wages $250K (Single threshold $200K) → excess $50K × 0.009 = $450 AMT
  // Realistic W-2 box 6: regular ($250K × 1.45% = $3,625) + additional ($450) = $4,075
  // Part V: line20 = $3,625; line21 = $4,075 - $3,625 = $450 → line25c
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 250_000,
    medicare_withheld: 4_075, // W-2 box 6: regular $3,625 + additional $450
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line25c_additional_medicare_withheld, 450);
});

Deno.test("withholding_no_amt_no_f1040: below threshold + withheld → no f1040 output", () => {
  // Below threshold — no Additional Medicare Tax → Form 8959 not filed → no line25c
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 150_000,
    medicare_withheld: 2_175, // regular Medicare withheld but no AMT situation
  });
  const s2 = findOutput(result, "schedule2");
  const f1 = findOutput(result, "f1040");
  assertEquals(s2, undefined);
  assertEquals(f1, undefined);
});

Deno.test("withholding_zero_no_output: no withholding fields → no f1040 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 150_000, // below $200K threshold, no withholding
  });
  const s2 = findOutput(result, "schedule2");
  const f1 = findOutput(result, "f1040");
  assertEquals(s2, undefined);
  assertEquals(f1, undefined);
});

Deno.test("withholding_rrta_combined: rrta above threshold + combined withheld → f1040 line25c", () => {
  // RRTA wages $250K above MFJ $250K threshold → line17 = 0; but rrta $260K → excess=$10K → $90
  // Use MFJ with rrta above threshold to trigger line18 > 0
  const result = compute({
    filing_status: FilingStatus.MFJ,
    rrta_wages: 260_000,
    medicare_withheld: 1_000,
    rrta_medicare_withheld: 500,
  });
  assertEquals(fieldsOf(result.outputs, f1040)!.line25c_additional_medicare_withheld, 1_500);
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no inputs → no outputs", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: all fields present → schedule2 AMT + f1040 withholding credit", () => {
  // MFJ threshold = $250,000
  // Part I: wages($300k) + tips($5k) + 8919($2k) = $307k total; excess = $57k × 0.009 = $513
  // Part II: se($50k), threshold reduced to max(0, $250k - $307k) = 0 → $50k × 0.009 = $450
  // Part III: rrta($260k) - $250k = $10k × 0.009 = $90
  // Total = $513 + $450 + $90 = $1,053
  // Part V: line4 = $307k; line20 (regular) = $307k × 1.45% = $4,451.50
  //         medicare_withheld (box 6) = $4,000 < $4,451.50 → line21 = 0
  //         line22 (RRTA additional) = $200 → line24 = $200 → f1040 line25c
  const result = compute({
    filing_status: FilingStatus.MFJ,
    medicare_wages: 300_000,
    unreported_tips: 5_000,
    wages_8919: 2_000,
    se_income: 50_000,
    rrta_wages: 260_000,
    medicare_withheld: 4_000,
    rrta_medicare_withheld: 200,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line11_additional_medicare, 1_053);
  assertEquals(fieldsOf(result.outputs, f1040)!.line25c_additional_medicare_withheld, 200);
});
