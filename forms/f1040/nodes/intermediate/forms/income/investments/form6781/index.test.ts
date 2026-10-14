import { assertEquals, assertThrows } from "@std/assert";
import { form6781 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form6781.compute({ taxYear: 2025, formType: "f1040" }, input);
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

Deno.test("60/40: $10k net gain → $6k LT (line 11), $4k ST (line 4)", () => {
  const result = compute({ net_section_1256_gain: 10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_4_other_st" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 6_000);
  assertEquals(stOut?.fields.line_4_other_st, 4_000);
});

Deno.test("60/40: $50k net gain → $30k LT, $20k ST", () => {
  const result = compute({ net_section_1256_gain: 50_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_4_other_st" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 30_000);
  assertEquals(stOut?.fields.line_4_other_st, 20_000);
});

Deno.test("60/40: $1k net gain → $600 LT, $400 ST (exact integers)", () => {
  const result = compute({ net_section_1256_gain: 1_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_4_other_st" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, 600);
  assertEquals(stOut?.fields.line_4_other_st, 400);
});

// ─── 60/40 rule — losses ──────────────────────────────────────────────────────

Deno.test("60/40: $10k net loss → -$6k LT, -$4k ST", () => {
  const result = compute({ net_section_1256_gain: -10_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_4_other_st" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -6_000);
  assertEquals(stOut?.fields.line_4_other_st, -4_000);
});

Deno.test("60/40: $25k net loss → -$15k LT, -$10k ST", () => {
  const result = compute({ net_section_1256_gain: -25_000 });
  const sdOutputs = allOutputs(result, "schedule_d");
  const ltOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const stOut = sdOutputs.find((o) => "line_4_other_st" in o.fields);
  assertEquals(ltOut?.fields.line_11_form2439, -15_000);
  assertEquals(stOut?.fields.line_4_other_st, -10_000);
});

Deno.test("account rows net gains and losses before the 60/40 split", () => {
  const result = compute({
    accounts: [
      { account_identification: "Broker A", gain_loss: 12_000 },
      { account_identification: "Broker B", gain_loss: -2_000 },
    ],
  });
  assertEquals(
    result.outputs.find((o) => "line_11_form2439" in o.fields)?.fields
      .line_11_form2439,
    6_000,
  );
  assertEquals(
    result.outputs.find((o) => "line_4_other_st" in o.fields)?.fields
      .line_4_other_st,
    4_000,
  );
});

Deno.test("mismatched aggregate and account rows are rejected", () => {
  assertThrows(
    () =>
      compute({
        accounts: [{ account_identification: "Broker A", gain_loss: 100 }],
        net_section_1256_gain: 99,
      }),
    Error,
    "do not match",
  );
});

Deno.test("old prior-year carryover input is rejected rather than misreported", () => {
  assertThrows(
    () =>
      compute({
        net_section_1256_gain: 10_000,
        prior_year_loss_carryover: 4_000,
      }),
    Error,
    "does not apply a prior-year loss carryover",
  );
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
