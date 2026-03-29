import { assertEquals, assertThrows } from "@std/assert";
import type { z } from "zod";
import { FilingStatus } from "../../types.ts";
import { f8863, type itemSchema } from "./index.ts";

type F8863Item = z.infer<typeof itemSchema>;

// ============================================================
// Helpers
// ============================================================

/**
 * Minimal AOC student item — all required fields present, all AOC gates pass,
 * with zero expenses so no credit is produced unless overridden.
 */
function minimalAocItem(overrides: Partial<F8863Item> = {}): F8863Item {
  return {
    credit_type: "aoc",
    student_name: "Test Student",
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    aoc_adjusted_expenses: 0,
    filer_magi: 0,
    filing_status: FilingStatus.Single,
    ...overrides,
  };
}

/**
 * Minimal LLC student item — no AOC eligibility flags required.
 */
function minimalLlcItem(overrides: Partial<F8863Item> = {}): F8863Item {
  return {
    credit_type: "llc",
    student_name: "Test Student",
    llc_adjusted_expenses: 0,
    filer_magi: 0,
    filing_status: FilingStatus.Single,
    ...overrides,
  };
}

function compute(items: F8863Item[]) {
  return f8863.compute({ f8863s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema_empty_array: f8863s array must have at least 1 item", () => {
  assertThrows(
    () => f8863.compute({ f8863s: [] }),
    Error,
  );
});

Deno.test("schema_requires_credit_type: item without credit_type is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{ student_name: "Alice", aoc_adjusted_expenses: 1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_requires_student_name: item without student_name is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{ credit_type: "aoc", aoc_adjusted_expenses: 1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_aoc_expenses_nonnegative: negative aoc_adjusted_expenses is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Alice",
      aoc_adjusted_expenses: -100,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_llc_expenses_nonnegative: negative llc_adjusted_expenses is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{
      credit_type: "llc",
      student_name: "Alice",
      llc_adjusted_expenses: -100,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_valid_minimal_aoc: minimal AOC item passes schema validation", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [minimalAocItem()],
  });
  assertEquals(parsed.success, true);
});

Deno.test("schema_valid_minimal_llc: minimal LLC item passes schema validation", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [minimalLlcItem()],
  });
  assertEquals(parsed.success, true);
});

// ============================================================
// 2. Per-Box Routing — AOC path
// ============================================================

Deno.test("aoc_zero_expenses_no_output: AOC student with zero expenses produces no outputs", () => {
  const result = compute([minimalAocItem({ aoc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_routes_refundable_to_f1040: AOC with expenses routes refundable portion to f1040", () => {
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    (f1040Out!.input as Record<string, number>).line29_refundable_aoc > 0,
    true,
  );
});

Deno.test("aoc_routes_nonrefundable_to_schedule3: AOC with expenses routes nonrefundable portion to schedule3", () => {
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(sch3Out !== undefined, true);
  assertEquals(
    (sch3Out!.input as Record<string, number>).line3_education_credit > 0,
    true,
  );
});

Deno.test("aoc_max_credit_2500: full $4,000 expenses produce $2,500 tentative credit split 40/60", () => {
  // Line 27=$4k → Line 28=$2k → Line 29=$500 → Line 30=$2,500
  // Refundable = 40% × $2,500 = $1,000; nonrefundable = 60% × $2,500 = $1,500
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.input as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.input as Record<string, number>).line3_education_credit;
  assertEquals(Math.round(refundable), 1000);
  assertEquals(Math.round(nonrefundable), 1500);
});

Deno.test("aoc_partial_credit_first_tier_only: $1,500 expenses produce $1,500 total credit", () => {
  // Line 27=$1,500, Line 28=$0, Line 29=$0, Line 30=$1,500
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 1500, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.input as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.input as Record<string, number>).line3_education_credit;
  // Refundable = 40% × $1,500 = $600
  assertEquals(Math.round(refundable * 100) / 100, 600);
  // Nonrefundable = 60% × $1,500 = $900
  assertEquals(Math.round(nonrefundable * 100) / 100, 900);
});

Deno.test("aoc_partial_credit_both_tiers: $2,500 expenses produce $2,125 total credit", () => {
  // Line 27=$2,500, Line 28=$500, Line 29=$125, Line 30=$2,125
  // Refundable = 40% × $2,125 = $850; nonrefundable = 60% × $2,125 = $1,275
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 2500, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.input as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.input as Record<string, number>).line3_education_credit;
  assertEquals(Math.round(refundable * 100) / 100, 850);
  assertEquals(Math.round(nonrefundable * 100) / 100, 1275);
});

