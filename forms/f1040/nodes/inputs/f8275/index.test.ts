import { assertEquals, assertThrows } from "@std/assert";
import { DisclosureType, f8275 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8275.compute({ taxYear: 2025 }, input as Parameters<typeof f8275.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8275.inputSchema: empty input passes (all fields optional)", () => {
  const parsed = f8275.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8275.inputSchema: invalid disclosure_type fails", () => {
  const parsed = f8275.inputSchema.safeParse({ disclosure_type: "other" });
  assertEquals(parsed.success, false);
});

Deno.test("f8275.inputSchema: negative amount fails", () => {
  const parsed = f8275.inputSchema.safeParse({ amount: -100 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f8275.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: position disclosure — no tax outputs", () => {
  const result = compute({
    disclosure_type: DisclosureType.Position,
    form_or_schedule: "Schedule C",
    line_number: "28",
    item_description: "Home office deduction",
    amount: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: regulation disclosure — no tax outputs", () => {
  const result = compute({
    disclosure_type: DisclosureType.Regulation,
    revenue_ruling: "Treas. Reg. §1.162-5",
    information_summary: "Taxpayer deducted education expenses related to maintaining skills.",
    amount: 3200,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: large amount with summary — no tax outputs", () => {
  // Confirms that even significant disclosed amounts do not produce tax credits or deductions
  const result = compute({
    disclosure_type: DisclosureType.Position,
    amount: 500_000,
    information_summary: "Large position disclosure.",
  });
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

Deno.test("f8275.compute: zero amount does not throw and produces no outputs", () => {
  const result = compute({ amount: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8275.compute: full Form 8275 disclosure produces no outputs", () => {
  const result = compute({
    disclosure_type: DisclosureType.Position,
    form_or_schedule: "Schedule C",
    line_number: "28",
    item_description: "Home office deduction claimed under simplified method",
    amount: 1500,
    information_summary: "Taxpayer uses 200 sq ft exclusively and regularly for business. Simplified method rate $5/sq ft = $1,000.",
    revenue_ruling: "Rev. Rul. 2013-13",
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8275.compute: full Form 8275-R regulation disclosure produces no outputs", () => {
  const result = compute({
    disclosure_type: DisclosureType.Regulation,
    form_or_schedule: "1040",
    line_number: "15",
    item_description: "IRA deduction taken contrary to Treas. Reg. §1.219-1",
    amount: 7000,
    information_summary: "Taxpayer believes regulation is invalid based on statutory text of IRC §219.",
    revenue_ruling: "Treas. Reg. §1.219-1",
  });
  assertEquals(result.outputs.length, 0);
});
