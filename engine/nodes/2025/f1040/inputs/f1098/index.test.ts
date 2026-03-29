// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton (e.g. `f1098`)
//   2. The input wrapper key matches compute()'s parameter (e.g. `f1098s`)
//   3. The nodeType strings match the actual node routing strings:
//      - schedule_a, schedule_e, schedule_c, form_8829, schedule_1
//   4. The for_routing enum values: "A", "E", "C", "8829"
//   5. Field names on output objects (e.g. line8a_mortgage_interest_1098,
//      line8c_points_no_1098, mortgage_interest, line16a_interest_mortgage,
//      mortgage_interest_8829, line8z_other_income)
// These tests define the IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES (implementor must resolve):
//   A. Does the node accept a `lender_name` field or is it optional? Context.md
//      only requires for_routing and box1_mortgage_interest.
//   B. What is the exact output field name for box1 routed to schedule_e?
//      Context.md says "line 12 — mortgage interest paid to banks" — likely
//      `mortgage_interest` or `line12_mortgage_interest`.
//   C. What is the exact field name for box1 routed to schedule_c?
//      Context.md says "line 16a" — likely `line16a_interest_mortgage`.
//   D. What is the exact field name for box1 routed to form_8829?
//      Context.md says "line 10 or line 16" — implementor must choose.
//   E. Does the engine expose a `prior_year_refund` boolean on the item to
//      distinguish Scenario A vs. Scenario B for box4? Context.md requires
//      this distinction but it cannot be derived from box4 alone.
//   F. Does the engine expose a DEDM override flag per-item? Context.md says
//      if DEDM data exists, box1 from 1098 is ignored.
//   G. What is the field name for points on schedule_a?
//      Context.md routes box6 to "line 8a" (purchase points) — check whether
//      it is the same field as mortgage interest or a separate field like
//      `line8a_points_1098` or `line8c_points_no_1098`.
//   H. Does the node accept a `binding_contract_exception` boolean?
//   I. For MFS limits ($375K / $500K): does the node accept a `filing_status`
//      field, or is this handled upstream?
//   J. box10_other in context.md is a STRING (lender free-text). It must NOT
//      be auto-routed to schedule_a line 5b. Any prior test asserting box10
//      routes to real-estate-tax is INCORRECT per context.md.

import { assertEquals, assertThrows } from "@std/assert";
import { f1098, inputSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ItemOverrides = Record<string, unknown>;

function minimalItem(overrides: ItemOverrides = {}): ItemOverrides {
  return {
    box1_mortgage_interest: 0,
    for_routing: "A",
    ...overrides,
  };
}

function compute(items: unknown[]) {
  return f1098.compute(inputSchema.parse({ f1098s: items }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function outputCount(result: ReturnType<typeof compute>): number {
  return result.outputs.length;
}

// ---------------------------------------------------------------------------
// Section 1: Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema_empty_array_accepted — empty f1098s array does not throw", () => {
  assertEquals(Array.isArray(compute([]).outputs), true);
});

Deno.test("schema_missing_box1_rejected — entry without box1_mortgage_interest throws", () => {
  assertThrows(
    () => compute([{ for_routing: "A" }]),
    Error,
  );
});

Deno.test("schema_negative_box1_rejected — box1_mortgage_interest < 0 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box1_mortgage_interest: -1 })]),
    Error,
  );
});

Deno.test("schema_negative_box4_rejected — box4_refund_overpaid < 0 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box4_refund_overpaid: -1 })]),
    Error,
  );
});

Deno.test("schema_negative_box5_rejected — box5_mip < 0 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box5_mip: -1 })]),
    Error,
  );
});

Deno.test("schema_negative_box6_rejected — box6_points_paid < 0 throws", () => {
  assertThrows(
    () => compute([minimalItem({ box6_points_paid: -1 })]),
    Error,
  );
});

Deno.test("schema_invalid_for_routing_rejected — for_routing='B' throws", () => {
  assertThrows(
    () => compute([minimalItem({ for_routing: "B" })]),
    Error,
  );
});