Deno.test("aoc_expense_cap_at_4000: $5,000 expenses produce same result as $4,000 (cap enforced)", () => {
  const result5k = compute([
    minimalAocItem({ aoc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const result4k = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const refund5k =
    (findOutput(result5k, "f1040")!.input as Record<string, number>)
      .line29_refundable_aoc;
  const refund4k =
    (findOutput(result4k, "f1040")!.input as Record<string, number>)
      .line29_refundable_aoc;
  assertEquals(refund5k, refund4k);
});

// ============================================================
// 3. Per-Box Routing — LLC path
// ============================================================

Deno.test("llc_zero_expenses_no_output: LLC student with zero expenses produces no outputs", () => {
  const result = compute([minimalLlcItem({ llc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_routes_to_schedule3: LLC with expenses routes to schedule3 line3_education_credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(sch3Out !== undefined, true);
  assertEquals(
    (sch3Out!.input as Record<string, number>).line3_education_credit > 0,
    true,
  );
});

Deno.test("llc_does_not_route_to_f1040_refundable: LLC credit never produces refundable output on f1040", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out === undefined, true);
});

Deno.test("llc_max_credit_2000: $10k expenses produce $2,000 credit (20% × $10k)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_5k_expenses_credit_1000: $5,000 expenses produce $1,000 credit (20% × $5k)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    1000,
  );
});

// ============================================================
// 4. Aggregation — multi-student
// ============================================================

Deno.test("aoc_aggregates_across_students: two AOC students sum their credits", () => {
  // Each student: $4,000 expenses → $2,500 → total $5,000 tentative
  // Refundable per student = $1,000 → total $2,000
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalAocItem({
      student_name: "Bob",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    2000,
  );
});

Deno.test("llc_aggregates_across_students_below_cap: two students × $4k = $8k → $1,600 credit", () => {
  const result = compute([
    minimalLlcItem({
      student_name: "Alice",
      llc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    1600,
  );
});

Deno.test("llc_aggregate_capped_at_10k_expenses: two students × $8k → capped at $10k → $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({
      student_name: "Alice",
      llc_adjusted_expenses: 8000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 8000,
      filer_magi: 0,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("aoc_and_llc_same_return_different_students: both credits appear on same return", () => {
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 5000,
      filer_magi: 0,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(f1040Out !== undefined, true); // refundable AOC
  assertEquals(sch3Out !== undefined, true); // nonrefundable AOC + LLC
});

// ============================================================
// 5. Thresholds — AOC MAGI phase-out (single/HOH/QSS: $80k–$90k)
// ============================================================

Deno.test("aoc_magi_zero_full_credit: MAGI $0 single yields full $1,000 refundable AOC", () => {
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_at_lower_bound_single_80k: MAGI exactly $80k single yields full credit (phase-out not started)", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 80000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_mid_phaseout_single_85k: MAGI $85k single yields 50% credit ($500 refundable)", () => {
  // fraction = (85000 − 80000) / 10000 = 0.5 → allowed = $2,500 × 0.5 = $1,250
  // refundable = 40% × $1,250 = $500
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    500,
  );
});

Deno.test("aoc_magi_at_ceiling_single_90k: MAGI $90k single yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 90000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_magi_above_ceiling_single_95k: MAGI above $90k ceiling yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 95000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_magi_mfj_at_lower_bound_160k: MAGI exactly $160k MFJ yields full credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 160000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_mfj_mid_phaseout_170k: MAGI $170k MFJ yields 50% credit ($500 refundable)", () => {
  // fraction = (170000 − 160000) / 20000 = 0.5 → allowed = $1,250 → refundable = $500
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 170000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    500,
  );
});

Deno.test("aoc_magi_mfj_at_ceiling_180k: MAGI $180k MFJ yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 180000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 6. Thresholds — LLC MAGI phase-out (same thresholds as AOC)
// ============================================================

Deno.test("llc_magi_zero_full_credit: MAGI $0 single yields full $2,000 LLC credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_magi_at_lower_bound_single_80k: MAGI $80k single yields full $2,000 LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 80000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_magi_mid_phaseout_single_85k: MAGI $85k single yields 50% LLC credit ($1,000)", () => {
  // fraction = 0.5 → $2,000 × 0.5 = $1,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    1000,
  );
});

Deno.test("llc_magi_at_ceiling_single_90k: MAGI $90k single yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 90000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_above_ceiling_single_95k: MAGI above $90k ceiling yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 95000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_mfj_at_ceiling_180k: MAGI $180k MFJ yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 180000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_mfj_at_lower_bound_160k: MAGI exactly $160k MFJ yields full $2,000 LLC credit", () => {
  // $160k = phase-out start for MFJ → fraction = 0 → full credit
  // $10,000 expenses → LLC credit = min($10,000, $10,000) × 20% = $2,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 160000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  assertEquals(
    (sch3!.input as Record<string, number>).line3_education_credit,
    2000,
  );
});

Deno.test("llc_magi_mfj_mid_phaseout_170k: MAGI $170k MFJ yields $1,000 LLC credit (50% phase-out)", () => {
  // fraction = (170000 − 160000) / 20000 = 0.500 → allowed = $2,000 × (1 − 0.500) = $1,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 170000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  const sch3 = findOutput(result, "schedule3");
  assertEquals(sch3 !== undefined, true);
  assertEquals(
    (sch3!.input as Record<string, number>).line3_education_credit,
    1000,
  );
});

// ============================================================
// 7. AOC Eligibility Gates (Lines 23–26)
// ============================================================

Deno.test("aoc_gate_prior_4_years_blocks_aoc_refundable: aoc_claimed_4_prior_years=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      aoc_claimed_4_prior_years: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") === undefined, true);
});

Deno.test("aoc_gate_not_half_time_blocks_aoc_refundable: enrolled_half_time=false → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      enrolled_half_time: false,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") === undefined, true);
});

Deno.test("aoc_gate_completed_4_years_blocks_aoc_refundable: completed_4_years_postsec=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      completed_4_years_postsec: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") === undefined, true);
});

