import { assertEquals } from "@std/assert";
import { form8959, inputSchema } from "./index.ts";
import { FilingStatus } from "../../types.ts";

function compute(input: Record<string, unknown>) {
  return form8959.compute(inputSchema.parse(input));
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 180);
});

Deno.test("part1_mfj_above: MFJ $325k wages → 0.9% on $75k = $675", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    medicare_wages: 325_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 675);
});

Deno.test("part1_mfs_above: MFS $200k wages → 0.9% on $75k = $675", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    medicare_wages: 200_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 675);
});

Deno.test("part1_hoh_above: HOH $210k wages → 0.9% on $10k = $90", () => {
  const result = compute({
    filing_status: FilingStatus.HOH,
    medicare_wages: 210_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 90);
});

Deno.test("part1_qss_above: QSS $205k wages → 0.9% on $5k = $45", () => {
  const result = compute({
    filing_status: FilingStatus.QSS,
    medicare_wages: 205_000,
  });
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 45);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 180);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 675);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 900);
});

// Negative SE income → treated as zero for Part II
Deno.test("part2_negative_se_ignored: negative SE income → no Part II AMT", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 210_000,
    se_income: -50_000,
  });
  const out = findOutput(result, "schedule2");
  // Only Part I: ($210k - $200k) × 0.009 = $90
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 90);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 180);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 180);
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
  const out = findOutput(result, "schedule2");
  assertEquals((out!.input as Record<string, unknown>).line11_additional_medicare, 810);
});

// ─── Part V: Withholding ──────────────────────────────────────────────────────

Deno.test("withholding_routes_to_f1040: medicare_withheld → f1040 line25c", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_withheld: 2_900,
  });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out!.input as Record<string, unknown>).line25c_additional_medicare_withheld,
    2_900,
  );
});

Deno.test("withholding_zero_no_output: zero withholding → no f1040 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_wages: 150_000,
  });
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("withholding_rrta_combined: medicare_withheld + rrta_medicare_withheld → combined f1040 output", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    medicare_withheld: 1_000,
    rrta_medicare_withheld: 500,
  });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out!.input as Record<string, unknown>).line25c_additional_medicare_withheld,
    1_500,
  );
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no inputs → no outputs", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: all fields present → produces outputs", () => {
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
  // Should have schedule2 and f1040 outputs
  const s2 = findOutput(result, "schedule2");
  const f = findOutput(result, "f1040");
  assertEquals(s2 !== undefined, true);
  assertEquals(f !== undefined, true);
});