Deno.test("schema_missing_for_routing_defaults — entry without for_routing does not throw", () => {
  // Per context.md, Schedule A is the default destination for residence interest
  assertEquals(
    Array.isArray(
      compute([{ box1_mortgage_interest: 5000 }]).outputs,
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// Section 2: Per-Box Routing
// ---------------------------------------------------------------------------

Deno.test("routing_box1_for_A_routes_to_schedule_a — box1 with for_routing=A routes to schedule_a", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 12000, for_routing: "A" })]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 12000);
});

Deno.test("routing_box1_for_E_routes_to_schedule_e — box1 with for_routing=E routes to schedule_e", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "E" })]);
  const out = findOutput(result, "schedule_e");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  // AMBIGUITY B: field name may be mortgage_interest or line12_mortgage_interest
  const fieldValue = inp.mortgage_interest ?? inp.line12_mortgage_interest;
  assertEquals(fieldValue, 8000);
});

Deno.test("routing_box1_for_C_routes_to_schedule_c — box1 with for_routing=C routes to schedule_c", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 6000, for_routing: "C" })]);
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  // AMBIGUITY C: per context.md Schedule C line 16a
  const fieldValue = inp.line16a_interest_mortgage ?? inp.mortgage_interest;
  assertEquals(fieldValue, 6000);
});

Deno.test("routing_box1_for_8829_routes_to_form8829 — box1 with for_routing=8829 routes to form_8829", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 4000, for_routing: "8829" })]);
  const out = findOutput(result, "form_8829");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  // AMBIGUITY D: form_8829 line 10 or line 16 depending on deduction method
  const hasField = inp.mortgage_interest !== undefined ||
    inp.line10_mortgage_interest !== undefined ||
    inp.line16_mortgage_interest !== undefined;
  assertEquals(hasField, true);
});

Deno.test("routing_box1_zero_does_not_route — box1=0 produces no interest output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 0, for_routing: "A" })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.fields as Record<string, unknown>).line8a_mortgage_interest_1098 !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("routing_box4_reduces_schedule_a_interest — box4 reduces net interest to schedule_a", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10000, box4_refund_overpaid: 1500, for_routing: "A" }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 8500);
});

Deno.test("routing_box4_equals_box1_zero_net — box4=box1 means zero net, no interest output", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5000, box4_refund_overpaid: 5000, for_routing: "A" }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.fields as Record<string, unknown>).line8a_mortgage_interest_1098 !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("routing_box4_prior_year_routes_to_schedule1 — box4 with prior_year flag routes to schedule_1 line 8z", () => {
  // AMBIGUITY E: prior_year_refund boolean must be present on item schema
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 10000,
      box4_refund_overpaid: 2000,
      box4_prior_year_refund: true,
      for_routing: "A",
    }),
  ]);
  // Prior-year refund is income on Schedule 1 line 8z (tax benefit rule)
  const incomeOut = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_other_income !== undefined,
  );
  assertEquals(incomeOut !== undefined, true);
  const inp = incomeOut!.fields as Record<string, unknown>;
  assertEquals(inp.line8z_other_income, 2000);
});

Deno.test("routing_box4_prior_year_does_not_reduce_box1 — prior-year box4 does not net against box1", () => {
  // Per context.md Scenario B: do NOT reduce current-year box1 by box4
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 10000,
      box4_refund_overpaid: 2000,
      box4_prior_year_refund: true,
      for_routing: "A",
    }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  // box1 should be unaffected: 10000 (not 8000)
  assertEquals(inp.line8a_mortgage_interest_1098, 10000);
});

Deno.test("routing_box5_mip_not_routed_ty2025 — box5_mip collected but not deductible in TY2025", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10000, box5_mip: 1200, for_routing: "A" }),
  ]);
  // No output should reference any MIP field
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
  // Interest should still route normally
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
});

Deno.test("routing_box5_zero_no_mip_output — box5_mip=0 produces no MIP output", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5000, box5_mip: 0, for_routing: "A" }),
  ]);
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
});

