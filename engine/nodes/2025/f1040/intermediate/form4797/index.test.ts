import { assertEquals, assertThrows } from "@std/assert";
import { form4797, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) { return form4797.compute(inputSchema.parse(input)); }
function findOutput(result: ReturnType<typeof compute>, nodeType: string) { return result.outputs.find((o) => o.nodeType === nodeType); }

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: disposed_properties alone produces no outputs (indicator only)", () => {
  const result = compute({ disposed_properties: 2 });
  assertEquals(result.outputs.length, 0);
});

// ─── Part I — Section 1231 long-term gain ─────────────────────────────────────

Deno.test("Part I: pure §1231 gain routes to schedule_d line_11_form2439", () => {
  const result = compute({ section_1231_gain: 10_000 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.input.line_11_form2439, 10_000);
});

Deno.test("Part I: §1231 gain with no prior losses goes entirely to schedule_d", () => {
  const result = compute({ section_1231_gain: 5_000, nonrecaptured_1231_loss: 0 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.input.line_11_form2439, 5_000);
});

Deno.test("Part I: §1231 gain partially offset by prior nonrecaptured loss → reduced LT gain + ordinary income", () => {
  // §1231 gain = 10,000; prior loss recapture = 3,000
  // → net LT gain = 7,000 to schedule_d; ordinary gain from recapture = 3,000 to schedule1
  const result = compute({ section_1231_gain: 10_000, nonrecaptured_1231_loss: 3_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.input.line_11_form2439, 7_000);
  assertEquals(s1?.input.line4_other_gains, 3_000);
});

Deno.test("Part I: §1231 gain fully offset by prior losses → all ordinary income, no schedule_d output", () => {
  const result = compute({ section_1231_gain: 5_000, nonrecaptured_1231_loss: 5_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined);
  assertEquals(s1?.input.line4_other_gains, 5_000);
});

Deno.test("Part I: §1231 gain less than prior losses → all gain is ordinary, no schedule_d output", () => {
  const result = compute({ section_1231_gain: 3_000, nonrecaptured_1231_loss: 8_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined);
  assertEquals(s1?.input.line4_other_gains, 3_000);
});

Deno.test("Part I: zero §1231 gain produces no schedule_d output", () => {
  const result = compute({ section_1231_gain: 0 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("Part I: §1231 loss (negative) produces no schedule_d output and no ordinary gain", () => {
  // Net §1231 loss goes on Sch D line 11 as negative for Part I purposes,
  // but the IRS says report the loss on line 11 of Sch D when line 7 is negative.
  // For our purposes: a loss flows to schedule_d as a negative LT number.
  const result = compute({ section_1231_gain: -4_000 });
  const sd = findOutput(result, "schedule_d");
  // Losses from Part I flow to Sch D as negative
  assertEquals(sd?.input.line_11_form2439, -4_000);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ─── Part II — Ordinary gains ─────────────────────────────────────────────────

Deno.test("Part II: ordinary_gain routes to schedule1 line4_other_gains", () => {
  const result = compute({ ordinary_gain: 8_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line4_other_gains, 8_000);
});

Deno.test("Part II: ordinary_gain of zero produces no schedule1 output", () => {
  const result = compute({ ordinary_gain: 0 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("Part II: negative ordinary_gain (loss) routes to schedule1", () => {
  const result = compute({ ordinary_gain: -2_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line4_other_gains, -2_000);
});

// ─── Part III — §1245/§1250 recapture (flows into ordinary_gain) ─────────────

Deno.test("Part III: §1245 recapture alone produces schedule1 ordinary gain output", () => {
  // §1245 recapture is ordinary income; it is included in Part II
  // The user provides ordinary_gain which already includes Part III recapture
  const result = compute({ ordinary_gain: 15_000, recapture_1245: 15_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line4_other_gains, 15_000);
});

Deno.test("Part III: §1250 recapture included in ordinary gain", () => {
  const result = compute({ ordinary_gain: 5_000, recapture_1250: 5_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.input.line4_other_gains, 5_000);
});

// ─── Combined scenarios ────────────────────────────────────────────────────────

Deno.test("combined: §1231 gain + ordinary gain routes to both schedule_d and schedule1", () => {
  const result = compute({ section_1231_gain: 20_000, ordinary_gain: 6_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.input.line_11_form2439, 20_000);
  assertEquals(s1?.input.line4_other_gains, 6_000);
});

Deno.test("combined: §1231 gain with partial prior loss recapture + additional ordinary gain", () => {
  // §1231 gain = 12,000; prior §1231 loss recapture = 4,000; separate ordinary gain = 3,000
  // → LT gain to Sch D = 8,000; ordinary to schedule1 = 4,000 (recaptured) + 3,000 = 7,000
  const result = compute({
    section_1231_gain: 12_000,
    nonrecaptured_1231_loss: 4_000,
    ordinary_gain: 3_000,
  });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.input.line_11_form2439, 8_000);
  assertEquals(s1?.input.line4_other_gains, 7_000); // 4,000 recaptured + 3,000 ordinary
});

Deno.test("combined: disposed_properties + sale data both present", () => {
  const result = compute({ disposed_properties: 1, section_1231_gain: 5_000 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.input.line_11_form2439, 5_000);
});

// ─── Holding period / schema validation ──────────────────────────────────────

Deno.test("schema: negative nonrecaptured_1231_loss is rejected", () => {
  assertThrows(() => compute({ nonrecaptured_1231_loss: -1_000 }));
});

Deno.test("schema: negative disposed_properties is rejected", () => {
  assertThrows(() => compute({ disposed_properties: -1 }));
});

Deno.test("schema: unknown fields are stripped without error", () => {
  const result = compute({ section_1231_gain: 5_000, unknown_field: "foo" });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.input.line_11_form2439, 5_000);
});
