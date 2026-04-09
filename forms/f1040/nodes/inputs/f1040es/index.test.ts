import { assertEquals, assertThrows } from "@std/assert";
import { f1040es } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return f1040es.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof f1040es.compute>[1]);
}

function estimatedTax(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, f1040)?.line26_estimated_tax;
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f1040es.inputSchema: rejects negative quarterly payments", () => {
  assertEquals(f1040es.inputSchema.safeParse({ payment_q1: -1 }).success, false);
  assertEquals(f1040es.inputSchema.safeParse({ payment_q3: -0.01 }).success, false);
});

// =============================================================================
// No Output When No Payments
// =============================================================================

Deno.test("f1040es.compute: no payments — no output", () => {
  assertEquals(compute({}).outputs, []);
});

Deno.test("f1040es.compute: all quarters zero — no output", () => {
  assertEquals(
    compute({ payment_q1: 0, payment_q2: 0, payment_q3: 0, payment_q4: 0 }).outputs,
    [],
  );
});

// =============================================================================
// Hard Validation
// =============================================================================

Deno.test("f1040es.compute: throws on negative payment", () => {
  assertThrows(() => compute({ payment_q1: -1 }), Error);
});

// =============================================================================
// Each Quarter Routes Independently to f1040 Line 26
// =============================================================================

Deno.test("f1040es.compute: q1 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q1: 2000 })), 2000);
});

Deno.test("f1040es.compute: q2 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q2: 1500 })), 1500);
});

Deno.test("f1040es.compute: q3 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q3: 3000 })), 3000);
});

Deno.test("f1040es.compute: q4 only → f1040 line26", () => {
  assertEquals(estimatedTax(compute({ payment_q4: 500 })), 500);
});

// =============================================================================
// Quarterly Aggregation
// =============================================================================

Deno.test("f1040es.compute: all 4 quarters summed into single f1040 line26 output", () => {
  const result = compute({ payment_q1: 1000, payment_q2: 1000, payment_q3: 1000, payment_q4: 1000 });
  assertEquals(estimatedTax(result), 4000);
  assertEquals(result.outputs.length, 1);
});

Deno.test("f1040es.compute: partial quarters (q1 + q3) summed correctly", () => {
  assertEquals(estimatedTax(compute({ payment_q1: 2500, payment_q3: 2500 })), 5000);
});

Deno.test("f1040es.compute: unequal quarterly payments aggregated correctly", () => {
  // Taxpayer made larger Q1 and Q2 payments, skipped Q3 and Q4
  assertEquals(estimatedTax(compute({ payment_q1: 3000, payment_q2: 4500 })), 7500);
});

// =============================================================================
// Smoke Test
// =============================================================================

Deno.test("f1040es.compute: smoke — full year payments aggregate to line26", () => {
  const result = compute({ payment_q1: 3000, payment_q2: 3000, payment_q3: 3000, payment_q4: 3000 });
  assertEquals(estimatedTax(result), 12000);
  assertEquals(result.outputs.length, 1);
});
