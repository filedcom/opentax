import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, qdcgtw } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { income_tax_calculation } from "../income_tax_calculation/index.ts";

function compute(input: Record<string, unknown>) {
  return qdcgtw.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

// ---------------------------------------------------------------------------
// 1. Empty / zero input
// ---------------------------------------------------------------------------

Deno.test("empty input: no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("line18_28pct_gain zero: no outputs", () => {
  const result = compute({ line18_28pct_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. 28% rate gain forwarded to income_tax_calculation
// ---------------------------------------------------------------------------

Deno.test("line18_28pct_gain positive: forwards rate_28_gain to income_tax_calculation", () => {
  const result = compute({ line18_28pct_gain: 5_000 });
  assertEquals(fieldsOf(result.outputs, income_tax_calculation)?.rate_28_gain, 5_000);
});

Deno.test("line18_28pct_gain large value: forwarded correctly", () => {
  const result = compute({ line18_28pct_gain: 1_000_000 });
  assertEquals(fieldsOf(result.outputs, income_tax_calculation)?.rate_28_gain, 1_000_000);
});

Deno.test("line18_28pct_gain fractional: forwarded correctly", () => {
  const result = compute({ line18_28pct_gain: 1313.46 });
  assertEquals(fieldsOf(result.outputs, income_tax_calculation)?.rate_28_gain, 1313.46);
});

// ---------------------------------------------------------------------------
// 3. Unrecaptured §1250 gain forwarded to income_tax_calculation
// ---------------------------------------------------------------------------

Deno.test("line19_unrecaptured_1250 positive: forwards to income_tax_calculation", () => {
  const result = compute({ line19_unrecaptured_1250: 8_000 });
  assertEquals(fieldsOf(result.outputs, income_tax_calculation)?.unrecaptured_1250_gain, 8_000);
});

Deno.test("both rate gains forwarded separately", () => {
  const result = compute({ line18_28pct_gain: 3_000, line19_unrecaptured_1250: 5_000 });
  assertEquals(result.outputs.length, 2);
});

// ---------------------------------------------------------------------------
// 4. Validation — invalid inputs rejected
// ---------------------------------------------------------------------------

Deno.test("negative line18_28pct_gain: throws", () => {
  assertThrows(() => compute({ line18_28pct_gain: -100 }));
});

Deno.test("non-numeric line18_28pct_gain: throws", () => {
  assertThrows(() => compute({ line18_28pct_gain: "not-a-number" }));
});
