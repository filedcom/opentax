import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form6781 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form6781.compute({ taxYear: 2025 }, input);
}

function allOutputs(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.filter((o) => o.nodeType === nodeType);
}

// ─── Zero / no-op cases ───────────────────────────────────────────────────────

Deno.test("no input — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero net gain — no outputs", () => {
  const result = compute({ net_section_1256_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── 60/40 rule — gains ───────────────────────────────────────────────────────

Deno.test("60/40: $10k net gain → $6k LT (line_11_form2439), $4k ST (line_1a_proceeds)", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 6_000);
  assertEquals(stOut?.fields.line_1a_proceeds, 4_000);
  assertEquals(stOut?.fields.line_1a_cost, 0);
});

Deno.test("60/40: $50k net gain → $30k LT, $20k ST", () => {
  const result = compute({ net_section_1256_gain: 50_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 30_000);
  assertEquals(stOut?.fields.line_1a_proceeds, 20_000);
});

Deno.test("60/40: $1k net gain → $600 LT, $400 ST (exact integers)", () => {
  const result = compute({ net_section_1256_gain: 1_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 600);
  assertEquals(stOut?.fields.line_1a_proceeds, 400);
});

// ─── 60/40 rule — losses ──────────────────────────────────────────────────────

Deno.test("60/40: $10k net loss → -$6k LT, -$4k ST", () => {
  const result = compute({ net_section_1256_gain: -10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -6_000);
  assertEquals(stOut?.fields.line_1a_proceeds, -4_000);
});

Deno.test("60/40: $25k net loss → -$15k LT, -$10k ST", () => {
  const result = compute({ net_section_1256_gain: -25_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -15_000);
  assertEquals(stOut?.fields.line_1a_proceeds, -10_000);
});

// ─── Prior-year loss carryover reduces net before 60/40 split ────────────────

Deno.test("carryover reduces gain: $10k gain - $4k carryover = $6k net → LT=$3.6k, ST=$2.4k", () => {
  const result = compute({
    net_section_1256_gain: 10_000,
    prior_year_loss_carryover: 4_000,
  });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertAlmostEquals(ltOut?.fields.line_11_form2439 as number, 3_600, 0.01);
  assertAlmostEquals(stOut?.fields.line_1a_proceeds as number, 2_400, 0.01);
});

Deno.test("carryover equals gain — net zero, no outputs", () => {
  const result = compute({
    net_section_1256_gain: 5_000,
    prior_year_loss_carryover: 5_000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("carryover exceeds gain: $3k gain - $8k carryover = -$5k net → LT=-$3k, ST=-$2k", () => {
  const result = compute({
    net_section_1256_gain: 3_000,
    prior_year_loss_carryover: 8_000,
  });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -3_000);
  assertEquals(stOut?.fields.line_1a_proceeds, -2_000);
});

Deno.test("carryover with no current-year gain: -$5k net → LT=-$3k, ST=-$2k", () => {
  const result = compute({ prior_year_loss_carryover: 5_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -3_000);
  assertEquals(stOut?.fields.line_1a_costs, undefined); // verify no extra fields bleed
  assertEquals(stOut?.fields.line_1a_proceeds, -2_000);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("all outputs route to schedule_d", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  assertEquals(result.outputs.every((o) => o.nodeType === "schedule_d"), true);
});

Deno.test("nonzero net produces exactly 2 schedule_d outputs (LT and ST)", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  assertEquals(result.outputs.length, 2);
});
