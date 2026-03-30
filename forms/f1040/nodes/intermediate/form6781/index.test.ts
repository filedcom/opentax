import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form6781 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form6781.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function allOutputs(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.filter((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke — zero net gain returns no outputs", () => {
  const result = compute({ net_section_1256_gain: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── 60/40 Rule — Gains ──────────────────────────────────────────────────────

Deno.test("60/40 — $10k net gain: $6k long-term, $4k short-term", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 6_000);
  assertEquals(stOut?.fields.line_1a_proceeds, 4_000);
});

Deno.test("60/40 — $50k net gain: $30k LT, $20k ST", () => {
  const result = compute({ net_section_1256_gain: 50_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 30_000);
  assertEquals(stOut?.fields.line_1a_proceeds, 20_000);
});

// ─── 60/40 Rule — Losses ─────────────────────────────────────────────────────

Deno.test("60/40 — $10k net loss: -$6k long-term, -$4k short-term", () => {
  const result = compute({ net_section_1256_gain: -10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_1a_proceeds" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -6_000);
  assertEquals(stOut?.fields.line_1a_proceeds, -4_000);
});

// ─── Prior Year Loss Carryover ────────────────────────────────────────────────

Deno.test("carryover reduces net gain before 60/40 split", () => {
  // Net gain $10k - carryover $4k = $6k net; LT=$3.6k, ST=$2.4k
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

Deno.test("carryover exceeds gain — net loss after carryover", () => {
  // Net $3k - carryover $8k = -$5k; LT=-$3k, ST=-$2k
  const result = compute({
    net_section_1256_gain: 3_000,
    prior_year_loss_carryover: 8_000,
  });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -3_000);
});

Deno.test("carryover with no current year activity", () => {
  // No current activity + carryover $5k = net -$5k; LT=-$3k, ST=-$2k
  const result = compute({ prior_year_loss_carryover: 5_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -3_000);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("all outputs route to schedule_d", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  assertEquals(result.outputs.every((o) => o.nodeType === "schedule_d"), true);
});

Deno.test("produces exactly 2 schedule_d outputs for nonzero net", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  assertEquals(result.outputs.length, 2);
});
