import { assertEquals, assertThrows } from "@std/assert";
import { w2g } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return w2g.compute({ taxYear: 2025 }, { w2gs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("w2g.inputSchema: valid minimal item passes", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("w2g.inputSchema: negative box1_winnings fails", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [{ box1_winnings: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("w2g.inputSchema: negative box4_federal_withheld fails", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [{ box4_federal_withheld: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("w2g.inputSchema: negative box7_winnings_noncash fails", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [{ box7_winnings_noncash: -50 }] });
  assertEquals(parsed.success, false);
});

Deno.test("w2g.inputSchema: negative box15_state_withheld fails", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [{ box15_state_withheld: -200 }] });
  assertEquals(parsed.success, false);
});

Deno.test("w2g.inputSchema: empty array fails (min 1)", () => {
  const parsed = w2g.inputSchema.safeParse({ w2gs: [] });
  assertEquals(parsed.success, false);
});

Deno.test("w2g.inputSchema: valid full item passes", () => {
  const parsed = w2g.inputSchema.safeParse({
    w2gs: [{
      box1_winnings: 1000,
      box2_type_of_wager: "Slot machine",
      box3_winnings_identical: 500,
      box4_federal_withheld: 250,
      box7_winnings_noncash: 0,
      box15_state_withheld: 50,
      payer_name: "Casino ABC",
      payer_ein: "12-3456789",
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("w2g.compute: box1_winnings routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box1_winnings: 2000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 2000);
});

Deno.test("w2g.compute: box1_winnings zero — no schedule1 output", () => {
  const result = compute([minimalItem({ box1_winnings: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: box4_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 500 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 500);
});

Deno.test("w2g.compute: box4_federal_withheld zero — no f1040 output", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: empty item produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation
// =============================================================================

Deno.test("w2g.compute: multiple items — box1_winnings summed to schedule1", () => {
  const result = compute([
    minimalItem({ box1_winnings: 1000 }),
    minimalItem({ box1_winnings: 2500 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 3500);
});

Deno.test("w2g.compute: multiple items — box4_federal_withheld summed to f1040", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 300 }),
    minimalItem({ box4_federal_withheld: 200 }),
  ]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 500);
});

Deno.test("w2g.compute: winnings and withholding both route correctly", () => {
  const result = compute([
    minimalItem({ box1_winnings: 5000, box4_federal_withheld: 1250 }),
  ]);
  const s1 = fieldsOf(result.outputs, schedule1)!;
  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(s1.line8z_other_income, 5000);
  assertEquals(f.line25b_withheld_1099, 1250);
});

// =============================================================================
// 4. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("w2g.compute: box2_type_of_wager only — no outputs", () => {
  const result = compute([minimalItem({ box2_type_of_wager: "Lottery" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: box13_state only — no outputs", () => {
  const result = compute([minimalItem({ box13_state: "CA" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: box15_state_withheld only — no federal outputs", () => {
  const result = compute([minimalItem({ box15_state_withheld: 100 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: payer_name and payer_ein only — no outputs", () => {
  const result = compute([minimalItem({ payer_name: "Casino", payer_ein: "12-3456789" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("w2g.compute: box3_winnings_identical only — no outputs", () => {
  const result = compute([minimalItem({ box3_winnings_identical: 500 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Hard Validation Rules (schema-level)
// =============================================================================

Deno.test("w2g.compute: throws on negative box1_winnings", () => {
  assertThrows(() => compute([minimalItem({ box1_winnings: -1 })]), Error);
});

Deno.test("w2g.compute: throws on negative box4_federal_withheld", () => {
  assertThrows(() => compute([minimalItem({ box4_federal_withheld: -100 })]), Error);
});

Deno.test("w2g.compute: zero values do not throw", () => {
  const result = compute([minimalItem({ box1_winnings: 0, box4_federal_withheld: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Edge Cases
// =============================================================================

Deno.test("w2g.compute: only withholding no winnings — no schedule1 output, has f1040 output", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 250 })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
  assertEquals(findOutput(result, "f1040") !== undefined, true);
});

Deno.test("w2g.compute: only winnings no withholding — has schedule1, no f1040 output", () => {
  const result = compute([minimalItem({ box1_winnings: 1000 })]);
  assertEquals(findOutput(result, "schedule1") !== undefined, true);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("w2g.compute: multiple items mixed — winnings summed, withholding summed", () => {
  const result = compute([
    minimalItem({ box1_winnings: 500 }),
    minimalItem({ box4_federal_withheld: 100 }),
    minimalItem({ box1_winnings: 1500, box4_federal_withheld: 375 }),
  ]);
  const s1 = fieldsOf(result.outputs, schedule1)!;
  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(s1.line8z_other_income, 2000);
  assertEquals(f.line25b_withheld_1099, 475);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("w2g.compute: smoke test — multiple W-2Gs with all major fields", () => {
  const result = compute([
    minimalItem({
      box1_winnings: 5000,
      box2_type_of_wager: "Blackjack",
      box3_winnings_identical: 1000,
      box4_federal_withheld: 1250,
      box7_winnings_noncash: 0,
      box13_state: "NV",
      box15_state_withheld: 200,
      payer_name: "Nevada Casino",
      payer_ein: "88-1234567",
    }),
    minimalItem({
      box1_winnings: 2000,
      box4_federal_withheld: 500,
      box2_type_of_wager: "Slot machine",
    }),
  ]);

  const s1 = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1.line8z_other_income, 7000);

  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(f.line25b_withheld_1099, 1750);
});