Deno.test("aoc_gate_felony_blocks_aoc_refundable: felony_drug_conviction=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      felony_drug_conviction: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") === undefined, true);
});

Deno.test("aoc_all_gates_pass_allows_refundable: all eligibility flags correct → f1040 refundable credit present", () => {
  const result = compute([
    minimalAocItem({
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") !== undefined, true);
});

Deno.test("aoc_gate_felony_does_not_block_llc_path: felony disqualifies AOC but compute does not throw", () => {
  // Felony only blocks AOC; LLC is not affected. Engine should not crash.
  assertEquals(
    Array.isArray(
      compute([
        minimalAocItem({
          aoc_adjusted_expenses: 4000,
          felony_drug_conviction: true,
          llc_adjusted_expenses: 5000,
          filer_magi: 0,
        }),
      ]).outputs,
    ),
    true,
  );
});

// ============================================================
// 8. Kiddie Rule — AOC fully nonrefundable
// ============================================================

Deno.test("kiddie_rule_true_aoc_fully_nonrefundable: entire AOC goes to schedule3, no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      taxpayer_under_24_no_refundable_aoc: true,
    }),
  ]);
  // No refundable portion on f1040
  assertEquals(findOutput(result, "f1040") === undefined, true);
  // Entire $2,500 credit is nonrefundable on schedule3
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(sch3Out !== undefined, true);
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    2500,
  );
});

Deno.test("kiddie_rule_false_allows_refundable: taxpayer_under_24_no_refundable_aoc=false → normal 40/60 split", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      taxpayer_under_24_no_refundable_aoc: false,
    }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    1000,
  );
});

// ============================================================
// 9. MFS Filing Status — Both Credits Disallowed
// ============================================================

Deno.test("mfs_aoc_no_output: married filing separately produces no AOC output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      filing_status: FilingStatus.MFS,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("mfs_llc_no_output: married filing separately produces no LLC output", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 0,
      filing_status: FilingStatus.MFS,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 10. LLC Expense Cap ($10,000 per return)
// ============================================================

Deno.test("llc_expense_cap_single_student_15k: $15k expenses capped at $10k → $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 15000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.input as Record<string, number>)
        .line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_expense_exactly_at_cap_10k: $10k produces max $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.input as Record<string, number>)
        .line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_expense_below_cap_5k: $5k produces $1,000 credit (no cap triggered)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.input as Record<string, number>)
        .line3_education_credit,
    ),
    1000,
  );
});

// ============================================================
// 11. Informational Fields — must NOT add extra outputs
// ============================================================

Deno.test("institution_a_fields_informational: institution name/address/EIN fields do not alter output count", () => {
  const withInstitution = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      institution_a_name: "State University",
      institution_a_address: "123 College Ave, Townville, ST 12345",
      institution_a_ein: "12-3456789",
      institution_a_1098t_received: true,
      institution_a_1098t_box7_prior: false,
    }),
  ]);
  const withoutInstitution = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(
    withInstitution.outputs.length,
    withoutInstitution.outputs.length,
  );
});

