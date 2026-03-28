// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton: `f8863`
//   2. The input wrapper key matches compute()'s parameter: `f8863s`
//   3. The nodeType strings match the actual node routing strings:
//      - f1040 (for line29_refundable_aoc)
//      - schedule3 (for line3_education_credit)
//   4. AMBIGUITIES flagged below must be resolved against the implementation
//
// AMBIGUITIES:
//   A. The full per-student schema fields (student_name, student_ssn,
//      institution_a_name, institution_a_address, institution_a_1098t_received,
//      institution_a_1098t_box7_prior, institution_a_ein, aoc_claimed_4_prior_years,
//      enrolled_half_time, completed_4_years_postsec, felony_drug_conviction,
//      aoc_adjusted_expenses, llc_adjusted_expenses, filer_magi,
//      taxpayer_under_24_no_refundable_aoc, filing_status) are all described
//      in context.md. The implementation may use a simplified schema.
//   B. context.md says "filer_magi" is the MAGI field (not "agi"). Adjust
//      tests if the implementation uses a different field name.
//   C. context.md describes filing_status used for phase-out range selection;
//      MFS filers should not be able to claim any credit.
//   D. Multiple-student aggregation: AOC outputs should aggregate per-student
//      Line 30 values before applying phase-out; LLC outputs should aggregate
//      Line 31 values before applying the $10,000 cap and 20% rate.
//   E. "kiddie rule" field name: context.md uses `taxpayer_under_24_no_refundable_aoc`
//      boolean; verify field name in implementation.
//   F. AOC phase-out uses a fraction applied to the tentative credit;
//      context.md rounds the fraction to 3 decimal places (min(fraction, 1.000)).

import { assertEquals, assertThrows } from "@std/assert";
import { f8863 } from "./index.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Minimal AOC-eligible student item. */
function aocItem(overrides: Record<string, unknown> = {}) {
  return {
    credit_type: "aoc",
    student_name: "Alice Student",
    student_ssn: "123-45-6789",
    institution_a_name: "State University",
    institution_a_address: "1 College Ave, Springfield, IL 62701",
    institution_a_1098t_received: true,
    institution_a_1098t_box7_prior: false,
    institution_a_ein: "12-3456789",
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    aoc_adjusted_expenses: 4000,
    filer_magi: 50000,
    filing_status: "single",
    ...overrides,
  };
}

/** Minimal LLC-eligible student item. */
function llcItem(overrides: Record<string, unknown> = {}) {
  return {
    credit_type: "llc",
    student_name: "Bob Learner",
    student_ssn: "987-65-4321",
    institution_a_name: "Community College",
    institution_a_address: "2 Learning Rd, Springfield, IL 62701",
    institution_a_1098t_received: true,
    institution_a_1098t_box7_prior: false,
    llc_adjusted_expenses: 5000,
    filer_magi: 50000,
    filing_status: "single",
    ...overrides,
  };
}