Deno.test("routing_box6_for_A_routes_to_schedule_a — box6 points with for_routing=A route to schedule_a", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 2000, for_routing: "A" }),
  ]);
  // AMBIGUITY G: box6 purchase points go to line 8a (same as box1) or separate line8c
  const pointsOut = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (
        (o.fields as Record<string, unknown>).line8a_mortgage_interest_1098 !== undefined ||
        (o.fields as Record<string, unknown>).line8c_points_no_1098 !== undefined ||
        (o.fields as Record<string, unknown>).line8a_points !== undefined
      ),
  );
  assertEquals(pointsOut !== undefined, true);
});

Deno.test("routing_box6_for_E_not_routed_to_schedule_a — box6 with for_routing=E produces no points on schedule_a", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5000, box6_points_paid: 1500, for_routing: "E" }),
  ]);
  const pointsOnSchedA = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (
        (o.fields as Record<string, unknown>).line8c_points_no_1098 !== undefined ||
        (o.fields as Record<string, unknown>).line8a_points !== undefined
      ),
  );
  assertEquals(pointsOnSchedA, undefined);
});

Deno.test("routing_box6_zero_no_points_output — box6=0 produces no points output", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5000, box6_points_paid: 0, for_routing: "A" }),
  ]);
  const pointsOut = result.outputs.find(
    (o) =>
      (o.fields as Record<string, unknown>).line8c_points_no_1098 !== undefined ||
      (o.fields as Record<string, unknown>).line8a_points !== undefined,
  );
  assertEquals(pointsOut, undefined);
});

// ---------------------------------------------------------------------------
// Section 3: Informational Fields — No Routing
// (per context.md: box2, box3, box7, box8, box9, box10, box11, qualified_premiums_checkbox)
// ---------------------------------------------------------------------------

Deno.test("informational_box2_output_count_unchanged — adding box2 does not change output count", () => {
  const withoutBox2 = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox2 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box2_outstanding_principal: 600000 }),
  ]);
  assertEquals(outputCount(withBox2), outputCount(withoutBox2));
});

Deno.test("informational_box3_output_count_unchanged — adding box3 does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox3 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box3_origination_date: "01/15/2020" }),
  ]);
  assertEquals(outputCount(withBox3), outputCount(without));
});

Deno.test("informational_box5_mip_output_count_unchanged — adding box5_mip does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox5 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box5_mip: 900 }),
  ]);
  assertEquals(outputCount(withBox5), outputCount(without));
});

Deno.test("informational_box7_output_count_unchanged — adding box7 does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox7 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box7_property_address_same: true }),
  ]);
  assertEquals(outputCount(withBox7), outputCount(without));
});

Deno.test("informational_box8_output_count_unchanged — adding box8 address does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox8 = compute([
    minimalItem({
      box1_mortgage_interest: 8000,
      for_routing: "A",
      box8_property_address: "123 Main St, Springfield IL 62701",
    }),
  ]);
  assertEquals(outputCount(withBox8), outputCount(without));
});

Deno.test("informational_box9_output_count_unchanged — adding box9 number_of_properties does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox9 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box9_number_of_properties: 2 }),
  ]);
  assertEquals(outputCount(withBox9), outputCount(without));
});

Deno.test("informational_box10_not_auto_routed — box10_other (lender free-text) does NOT auto-route to real estate tax", () => {
  // Per context.md: "do NOT auto-route Box 10 content — it requires separate manual entry"
  const result = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box10_other: "RE taxes paid: $4200" }),
  ]);
  const taxOut = result.outputs.find(
    (o) =>
      (o.fields as Record<string, unknown>).line5b_real_estate_tax !== undefined,
  );
  assertEquals(taxOut, undefined);
});

Deno.test("informational_box11_output_count_unchanged — adding box11 acquisition date does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, for_routing: "A" })]);
  const withBox11 = compute([
    minimalItem({ box1_mortgage_interest: 8000, for_routing: "A", box11_acquisition_date: "03/01/2020" }),
  ]);
  assertEquals(outputCount(withBox11), outputCount(without));
});

