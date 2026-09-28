import { assertEquals, assertThrows } from "@std/assert";
import type { NodeOutput } from "../../../../../core/types/tax-node.ts";
import { f2439, inputSchema, itemSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...overrides };
}

function sourcedItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return minimalItem({
    box1a: 10_000,
    box2: 1_500,
    shareholder: "T",
    shareholder_name: "Alex Taxpayer",
    shareholder_ssn_last4: "6789",
    payer_name: "Example Growth Fund",
    payer_ein: "12-3456789",
    payer_address_line1: "1 Fund Way",
    payer_address_city: "Boston",
    payer_address_state: "MA",
    payer_address_zip: "02110",
    tax_period_begin: "2025-01-01",
    tax_period_end: "2025-12-31",
    ...overrides,
  });
}

function compute(items: Record<string, unknown>[]) {
  return f2439.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ f2439s: items }),
  );
}

function findOutput(
  result: ReturnType<typeof compute>,
  nodeType: string,
): NodeOutput | undefined {
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
  const result = compute([sourcedItem({ box1a: 5000, box2: undefined })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 5000);
});

Deno.test("box1a does not produce f1040 output when box2 absent", () => {
  const result = compute([sourcedItem({ box1a: 5000, box2: undefined })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out, undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("gain-only Form 2439 without payer-issued Copy B facts fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 5_000 })]),
    Error,
    "needs payer-issued Copy B identity and tax period",
  );
});

// ---------------------------------------------------------------------------
// 4. Box 1b → routes to schedule_d line19_unrecaptured_1250
// ---------------------------------------------------------------------------

Deno.test("box1b routes to schedule_d.line19_unrecaptured_1250", () => {
  const result = compute([sourcedItem({ box1a: 10000, box1b: 3000, box2: undefined })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
});

Deno.test("box1b zero does not set line19_unrecaptured_1250", () => {
  const result = compute([sourcedItem({ box1a: 10000, box1b: 0, box2: undefined })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, undefined);
});

// ---------------------------------------------------------------------------
// 5. Box 1c — section 1202 gain must not disappear from the return
// ---------------------------------------------------------------------------

Deno.test("positive box1c alone fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box1c: 2000 })]),
    Error,
    "Form 2439 box 1c section 1202 gain cannot be filed",
  );
});

Deno.test("positive box1c with box1a fails closed before partial gain routing", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 8000, box1c: 2000 })]),
    Error,
    "Form 2439 box 1c section 1202 gain cannot be filed",
  );
});

// ---------------------------------------------------------------------------
// 6. Box 1d → routes to schedule_d collectibles_gain_form2439
// ---------------------------------------------------------------------------

Deno.test("box1d routes to schedule_d.collectibles_gain_form2439", () => {
  const result = compute([sourcedItem({ box1a: 10000, box1d: 4000, box2: undefined })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.collectibles_gain_form2439, 4000);
});

Deno.test("box1d zero does not set collectibles_gain_form2439", () => {
  const result = compute([sourcedItem({ box1a: 10000, box1d: 0, box2: undefined })]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(
    (schedD?.fields as Record<string, unknown>)?.collectibles_gain_form2439,
    undefined,
  );
});

Deno.test("box1d without its box1a total fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box1d: 1500 })]),
    Error,
    "needs consistent box 1a gains",
  );
});

// ---------------------------------------------------------------------------
// 7. Box 2 needs Schedule 3 line 13a and a linked IRS2439 document
// ---------------------------------------------------------------------------

Deno.test("positive box2 with gain needs payer-issued source facts", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 10000, box2: 1500 })]),
    Error,
    "needs payer-issued Copy B identity and tax period",
  );
});

Deno.test("box2 zero produces no f1040 output", () => {
  const result = compute([sourcedItem({ box1a: 5000, box2: 0 })]);
  const f1040out = findOutput(result, "f1040");
  assertEquals(f1040out, undefined);
});

Deno.test("positive box2 without box1a fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box2: 750 })]),
    Error,
    "needs consistent box 1a gains",
  );
});

