// Black-box tests for intermediate node: form2441
// Sources: nodes/2025/f1040/intermediate/form2441/research/context.md
// These tests define IRS-correct behavior. If a test fails, fix the implementation — not the test.
//
// Design notes:
//   - This node receives dep_care_benefits (W-2 Box 10 total) from the w2 input node.
//   - It applies the IRC §129 exclusion limit ($5,000) and routes taxable excess to f1040 line1e.
//   - MFS ($2,500 limit) is handled by the f2441 input node, not here.
//   - No credit computation occurs in this node.

import { assertEquals, assertThrows } from "@std/assert";
import { form2441 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return form2441.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input validation
// ---------------------------------------------------------------------------

Deno.test("form2441: negative dep_care_benefits throws", () => {
  assertThrows(() => compute({ dep_care_benefits: -1 }), Error);
});

Deno.test("form2441: zero dep_care_benefits produces no outputs", () => {
  const result = compute({ dep_care_benefits: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: absent dep_care_benefits produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Per-field calculation — taxable excess routing
// ---------------------------------------------------------------------------

Deno.test("form2441: benefits below $5000 produce no f1040 output", () => {
  const result = compute({ dep_care_benefits: 3000 });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits exactly at $5000 produce no f1040 output", () => {
  const result = compute({ dep_care_benefits: 5000 });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $1 above $5000 route $1 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 5001 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

Deno.test("form2441: benefits of $6000 route $1000 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 6000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1000);
});

Deno.test("form2441: benefits of $10000 route $5000 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 10000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 5000);
});

// ---------------------------------------------------------------------------
// 3. Thresholds — exclusion limit boundary tests
// ---------------------------------------------------------------------------

Deno.test("form2441: benefits of $4999 (just below limit) produce no output", () => {
  const result = compute({ dep_care_benefits: 4999 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $5000 (at limit) produce no output", () => {
  const result = compute({ dep_care_benefits: 5000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $5001 (just above limit) route $1 to f1040", () => {
  const result = compute({ dep_care_benefits: 5001 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

// ---------------------------------------------------------------------------
// 4. Output routing — field names and nodeTypes
// ---------------------------------------------------------------------------

Deno.test("form2441: output nodeType is 'f1040' when taxable excess exists", () => {
  const result = compute({ dep_care_benefits: 6000 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("form2441: output field is line1e_taxable_dep_care (not another field)", () => {
  const result = compute({ dep_care_benefits: 7500 });
  const fields = fieldsOf(result.outputs, f1040)!;
  const keys = Object.keys(fields);
  assertEquals(keys, ["line1e_taxable_dep_care"]);
  assertEquals(fields.line1e_taxable_dep_care, 2500);
});

Deno.test("form2441: no schedule3 output is emitted (credit not computed here)", () => {
  const result = compute({ dep_care_benefits: 10000 });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 5. Edge cases
// ---------------------------------------------------------------------------

Deno.test("form2441: very large benefits route correct taxable excess", () => {
  // $100,000 - $5,000 exclusion = $95,000 taxable
  const result = compute({ dep_care_benefits: 100000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 95000);
});

Deno.test("form2441: fractional benefits handled correctly (below limit)", () => {
  const result = compute({ dep_care_benefits: 4999.99 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: fractional benefits above limit route correct decimal excess", () => {
  const result = compute({ dep_care_benefits: 5000.01 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  // 5000.01 - 5000 = 0.01 (approximately)
  assertEquals(Math.round((input.line1e_taxable_dep_care as number) * 100), 1);
});

// ---------------------------------------------------------------------------
// 6. Smoke test
// ---------------------------------------------------------------------------

Deno.test("form2441 smoke test: $7500 employer benefits → $2500 taxable on f1040 line1e", () => {
  // $7,500 employer dep care benefits
  // Exclusion: min($7,500, $5,000) = $5,000
  // Taxable: $7,500 - $5,000 = $2,500
  const result = compute({ dep_care_benefits: 7500 });

  assertEquals(result.outputs.length, 1);

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 2500);

  // No schedule3 output (credit not computed by this node)
  assertEquals(findOutput(result, "schedule3"), undefined);
});