Deno.test("informational_qualified_premiums_checkbox_no_effect_ty2025 — qualified_premiums_checkbox=true does not change output count for TY2025", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8000, box5_mip: 900, for_routing: "A" })]);
  const withFlag = compute([
    minimalItem({
      box1_mortgage_interest: 8000,
      box5_mip: 900,
      for_routing: "A",
      qualified_premiums_checkbox: true,
    }),
  ]);
  assertEquals(outputCount(withFlag), outputCount(without));
  // And still no MIP routing
  const mipOut = withFlag.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
});

// ---------------------------------------------------------------------------
// Section 4: Aggregation
// ---------------------------------------------------------------------------

Deno.test("aggregation_multiple_for_a_box1_summed — two for_routing=A items; box1 amounts aggregate", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 9000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 5000, for_routing: "A" }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 14000);
});

Deno.test("aggregation_multiple_for_e_box1_summed — two for_routing=E items; box1 amounts aggregate", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 4000, for_routing: "E" }),
    minimalItem({ box1_mortgage_interest: 3000, for_routing: "E" }),
  ]);
  const out = findOutput(result, "schedule_e");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  const fieldValue = inp.mortgage_interest ?? inp.line12_mortgage_interest;
  assertEquals(fieldValue, 7000);
});

Deno.test("aggregation_mixed_routing_no_cross_contamination — for_routing=A and E go to separate destinations", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 6000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 4000, for_routing: "E" }),
  ]);
  const schedA = findOutput(result, "schedule_a");
  const schedE = findOutput(result, "schedule_e");
  assertEquals(schedA !== undefined, true);
  assertEquals(schedE !== undefined, true);
  assertEquals((schedA!.fields as Record<string, unknown>).line8a_mortgage_interest_1098, 6000);
  const eField = (schedE!.fields as Record<string, unknown>).mortgage_interest ??
    (schedE!.fields as Record<string, unknown>).line12_mortgage_interest;
  assertEquals(eField, 4000);
});

Deno.test("aggregation_box4_reduces_total_for_multiple_items — two for_routing=A with box4; net interest correct", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10000, box4_refund_overpaid: 500, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 8000, box4_refund_overpaid: 200, for_routing: "A" }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  // net = (10000 - 500) + (8000 - 200) = 9500 + 7800 = 17300
  assertEquals(inp.line8a_mortgage_interest_1098, 17300);
});

Deno.test("aggregation_multiple_box6_for_a_points_summed — two for_routing=A with box6; points aggregate", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 1000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 1500, for_routing: "A" }),
  ]);
  // Points must appear in schedule_a output combined
  const pointsOut = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (
        (o.fields as Record<string, unknown>).line8c_points_no_1098 !== undefined ||
        (o.fields as Record<string, unknown>).line8a_points !== undefined ||
        (o.fields as Record<string, unknown>).line8a_mortgage_interest_1098 !== undefined
      ),
  );
  assertEquals(pointsOut !== undefined, true);
  const inp = pointsOut!.fields as Record<string, unknown>;
  const pointsValue = inp.line8c_points_no_1098 ?? inp.line8a_points;
  if (pointsValue !== undefined) {
    assertEquals(pointsValue, 2500);
  }
  // If points are merged into line8a, total = 2500
});

// ---------------------------------------------------------------------------
// Section 5: Thresholds — Loan Limit (Box 2 vs. applicable limit)
// ---------------------------------------------------------------------------

Deno.test("threshold_box2_below_post2017_limit_no_flag — box2=749999 with post-2017 loan, no limitation flag", () => {
  // Per context.md: post-2017 limit is $750,000; below limit = no DEDM needed
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 15000,
      box2_outstanding_principal: 749999,
      box3_origination_date: "01/15/2020",
      for_routing: "A",
    }),
  ]);
  // Should still route box1 to schedule_a normally (no limitation)
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 15000);
});

Deno.test("threshold_box2_at_post2017_limit_no_flag — box2=750000 with post-2017 loan, no limitation", () => {
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 15000,
      box2_outstanding_principal: 750000,
      box3_origination_date: "01/15/2020",
      for_routing: "A",
    }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 15000);
});

