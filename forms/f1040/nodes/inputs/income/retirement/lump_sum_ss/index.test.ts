import { assertEquals, assertThrows } from "@std/assert";
import { lump_sum_ss } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    total_ss_benefits_this_year: 0,
    lump_sum_amount: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return lump_sum_ss.compute({ taxYear: 2025, formType: "f1040" }, {
    lump_sum_sss: items,
  });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("lump_sum_ss.inputSchema: valid minimal item passes", () => {
  const parsed = lump_sum_ss.inputSchema.safeParse({
    lump_sum_sss: [minimalItem()],
  });
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
// 3. The issued benefit statement owns line 6a
// =============================================================================

Deno.test("lump_sum_ss.compute: no lump sum does not duplicate issued box 5", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 24_000,
    lump_sum_amount: 0,
  })]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 4. Election Cannot Be Inferred from a Beneficial Flag
// =============================================================================

Deno.test("lump_sum_ss.compute: election flag alone cannot reduce line 6a", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        total_ss_benefits_this_year: 30_000,
        lump_sum_amount: 18_000,
        is_lump_sum_election_beneficial: true,
      })]),
    Error,
    "needs Publication 915 Worksheet 4",
  );
});

// =============================================================================
// 5. Lump Sum Election — Not Beneficial
// =============================================================================

Deno.test("lump_sum_ss.compute: election not beneficial leaves issued box 5 as the source", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 30_000,
    lump_sum_amount: 18_000,
    is_lump_sum_election_beneficial: false,
  })]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 6. Lump Sum Without Election Override
// =============================================================================

Deno.test("lump_sum_ss.compute: lump sum without election does not deposit box 5 twice", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 24_000,
    lump_sum_amount: 12_000,
  })]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 7. Validation — Lump Sum > Total (Hard Error)
// =============================================================================

Deno.test("lump_sum_ss.compute: lump_sum_amount > total_ss_benefits → throws", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        total_ss_benefits_this_year: 10_000,
        lump_sum_amount: 15_000,
      })]),
    Error,
  );
});

// =============================================================================
// 8. Prior Year Benefits Array
// =============================================================================

Deno.test("lump_sum_ss.compute: prior-year payment splits alone cannot support election", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        total_ss_benefits_this_year: 36_000,
        lump_sum_amount: 24_000,
        prior_year_benefits: [
          { year: 2022, amount: 12_000 },
          { year: 2023, amount: 12_000 },
        ],
        is_lump_sum_election_beneficial: true,
      })]),
    Error,
    "needs Publication 915 Worksheet 4",
  );
});

// =============================================================================
// 9. Worksheet cannot create a second return source
// =============================================================================

Deno.test("lump_sum_ss.compute: has no separate f1040 output", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 18_000,
    lump_sum_amount: 0,
  })]);
  assertEquals(result.outputs, []);
});

Deno.test("lump_sum_ss.compute: does not route to any nodeType", () => {
  const result = compute([minimalItem({
    total_ss_benefits_this_year: 18_000,
    lump_sum_amount: 0,
  })]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 10. Aggregation — Multiple Items
// =============================================================================

Deno.test("lump_sum_ss.compute: multiple worksheet items do not duplicate line 6a", () => {
  const result = compute([
    minimalItem({
      total_ss_benefits_this_year: 12_000,
      lump_sum_amount: 0,
    }),
    minimalItem({
      total_ss_benefits_this_year: 18_000,
      lump_sum_amount: 6_000,
      is_lump_sum_election_beneficial: false,
    }),
  ]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 11. Smoke Test
// =============================================================================

Deno.test("lump_sum_ss.compute: two prior-year splits still need taxable-benefit worksheets", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        total_ss_benefits_this_year: 42_000,
        lump_sum_amount: 28_000,
        prior_year_benefits: [
          { year: 2023, amount: 15_000 },
          { year: 2024, amount: 13_000 },
        ],
        is_lump_sum_election_beneficial: true,
      })]),
    Error,
    "needs Publication 915 Worksheet 4",
  );
});
