import { assertEquals, assertThrows } from "@std/assert";
import { CommunityPropertyState, f8958, inputSchema } from "./index.ts";

function compute(input: Parameters<typeof f8958.compute>[1]) {
  return f8958.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// 1. Schema Validation — state enum
// =============================================================================

Deno.test("f8958: all nine community property states accepted", () => {
  const states: CommunityPropertyState[] = [
    CommunityPropertyState.AZ,
    CommunityPropertyState.CA,
    CommunityPropertyState.ID,
    CommunityPropertyState.LA,
    CommunityPropertyState.NM,
    CommunityPropertyState.NV,
    CommunityPropertyState.TX,
    CommunityPropertyState.WA,
    CommunityPropertyState.WI,
  ];
  for (const state of states) {
    const parsed = inputSchema.safeParse({ state });
    assertEquals(parsed.success, true, `State ${state} should be valid`);
  }
});

Deno.test("f8958: non-community-property state rejected", () => {
  const parsed = inputSchema.safeParse({ state: "FL" });
  assertEquals(parsed.success, false);
});

Deno.test("f8958: empty object is valid — all fields optional", () => {
  const parsed = inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Schema Validation — withholding fields
// =============================================================================

Deno.test("f8958: negative taxpayer_withholding rejected", () => {
  const parsed = inputSchema.safeParse({ taxpayer_withholding: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8958: negative spouse_withholding rejected", () => {
  const parsed = inputSchema.safeParse({ spouse_withholding: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8958: zero withholding accepted", () => {
  const parsed = inputSchema.safeParse({
    taxpayer_withholding: 0,
    spouse_withholding: 0,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 3. Schema Validation — allocation_items shape
// =============================================================================

Deno.test("f8958: allocation_items with valid shape accepted", () => {
  const parsed = inputSchema.safeParse({
    state: CommunityPropertyState.CA,
    allocation_items: [
      { description: "Wages", total_amount: 100_000, taxpayer_share: 60_000, spouse_share: 40_000 },
      { description: "Interest", total_amount: 2_000, taxpayer_share: 1_000, spouse_share: 1_000 },
    ],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8958: allocation_items with all optional sub-fields omitted accepted", () => {
  const parsed = inputSchema.safeParse({
    allocation_items: [{}],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 4. Allocation math — taxpayer + spouse shares sum to total
// =============================================================================

Deno.test("f8958: taxpayer_share + spouse_share equals total_amount for each item", () => {
  // The form requires spouses to split total income between them.
  // Verify that the test data is self-consistent (the schema doesn't enforce this —
  // it's a preparer responsibility verified by the IRS).
  const items = [
    { description: "Wages", total_amount: 120_000, taxpayer_share: 70_000, spouse_share: 50_000 },
    { description: "Interest", total_amount: 4_000, taxpayer_share: 2_000, spouse_share: 2_000 },
    { description: "Business income", total_amount: 30_000, taxpayer_share: 30_000, spouse_share: 0 },
  ];
  for (const item of items) {
    assertEquals(
      (item.taxpayer_share ?? 0) + (item.spouse_share ?? 0),
      item.total_amount ?? 0,
      `Shares must sum to total for: ${item.description}`,
    );
  }
  // Confirm these items are accepted by schema
  const parsed = inputSchema.safeParse({
    state: CommunityPropertyState.CA,
    allocation_items: items,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8958: taxpayer_total_income + spouse_total_income represents combined income split", () => {
  // Verify the summary totals correctly reflect the per-spouse allocated amounts.
  const taxpayerTotal = 70_000;
  const spouseTotal = 50_000;
  const combinedIncome = 120_000;
  assertEquals(taxpayerTotal + spouseTotal, combinedIncome);

  const parsed = inputSchema.safeParse({
    state: CommunityPropertyState.CA,
    taxpayer_total_income: taxpayerTotal,
    spouse_total_income: spouseTotal,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 5. Outputs — always empty (informational/disclosure only)
// =============================================================================

Deno.test("f8958: disclosure-only form always produces no tax outputs", () => {
  const result = compute({
    state: CommunityPropertyState.CA,
    taxpayer_total_income: 60_000,
    spouse_total_income: 40_000,
    taxpayer_withholding: 8_000,
    spouse_withholding: 5_000,
    allocation_items: [
      { description: "Wages", total_amount: 100_000, taxpayer_share: 60_000, spouse_share: 40_000 },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Compute — invalid state throws
// =============================================================================

Deno.test("f8958: compute throws on invalid state", () => {
  assertThrows(() =>
    f8958.compute({ taxYear: 2025, formType: "f1040" }, {
      state: "NY" as CommunityPropertyState,
    })
  );
});
