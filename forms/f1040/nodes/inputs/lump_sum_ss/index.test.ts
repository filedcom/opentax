import { assertEquals, assertThrows } from "@std/assert";
import { lump_sum_ss } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    total_ss_benefits_this_year: 0,
    lump_sum_amount: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return lump_sum_ss.compute({ taxYear: 2025, formType: "f1040" }, { lump_sum_sss: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("lump_sum_ss.inputSchema: valid minimal item passes", () => {
  const parsed = lump_sum_ss.inputSchema.safeParse({ lump_sum_sss: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("lump_sum_ss.inputSchema: empty array fails (min 1)", () => {
  const parsed = lump_sum_ss.inputSchema.safeParse({ lump_sum_sss: [] });
  assertEquals(parsed.success, false);
});

Deno.test("lump_sum_ss.inputSchema: negative total_ss_benefits_this_year fails", () => {
  const parsed = lump_sum_ss.inputSchema.safeParse({
    lump_sum_sss: [minimalItem({ total_ss_benefits_this_year: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("lump_sum_ss.inputSchema: negative lump_sum_amount fails", () => {
  const parsed = lump_sum_ss.inputSchema.safeParse({
    lump_sum_sss: [minimalItem({ lump_sum_amount: -500 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Zero Benefits — No Output
// =============================================================================

Deno.test("lump_sum_ss.compute: zero total_ss_benefits → no output", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 0,
    lump_sum_amount: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. No Lump Sum — Routes Total Directly
// =============================================================================

Deno.test("lump_sum_ss.compute: no lump sum → routes total_ss_benefits to f1040 line6a", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 24_000,
    lump_sum_amount: 0,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 24_000);
});

// =============================================================================
// 4. Lump Sum Election — Beneficial (Explicit Override)
// =============================================================================

Deno.test("lump_sum_ss.compute: election beneficial → adjusted benefits = current year only", () => {
  // total=30000, lump_sum=18000, current_year_only=12000
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 30_000,
    lump_sum_amount: 18_000,
    is_lump_sum_election_beneficial: true,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 12_000);
});

// =============================================================================
// 5. Lump Sum Election — Not Beneficial
// =============================================================================

Deno.test("lump_sum_ss.compute: election not beneficial → routes full total_ss_benefits", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 30_000,
    lump_sum_amount: 18_000,
    is_lump_sum_election_beneficial: false,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 30_000);
});

// =============================================================================
// 6. Lump Sum Without Election Override
// =============================================================================

Deno.test("lump_sum_ss.compute: lump sum present without override → total routed (conservative default)", () => {
  // Without explicit election flag, default is to include total (no retroactive adjustment without flag)
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 24_000,
    lump_sum_amount: 12_000,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 24_000);
});

// =============================================================================
// 7. Validation — Lump Sum > Total (Hard Error)
// =============================================================================

Deno.test("lump_sum_ss.compute: lump_sum_amount > total_ss_benefits → throws", () => {
  assertThrows(
    () => compute([minimalItem({
      total_ss_benefits_this_year: 10_000,
      lump_sum_amount: 15_000,
    })]),
    Error,
  );
});

// =============================================================================
// 8. Prior Year Benefits Array
// =============================================================================

Deno.test("lump_sum_ss.compute: prior_year_benefits provided with election beneficial", () => {
  // total=36000, lump=24000, current=12000; prior_year_benefits provided
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 36_000,
    lump_sum_amount: 24_000,
    prior_year_benefits: [
      { year: 2022, amount: 12_000 },
      { year: 2023, amount: 12_000 },
    ],
    is_lump_sum_election_beneficial: true,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 12_000);
});

// =============================================================================
// 9. Output Routing
// =============================================================================

Deno.test("lump_sum_ss.compute: output routes to f1040.line6a_ss_gross", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 18_000,
    lump_sum_amount: 0,
  })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
});

Deno.test("lump_sum_ss.compute: does not route to any other nodeType", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 18_000,
    lump_sum_amount: 0,
  })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

// =============================================================================
// 10. Aggregation — Multiple Items
// =============================================================================

Deno.test("lump_sum_ss.compute: multiple items — adjusted benefits aggregated", () => {
  const result = compute([
    minimalItem({
      total_ss_benefits_this_year: 12_000,
      lump_sum_amount: 0,
    }),
    minimalItem({
      total_ss_benefits_this_year: 18_000,
      lump_sum_amount: 6_000,
      is_lump_sum_election_beneficial: true,
    }),
  ]);
  // Item 1: 12000; Item 2 with election: 18000-6000=12000; total = 24000
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 24_000);
});

// =============================================================================
// 11. Smoke Test
// =============================================================================

Deno.test("lump_sum_ss.compute: smoke test — lump sum from prior 2 years, election beneficial", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 42_000,
    lump_sum_amount: 28_000,
    prior_year_benefits: [
      { year: 2023, amount: 15_000 },
      { year: 2024, amount: 13_000 },
    ],
    is_lump_sum_election_beneficial: true,
  })]);
  // election beneficial: adjusted = 42000 - 28000 = 14000
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 14_000);
});
