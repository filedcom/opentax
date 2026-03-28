import { assertEquals } from "@std/assert";
import { scheduleD } from "./index.ts";

// ---- Unit: short-term gains ----

Deno.test("scheduleD.compute: short-term gain routes to f1040 line7", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 20_000,
    line_1a_cost: 15_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 5_000);
});

Deno.test("scheduleD.compute: short-term loss carryover reduces ST net", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 20_000,
    line_1a_cost: 15_000,
    line_6_carryover: 8_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // stNet = 20000 - 15000 - 8000 = -3000, total = -3000, deductible = -3000
  assertEquals(input.line7_capital_gain, -3_000);
});

// ---- Unit: long-term gains ----

Deno.test("scheduleD.compute: long-term gain routes to f1040 line7", () => {
  const result = scheduleD.compute({
    line_8a_proceeds: 50_000,
    line_8a_cost: 30_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 20_000);
});

Deno.test("scheduleD.compute: long-term carryover reduces LT net", () => {
  const result = scheduleD.compute({
    line_8a_proceeds: 10_000,
    line_8a_cost: 5_000,
    line_14_carryover: 8_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // ltNet = 10000 - 5000 - 8000 = -3000, total = -3000, deductible = -3000
  assertEquals(input.line7_capital_gain, -3_000);
});

// ---- Unit: capital gain distributions ----

Deno.test("scheduleD.compute: cap gain distributions (LT) included in LT net", () => {
  const result = scheduleD.compute({
    line_12_cap_gain_dist: 4_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 4_000);
});

// ---- Unit: $3,000 loss limitation ----

Deno.test("scheduleD.compute: loss between -$3000 and $0 fully deductible", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 7_000,
    line_1a_cost: 9_500,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -2_500);

  // No carryforward when loss <= $3000
  const schedD = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(schedD, undefined);
});

Deno.test("scheduleD.compute: loss exactly -$3000 is fully deductible, no carryforward", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 7_000,
    line_1a_cost: 10_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, -3_000);

  const schedD = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(schedD, undefined);
});

Deno.test("scheduleD.compute: loss > $3000 capped at -$3000 with carryforward emitted", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 5_000,
    line_1a_cost: 12_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);

  const schedD = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(schedD !== undefined, true);
  const dInput = schedD!.input as Record<string, number>;
  // totalNet = -7000, carryforward = -(-7000 - (-3000)) = 4000
  assertEquals(dInput.capital_loss_carryover, 4_000);
});

// ---- Unit: ST + LT combination ----

Deno.test("scheduleD.compute: ST gain + LT loss offset each other", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 20_000,
    line_1a_cost: 10_000, // ST gain = 10000
    line_8a_proceeds: 5_000,
    line_8a_cost: 8_000, // LT loss = -3000
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  // total = 10000 + (-3000) = 7000
  assertEquals(input.line7_capital_gain, 7_000);
});

// ---- Unit: K-1 gains/losses ----

Deno.test("scheduleD.compute: K-1 short-term and long-term flows included", () => {
  const result = scheduleD.compute({
    line_5_k1_st: 2_000,
    line_12_k1_lt: 3_000,
  });

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 5_000);
});

// ---- Unit: zero-input behavior ----

Deno.test("scheduleD.compute: zero inputs produce zero capital gain", () => {
  const result = scheduleD.compute({});
  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040 !== undefined, true);
  const input = f1040!.input as Record<string, number>;
  assertEquals(input.line7_capital_gain, 0);
});

// ---- Unit: inputSchema validation ----

Deno.test("scheduleD.inputSchema: empty object is valid (all fields optional)", () => {
  const parsed = scheduleD.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("scheduleD.inputSchema: negative carryover fails validation", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_6_carryover: -500 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleD.inputSchema: negative cap_gain_dist fails validation", () => {
  const parsed = scheduleD.inputSchema.safeParse({ line_12_cap_gain_dist: -1 });
  assertEquals(parsed.success, false);
});

// ---- Unit: large loss carryforward math ----

Deno.test("scheduleD.compute: very large loss computes correct carryforward amount", () => {
  const result = scheduleD.compute({
    line_1a_proceeds: 0,
    line_1a_cost: 50_000,
  });

  const schedD = result.outputs.find((o) => o.nodeType === "schedule_d");
  assertEquals(schedD !== undefined, true);
  const dInput = schedD!.input as Record<string, number>;
  // totalNet = -50000, carryforward = -(-50000 - (-3000)) = 47000
  assertEquals(dInput.capital_loss_carryover, 47_000);

  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  const fInput = f1040!.input as Record<string, number>;
  assertEquals(fInput.line7_capital_gain, -3_000);
});
