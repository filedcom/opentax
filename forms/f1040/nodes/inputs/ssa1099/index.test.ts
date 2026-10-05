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
  return ssa1099.compute({ taxYear: 2025, formType: "f1040" }, { ssas: items });
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

Deno.test("SSA and RRB benefit statements reject a repeated issued-copy reference", () => {
  const first = minimalItem({
    box3_gross_benefits: 4_000,
    recipient_tin: "111223333",
    source_document_reference: "issued-copy-2025",
  });
  assertThrows(
    () => compute([first, { ...first, box3_gross_benefits: 5_000 }]),
    Error,
    "repeats an issued-copy reference",
  );
  for (const is_rrb of [false, true]) {
    assertThrows(
      () =>
        compute([
          minimalItem({ ...first, is_rrb }),
          minimalItem({
            ...first,
            is_rrb,
            source_document_reference: "ISSUED-COPY-2025",
          }),
        ]),
      Error,
      "repeats an issued-copy reference",
    );
  }
  compute([
    first,
    minimalItem({
      ...first,
      is_rrb: true,
      box3_gross_benefits: 5_000,
    }),
  ]);
});

Deno.test("ssa1099 rejects a box 5 that contradicts boxes 3 and 4", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box3_gross_benefits: 10_000,
        box4_repaid: 2_000,
        box5_net_benefits: 9_000,
      })]),
    Error,
    "SSA-1099 box 5 must equal box 3 minus box 4",
  );
});

Deno.test("ssa1099 compares issued boxes at cent precision", () => {
  assertEquals(
    ssa1099.inputSchema.safeParse({
      ssas: [{
        box3_gross_benefits: 0.3,
        box4_repaid: 0.2,
        box5_net_benefits: 0.1,
      }],
    }).success,
    true,
  );
});

Deno.test("RRB-1099 box 5 offsets SSA-1099 box 5 and box 10 carries withholding", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 5_000 }),
    minimalItem({
      is_rrb: true,
      box3_gross_benefits: 1_000,
      box4_repaid: 2_000,
      box5_net_benefits: -1_000,
      rrb_box10_federal_withheld: 100,
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line6a_ss_gross, 4_000);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 100);
});

Deno.test("SSA and RRB issued withholding boxes cannot be exchanged", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        is_rrb: true,
        box6_federal_withheld: 100,
      })]),
    Error,
    "RRB-1099 withholding belongs in box 10",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        rrb_box10_federal_withheld: 100,
      })]),
    Error,
    "SSA-1099 withholding belongs in box 6",
  );
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("ssa.compute: box3_gross_benefits routes net to f1040 line6a_ss_gross", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 15000 })]);
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
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 8000);
});

Deno.test("ssa.compute: box6_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 12000, box6_federal_withheld: 1200 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 1200);
});

Deno.test("ssa.compute: box6_federal_withheld=0 does not add line25b to output", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 12000, box6_federal_withheld: 0 }),
  ]);
  const f1040Fields = fieldsOf(result.outputs, f1040);
  assertEquals(f1040Fields?.line25b_withheld_1099, undefined);
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
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 15000);
});

Deno.test("ssa.compute: two items — line25b_withheld_1099 sums both box6 amounts", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 8000, box6_federal_withheld: 800 }),
    minimalItem({ box3_gross_benefits: 6000, box6_federal_withheld: 400 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 1200);
});

Deno.test("ssa.compute: a negative statement offsets another statement before line6a", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 1000, box4_repaid: 2000 }), // net = 0 (clamped)
    minimalItem({ box3_gross_benefits: 5000 }), // net = 5000
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 4000);
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
Deno.test("ssa.compute: zero box3_gross_benefits produces no output", () => {
  const result = compute([minimalItem({ box3_gross_benefits: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("ssa.compute: zero box6_federal_withheld still routes line6a from gross", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000, box6_federal_withheld: 0 }),
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 10000);
  assertEquals(input.line25b_withheld_1099, undefined);
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

Deno.test("ssa.compute: negative aggregate needs repayment review", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box3_gross_benefits: 1000,
        box4_repaid: 5000,
        box5_net_benefits: -4000,
      })]),
    Error,
    "Negative total SSA-1099 benefits need repayment deduction or credit review",
  );
});

Deno.test("ssa.compute: repayment on one item offsets the other item's net", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 500, box4_repaid: 1000 }), // net = -500
    minimalItem({ box3_gross_benefits: 8000 }), // net = 8000
  ]);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line6a_ss_gross, 7500);
});

Deno.test("ssa.compute: box3 and box6 on different items produce single merged f1040 output with both fields", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 10000 }),
    minimalItem({ box3_gross_benefits: 0, box6_federal_withheld: 500 }),
  ]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line6a_ss_gross, 10000);
  assertEquals(fields.line25b_withheld_1099, 500);
});

Deno.test("ssa.compute: RRB-1099 treated same as SSA-1099 for routing", () => {
  const result = compute([
    minimalItem({ box3_gross_benefits: 20000, is_rrb: true }),
  ]);
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
