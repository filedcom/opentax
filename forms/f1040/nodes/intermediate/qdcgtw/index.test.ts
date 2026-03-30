import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, qdcgtw } from "./index.ts";

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
// 2. Valid positive input accepted
// ---------------------------------------------------------------------------

Deno.test("line18_28pct_gain positive: accepted, stub produces no outputs", () => {
  const result = compute({ line18_28pct_gain: 5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("line18_28pct_gain large value: accepted without error", () => {
  const result = compute({ line18_28pct_gain: 1_000_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("line18_28pct_gain fractional: accepted without error", () => {
  const result = compute({ line18_28pct_gain: 1313.46 });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 3. Validation — invalid inputs rejected
// ---------------------------------------------------------------------------

Deno.test("negative line18_28pct_gain: throws", () => {
  assertThrows(() => compute({ line18_28pct_gain: -100 }));
});

Deno.test("non-numeric line18_28pct_gain: throws", () => {
  assertThrows(() => compute({ line18_28pct_gain: "not-a-number" }));
});
