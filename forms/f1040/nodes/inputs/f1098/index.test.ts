import { assertEquals, assertThrows } from "@std/assert";
import { f1098, inputSchema, ForRouting } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { scheduleE as schedule_e } from "../schedule_e/index.ts";
import { form_8829 } from "../../intermediate/forms/form_8829/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    box1_mortgage_interest: 0,
    for_routing: ForRouting.A,
    ...overrides,
  };
}

function compute(items: unknown[]) {
  return f1098.compute({ taxYear: 2025 }, inputSchema.parse({ f1098s: items }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// Section 1: Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("f1098.schema: empty array accepted — zero items produces empty outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1098.schema: missing box1_mortgage_interest throws", () => {
  assertThrows(() => compute([{ for_routing: ForRouting.A }]), Error);
});

Deno.test("f1098.schema: negative box1_mortgage_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box1_mortgage_interest: -1 })]), Error);
});

Deno.test("f1098.schema: invalid for_routing value throws", () => {
  assertThrows(() => compute([minimalItem({ for_routing: "B" })]), Error);
});

Deno.test("f1098.schema: missing for_routing defaults to Schedule A routing", () => {
  // Per implementation: for_routing ?? ForRouting.A — defaults to A
  const result = compute([{ box1_mortgage_interest: 5_000 }]);
  const fields = fieldsOf(result.outputs, scheduleA);
  assertEquals(fields?.line_8a_mortgage_interest_1098, 5_000);
});

// ---------------------------------------------------------------------------
// Section 2: Schedule A — mortgage interest routing
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: box1 with for_routing=A routes to schedule_a line_8a", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 12_000 })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 12_000);
});

Deno.test("f1098.compute: box1=0 with for_routing=A produces no schedule_a output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 0 })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("f1098.compute: box4 same-year refund reduces net interest to schedule_a", () => {
  // net = 10000 - 1500 = 8500
  const result = compute([minimalItem({ box1_mortgage_interest: 10_000, box4_refund_overpaid: 1_500 })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 8_500);
});

Deno.test("f1098.compute: box4 equal to box1 yields zero net — no schedule_a interest output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 5_000, box4_refund_overpaid: 5_000 })]);
  // No schedule_a output because interest is 0
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("f1098.compute: box4 prior-year refund does NOT reduce box1 interest", () => {
  // Scenario B: box4_prior_year_refund=true → box1 is unaffected
  const result = compute([minimalItem({
    box1_mortgage_interest: 10_000,
    box4_refund_overpaid: 2_000,
    box4_prior_year_refund: true,
  })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 10_000);
});

Deno.test("f1098.compute: box4 prior-year refund routes refund amount to schedule1 line8z as income", () => {
  const result = compute([minimalItem({
    box1_mortgage_interest: 10_000,
    box4_refund_overpaid: 2_000,
    box4_prior_year_refund: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 2_000);
});

Deno.test("f1098.compute: box6 purchase points route to schedule_a line_8c", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 2_000 })]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8c_points_no_1098, 2_000);
});

Deno.test("f1098.compute: box1 + box6 both route to schedule_a in single output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 15_000, box6_points_paid: 3_000 })]);
  const schedAOutputs = result.outputs.filter((o) => o.nodeType === "schedule_a");
  assertEquals(schedAOutputs.length, 1);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 15_000);
  assertEquals(fields.line_8c_points_no_1098, 3_000);
});

Deno.test("f1098.compute: box5 MIP is not deductible for TY2025 — no MIP field in any output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 10_000, box5_mip: 1_200 })]);
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
  // Interest still routes normally
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 10_000);
});

// ---------------------------------------------------------------------------
// Section 3: Other routing destinations
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: for_routing=E routes box1 to schedule_e mortgage_interest", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 8_000, for_routing: ForRouting.E })]);
  const fields = fieldsOf(result.outputs, schedule_e)!;
  assertEquals(fields.mortgage_interest, 8_000);
});

Deno.test("f1098.compute: for_routing=E does not produce schedule_a output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 8_000, for_routing: ForRouting.E })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("f1098.compute: for_routing=C routes box1 to schedule_c line16a_interest_mortgage", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 6_000, for_routing: ForRouting.C })]);
  const fields = fieldsOf(result.outputs, schedule_c)!;
  assertEquals(fields.line16a_interest_mortgage, 6_000);
});

Deno.test("f1098.compute: for_routing=8829 routes box1 to form_8829 mortgage_interest", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 4_000, for_routing: ForRouting.F8829 })]);
  const fields = fieldsOf(result.outputs, form_8829)!;
  assertEquals(fields.mortgage_interest, 4_000);
});

Deno.test("f1098.compute: box6 with for_routing=E does not route points to schedule_a", () => {
  // Points only aggregate for Schedule A items; E routing ignores box6
  const result = compute([minimalItem({ box1_mortgage_interest: 5_000, box6_points_paid: 1_500, for_routing: ForRouting.E })]);
  const schedAFields = fieldsOf(result.outputs, scheduleA);
  assertEquals(schedAFields?.line_8c_points_no_1098, undefined);
});

// ---------------------------------------------------------------------------
// Section 4: DEDM override
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: dedm_override=true suppresses box1 from schedule_a output", () => {
  const result = compute([minimalItem({
    box1_mortgage_interest: 15_000,
    box2_outstanding_principal: 900_000,
    dedm_override: true,
  })]);
  // box1 from 1098 screen should NOT appear when DEDM overrides
  const schedAFields = fieldsOf(result.outputs, scheduleA);
  assertEquals(schedAFields?.line_8a_mortgage_interest_1098, undefined);
});