// deno-lint-ignore no-explicit-any
function compute(items: any[]) {
  // deno-lint-ignore no-explicit-any
  return f8863.compute({ f8863s: items } as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── 1. Input Schema Validation ─────────────────────────────────────────────

Deno.test("schema: empty array throws", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("schema: missing credit_type throws", () => {
  assertThrows(
    () => compute([{ student_name: "Alice", filer_magi: 50000 }]),
    Error,
  );
});

Deno.test("schema: invalid credit_type throws", () => {
  assertThrows(
    () => compute([{ ...aocItem(), credit_type: "both" }]),
    Error,
  );
});

Deno.test("schema: negative aoc_adjusted_expenses throws", () => {
  assertThrows(
    () => compute([aocItem({ aoc_adjusted_expenses: -100 })]),
    Error,
  );
});

Deno.test("schema: negative llc_adjusted_expenses throws", () => {
  assertThrows(
    () => compute([llcItem({ llc_adjusted_expenses: -1 })]),
    Error,
  );
});

Deno.test("schema: negative filer_magi throws", () => {
  assertThrows(
    () => compute([aocItem({ filer_magi: -1 })]),
    Error,
  );
});

Deno.test("schema: valid minimal aoc item does not throw", () => {
  const result = compute([aocItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: valid minimal llc item does not throw", () => {
  const result = compute([llcItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ─── 2. Per-Box Routing ─────────────────────────────────────────────────────

Deno.test("routing: AOC routes nonrefundable portion to schedule3 line3_education_credit", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const inp = out!.input as Record<string, unknown>;
  assertEquals(typeof inp.line3_education_credit, "number");
});

Deno.test("routing: AOC routes refundable portion to f1040 line29_refundable_aoc", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const inp = out!.input as Record<string, unknown>;
  assertEquals(typeof inp.line29_refundable_aoc, "number");
});

Deno.test("routing: LLC routes only to schedule3 (no f1040 output)", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 5000, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040, undefined);
});

Deno.test("routing: AOC with zero expenses produces no outputs", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("routing: LLC with zero expenses produces no outputs", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ─── 3. AOC Credit Computation (Lines 27–30) ────────────────────────────────

Deno.test("aoc computation: $4000 expenses yields $2500 tentative credit", () => {
  // Line 27=$4000, Line28=$2000, Line29=$500, Line30=$2500
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  // nonrefundable = 2500 * 0.60 = 1500; refundable = 2500 * 0.40 = 1000
  assertEquals(s3.line3_education_credit, 1500);
  assertEquals(f1.line29_refundable_aoc, 1000);
});

Deno.test("aoc computation: $2500 expenses yields $2125 tentative credit", () => {
  // Line 27=$2500, Line28=$500, Line29=$125, Line30=$2125
  const result = compute([aocItem({ aoc_adjusted_expenses: 2500, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  // nonrefundable = 2125 * 0.60 = 1275; refundable = 2125 * 0.40 = 850
  assertEquals(s3.line3_education_credit, 1275);
  assertEquals(f1.line29_refundable_aoc, 850);
});

Deno.test("aoc computation: $1500 expenses (below $2000 tier) yields $1500 tentative", () => {
  // Line 27=$1500, Line28=$0, Line29=$0, Line30=$1500
  const result = compute([aocItem({ aoc_adjusted_expenses: 1500, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  // nonrefundable = 1500 * 0.60 = 900; refundable = 1500 * 0.40 = 600
  assertEquals(s3.line3_education_credit, 900);
  assertEquals(f1.line29_refundable_aoc, 600);
});

Deno.test("aoc computation: expenses > $4000 are capped at $4000", () => {
  // Entering $5000 should be treated same as $4000
  const result4000 = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000 })]);
  const result5000 = compute([aocItem({ aoc_adjusted_expenses: 5000, filer_magi: 50000 })]);
  const s3_4000 = findOutput(result4000, "schedule3")!.input as Record<string, unknown>;
  const s3_5000 = findOutput(result5000, "schedule3")!.input as Record<string, unknown>;
  // Both should yield the same nonrefundable credit
  assertEquals(s3_5000.line3_education_credit, s3_4000.line3_education_credit);
});

// ─── 4. LLC Credit Computation (Lines 10–12) ────────────────────────────────

Deno.test("llc computation: $10000 expenses yields $2000 credit (20% rate, $10k cap)", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 2000);
});

Deno.test("llc computation: $5000 expenses yields $1000 credit", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 5000, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 1000);
});

Deno.test("llc computation: expenses > $10000 are capped at $10000", () => {
  // $15000 treated same as $10000 → $2000 credit
  const result = compute([llcItem({ llc_adjusted_expenses: 15000, filer_magi: 50000 })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 2000);
});

// ─── 5. AOC MAGI Phase-Out Thresholds ───────────────────────────────────────

// Single filer: phase-out lower=$80,000, upper=$90,000, range=$10,000

Deno.test("aoc phase-out: single filer below $80,000 — no reduction", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 79999, filing_status: "single" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000); // full $2500 AOC
});

Deno.test("aoc phase-out: single filer at exactly $80,000 — no reduction", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 80000, filing_status: "single" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000); // full credit
});

Deno.test("aoc phase-out: single filer at $85,000 — 50% reduction", () => {
  // fraction = (85000-80000)/10000 = 0.5; allowed = 2500 * 0.5 = 1250
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 85000, filing_status: "single" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 500); // 1250 * 0.40 = 500
});

Deno.test("aoc phase-out: single filer at exactly $90,000 — fully phased out", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 90000, filing_status: "single" })]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("aoc phase-out: single filer above $90,000 — fully phased out", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 95000, filing_status: "single" })]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// MFJ filer: phase-out lower=$160,000, upper=$180,000, range=$20,000

Deno.test("aoc phase-out: MFJ filer below $160,000 — no reduction", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 159999, filing_status: "mfj" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000);
});

Deno.test("aoc phase-out: MFJ filer at exactly $160,000 — no reduction", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 160000, filing_status: "mfj" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000);
});