Deno.test("student_ssn_informational: student_ssn does not alter output count", () => {
  const withSsn = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      student_ssn: "123-45-6789",
    }),
  ]);
  const withoutSsn = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(withSsn.outputs.length, withoutSsn.outputs.length);
});

Deno.test("institution_b_fields_informational: second institution fields do not alter output count", () => {
  const withB = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      institution_b_name: "Community College",
      institution_b_address: "456 Main St",
      institution_b_1098t_received: false,
      institution_b_ein: "98-7654321",
    }),
  ]);
  const withoutB = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(withB.outputs.length, withoutB.outputs.length);
});

// ============================================================
// 12. Edge Cases
// ============================================================

Deno.test("edge_hoh_uses_single_thresholds: HOH at $90k ceiling yields zero credit", () => {
  // HOH uses the $80k–$90k range (same as single)
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 90000,
      filing_status: FilingStatus.HOH,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("edge_hoh_below_ceiling_86k_has_credit: HOH at $86k yields partial credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 86000,
      filing_status: FilingStatus.HOH,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  // Credit may still exist at $86k (fraction = 0.6 → allowed = $1,000 → refundable = $400)
  assertEquals(findOutput(result, "f1040") !== undefined, true);
});

Deno.test("edge_multiple_aoc_students_summed_per_student_rule: two $4k students → $2,000 refundable total", () => {
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalAocItem({
      student_name: "Bob",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.input as Record<string, number>)
        .line29_refundable_aoc,
    ),
    2000,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.input as Record<string, number>)
        .line3_education_credit,
    ),
    3000,
  );
});

Deno.test("edge_aoc_ineligible_student_llc_expenses_no_crash: AOC-ineligible student with LLC expenses does not throw", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalAocItem({
          aoc_adjusted_expenses: 4000,
          aoc_claimed_4_prior_years: true,
          llc_adjusted_expenses: 5000,
          filer_magi: 0,
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("edge_phase_out_fraction_3_decimal_places: non-round MAGI fraction does not crash", () => {
  // MAGI $87,333 → fraction = 0.7333 → rounds to 0.733
  assertEquals(
    Array.isArray(
      compute([
        minimalAocItem({
          aoc_adjusted_expenses: 4000,
          filer_magi: 87333,
          filing_status: FilingStatus.Single,
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("edge_kiddie_rule_with_phase_out: kiddie rule + partial phase-out both applied correctly", () => {
  // Kiddie rule + MAGI $85k (fraction 0.5) → allowed = $2,500 × 0.5 = $1,250 → all nonrefundable
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
      taxpayer_under_24_no_refundable_aoc: true,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") === undefined, true);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(sch3Out !== undefined, true);
  // $1,250 entirely nonrefundable
  assertEquals(
    Math.round(
      (sch3Out!.input as Record<string, number>).line3_education_credit,
    ),
    1250,
  );
});

// ============================================================
// 13. Smoke Test — Comprehensive scenario
// ============================================================

Deno.test("smoke_test_full_scenario: two students (AOC + LLC), single filer MAGI $85k, partial phase-out", () => {
  // Single filer, MAGI = $85,000 → phase-out fraction = 0.5
  // AOC student: $4,000 expenses → tentative $2,500 → allowed $1,250
  //   refundable = 40% × $1,250 = $500 → f1040
  //   nonrefundable = 60% × $1,250 = $750 → schedule3
  // LLC student: $10,000 expenses → $2,000 base → allowed $1,000 → schedule3

  const result = compute([
    {
      credit_type: "aoc" as const,
      student_name: "Alice AOC",
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
      institution_a_name: "State University",
      institution_a_address: "1 Campus Dr, Collegetown, ST 12345",
      institution_a_ein: "12-3456789",
      institution_a_1098t_received: true,
      institution_a_1098t_box7_prior: false,
      student_ssn: "111-22-3333",
      taxpayer_under_24_no_refundable_aoc: false,
    },
    {
      credit_type: "llc" as const,
      student_name: "Bob LLC",
      llc_adjusted_expenses: 10000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    },
  ]);

  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");

  // Refundable AOC = $500
  assertEquals(f1040Out !== undefined, true);
  assertEquals(
    Math.round(
      (f1040Out!.input as Record<string, number>).line29_refundable_aoc,
    ),
    500,
  );

  // Nonrefundable on schedule3 must be positive (may be merged AOC + LLC or separate)
  assertEquals(sch3Out !== undefined, true);
  assertEquals(
    (sch3Out!.input as Record<string, number>).line3_education_credit > 0,
    true,
  );
});
