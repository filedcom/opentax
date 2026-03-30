import { assertEquals, assertThrows } from "@std/assert";
import type { NodeOutput } from "../../../../../core/types/tax-node.ts";
import { f2439, inputSchema, itemSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(
  overrides: Partial<{
    box1a: number;
    box1b: number;
    box1c: number;
    box1d: number;
    box2: number;
  }> = {},
): Record<string, unknown> {
  return { ...overrides };
}

function compute(items: Record<string, unknown>[]) {
  return f2439.compute(inputSchema.parse({ f2439s: items }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string): NodeOutput | undefined {
  return result.outputs.find((o: NodeOutput) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Schema Validation
// ---------------------------------------------------------------------------

Deno.test("rejects negative box1a", () => {
  assertThrows(() => itemSchema.parse({ box1a: -1 }), Error);
});

Deno.test("rejects negative box1b", () => {
  assertThrows(() => itemSchema.parse({ box1b: -0.01 }), Error);
});

Deno.test("rejects negative box1c", () => {
  assertThrows(() => itemSchema.parse({ box1c: -1 }), Error);
});

Deno.test("rejects negative box1d", () => {
  assertThrows(() => itemSchema.parse({ box1d: -1 }), Error);
});

Deno.test("rejects negative box2", () => {
  assertThrows(() => itemSchema.parse({ box2: -0.01 }), Error);
});

Deno.test("accepts fully empty item (all fields optional)", () => {
  const item = itemSchema.parse({});
  assertEquals(item, {});
});

// ---------------------------------------------------------------------------
// 2. Empty input → no outputs
// ---------------------------------------------------------------------------

Deno.test("empty array produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("single item with all zeros produces no outputs", () => {
  const result = compute([minimalItem({ box1a: 0, box2: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("single item with no fields set produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 3. Box 1a only → routes to schedule_d line_11_form2439
// ---------------------------------------------------------------------------

Deno.test("box1a only routes to schedule_d.line_11_form2439", () => {
  const result = compute([minimalItem({ box1a: 5000 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 5000);
});

Deno.test("box1a does not produce f1040 output when box2 absent", () => {
  const result = compute([minimalItem({ box1a: 5000 })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out, undefined);
});

// ---------------------------------------------------------------------------
// 4. Box 1b → routes to schedule_d line19_unrecaptured_1250
// ---------------------------------------------------------------------------

Deno.test("box1b routes to schedule_d.line19_unrecaptured_1250", () => {
  const result = compute([minimalItem({ box1a: 10000, box1b: 3000 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
});

Deno.test("box1b zero does not set line19_unrecaptured_1250", () => {
  const result = compute([minimalItem({ box1a: 10000, box1b: 0 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, undefined);
});

// ---------------------------------------------------------------------------
// 5. Box 1c — captured but not routed (no downstream node yet)
// ---------------------------------------------------------------------------

Deno.test("box1c alone (no other boxes) produces no outputs", () => {
  const result = compute([minimalItem({ box1c: 2000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box1c with box1a still only routes box1a to schedule_d", () => {
  const result = compute([minimalItem({ box1a: 8000, box1c: 2000 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 8000);
  // box1c has no corresponding field in schedule_d output
  assertEquals((schedD?.fields as Record<string, unknown>)?.section_1202_gain, undefined);
});

// ---------------------------------------------------------------------------
// 6. Box 1d → routes to schedule_d collectibles_gain_form2439
// ---------------------------------------------------------------------------

Deno.test("box1d routes to schedule_d.collectibles_gain_form2439", () => {
  const result = compute([minimalItem({ box1a: 10000, box1d: 4000 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.collectibles_gain_form2439, 4000);
});

Deno.test("box1d zero does not set collectibles_gain_form2439", () => {
  const result = compute([minimalItem({ box1a: 10000, box1d: 0 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals((schedD?.fields as Record<string, unknown>)?.collectibles_gain_form2439, undefined);
});

Deno.test("box1d without box1a still routes collectibles gain to schedule_d", () => {
  // Edge: fund reports only collectibles gain with no separate box1a allocation
  const result = compute([minimalItem({ box1d: 1500 })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.collectibles_gain_form2439, 1500);
});

// ---------------------------------------------------------------------------
// 7. Box 2 → f1040 line31_additional_payments
// ---------------------------------------------------------------------------

Deno.test("box2 routes to f1040.line31_additional_payments", () => {
  const result = compute([minimalItem({ box1a: 10000, box2: 1500 })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out?.fields.line31_additional_payments, 1500);
});

Deno.test("box2 zero produces no f1040 output", () => {
  const result = compute([minimalItem({ box1a: 5000, box2: 0 })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out, undefined);
});

Deno.test("box2 alone (no capital gain boxes) still routes to f1040", () => {
  const result = compute([minimalItem({ box2: 750 })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out?.fields.line31_additional_payments, 750);
});

// ---------------------------------------------------------------------------
// 8. All boxes together — correct routing
// ---------------------------------------------------------------------------

Deno.test("all boxes route to correct destinations", () => {
  const result = compute([
    minimalItem({ box1a: 20000, box1b: 5000, box1c: 3000, box1d: 4000, box2: 2000 }),
  ]);

  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 20000);
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 5000);
  assertEquals(schedD?.fields.collectibles_gain_form2439, 4000);

  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out?.fields.line31_additional_payments, 2000);
});

// ---------------------------------------------------------------------------
// 9. Multiple f2439 forms → totals aggregated correctly
// ---------------------------------------------------------------------------

Deno.test("multiple forms aggregate box1a totals", () => {
  const result = compute([
    minimalItem({ box1a: 3000 }),
    minimalItem({ box1a: 7000 }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 10000);
});

Deno.test("multiple forms aggregate box1b totals", () => {
  const result = compute([
    minimalItem({ box1a: 5000, box1b: 1000 }),
    minimalItem({ box1a: 5000, box1b: 2000 }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
});

Deno.test("multiple forms aggregate box1d totals", () => {
  const result = compute([
    minimalItem({ box1d: 500 }),
    minimalItem({ box1d: 1500 }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.collectibles_gain_form2439, 2000);
});

Deno.test("multiple forms aggregate box2 totals", () => {
  const result = compute([
    minimalItem({ box1a: 5000, box2: 600 }),
    minimalItem({ box1a: 5000, box2: 900 }),
  ]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out?.fields.line31_additional_payments, 1500);
});

Deno.test("three forms with all boxes aggregate correctly", () => {
  const result = compute([
    minimalItem({ box1a: 10000, box1b: 2000, box1d: 1000, box2: 500 }),
    minimalItem({ box1a: 5000, box1b: 1000, box1d: 500, box2: 250 }),
    minimalItem({ box1a: 3000, box1b: 0, box1d: 0, box2: 100 }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 18000);
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
  assertEquals(schedD?.fields.collectibles_gain_form2439, 1500);

  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out?.fields.line31_additional_payments, 850);
});

// ---------------------------------------------------------------------------
// 10. Output count correctness
// ---------------------------------------------------------------------------

Deno.test("box1a only produces exactly one output (schedule_d)", () => {
  const result = compute([minimalItem({ box1a: 1000 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule_d");
});

Deno.test("box2 only produces exactly one output (f1040)", () => {
  const result = compute([minimalItem({ box2: 500 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("box1a and box2 produce exactly two outputs", () => {
  const result = compute([minimalItem({ box1a: 1000, box2: 100 })]);
  assertEquals(result.outputs.length, 2);
});