// ---------------------------------------------------------------------------
// 8. All boxes together — correct routing
// ---------------------------------------------------------------------------

Deno.test("all supported gain boxes route to Schedule D", () => {
  const result = compute([
    sourcedItem({ box1a: 20000, box1b: 5000, box1d: 4000, box2: undefined }),
  ]);

  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 20000);
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 5000);
  assertEquals(schedD?.fields.collectibles_gain_form2439, 4000);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ---------------------------------------------------------------------------
// 9. Multiple f2439 forms → totals aggregated correctly
// ---------------------------------------------------------------------------

Deno.test("multiple forms aggregate box1a totals", () => {
  const result = compute([
    sourcedItem({ box1a: 3000, box2: undefined }),
    sourcedItem({ box1a: 7000, box2: undefined, payer_ein: "98-7654321" }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 10000);
});

Deno.test("multiple forms aggregate box1b totals", () => {
  const result = compute([
    sourcedItem({ box1a: 5000, box1b: 1000, box2: undefined }),
    sourcedItem({ box1a: 5000, box1b: 2000, box2: undefined, payer_ein: "98-7654321" }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
});

Deno.test("multiple forms aggregate box1d totals", () => {
  const result = compute([
    sourcedItem({ box1d: 500, box2: undefined }),
    sourcedItem({ box1d: 1500, box2: undefined, payer_ein: "98-7654321" }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.collectibles_gain_form2439, 2000);
});

Deno.test("one unsourced positive box2 among multiple forms fails closed", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ box1a: 5000, box2: 600 }),
        minimalItem({ box1a: 5000, box2: 0 }),
      ]),
    Error,
    "needs payer-issued Copy B identity and tax period",
  );
});

Deno.test("three forms with supported gain boxes aggregate correctly", () => {
  const result = compute([
    sourcedItem({ box1a: 10000, box1b: 2000, box1d: 1000, box2: undefined }),
    sourcedItem({ box1a: 5000, box1b: 1000, box1d: 500, box2: undefined, payer_ein: "98-7654321" }),
    sourcedItem({ box1a: 3000, box1b: 0, box1d: 0, box2: undefined, payer_ein: "23-4567890" }),
  ]);
  const schedD = findOutput(result, "schedule_d");
  assertEquals(schedD?.fields.line_11_form2439, 18000);
  assertEquals(schedD?.fields.line19_unrecaptured_1250, 3000);
  assertEquals(schedD?.fields.collectibles_gain_form2439, 1500);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ---------------------------------------------------------------------------
// 10. Output count correctness
// ---------------------------------------------------------------------------

Deno.test("box1a only produces exactly one output (schedule_d)", () => {
  const result = compute([sourcedItem({ box1a: 1000, box2: undefined })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule_d");
});

Deno.test("box2 only cannot produce a Form 1040 payment", () => {
  assertThrows(
    () => compute([minimalItem({ box2: 500 })]),
    Error,
    "needs consistent box 1a gains",
  );
});

Deno.test("box1a with unsourced box2 cannot partially file", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 1000, box2: 100 })]),
    Error,
    "needs payer-issued Copy B identity and tax period",
  );
});

Deno.test("sourced box2 routes through Schedule 3 line 13a, not directly to 1040", () => {
  const result = compute([sourcedItem()]);
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    10_000,
  );
  assertEquals(
    findOutput(result, "schedule3")?.fields.line13a_tax_paid_by_ric_or_reit,
    1_500,
  );
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("multiple sourced box2 amounts aggregate once", () => {
  const result = compute([
    sourcedItem({ box1a: 10_000, box2: 1_500 }),
    sourcedItem({ box1a: 5_000, box2: 750, payer_ein: "98-7654321" }),
  ]);
  assertEquals(
    findOutput(result, "schedule3")?.fields.line13a_tax_paid_by_ric_or_reit,
    2_250,
  );
});

Deno.test("box2 rejects a payer tax period ending outside TY2025", () => {
  assertThrows(
    () => compute([sourcedItem({ tax_period_end: "2026-01-31" })]),
    Error,
    "tax period must end in 2025",
  );
});
