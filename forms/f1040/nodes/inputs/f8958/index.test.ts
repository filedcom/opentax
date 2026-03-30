import { assertEquals } from "@std/assert";
import { CommunityPropertyState, f8958 } from "./index.ts";

function compute(input: Parameters<typeof f8958.compute>[1]) {
  return f8958.compute({ taxYear: 2025 }, input);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8958: empty object is valid — all fields optional", () => {
  const parsed = f8958.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8958: valid community property state accepted", () => {
  const parsed = f8958.inputSchema.safeParse({ state: "CA" });
  assertEquals(parsed.success, true);
});

Deno.test("f8958: non-community-property state rejected", () => {
  const parsed = f8958.inputSchema.safeParse({ state: "FL" });
  assertEquals(parsed.success, false);
});

Deno.test("f8958: all nine community property states accepted", () => {
  const states = ["AZ", "CA", "ID", "LA", "NM", "NV", "TX", "WA", "WI"];
  for (const s of states) {
    const parsed = f8958.inputSchema.safeParse({ state: s });
    assertEquals(parsed.success, true, `State ${s} should be valid`);
  }
});

Deno.test("f8958: negative taxpayer_withholding rejected", () => {
  const parsed = f8958.inputSchema.safeParse({ taxpayer_withholding: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8958: negative spouse_withholding rejected", () => {
  const parsed = f8958.inputSchema.safeParse({ spouse_withholding: -100 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Outputs — always empty (informational only)
// =============================================================================

Deno.test("f8958: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8958: full input still produces no outputs", () => {
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

Deno.test("f8958: TX state with allocations produces no outputs", () => {
  const result = compute({
    state: CommunityPropertyState.TX,
    allocation_items: [
      { description: "Interest income", total_amount: 2_000, taxpayer_share: 1_000, spouse_share: 1_000 },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Enum export
// =============================================================================

Deno.test("f8958: CommunityPropertyState enum has 9 states", () => {
  const states = Object.values(CommunityPropertyState);
  assertEquals(states.length, 9);
});
