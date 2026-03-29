import { assertEquals, assertThrows } from "@std/assert";
import { form5329, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../schedule2/index.ts";

function compute(input: Record<string, unknown>) {
  return form5329.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema: accepts empty object (all fields optional)", () => {
  const parsed = form5329.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("schema: rejects negative early_distribution", () => {
  const parsed = form5329.inputSchema.safeParse({ early_distribution: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("schema: rejects negative excess_traditional_ira", () => {
  const parsed = form5329.inputSchema.safeParse({ excess_traditional_ira: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("schema: accepts valid full input", () => {
  const parsed = form5329.inputSchema.safeParse({
    early_distribution: 10000,
    early_distribution_exception: 5000,
    excess_traditional_ira: 2000,
    traditional_ira_value: 15000,
    excess_roth_ira: 1000,
    roth_ira_value: 8000,
  });
  assertEquals(parsed.success, true);
});

// ---------------------------------------------------------------------------
// 2. No Output When No Penalty
// ---------------------------------------------------------------------------

Deno.test("no_output: no fields provided → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("no_output: early_distribution fully covered by exception → no outputs", () => {
  // All $10,000 covered by exception — net subject to tax = 0
  const result = compute({
    early_distribution: 10_000,
    early_distribution_exception: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no_output: zero excess contributions → no outputs", () => {
  const result = compute({
    excess_traditional_ira: 0,
    traditional_ira_value: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 3. Part I — Early Distribution Penalty (10%)
// ---------------------------------------------------------------------------

Deno.test("part1: 10% penalty on full early distribution (no exception)", () => {
  // Line 1 = 10000, line 2 = 0, line 3 = 10000, line 4 = 1000
  const result = compute({ early_distribution: 10_000 });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 1_000);
});

Deno.test("part1: 10% penalty reduced by exception", () => {
  // Line 1 = 20000, line 2 = 5000, line 3 = 15000, line 4 = 1500
  const result = compute({
    early_distribution: 20_000,
    early_distribution_exception: 5_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 1_500);
});

Deno.test("part1: exception cannot exceed distribution (clamped to zero)", () => {
  // Exception > distribution → net = 0 → no penalty
  const result = compute({
    early_distribution: 5_000,
    early_distribution_exception: 8_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 4. Part I — SIMPLE IRA (25% penalty)
// ---------------------------------------------------------------------------

Deno.test("part1_simple: 25% penalty on SIMPLE IRA early distribution within 2 years", () => {
  // 25% × 8000 = 2000
  const result = compute({ simple_ira_early_distribution: 8_000 });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 2_000);
});

Deno.test("part1_simple: SIMPLE IRA and regular early dist combine", () => {
  // Regular: 10000 × 10% = 1000
  // SIMPLE:  5000 × 25% = 1250
  // Total = 2250
  const result = compute({
    early_distribution: 10_000,
    simple_ira_early_distribution: 5_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 2_250);
});

// ---------------------------------------------------------------------------
// 5. Part II — ESA/ABLE Distributions (10%)
// ---------------------------------------------------------------------------

Deno.test("part2: 10% penalty on ESA/ABLE distribution (no exception)", () => {
  // 10% × 3000 = 300
  const result = compute({ esa_able_distribution: 3_000 });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 300);
});

Deno.test("part2: exception reduces ESA/ABLE penalty", () => {
  // Line 5 = 5000, line 6 = 2000, line 7 = 3000, line 8 = 300
  const result = compute({
    esa_able_distribution: 5_000,
    esa_able_exception: 2_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 300);
});

Deno.test("part2: fully excepted ESA/ABLE → no output", () => {
  const result = compute({
    esa_able_distribution: 2_000,
    esa_able_exception: 2_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 6. Part III — Excess Traditional IRA Contributions (6%)
// ---------------------------------------------------------------------------

Deno.test("part3: 6% penalty on excess traditional IRA contributions", () => {
  // min(2000, 15000) × 6% = 120
  const result = compute({
    excess_traditional_ira: 2_000,
    traditional_ira_value: 15_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 120);
});

Deno.test("part3: 6% capped at IRA FMV when excess > FMV", () => {
  // min(5000, 500) × 6% = 30 (FMV is the lesser)
  const result = compute({
    excess_traditional_ira: 5_000,
    traditional_ira_value: 500,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 30);
});

Deno.test("part3: excess traditional IRA with no FMV provided uses excess as base", () => {
  // When account value not provided, assume excess is the base (most conservative)
  // 6% × 3000 = 180
  const result = compute({ excess_traditional_ira: 3_000 });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 180);
});

// ---------------------------------------------------------------------------
// 7. Part IV — Excess Roth IRA Contributions (6%)
// ---------------------------------------------------------------------------

Deno.test("part4: 6% penalty on excess Roth IRA contributions", () => {
  // min(1500, 10000) × 6% = 90
  const result = compute({
    excess_roth_ira: 1_500,
    roth_ira_value: 10_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 90);
});

Deno.test("part4: 6% Roth capped at account FMV", () => {
  // min(8000, 300) × 6% = 18
  const result = compute({
    excess_roth_ira: 8_000,
    roth_ira_value: 300,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 18);
});

// ---------------------------------------------------------------------------
// 8. Part V — Excess Coverdell ESA (6%)
// ---------------------------------------------------------------------------

Deno.test("part5: 6% penalty on excess Coverdell ESA contributions", () => {
  // min(500, 2000) × 6% = 30
  const result = compute({
    excess_coverdell_esa: 500,
    coverdell_esa_value: 2_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 30);
});

// ---------------------------------------------------------------------------
// 9. Part VI — Excess Archer MSA (6%)
// ---------------------------------------------------------------------------

Deno.test("part6: 6% penalty on excess Archer MSA contributions", () => {
  // min(1000, 5000) × 6% = 60
  const result = compute({
    excess_archer_msa: 1_000,
    archer_msa_value: 5_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 60);
});

// ---------------------------------------------------------------------------
// 10. Part VII — Excess HSA Contributions (6%)
// ---------------------------------------------------------------------------

Deno.test("part7: 6% penalty on excess HSA contributions", () => {
  // min(2000, 8000) × 6% = 120
  const result = compute({
    excess_hsa: 2_000,
    hsa_value: 8_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 120);
});

Deno.test("part7: HSA excess capped at account value", () => {
  // min(10000, 200) × 6% = 12
  const result = compute({
    excess_hsa: 10_000,
    hsa_value: 200,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 12);
});

// ---------------------------------------------------------------------------
// 11. Part VIII — Excess ABLE Contributions (6%)
// ---------------------------------------------------------------------------

Deno.test("part8: 6% penalty on excess ABLE contributions", () => {
  // min(1000, 5000) × 6% = 60
  const result = compute({
    excess_able: 1_000,
    able_value: 5_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 60);
});

// ---------------------------------------------------------------------------
// 12. Output Routing
// ---------------------------------------------------------------------------

Deno.test("routing: all penalties aggregate to single schedule2 output", () => {
  // Part I: 10000 × 10% = 1000
  // Part III: min(2000, 20000) × 6% = 120
  // Part IV: min(500, 8000) × 6% = 30
  // Total = 1150
  const result = compute({
    early_distribution: 10_000,
    excess_traditional_ira: 2_000,
    traditional_ira_value: 20_000,
    excess_roth_ira: 500,
    roth_ira_value: 8_000,
  });

  const sch2Outputs = result.outputs.filter((o) => o.nodeType === "schedule2");
  assertEquals(sch2Outputs.length, 1);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 1_150);
});

Deno.test("routing: output nodeType is schedule2", () => {
  const result = compute({ early_distribution: 5_000 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
});

// ---------------------------------------------------------------------------
// 13. Smoke Test — comprehensive scenario
// ---------------------------------------------------------------------------

Deno.test("smoke: multiple penalties across several parts", () => {
  // Part I: 15000 × 10% = 1500
  // Part I SIMPLE: 4000 × 25% = 1000
  // Part II: (3000 - 1000) × 10% = 200
  // Part III: min(2000, 10000) × 6% = 120
  // Part IV: min(1000, 5000) × 6% = 60
  // Part VII: min(500, 8000) × 6% = 30
  // Total = 2910
  const result = compute({
    early_distribution: 15_000,
    simple_ira_early_distribution: 4_000,
    esa_able_distribution: 3_000,
    esa_able_exception: 1_000,
    excess_traditional_ira: 2_000,
    traditional_ira_value: 10_000,
    excess_roth_ira: 1_000,
    roth_ira_value: 5_000,
    excess_hsa: 500,
    hsa_value: 8_000,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line8_form5329_tax, 2_910);
});