Deno.test("aoc phase-out: MFJ filer at $170,000 — 50% reduction", () => {
  // fraction = (170000-160000)/20000 = 0.5; allowed = 2500 * 0.5 = 1250
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 170000, filing_status: "mfj" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 500);
});

Deno.test("aoc phase-out: MFJ filer at exactly $180,000 — fully phased out", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 180000, filing_status: "mfj" })]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("aoc phase-out: MFJ filer above $180,000 — fully phased out", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 185000, filing_status: "mfj" })]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── 6. LLC MAGI Phase-Out Thresholds ───────────────────────────────────────

// Single filer: phase-out lower=$80,000, upper=$90,000

Deno.test("llc phase-out: single filer at exactly $80,000 — no reduction", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 80000, filing_status: "single" })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 2000);
});

Deno.test("llc phase-out: single filer at $85,000 — 50% reduction", () => {
  // LLC base = 2000; allowed = 2000 * 0.5 = 1000
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 85000, filing_status: "single" })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 1000);
});

Deno.test("llc phase-out: single filer at exactly $90,000 — fully phased out", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 90000, filing_status: "single" })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("llc phase-out: single filer above $90,000 — fully phased out", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 95000, filing_status: "single" })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// MFJ filer: phase-out lower=$160,000, upper=$180,000

Deno.test("llc phase-out: MFJ filer at exactly $160,000 — no reduction", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 160000, filing_status: "mfj" })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 2000);
});

Deno.test("llc phase-out: MFJ filer at $170,000 — 50% reduction", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 170000, filing_status: "mfj" })]);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 1000);
});

