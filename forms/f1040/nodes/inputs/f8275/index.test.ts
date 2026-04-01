import { assertEquals, assertThrows } from "@std/assert";
import { f8275 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8275.compute({ taxYear: 2025 }, input as Parameters<typeof f8275.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8275.inputSchema: empty input passes", () => {
  const parsed = f8275.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid disclosure_type position passes", () => {
  const parsed = f8275.inputSchema.safeParse({ disclosure_type: "position" });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid disclosure_type regulation passes", () => {
  const parsed = f8275.inputSchema.safeParse({ disclosure_type: "regulation" });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: invalid disclosure_type fails", () => {
  const parsed = f8275.inputSchema.safeParse({ disclosure_type: "other" });
  assertEquals(parsed.success, false);
});

Deno.test("f8275.inputSchema: valid form_or_schedule string passes", () => {
  const parsed = f8275.inputSchema.safeParse({ form_or_schedule: "Schedule C" });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid line_number string passes", () => {
  const parsed = f8275.inputSchema.safeParse({ line_number: "28" });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid amount passes", () => {
  const parsed = f8275.inputSchema.safeParse({ amount: 5000 });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: negative amount fails", () => {
  const parsed = f8275.inputSchema.safeParse({ amount: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8275.inputSchema: zero amount passes", () => {
  const parsed = f8275.inputSchema.safeParse({ amount: 0 });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid item_description passes", () => {
  const parsed = f8275.inputSchema.safeParse({ item_description: "Deduction for home office expenses" });
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: valid information_summary passes", () => {
  const parsed = f8275.inputSchema.safeParse({
    information_summary: "Taxpayer maintained dedicated home office space of 200 sq ft.",
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f8275.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: disclosure_type position — no tax outputs", () => {
  const result = compute({ disclosure_type: "position" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: disclosure_type regulation — no tax outputs", () => {
  const result = compute({ disclosure_type: "regulation" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: amount set — no tax outputs", () => {
  const result = compute({ amount: 5000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: item_description set — no tax outputs", () => {
  const result = compute({ item_description: "Home office deduction" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: information_summary set — no tax outputs", () => {
  const result = compute({ information_summary: "Detailed explanation of position." });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation (schema boundary)
// =============================================================================

Deno.test("f8275.compute: throws on negative amount", () => {
  assertThrows(() => compute({ amount: -500 }), Error);
});

Deno.test("f8275.compute: throws on invalid disclosure_type", () => {
  assertThrows(() => compute({ disclosure_type: "invalid" }), Error);
});

Deno.test("f8275.compute: zero amount does not throw", () => {
  const result = compute({ amount: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8275.compute: smoke test — full disclosure statement produces no outputs", () => {
  const result = compute({
    disclosure_type: "position",
    form_or_schedule: "Schedule C",
    line_number: "28",
    item_description: "Home office deduction claimed under simplified method",
    amount: 1500,
    information_summary: "Taxpayer uses 200 sq ft exclusively and regularly for business. Simplified method rate $5/sq ft = $1,000.",
    revenue_ruling: "Rev. Rul. 2013-13",
  });
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});