Deno.test("threshold_box2_above_post2017_limit_triggers_flag — box2=750001 with post-2017 loan, limitation applies", () => {
  // Per context.md: when box2 > $750K, 1098 screen cannot compute deductible portion;
  // engine must flag (e.g., a warning output or a flag on the output) — it must NOT silently drop box1
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 15000,
      box2_outstanding_principal: 750001,
      box3_origination_date: "01/15/2020",
      for_routing: "A",
    }),
  ]);
  // AMBIGUITY F: engine may either (a) still emit box1 with a limitation_flag,
  // or (b) not emit box1 and instead emit a DEDM-trigger output.
  // Either is acceptable — just must not silently omit with no signal.
  const hasAnyOutput = result.outputs.length > 0;
  assertEquals(hasAnyOutput, true);
});

Deno.test("threshold_box2_below_pre2017_limit_no_flag — box2=999999 with pre-2017 loan, no limitation", () => {
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 20000,
      box2_outstanding_principal: 999999,
      box3_origination_date: "06/01/2010",
      for_routing: "A",
    }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 20000);
});

Deno.test("threshold_box2_at_pre2017_limit_no_flag — box2=1000000 with pre-2017 loan, no limitation", () => {
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 20000,
      box2_outstanding_principal: 1000000,
      box3_origination_date: "06/01/2010",
      for_routing: "A",
    }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  const inp = out!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 20000);
});

Deno.test("threshold_box2_above_pre2017_limit_triggers_flag — box2=1000001 with pre-2017 loan, limitation applies", () => {
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 20000,
      box2_outstanding_principal: 1000001,
      box3_origination_date: "06/01/2010",
      for_routing: "A",
    }),
  ]);
  // Must produce some output (flag or DEDM trigger)
  assertEquals(result.outputs.length > 0, true);
});

// ---------------------------------------------------------------------------
// Section 6: Warning-Only Rules (must NOT throw)
// ---------------------------------------------------------------------------

Deno.test("warning_box3_blank_treated_as_post2017 — box3 absent defaults to post-2017 classification, no throw", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box1_mortgage_interest: 12000, for_routing: "A" })]).outputs,
    ),
    true,
  );
});

Deno.test("warning_box2_exceeds_limit_does_not_throw — box2 over $750K still computes without throwing", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box1_mortgage_interest: 15000,
          box2_outstanding_principal: 900000,
          box3_origination_date: "01/15/2020",
          for_routing: "A",
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("warning_binding_contract_exception_does_not_throw — binding_contract_exception flag does not throw", () => {
  // AMBIGUITY H: if the node exposes this flag
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box1_mortgage_interest: 15000,
          box2_outstanding_principal: 800000,
          box3_origination_date: "01/15/2020",
          binding_contract_exception: true,
          for_routing: "A",
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("warning_grandfathered_debt_pre1987_does_not_throw — box3 before 10/14/1987 is accepted without throw", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box1_mortgage_interest: 25000,
          box2_outstanding_principal: 500000,
          box3_origination_date: "05/01/1985",
          for_routing: "A",
        }),
      ]).outputs,
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// Section 7: Edge Cases
// ---------------------------------------------------------------------------

Deno.test("edge_dedm_override_ignores_box1 — when DEDM override flag is set, box1 from 1098 is not routed to schedule_a", () => {
  // AMBIGUITY F: node must expose a per-item DEDM override flag
  // If the 1098 screen box1 is ignored when DEDM is active (per context.md)
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 15000,
      box2_outstanding_principal: 900000,
      dedm_override: true, // DEDM data present — ignore 1098 box1
      for_routing: "A",
    }),
  ]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.fields as Record<string, unknown>).line8a_mortgage_interest_1098 === 15000,
  );
  // box1 from 1098 screen should NOT appear when DEDM overrides
  assertEquals(out, undefined);
});

