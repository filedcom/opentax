import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, unrecaptured_1250_worksheet } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return unrecaptured_1250_worksheet.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Zero / empty ─────────────────────────────────────────────────────────────

Deno.test("returns no outputs when input is empty", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("returns no outputs when all gains are zero", () => {
  const result = compute({
    property: { prior_depreciation_allowed: 0, gain_on_sale: 0 },
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("returns no outputs when gain_on_sale is zero (no realized gain)", () => {
  // Even with depreciation taken, if no gain on sale, §1250 gain = 0
  const result = compute({
    property: { prior_depreciation_allowed: 10_000, gain_on_sale: 0 },
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Single property — basic recapture ────────────────────────────────────────

Deno.test("property: depreciation < gain → limited by depreciation", () => {
  // prior_depreciation_allowed < gain_on_sale → §1250 gain = prior_depreciation_allowed
  const result = compute({
    property: { prior_depreciation_allowed: 30_000, gain_on_sale: 80_000 },
  });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 30_000 });
});

Deno.test("property: gain < depreciation → limited by gain", () => {
  // gain_on_sale < prior_depreciation_allowed → §1250 gain = gain_on_sale
  const result = compute({
    property: { prior_depreciation_allowed: 50_000, gain_on_sale: 20_000 },
  });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 20_000 });
});

Deno.test("property: depreciation equals gain → exactly the gain", () => {
  const result = compute({
    property: { prior_depreciation_allowed: 25_000, gain_on_sale: 25_000 },
  });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 25_000 });
});

// ─── Distribution from f1099div (box 2b) ──────────────────────────────────────

Deno.test("distribution only: routes full amount to schedule_d", () => {
  const result = compute({ unrecaptured_1250_gain: 5_000 });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 5_000 });
});

Deno.test("distribution only: zero amount returns no outputs", () => {
  const result = compute({ unrecaptured_1250_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── Multiple properties (accumulation pattern) ────────────────────────────────

Deno.test("multiple properties: sums contributions", () => {
  // Two properties:
  //   Property A: depreciation=20000, gain=50000 → §1250 gain = 20000
  //   Property B: depreciation=15000, gain=10000 → §1250 gain = 10000
  //   Total = 30000
  const result = compute({
    property: [
      { prior_depreciation_allowed: 20_000, gain_on_sale: 50_000 },
      { prior_depreciation_allowed: 15_000, gain_on_sale: 10_000 },
    ],
  });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 30_000 });
});

// ─── Combined sources ─────────────────────────────────────────────────────────

Deno.test("property sale + distribution: sums both", () => {
  // Property: depreciation=30000, gain=80000 → §1250 = 30000
  // Distribution: 5000
  // Total = 35000
  const result = compute({
    property: { prior_depreciation_allowed: 30_000, gain_on_sale: 80_000 },
    unrecaptured_1250_gain: 5_000,
  });
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 35_000 });
});

Deno.test("multiple properties + distribution: aggregates all sources", () => {
  const result = compute({
    property: [
      { prior_depreciation_allowed: 10_000, gain_on_sale: 15_000 },
      { prior_depreciation_allowed: 8_000, gain_on_sale: 5_000 },
    ],
    unrecaptured_1250_gain: 2_000,
  });
  // Property A: min(10000,15000) = 10000
  // Property B: min(8000,5000) = 5000
  // Distribution: 2000
  // Total = 17000
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 17_000 });
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule_d nodeType", () => {
  const result = compute({
    property: { prior_depreciation_allowed: 10_000, gain_on_sale: 10_000 },
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule_d");
});

// ─── Schema validation ────────────────────────────────────────────────────────

Deno.test("schema rejects negative prior_depreciation_allowed", () => {
  assertThrows(() =>
    compute({
      property: { prior_depreciation_allowed: -1_000, gain_on_sale: 5_000 },
    })
  );
});

Deno.test("schema rejects negative gain_on_sale", () => {
  assertThrows(() =>
    compute({
      property: { prior_depreciation_allowed: 5_000, gain_on_sale: -1_000 },
    })
  );
});

Deno.test("schema rejects negative unrecaptured_1250_gain", () => {
  assertThrows(() => compute({ unrecaptured_1250_gain: -500 }));
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: typical rental property sale with distribution", () => {
  // Rental property: cost 300k, depreciation 50k over 10yr, sold at 350k
  // Realized gain = 100k, §1250 = min(50000, 100000) = 50000
  // Plus REIT distribution of 3000
  const result = compute({
    property: { prior_depreciation_allowed: 50_000, gain_on_sale: 100_000 },
    unrecaptured_1250_gain: 3_000,
  });
  assertEquals(result.outputs.length, 1);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields, { line19_unrecaptured_1250: 53_000 });
});
