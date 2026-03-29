import { assertEquals, assertThrows } from "@std/assert";
import { f1099g } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    // all fields optional; provide overrides as needed
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099g.compute({ f1099gs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f1099g.inputSchema: valid empty object passes validation", () => {
  const parsed = f1099g.inputSchema.safeParse({ f1099gs: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f1099g.inputSchema: empty g99s array passes validation", () => {
  const parsed = f1099g.inputSchema.safeParse({ f1099gs: [] });
  assertEquals(parsed.success, true);
});

Deno.test("f1099g.inputSchema: negative box_1_unemployment fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_1_unemployment: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_1_repaid fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_1_repaid: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_2_state_refund fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_2_state_refund: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_4_federal_withheld fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_4_federal_withheld: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_5_rtaa fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_5_rtaa: -600 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_6_taxable_grants fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_6_taxable_grants: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_7_agriculture fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_7_agriculture: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_9_market_gain fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_9_market_gain: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1099g.inputSchema: negative box_11_state_withheld fails validation", () => {
  const parsed = f1099g.inputSchema.safeParse({
    f1099gs: [{ box_11_state_withheld: -1 }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("f1099g.compute: box_1_unemployment routes to schedule1 line7_unemployment", () => {
  const result = compute([minimalItem({ box_1_unemployment: 8000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8000);
});

Deno.test("f1099g.compute: box_1_unemployment zero produces no schedule1 unemployment output", () => {
  const result = compute([minimalItem({ box_1_unemployment: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_1_repaid reduces unemployment on schedule1 line7", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 8000, box_1_repaid: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6000);
});

Deno.test("f1099g.compute: box_2_state_refund taxable when prior year itemized routes to schedule1 line1", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 300, box_2_prior_year_itemized: true }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 300);
});

Deno.test("f1099g.compute: box_2_state_refund not taxable when not itemized — no line1 output", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 300, box_2_prior_year_itemized: false }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_2_state_refund zero with itemized — no line1 output", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 0, box_2_prior_year_itemized: true }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_4_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box_4_federal_withheld: 400 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 400);
});

Deno.test("f1099g.compute: box_4_federal_withheld zero — no f1040 withholding output", () => {
  const result = compute([minimalItem({ box_4_federal_withheld: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_5_rtaa routes to schedule1 line8z_rtaa", () => {
  const result = compute([minimalItem({ box_5_rtaa: 1500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 1500);
});

Deno.test("f1099g.compute: box_5_rtaa zero — no schedule1 rtaa output", () => {
  const result = compute([minimalItem({ box_5_rtaa: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_rtaa !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_6_taxable_grants (personal) routes to schedule1 line8z_taxable_grants", () => {
  const result = compute([minimalItem({ box_6_taxable_grants: 2000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_taxable_grants, 2000);
});

Deno.test("f1099g.compute: box_6_taxable_grants zero — no schedule1 grants output", () => {
  const result = compute([minimalItem({ box_6_taxable_grants: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_taxable_grants !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_7_agriculture routes to schedule_f line4a_gov_payments", () => {
  const result = compute([minimalItem({ box_7_agriculture: 3500 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line4a_gov_payments, 3500);
});

Deno.test("f1099g.compute: box_7_agriculture zero — no schedule_f output", () => {
  const result = compute([minimalItem({ box_7_agriculture: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_f" &&
      (o.fields as Record<string, unknown>).line4a_gov_payments !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_9_market_gain routes to schedule_f line5_ccc_gain", () => {
  const result = compute([minimalItem({ box_9_market_gain: 600 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line5_ccc_gain, 600);
});

Deno.test("f1099g.compute: box_9_market_gain zero — no schedule_f ccc output", () => {
  const result = compute([minimalItem({ box_9_market_gain: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_f" &&
      (o.fields as Record<string, unknown>).line5_ccc_gain !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: empty item produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — multiple 1099-G items
// =============================================================================

Deno.test("f1099g.compute: multiple items — box_1_unemployment summed across all items", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 5000 }),
    minimalItem({ box_1_unemployment: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8000);
});

Deno.test("f1099g.compute: multiple items — box_1_repaid subtracted from total across all items", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 6000, box_1_repaid: 1000 }),
    minimalItem({ box_1_unemployment: 4000, box_1_repaid: 500 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 8500); // 10000 - 1500
});

Deno.test("f1099g.compute: multiple items — box_4_federal_withheld summed to f1040 line25b", () => {
  const result = compute([
    minimalItem({ box_4_federal_withheld: 300 }),
    minimalItem({ box_4_federal_withheld: 200 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line25b_withheld_1099, 500);
});

Deno.test("f1099g.compute: multiple items — box_5_rtaa summed on schedule1 line8z_rtaa", () => {
  const result = compute([
    minimalItem({ box_5_rtaa: 1000 }),
    minimalItem({ box_5_rtaa: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 3000);
});

Deno.test("f1099g.compute: multiple items — box_2_state_refund summed when both itemized", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 100, box_2_prior_year_itemized: true }),
    minimalItem({ box_2_state_refund: 200, box_2_prior_year_itemized: true }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 300);
});

Deno.test("f1099g.compute: multiple items — box_7_agriculture summed on schedule_f line4a", () => {
  const result = compute([
    minimalItem({ box_7_agriculture: 1000 }),
    minimalItem({ box_7_agriculture: 2500 }),
  ]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line4a_gov_payments, 3500);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

// Box 1 unemployment — minimum reporting threshold $10
Deno.test("f1099g.compute: box_1_unemployment $9 (below $10 threshold) — does not route", () => {
  const result = compute([minimalItem({ box_1_unemployment: 9 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_1_unemployment $10 (at threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_1_unemployment: 10 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 10);
});

Deno.test("f1099g.compute: box_1_unemployment $11 (above threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_1_unemployment: 11 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 11);
});

// Box 2 state refund — minimum reporting threshold $10
Deno.test("f1099g.compute: box_2_state_refund $9 (below $10 threshold) with itemized — does not route", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 9, box_2_prior_year_itemized: true }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_2_state_refund $10 (at threshold) with itemized — routes to schedule1", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 10, box_2_prior_year_itemized: true }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line1_state_refund, 10);
});

// Box 5 RTAA — minimum reporting threshold $600
Deno.test("f1099g.compute: box_5_rtaa $599 (below $600 threshold) — does not route", () => {
  const result = compute([minimalItem({ box_5_rtaa: 599 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_rtaa !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_5_rtaa $600 (at threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_5_rtaa: 600 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 600);
});

Deno.test("f1099g.compute: box_5_rtaa $601 (above threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_5_rtaa: 601 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_rtaa, 601);
});

// Box 6 taxable grants — minimum reporting threshold $600 (general grants)
Deno.test("f1099g.compute: box_6_taxable_grants $599 (below $600 threshold) — does not route", () => {
  const result = compute([minimalItem({ box_6_taxable_grants: 599 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_taxable_grants !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099g.compute: box_6_taxable_grants $600 (at threshold) — routes to schedule1", () => {
  const result = compute([minimalItem({ box_6_taxable_grants: 600 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8z_taxable_grants, 600);
});

// Repayment threshold $3,000 for IRC §1341 treatment
Deno.test("f1099g.compute: box_1_repaid $3000 (at threshold) — routes net unemployment to schedule1", () => {
  // $3,000 or less: same-year repayment, net flows to line 7
  const result = compute([
    minimalItem({ box_1_unemployment: 10000, box_1_repaid: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 7000);
});

Deno.test("f1099g.compute: box_1_repaid $3001 (above threshold) — same-year net still $6999 on line7", () => {
  // same-year repayment above $3,000 — net amount is still reduced
  const result = compute([
    minimalItem({ box_1_unemployment: 10000, box_1_repaid: 3001 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6999);
});

// =============================================================================
// 5. Hard Validation Rules — throws
// =============================================================================

Deno.test("f1099g.compute: throws on negative box_1_unemployment", () => {
  assertThrows(
    () => compute([minimalItem({ box_1_unemployment: -1 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_1_repaid", () => {
  assertThrows(
    () => compute([minimalItem({ box_1_repaid: -1 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_2_state_refund", () => {
  assertThrows(
    () => compute([minimalItem({ box_2_state_refund: -100 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_4_federal_withheld", () => {
  assertThrows(
    () => compute([minimalItem({ box_4_federal_withheld: -50 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_5_rtaa", () => {
  assertThrows(
    () => compute([minimalItem({ box_5_rtaa: -600 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_6_taxable_grants", () => {
  assertThrows(
    () => compute([minimalItem({ box_6_taxable_grants: -1 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_7_agriculture", () => {
  assertThrows(
    () => compute([minimalItem({ box_7_agriculture: -1 })]),
    Error,
  );
});

Deno.test("f1099g.compute: throws on negative box_9_market_gain", () => {
  assertThrows(
    () => compute([minimalItem({ box_9_market_gain: -1 })]),
    Error,
  );
});

// boundary-pass tests — valid zero values must not throw
Deno.test("f1099g.compute: does not throw on zero box_1_unemployment (boundary pass)", () => {
  const result = compute([minimalItem({ box_1_unemployment: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099g.compute: does not throw on zero box_4_federal_withheld (boundary pass)", () => {
  const result = compute([minimalItem({ box_4_federal_withheld: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099g.compute: does not throw on zero box_5_rtaa (boundary pass)", () => {
  const result = compute([minimalItem({ box_5_rtaa: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Warning-Only Rules — must NOT throw
// =============================================================================

// box_1_railroad is informational — affects labeling but must not throw
Deno.test("f1099g.compute: box_1_railroad=true does not throw and routes unemployment to schedule1", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 5000, box_1_railroad: true }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 5000);
});

// =============================================================================
// 7. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("f1099g.compute: box_8_trade_or_business only — produces no outputs (informational checkbox)", () => {
  const outputsBefore = compute([minimalItem()]).outputs.length;
  const outputsAfter = compute([
    minimalItem({ box_8_trade_or_business: true }),
  ]).outputs.length;
  assertEquals(outputsBefore, outputsAfter);
});

Deno.test("f1099g.compute: box_10a_state only — produces no federal outputs", () => {
  const result = compute([minimalItem({ box_10a_state: "CA" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: box_10b_state_id only — produces no federal outputs", () => {
  const result = compute([minimalItem({ box_10b_state_id: "123-456-789" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: box_11_state_withheld only — produces no federal outputs", () => {
  const result = compute([minimalItem({ box_11_state_withheld: 500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: payer_name and payer_tin only — produces no outputs", () => {
  const result = compute([
    minimalItem({ payer_name: "State UI", payer_tin: "12-3456789" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: account_number only — produces no outputs", () => {
  const result = compute([minimalItem({ account_number: "ACC-001" })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099g.compute: box_3_tax_year only — produces no outputs (worksheet input only)", () => {
  const result = compute([minimalItem({ box_3_tax_year: 2023 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

// Repaid equals received in same year — net is $0, no output
Deno.test("f1099g.compute: repaid equals unemployment — no line7 output (net $0)", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 5000, box_1_repaid: 5000 }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(out, undefined);
});

// Repaid exceeds received in same year — net floors at $0
Deno.test("f1099g.compute: repaid exceeds unemployment — net floors at $0, no line7 output", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 2000, box_1_repaid: 3000 }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line7_unemployment !== undefined,
  );
  assertEquals(out, undefined);
});

// State refund — taxpayer did NOT itemize (standard deduction) — $0 taxable
Deno.test("f1099g.compute: state refund with standard deduction prior year — not taxable", () => {
  const result = compute([
    minimalItem({ box_2_state_refund: 500, box_2_prior_year_itemized: false }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

// State refund — prior_year_itemized omitted defaults to not taxable
Deno.test("f1099g.compute: state refund with prior_year_itemized omitted — not taxable", () => {
  const result = compute([minimalItem({ box_2_state_refund: 300 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line1_state_refund !== undefined,
  );
  assertEquals(out, undefined);
});

// Multiple 1099-G forms — California FTDI stacking
Deno.test("f1099g.compute: multiple forms with separate box_1 amounts — summed correctly", () => {
  // Two 1099-G: one for regular UI, one for CA FTDI — both report on Schedule 1 Line 7
  const result = compute([
    minimalItem({ box_1_unemployment: 8000 }),
    minimalItem({ box_1_unemployment: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 10000);
});

// Mixed items — one with unemployment and one with state refund (itemized)
Deno.test("f1099g.compute: mixed items — unemployment and state refund both routed", () => {
  const result = compute([
    minimalItem({ box_1_unemployment: 6000 }),
    minimalItem({ box_2_state_refund: 400, box_2_prior_year_itemized: true }),
  ]);
  const schedOut = findOutput(result, "schedule1");
  assertEquals(schedOut !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line7_unemployment, 6000);
  assertEquals(input.line1_state_refund, 400);
});

// Box 7 agriculture — both line 4a and taxable portion expected
Deno.test("f1099g.compute: box_7_agriculture routes to schedule_f with line4a_gov_payments", () => {
  const result = compute([minimalItem({ box_7_agriculture: 5000 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line4a_gov_payments, 5000);
});

// Box 9 market gain when taxpayer did NOT elect CCC proceeds — routes to schedule_f
Deno.test("f1099g.compute: box_9_market_gain without CCC election — routes to schedule_f", () => {
  const result = compute([minimalItem({ box_9_market_gain: 800 })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line5_ccc_gain, 800);
});

// Empty array — no outputs
Deno.test("f1099g.compute: empty g99s array produces no outputs", () => {
  const result = f1099g.compute({ f1099gs: [] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 9. Smoke Test — all major boxes populated
// =============================================================================

Deno.test("f1099g.compute: smoke test — all major boxes populated produces correct outputs", () => {
  const result = compute([
    minimalItem({
      box_1_unemployment: 12000,
      box_1_repaid: 1000,
      box_1_railroad: false,
      box_2_state_refund: 500,
      box_2_prior_year_itemized: true,
      box_3_tax_year: 2024,
      box_4_federal_withheld: 800,
      box_5_rtaa: 1200,
      box_6_taxable_grants: 750,
      box_7_agriculture: 4000,
      box_8_trade_or_business: false,
      box_9_market_gain: 300,
      box_10a_state: "TX",
      box_10b_state_id: "TX-123",
      box_11_state_withheld: 250,
      payer_name: "Texas Workforce Commission",
      payer_tin: "74-6000001",
      account_number: "TX-2025-001",
    }),
  ]);

  // Schedule 1: unemployment net (12000 - 1000 = 11000)
  const schedule1Out = findOutput(result, "schedule1");
  assertEquals(schedule1Out !== undefined, true);
  const s1 = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1.line7_unemployment, 11000);

  // Schedule 1: state refund taxable (itemized)
  assertEquals(s1.line1_state_refund, 500);

  // Schedule 1: RTAA payments
  assertEquals(s1.line8z_rtaa, 1200);

  // Schedule 1: taxable grants
  assertEquals(s1.line8z_taxable_grants, 750);

  // Form 1040: federal withholding
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(f.line25b_withheld_1099, 800);

  // Schedule F: agriculture payments
  const schedF = findOutput(result, "schedule_f");
  assertEquals(schedF !== undefined, true);
  assertEquals((schedF!.fields as Record<string, unknown>).line4a_gov_payments, 4000);

  // Schedule F: CCC market gain
  assertEquals((schedF!.fields as Record<string, unknown>).line5_ccc_gain, 300);
});

// Total test count: 68
// Coverage section breakdown:
//   1. Input Schema Validation: 11 tests
//   2. Per-Box Routing: 20 tests
//   3. Aggregation: 6 tests
//   4. Thresholds: 12 tests
//   5. Hard Validation Rules: 11 tests
//   6. Warning-Only Rules: 1 test
//   7. Informational Fields: 7 tests
//   8. Edge Cases: 9 tests
//   9. Smoke Test: 1 test
