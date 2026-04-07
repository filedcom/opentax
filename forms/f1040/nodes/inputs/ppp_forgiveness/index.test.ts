import { assertEquals, assertThrows } from "@std/assert";
import { itemSchema, ppp_forgiveness } from "./index.ts";

type PppItem = Partial<import("zod").z.infer<typeof itemSchema>> & { forgiven_amount: number };

function minimalItem(overrides: Partial<PppItem> = {}): PppItem {
  return { forgiven_amount: 0, ...overrides };
}

function compute(items: PppItem[]) {
  return ppp_forgiveness.compute({ taxYear: 2025 }, { ppp_forgivenesses: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("ppp_forgiveness.inputSchema: negative forgiven_amount fails", () => {
  const parsed = ppp_forgiveness.inputSchema.safeParse({
    ppp_forgivenesses: [{ forgiven_amount: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ppp_forgiveness.inputSchema: forgiveness_year non-integer fails", () => {
  const parsed = ppp_forgiveness.inputSchema.safeParse({
    ppp_forgivenesses: [{ forgiven_amount: 10000, forgiveness_year: 2020.5 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ppp_forgiveness.inputSchema: empty array fails (min 1)", () => {
  const parsed = ppp_forgiveness.inputSchema.safeParse({ ppp_forgivenesses: [] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Federal Exclusion — No Output (Informational Node)
// =============================================================================

Deno.test("ppp_forgiveness.compute: positive forgiven_amount — no output (excluded from federal income per CARES Act §1106(i))", () => {
  const result = compute([minimalItem({ forgiven_amount: 100000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ppp_forgiveness.compute: zero forgiven_amount — no output", () => {
  const result = compute([minimalItem({ forgiven_amount: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ppp_forgiveness.compute: multiple loans — no output (each loan fully excluded)", () => {
  const result = compute([
    minimalItem({ forgiven_amount: 50000 }),
    minimalItem({ forgiven_amount: 100000, loan_number: "LOAN-2" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ppp_forgiveness.compute: large forgiven amount — still no output (CAA 2021 §276 preserved all deductions)", () => {
  // Under pre-CAA 2021 rules (Notice 2020-32) deductions were disallowed.
  // CAA 2021 §276 reversed this — deductions fully allowed, no adjustment needed.
  const result = compute([minimalItem({ forgiven_amount: 2_000_000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ppp_forgiveness.compute: max first-draw ($10M) — still no output", () => {
  const result = compute([minimalItem({ forgiven_amount: 10_000_000 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Rev. Proc. 2021-48 Timing — forgiveness_year tracked, no federal impact
// =============================================================================

Deno.test("ppp_forgiveness.compute: forgiveness_year 2020 (first PPP round) — no output", () => {
  const result = compute([minimalItem({ forgiven_amount: 50000, forgiveness_year: 2020 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ppp_forgiveness.compute: forgiveness_year 2021 (second PPP round) — no output", () => {
  const result = compute([minimalItem({ forgiven_amount: 25000, forgiveness_year: 2021 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Hard Validation — Throws on Bad Input
// =============================================================================

Deno.test("ppp_forgiveness.compute: throws on negative forgiven_amount", () => {
  assertThrows(
    () => ppp_forgiveness.compute({ taxYear: 2025 }, {
      ppp_forgivenesses: [{ forgiven_amount: -500 }],
    }),
    Error,
  );
});

Deno.test("ppp_forgiveness.compute: throws on empty array", () => {
  assertThrows(
    () => ppp_forgiveness.compute({ taxYear: 2025 }, { ppp_forgivenesses: [] }),
    Error,
  );
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("ppp_forgiveness.compute: smoke test — two PPP loans with all optional fields, no federal outputs", () => {
  const result = compute([
    {
      forgiven_amount: 100_000,
      loan_number: "SBA-2020-FIRST-DRAW",
      forgiveness_year: 2020,
    },
    {
      forgiven_amount: 50_000,
      loan_number: "SBA-2021-SECOND-DRAW",
      forgiveness_year: 2021,
    },
  ]);
  assertEquals(result.outputs.length, 0);
});
