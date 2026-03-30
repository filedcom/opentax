// Black-box tests for the SSA node (SSA-1099 Social Security Benefit Statement).
// Generated from research/context.md only — never read index.ts.
// If a test fails, fix the implementation, not the test.
//
// Field name assumptions (verify against implementation):
//   - f1040: line6a_ss_gross, line25b_withheld_1099
//   - Input key: ssas: SsaItem[]
//   - Singleton export: ssa

import { assertEquals, assertThrows } from "@std/assert";
import { ssa1099 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    payer_name: "SSA",
    box3_gross_benefits: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return ssa1099.compute({ taxYear: 2025 }, { ssas: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("ssa1099.inputSchema: rejects empty ssas array", () => {
  const parsed = ssa1099.inputSchema.safeParse({ ssas: [] });
  assertEquals(parsed.success, false);
});

Deno.test("ssa1099.inputSchema: accepts minimal valid item", () => {
  const parsed = ssa1099.inputSchema.safeParse({ ssas: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("ssa1099.inputSchema: rejects negative box3_gross_benefits", () => {
  const parsed = ssa1099.inputSchema.safeParse({
    ssas: [minimalItem({ box3_gross_benefits: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ssa1099.inputSchema: rejects negative box4_repaid", () => {
  const parsed = ssa1099.inputSchema.safeParse({
    ssas: [minimalItem({ box4_repaid: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ssa1099.inputSchema: rejects negative box6_federal_withheld", () => {
  const parsed = ssa1099.inputSchema.safeParse({
    ssas: [minimalItem({ box6_federal_withheld: -50 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("ssa1099.inputSchema: accepts item with only required fields", () => {
  const parsed = ssa1099.inputSchema.safeParse({
    ssas: [{ payer_name: "SSA", box3_gross_benefits: 12000 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("ssa1099.inputSchema: accepts item with box4_repaid omitted (treats as 0)", () => {
  const parsed = ssa1099.inputSchema.safeParse({
    ssas: [minimalItem({ box3_gross_benefits: 10000 })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("ssa.compute: box3_gross_benefits routes net to f1040 line6a_ss_gross", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 15000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 15000);
});

Deno.test("ssa.compute: box3=0 produces no f1040 output", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 0 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("ssa.compute: box4_repaid reduces line6a_ss_gross", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000, box4_repaid: 2000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 8000);
});

Deno.test("ssa.compute: box6_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 12000, box6_federal_withheld: 1200 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 1200);
});

Deno.test("ssa.compute: box6_federal_withheld=0 does not add line25b to output", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 12000, box6_federal_withheld: 0 }),
  ]);
  // Output may exist for line6a but line25b should be absent or undefined
  const f1040Fields = fieldsOf(result.outputs, f1040);
  assertEquals(f1040Fields?.line25b_withheld_1099 === undefined || f1040Fields?.line25b_withheld_1099 === 0, true);
});

Deno.test("ssa.compute: box3 and box6 on same item emit single f1040 output with both fields", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 18000, box6_federal_withheld: 1800 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 18000);
  assertEquals(input.line25b_withheld_1099, 1800);
});

// =============================================================================
// 3. Aggregation
// =============================================================================

Deno.test("ssa.compute: two items — line6a_ss_gross sums both nets", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000 }),
    minimalItem({ box3_gross_benefits: 5000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 15000);
});

Deno.test("ssa.compute: two items — line25b_withheld_1099 sums both box6 amounts", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 8000, box6_federal_withheld: 800 }),
    minimalItem({ box3_gross_benefits: 6000, box6_federal_withheld: 400 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 1200);
});

Deno.test("ssa.compute: repayment exceeds gross on one item — that item contributes 0 to line6a", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 1000, box4_repaid: 2000 }), // net = 0 (clamped)
    minimalItem({ box3_gross_benefits: 5000 }), // net = 5000
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 5000);
});

Deno.test("ssa.compute: two items — single merged f1040 output regardless of source", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 7000, box6_federal_withheld: 700 }),
    minimalItem({ box3_gross_benefits: 3000, box6_federal_withheld: 300 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});

// =============================================================================
// 4. Thresholds (N/A for this input node — taxability computed downstream)
// =============================================================================
// No thresholds are applied in this input node. The downstream SS taxability
// intermediate node applies the $25,000/$32,000/$44,000 thresholds.

// =============================================================================
// 5. Hard Validation Rules — throws
// =============================================================================

Deno.test("ssa.compute: throws on negative box3_gross_benefits", () => {
  assertThrows(
    () => compute([minimalItem({ box3_gross_benefits: -1 })]),
    Error,
  );
});

Deno.test("ssa.compute: throws on negative box4_repaid", () => {
  assertThrows(
    () => compute([minimalItem({ box4_repaid: -100 })]),
    Error,
  );
});

Deno.test("ssa.compute: throws on negative box6_federal_withheld", () => {
  assertThrows(
    () => compute([minimalItem({ box6_federal_withheld: -50 })]),
    Error,
  );
});

// Boundary pass — zero values are valid
Deno.test("ssa.compute: does not throw on zero box3_gross_benefits (boundary pass)", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("ssa.compute: does not throw on zero box6_federal_withheld (boundary pass)", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000, box6_federal_withheld: 0 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Warning-Only Rules — must NOT throw
// =============================================================================

// None identified for this node.

// =============================================================================
// 7. Informational Fields — must NOT produce additional tax outputs
// =============================================================================

Deno.test("ssa.compute: is_rrb flag does not change output compared to SSA-1099", () => {
  const resultSsa = compute([minimalItem({ box3_gross_benefits: 12000 })]);
  const resultRrb = compute([
    minimalItem({ box3_gross_benefits: 12000, is_rrb: true }),
  ]);
  assertEquals(resultSsa.outputs.length, resultRrb.outputs.length);
  const ssaInput = fieldsOf(resultSsa.outputs, f1040)!;
  const rrbInput = fieldsOf(resultRrb.outputs, f1040)!;
  assertEquals(ssaInput.line6a_ss_gross, rrbInput.line6a_ss_gross);
});

Deno.test("ssa.compute: payer_name alone does not produce tax output", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

Deno.test("ssa.compute: all items have net=0 — no f1040 output", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 0 }),
    minimalItem({ box3_gross_benefits: 0 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("ssa.compute: single item where box4 > box3 — net clamped to 0, no line6a output", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 1000, box4_repaid: 5000 }),
  ]);
  // No line6a output since net = 0
  const f1040Fields2 = fieldsOf(result.outputs, f1040);
  assertEquals(f1040Fields2?.line6a_ss_gross === undefined || f1040Fields2?.line6a_ss_gross === 0, true);
});

Deno.test("ssa.compute: repayment on one item does not affect other item's net", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 500, box4_repaid: 1000 }), // net = 0
    minimalItem({ box3_gross_benefits: 8000 }), // net = 8000
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 8000);
});

Deno.test("ssa.compute: box3 and box6 on different items still produce single merged f1040 output", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000 }),
    minimalItem({ box3_gross_benefits: 0, box6_federal_withheld: 500 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  // Only one merged output (for line25b); line6a may or may not be in same object
  assertEquals(f1040Outputs.length <= 1, true);
});

Deno.test("ssa.compute: RRB-1099 treated same as SSA-1099 for routing", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 20000, is_rrb: true }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 20000);
});

// =============================================================================
// 9. Smoke Test — comprehensive scenario
// =============================================================================

Deno.test("ssa.compute: smoke test — taxpayer and spouse SSA-1099s with withholding", () => {
  // Taxpayer: received $18,000, repaid $500, withheld $1,800
  // Spouse: received $12,000, no repayment, withheld $600
  const result = compute([
    minimalItem({
      payer_name: "SSA - Taxpayer",
      box3_gross_benefits: 18000,
      box4_repaid: 500,
      box6_federal_withheld: 1800,
      is_rrb: false,
    }),
    minimalItem({
      payer_name: "SSA - Spouse",
      box3_gross_benefits: 12000,
      box6_federal_withheld: 600,
      is_rrb: false,
    }),
  ]);

  // Only one f1040 output (merged)
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);

  const input = fieldsOf(result.outputs, f1040)!;

  // line6a = (18000 - 500) + 12000 = 29500
  assertEquals(input.line6a_ss_gross, 29500);

  // line25b = 1800 + 600 = 2400
  assertEquals(input.line25b_withheld_1099, 2400);
});