Deno.test("f1098.compute: dedm_override=true also suppresses box6 points from schedule_a", () => {
  const result = compute([minimalItem({
    box1_mortgage_interest: 0,
    box6_points_paid: 2_000,
    dedm_override: true,
  })]);
  const schedAFields = fieldsOf(result.outputs, scheduleA);
  assertEquals(schedAFields?.line_8c_points_no_1098, undefined);
});

// ---------------------------------------------------------------------------
// Section 5: Multiple 1098s — aggregation
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: two for_routing=A items — box1 amounts sum to schedule_a", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 9_000 }),
    minimalItem({ box1_mortgage_interest: 5_000 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 14_000);
});

Deno.test("f1098.compute: two for_routing=A items with box4 — net interest sums correctly", () => {
  // (10000 - 500) + (8000 - 200) = 9500 + 7800 = 17300
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10_000, box4_refund_overpaid: 500 }),
    minimalItem({ box1_mortgage_interest: 8_000, box4_refund_overpaid: 200 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 17_300);
});

Deno.test("f1098.compute: two for_routing=A items with box6 — points aggregate to schedule_a line_8c", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 1_000 }),
    minimalItem({ box1_mortgage_interest: 0, box6_points_paid: 1_500 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8c_points_no_1098, 2_500);
});

Deno.test("f1098.compute: two for_routing=E items — box1 amounts sum to schedule_e", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 4_000, for_routing: ForRouting.E }),
    minimalItem({ box1_mortgage_interest: 3_000, for_routing: ForRouting.E }),
  ]);
  const fields = fieldsOf(result.outputs, schedule_e)!;
  assertEquals(fields.mortgage_interest, 7_000);
});

Deno.test("f1098.compute: mixed for_routing=A and E go to separate destinations without cross-contamination", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 6_000, for_routing: ForRouting.A }),
    minimalItem({ box1_mortgage_interest: 4_000, for_routing: ForRouting.E }),
  ]);
  assertEquals(fieldsOf(result.outputs, scheduleA)!.line_8a_mortgage_interest_1098, 6_000);
  assertEquals(fieldsOf(result.outputs, schedule_e)!.mortgage_interest, 4_000);
});

Deno.test("f1098.compute: three for_routing=A items all sum — engine accepts any number of 1098s", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 5_000 }),
    minimalItem({ box1_mortgage_interest: 4_000 }),
    minimalItem({ box1_mortgage_interest: 3_000 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 12_000);
});

Deno.test("f1098.compute: multiple prior-year box4 refunds sum on schedule1 line8z", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10_000, box4_refund_overpaid: 1_000, box4_prior_year_refund: true }),
    minimalItem({ box1_mortgage_interest: 8_000, box4_refund_overpaid: 500, box4_prior_year_refund: true }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 1_500);
});

Deno.test("f1098.compute: multiple prior-year items produce exactly one schedule1 output", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 10_000, box4_refund_overpaid: 1_000, box4_prior_year_refund: true }),
    minimalItem({ box1_mortgage_interest: 8_000, box4_refund_overpaid: 500, box4_prior_year_refund: true }),
  ]);
  const s1Outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

// ---------------------------------------------------------------------------
// Section 6: Informational fields — output count and routing unchanged
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: box2 outstanding_principal is informational — does not change output count", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8_000 })]);
  const withBox2 = compute([minimalItem({ box1_mortgage_interest: 8_000, box2_outstanding_principal: 600_000 })]);
  assertEquals(withBox2.outputs.length, without.outputs.length);
});

Deno.test("f1098.compute: box10_other lender free-text does NOT auto-route to real estate tax line", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 8_000, box10_other: "RE taxes paid: $4200" })]);
  const taxOut = result.outputs.find(
    (o) => (o.fields as Record<string, unknown>).line5b_real_estate_tax !== undefined,
  );
  assertEquals(taxOut, undefined);
});

Deno.test("f1098.compute: qualified_premiums_checkbox=true has no effect for TY2025", () => {
  const without = compute([minimalItem({ box1_mortgage_interest: 8_000, box5_mip: 900 })]);
  const withFlag = compute([minimalItem({ box1_mortgage_interest: 8_000, box5_mip: 900, qualified_premiums_checkbox: true })]);
  assertEquals(withFlag.outputs.length, without.outputs.length);
  // Still no MIP routing
  const mipOut = withFlag.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
});

// ---------------------------------------------------------------------------
// Section 7: Smoke test
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: smoke — comprehensive item routes correctly", () => {
  const result = compute([{
    box1_mortgage_interest: 18_000,
    box2_outstanding_principal: 600_000,
    box3_origination_date: "03/15/2022",
    box4_refund_overpaid: 500,
    box5_mip: 1_800,
    box6_points_paid: 2_400,
    box7_property_address_same: true,
    box9_number_of_properties: 1,
    box10_other: "Homeowner insurance: $1,200",
    qualified_premiums_checkbox: true,
    for_routing: ForRouting.A,
  }]);

  // Net mortgage interest = 18000 - 500 = 17500 → schedule_a line_8a
  const schedAFields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(schedAFields.line_8a_mortgage_interest_1098, 17_500);
  // box6 points → schedule_a line_8c
  assertEquals(schedAFields.line_8c_points_no_1098, 2_400);
  // Box 5 MIP not deductible TY2025 — no MIP in any output
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
  // No schedule_e or schedule_c output (all routed to A)
  assertEquals(findOutput(result, "schedule_e"), undefined);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});
