import { assertEquals, assertThrows } from "@std/assert";
import { rate_28_gain_worksheet } from "./index.ts";

// deno-lint-ignore no-explicit-any
function compute(input: Record<string, unknown>) {
  return rate_28_gain_worksheet.compute(input as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Zero / empty input
// ---------------------------------------------------------------------------

Deno.test("zero input: no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("explicit zeros: no outputs", () => {
  const result = compute({ collectibles_gain_from_8949: 0, collectibles_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Collectibles gain from Form 8949 (schedule_d)
// ---------------------------------------------------------------------------

Deno.test("collectibles_gain_from_8949 only: routes to schedule_d", () => {
  const result = compute({ collectibles_gain_from_8949: 5_000 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  assertEquals((out!.input as Record<string, unknown>).line18_28pct_gain, 5_000);
});

Deno.test("collectibles_gain_from_8949 only: exactly 1 output", () => {
  const result = compute({ collectibles_gain_from_8949: 3_000 });
  assertEquals(result.outputs.length, 1);
});

// ---------------------------------------------------------------------------
// 3. Collectibles gain from 1099-DIV (f1099div box 2d)
// ---------------------------------------------------------------------------

Deno.test("collectibles_gain only: routes to schedule_d", () => {
  const result = compute({ collectibles_gain: 1_200 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  assertEquals((out!.input as Record<string, unknown>).line18_28pct_gain, 1_200);
});

Deno.test("collectibles_gain only: exactly 1 output", () => {
  const result = compute({ collectibles_gain: 750 });
  assertEquals(result.outputs.length, 1);
});

// ---------------------------------------------------------------------------
// 4. Combined collectibles + 1202 (both sources)
// ---------------------------------------------------------------------------

Deno.test("combined gains: sums collectibles_gain_from_8949 + collectibles_gain", () => {
  const result = compute({ collectibles_gain_from_8949: 4_000, collectibles_gain: 1_500 });
  const out = findOutput(result, "schedule_d");
  assertEquals((out!.input as Record<string, unknown>).line18_28pct_gain, 5_500);
});

Deno.test("combined gains: exactly 1 output", () => {
  const result = compute({ collectibles_gain_from_8949: 4_000, collectibles_gain: 1_500 });
  assertEquals(result.outputs.length, 1);
});

// ---------------------------------------------------------------------------
// 5. Net gain is zero or negative — no positive output
// ---------------------------------------------------------------------------

Deno.test("both sources zero: no outputs", () => {
  const result = compute({ collectibles_gain_from_8949: 0, collectibles_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 6. Validation — invalid inputs rejected
// ---------------------------------------------------------------------------

Deno.test("negative collectibles_gain_from_8949: throws", () => {
  assertThrows(() => compute({ collectibles_gain_from_8949: -100 }));
});

Deno.test("negative collectibles_gain: throws", () => {
  assertThrows(() => compute({ collectibles_gain: -50 }));
});

Deno.test("non-numeric input: throws", () => {
  assertThrows(() => compute({ collectibles_gain_from_8949: "not-a-number" }));
});

// ---------------------------------------------------------------------------
// 7. Output field precision
// ---------------------------------------------------------------------------

Deno.test("fractional cents: preserves decimal precision", () => {
  const result = compute({ collectibles_gain_from_8949: 1234.56, collectibles_gain: 78.90 });
  const out = findOutput(result, "schedule_d");
  assertEquals((out!.input as Record<string, unknown>).line18_28pct_gain, 1313.46);
});

// ---------------------------------------------------------------------------
// 8. Smoke test — large gain
// ---------------------------------------------------------------------------

Deno.test("smoke: large collectibles gain routes correctly", () => {
  const result = compute({ collectibles_gain_from_8949: 100_000, collectibles_gain: 25_000 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  assertEquals((out!.input as Record<string, unknown>).line18_28pct_gain, 125_000);
  assertEquals(result.outputs.length, 1);
});