Deno.test("llc phase-out: MFJ filer at exactly $180,000 — fully phased out", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 180000, filing_status: "mfj" })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("llc phase-out: MFJ filer above $180,000 — fully phased out", () => {
  const result = compute([llcItem({ llc_adjusted_expenses: 10000, filer_magi: 185000, filing_status: "mfj" })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── 7. AOC Eligibility Gates (Lines 23–26) ─────────────────────────────────

Deno.test("aoc gate: aoc_claimed_4_prior_years=true forces LLC path (no f1040 refundable output)", () => {
  // Student is ineligible for AOC; if llc_adjusted_expenses also present, only LLC used
  const result = compute([
    aocItem({
      aoc_claimed_4_prior_years: true,
      aoc_adjusted_expenses: 4000,
      llc_adjusted_expenses: 3000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined); // no refundable AOC
});

Deno.test("aoc gate: enrolled_half_time=false forces LLC path (no f1040 refundable output)", () => {
  const result = compute([
    aocItem({
      enrolled_half_time: false,
      aoc_adjusted_expenses: 4000,
      llc_adjusted_expenses: 3000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc gate: completed_4_years_postsec=true forces LLC path (no f1040 refundable output)", () => {
  const result = compute([
    aocItem({
      completed_4_years_postsec: true,
      aoc_adjusted_expenses: 4000,
      llc_adjusted_expenses: 3000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc gate: felony_drug_conviction=true forces LLC path (no f1040 refundable output)", () => {
  // Felony disqualifies AOC only; LLC is still allowed
  const result = compute([
    aocItem({
      felony_drug_conviction: true,
      aoc_adjusted_expenses: 4000,
      llc_adjusted_expenses: 3000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc gate: all four eligibility conditions pass — AOC computed", () => {
  const result = compute([
    aocItem({
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040") !== undefined, true);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000);
});

// ─── 8. Kiddie Rule — AOC Fully Nonrefundable ───────────────────────────────

Deno.test("kiddie rule: taxpayer_under_24_no_refundable_aoc=true — no f1040 output, full AOC to schedule3", () => {
  const result = compute([
    aocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 50000,
      taxpayer_under_24_no_refundable_aoc: true,
    }),
  ]);
  // Entire $2500 AOC becomes nonrefundable
  assertEquals(findOutput(result, "f1040"), undefined);
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 2500);
});

Deno.test("kiddie rule: taxpayer_under_24_no_refundable_aoc=false — normal 40/60 split", () => {
  const result = compute([
    aocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 50000,
      taxpayer_under_24_no_refundable_aoc: false,
    }),
  ]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000); // 40% refundable
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 1500); // 60% nonrefundable
});

// ─── 9. MFS — Both Credits Disallowed ──────────────────────────────────────

Deno.test("mfs: AOC not allowed for married filing separately filer", () => {
  const result = compute([
    aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000, filing_status: "mfs" }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("mfs: LLC not allowed for married filing separately filer", () => {
  const result = compute([
    llcItem({ llc_adjusted_expenses: 5000, filer_magi: 50000, filing_status: "mfs" }),
  ]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ─── 10. Aggregation — Multiple Students ────────────────────────────────────

Deno.test("aggregation: AOC sums per-student Line 30 before phase-out (two students)", () => {
  // Each student: $4000 expenses → $2500 tentative AOC
  // Total tentative = $5000; MAGI = $50000 → no phase-out
  // Total nonrefundable = 5000 * 0.60 = 3000; refundable = 5000 * 0.40 = 2000
  const result = compute([
    aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "Student1", student_ssn: "111-11-1111" }),
    aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "Student2", student_ssn: "222-22-2222" }),
  ]);
  // Total refundable outputs should sum to 2000
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const totalRefundable = f1040Outputs.reduce(
    (sum, o) => sum + ((o.input as Record<string, unknown>).line29_refundable_aoc as number),
    0,
  );
  assertEquals(totalRefundable, 2000);
});

Deno.test("aggregation: LLC sums all students' expenses before $10,000 cap", () => {
  // Three students, $4000 each → $12000 total; capped at $10000 → $2000 credit
  const result = compute([
    llcItem({ llc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "S1", student_ssn: "111-11-1111" }),
    llcItem({ llc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "S2", student_ssn: "222-22-2222" }),
    llcItem({ llc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "S3", student_ssn: "333-33-3333" }),
  ]);
  const s3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  const totalLLC = s3Outputs.reduce(
    (sum, o) => sum + ((o.input as Record<string, unknown>).line3_education_credit as number),
    0,
  );
  assertEquals(totalLLC, 2000);
});

Deno.test("aggregation: both AOC and LLC may appear on same return for different students", () => {
  const result = compute([
    aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000, student_name: "S1", student_ssn: "111-11-1111" }),
    llcItem({ llc_adjusted_expenses: 5000, filer_magi: 50000, student_name: "S2", student_ssn: "222-22-2222" }),
  ]);
  // Should have both f1040 (refundable AOC) and schedule3 (nonrefundable AOC + LLC) outputs
  assertEquals(findOutput(result, "f1040") !== undefined, true);
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
});

// ─── 11. Informational / Identity Fields ────────────────────────────────────

Deno.test("info fields: student_name does not affect credit amount", () => {
  const r1 = compute([aocItem({ student_name: "Short" })]);
  const r2 = compute([aocItem({ student_name: "Very Long Name With Extra Characters" })]);
  const s3_1 = findOutput(r1, "schedule3")!.input as Record<string, unknown>;
  const s3_2 = findOutput(r2, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3_1.line3_education_credit, s3_2.line3_education_credit);
});

Deno.test("info fields: institution_a_name does not affect credit amount", () => {
  const r1 = compute([aocItem({ institution_a_name: "MIT" })]);
  const r2 = compute([aocItem({ institution_a_name: "State Community College" })]);
  const s3_1 = findOutput(r1, "schedule3")!.input as Record<string, unknown>;
  const s3_2 = findOutput(r2, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3_1.line3_education_credit, s3_2.line3_education_credit);
});

Deno.test("info fields: institution_a_1098t_received checkbox does not change credit amount", () => {
  const withForm = compute([aocItem({ institution_a_1098t_received: true })]);
  const withoutForm = compute([aocItem({ institution_a_1098t_received: false })]);
  const s3_with = findOutput(withForm, "schedule3")!.input as Record<string, unknown>;
  const s3_without = findOutput(withoutForm, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3_with.line3_education_credit, s3_without.line3_education_credit);
});

// ─── 12. Edge Cases ──────────────────────────────────────────────────────────

Deno.test("edge: HOH uses same thresholds as single (phase-out $80k–$90k)", () => {
  // HOH at $85,000 → 50% reduction, same as single
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 85000, filing_status: "hoh" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 500); // 2500 * 0.5 * 0.40 = 500
});

Deno.test("edge: QSS uses same thresholds as single (phase-out $80k–$90k)", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 85000, filing_status: "qss" })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 500);
});

Deno.test("edge: LLC cap — two students with $6000 each = $12000 total, capped to $10000 → $2000 credit", () => {
  const result = compute([
    llcItem({ llc_adjusted_expenses: 6000, filer_magi: 50000, student_name: "S1", student_ssn: "111-11-1111" }),
    llcItem({ llc_adjusted_expenses: 6000, filer_magi: 50000, student_name: "S2", student_ssn: "222-22-2222" }),
  ]);
  const s3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  const total = s3Outputs.reduce(
    (sum, o) => sum + ((o.input as Record<string, unknown>).line3_education_credit as number),
    0,
  );
  assertEquals(total, 2000);
});

Deno.test("edge: AOC expenses exactly at first $2000 tier — no second-tier component", () => {
  // Line 27=$2000, Line28=$0, Line29=$0, Line30=$2000
  const result = compute([aocItem({ aoc_adjusted_expenses: 2000, filer_magi: 50000 })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 800); // 2000 * 0.40
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(s3.line3_education_credit, 1200); // 2000 * 0.60
});

Deno.test("edge: AOC expenses exactly at $4000 cap — max $2500 credit", () => {
  const result = compute([aocItem({ aoc_adjusted_expenses: 4000, filer_magi: 50000 })]);
  const f1 = findOutput(result, "f1040")!.input as Record<string, unknown>;
  const s3 = findOutput(result, "schedule3")!.input as Record<string, unknown>;
  assertEquals(f1.line29_refundable_aoc, 1000); // 2500 * 0.40
  assertEquals(s3.line3_education_credit, 1500); // 2500 * 0.60
});

Deno.test("edge: felony conviction — LLC is NOT disqualified (LLC credit still computed)", () => {
  const result = compute([
    aocItem({
      felony_drug_conviction: true,
      aoc_adjusted_expenses: 0,
      llc_adjusted_expenses: 5000,
      filer_magi: 50000,
    }),
  ]);
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  const inp = s3!.input as Record<string, unknown>;
  assertEquals(inp.line3_education_credit, 1000); // 5000 * 0.20
});

Deno.test("edge: aoc_claimed_4_prior_years=false but enrolled_half_time=false — no AOC", () => {
  const result = compute([
    aocItem({
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 50000,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ─── 13. Smoke Test ──────────────────────────────────────────────────────────

Deno.test("smoke: multiple students, mixed AOC+LLC, MFJ within phase-out range", () => {
  // Student 1: AOC, $4000 expenses, all eligibility gates passed
  // Student 2: LLC, $8000 expenses
  // MFJ filer, MAGI = $170,000 (midpoint of $160k–$180k) → 50% phase-out on both
  const result = compute([
    aocItem({
      student_name: "Alice",
      student_ssn: "100-00-0001",
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 170000,
      filing_status: "mfj",
      taxpayer_under_24_no_refundable_aoc: false,
    }),
    llcItem({
      student_name: "Bob",
      student_ssn: "100-00-0002",
      llc_adjusted_expenses: 8000,
      filer_magi: 170000,
      filing_status: "mfj",
    }),
  ]);

  // AOC at 50% phase-out: 2500 * 0.5 = 1250; refundable = 500; nonrefundable = 750
  // LLC: 8000 * 0.20 = 1600; at 50% phase-out → 800

  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  const totalRefundableAOC = f1040Outputs.reduce(
    (sum, o) => sum + ((o.input as Record<string, unknown>).line29_refundable_aoc as number),
    0,
  );
  assertEquals(totalRefundableAOC, 500);

  const s3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  const totalNonrefundable = s3Outputs.reduce(
    (sum, o) => sum + ((o.input as Record<string, unknown>).line3_education_credit as number),
    0,
  );
  // 750 (AOC nonrefundable) + 800 (LLC) = 1550
  assertEquals(totalNonrefundable, 1550);
});

// ─── Total test count: 52 ────────────────────────────────────────────────────
// Coverage section breakdown:
//   1. Input Schema Validation: 8 tests
//   2. Per-Box Routing: 5 tests
//   3. AOC Credit Computation: 4 tests
//   4. LLC Credit Computation: 3 tests
//   5. AOC MAGI Phase-Out Thresholds: 10 tests (single + MFJ)
//   6. LLC MAGI Phase-Out Thresholds: 8 tests (single + MFJ)
//   7. AOC Eligibility Gates (Lines 23-26): 5 tests
//   8. Kiddie Rule: 2 tests
//   9. MFS Disallowance: 2 tests
//  10. Aggregation / Multiple Students: 3 tests
//  11. Informational / Identity Fields: 3 tests
//  12. Edge Cases: 7 tests
//  13. Smoke Test: 1 test
