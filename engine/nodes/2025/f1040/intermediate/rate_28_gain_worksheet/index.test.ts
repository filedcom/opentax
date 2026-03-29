import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, rate_28_gain_worksheet } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return rate_28_gain_worksheet.compute(inputSchema.parse(input));
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
// NOTE: line18_28pct_gain feeds the Schedule D Tax Worksheet (QDCGTW), not
// Schedule D itself. The node computes the value but does not yet route it
// downstream (no QDCGTW node exists yet). All active-gain cases produce 0 outputs.
// ---------------------------------------------------------------------------

Deno.test("collectibles_gain_from_8949 only: produces no outputs (pending QDCGTW)", () => {
  const result = compute({ collectibles_gain_from_8949: 5_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("collectibles_gain_from_8949 only: no schedule_d output", () => {
  const result = compute({ collectibles_gain_from_8949: 3_000 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out, undefined);
});

// ---------------------------------------------------------------------------
// 3. Collectibles gain from 1099-DIV (f1099div box 2d)
// ---------------------------------------------------------------------------

Deno.test("collectibles_gain only: produces no outputs (pending QDCGTW)", () => {
  const result = compute({ collectibles_gain: 1_200 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("collectibles_gain only: no schedule_d output", () => {
  const result = compute({ collectibles_gain: 750 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out, undefined);
});

// ---------------------------------------------------------------------------
// 4. Combined collectibles + 1202 (both sources)
// ---------------------------------------------------------------------------

Deno.test("combined gains: produces no outputs (pending QDCGTW)", () => {
  const result = compute({ collectibles_gain_from_8949: 4_000, collectibles_gain: 1_500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("combined gains: no schedule_d output", () => {
  const result = compute({ collectibles_gain_from_8949: 4_000, collectibles_gain: 1_500 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out, undefined);
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

Deno.test("fractional cents: node processes without error", () => {
  const result = compute({ collectibles_gain_from_8949: 1234.56, collectibles_gain: 78.90 });
  // Value is computed internally (1313.46) but not yet routed downstream
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 8. Smoke test — large gain
// ---------------------------------------------------------------------------

Deno.test("smoke: large collectibles gain processes without error", () => {
  const result = compute({ collectibles_gain_from_8949: 100_000, collectibles_gain: 25_000 });
  // Computes line18=125_000 internally; no downstream routing yet
  assertEquals(result.outputs.length, 0);
});