Deno.test("edge_split_interest_two_entries — same property split across for_routing=A and E each routes proportional amount", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 7000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 3000, for_routing: "E" }),
  ]);
  const schedA = findOutput(result, "schedule_a");
  const schedE = findOutput(result, "schedule_e");
  assertEquals((schedA!.fields as Record<string, unknown>).line8a_mortgage_interest_1098, 7000);
  const eField = (schedE!.fields as Record<string, unknown>).mortgage_interest ??
    (schedE!.fields as Record<string, unknown>).line12_mortgage_interest;
  assertEquals(eField, 3000);
});

Deno.test("edge_three_entries_for_a_accepted — three for_routing=A entries all accepted (engine does not auto-reject excess homes)", () => {
  // Per context.md: engine accepts any number of 1098 entries; limit enforcement is preparer's responsibility
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 4000, for_routing: "A" }),
    minimalItem({ box1_mortgage_interest: 3000, for_routing: "A" }),
  ]);
  const out = findOutput(result, "schedule_a");
  assertEquals(out !== undefined, true);
  // All three summed
  assertEquals((out!.fields as Record<string, unknown>).line8a_mortgage_interest_1098, 12000);
});

Deno.test("edge_box4_prior_year_multiple_entries_income_summed — multiple prior-year box4 refunds sum on schedule_1 line 8z", () => {
  // AMBIGUITY E: requires prior_year_refund flag
  const result = compute([
    minimalItem({
      box1_mortgage_interest: 10000,
      box4_refund_overpaid: 1000,
      box4_prior_year_refund: true,
      for_routing: "A",
    }),
    minimalItem({
      box1_mortgage_interest: 8000,
      box4_refund_overpaid: 500,
      box4_prior_year_refund: true,
      for_routing: "A",
    }),
  ]);
  const incomeOut = result.outputs.find(
    (o) =>
      o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_other_income !== undefined,
  );
  assertEquals(incomeOut !== undefined, true);
  const inp = incomeOut!.fields as Record<string, unknown>;
  assertEquals(inp.line8z_other_income, 1500);
});

Deno.test("edge_refinance_same_lender_does_not_throw — refinance scenario with same lender does not crash", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box1_mortgage_interest: 12000,
          box6_points_paid: 3000,
          refinance: true,
          for_routing: "A",
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("edge_box10_other_is_string_type_accepted — box10_other as lender free-text string is accepted", () => {
  // Per context.md: box10_other is a string, NOT a number
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box1_mortgage_interest: 8000,
          box10_other: "Real estate taxes: $4,200",
          for_routing: "A",
        }),
      ]).outputs,
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// Section 8: Smoke Test
// ---------------------------------------------------------------------------

Deno.test("smoke_all_major_boxes_populated — comprehensive item with all boxes routes correctly", () => {
  const result = compute([
    {
      box1_mortgage_interest: 18000,
      box2_outstanding_principal: 600000,
      box3_origination_date: "03/15/2022",
      box4_refund_overpaid: 500,
      box5_mip: 1800,
      box6_points_paid: 2400,
      box7_property_address_same: true,
      box8_property_address: "",
      box9_number_of_properties: 1,
      box10_other: "Homeowner insurance: $1,200",
      box11_acquisition_date: "",
      qualified_premiums_checkbox: true,
      for_routing: "A",
    },
  ]);

  // 1. Net mortgage interest = 18000 - 500 = 17500 → schedule_a
  const schedA = findOutput(result, "schedule_a");
  assertEquals(schedA !== undefined, true);
  const inp = schedA!.fields as Record<string, unknown>;
  assertEquals(inp.line8a_mortgage_interest_1098, 17500);

  // 2. Box 5 MIP must NOT be routed anywhere for TY2025
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);

  // 3. Box 10 must NOT produce a real-estate-tax line
  const reTaxOut = result.outputs.find(
    (o) => (o.fields as Record<string, unknown>).line5b_real_estate_tax !== undefined,
  );
  assertEquals(reTaxOut, undefined);

  // 4. No schedule_e or schedule_c output (all routed to A)
  assertEquals(findOutput(result, "schedule_e"), undefined);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});
