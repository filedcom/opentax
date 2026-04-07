import { assertEquals } from "@std/assert";
import { f4255, RecaptureReason } from "./index.ts";

// Array harness — one entry per property
function compute(items: Parameters<typeof f4255.compute>[1]["properties"]) {
  return f4255.compute({ taxYear: 2025 }, { properties: items });
}

function findSchedule2(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule2");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_original_credit", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{ original_credit_amount: -1000, year_of_recapture: 1 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_year_of_recapture_zero", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{ original_credit_amount: 1000, year_of_recapture: 0 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_year_of_recapture_six", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{ original_credit_amount: 1000, year_of_recapture: 6 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_empty_properties_array", () => {
  const result = f4255.inputSchema.safeParse({ properties: [] });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_negative_override", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{ original_credit_amount: 1000, year_of_recapture: 1, recapture_amount_override: -1 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_minimal_valid_item", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{ original_credit_amount: 5000, year_of_recapture: 3 }],
  });
  assertEquals(result.success, true);
});

Deno.test("schema_accepts_full_item_with_all_fields", () => {
  const result = f4255.inputSchema.safeParse({
    properties: [{
      description: "Solar panels",
      date_placed_in_service: "2021-06-15",
      original_credit_amount: 10000,
      year_of_recapture: 2,
      recapture_reason: RecaptureReason.Disposed,
      recapture_amount_override: 8000,
    }],
  });
  assertEquals(result.success, true);
});

// ── Recapture Percentages — §50(a) ───────────────────────────────────────────

Deno.test("year1_recapture_is_100_percent", () => {
  const result = compute([{ original_credit_amount: 10000, year_of_recapture: 1 }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 10000);
});

Deno.test("year2_recapture_is_80_percent", () => {
  const result = compute([{ original_credit_amount: 10000, year_of_recapture: 2 }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 8000);
});

Deno.test("year3_recapture_is_60_percent", () => {
  const result = compute([{ original_credit_amount: 10000, year_of_recapture: 3 }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 6000);
});

Deno.test("year4_recapture_is_40_percent", () => {
  const result = compute([{ original_credit_amount: 10000, year_of_recapture: 4 }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 4000);
});

Deno.test("year5_recapture_is_20_percent", () => {
  const result = compute([{ original_credit_amount: 10000, year_of_recapture: 5 }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 2000);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("zero_original_credit_produces_no_output", () => {
  const result = compute([{ original_credit_amount: 0, year_of_recapture: 1 }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("override_zero_produces_no_output", () => {
  const result = compute([{
    original_credit_amount: 10000,
    year_of_recapture: 1,
    recapture_amount_override: 0,
  }]);
  assertEquals(result.outputs.length, 0);
});

// ── Override ──────────────────────────────────────────────────────────────────

Deno.test("override_is_used_instead_of_computed_amount", () => {
  const result = compute([{
    original_credit_amount: 10000,
    year_of_recapture: 1,   // would compute 10000 without override
    recapture_amount_override: 7500,
  }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 7500);
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_properties_aggregate", () => {
  const result = compute([
    { original_credit_amount: 10000, year_of_recapture: 1 }, // 10000
    { original_credit_amount: 5000,  year_of_recapture: 3 }, //  3000
    { original_credit_amount: 2000,  year_of_recapture: 5 }, //   400
  ]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 13400);
});

Deno.test("all_zero_properties_produce_no_output", () => {
  const result = compute([
    { original_credit_amount: 0, year_of_recapture: 1 },
    { original_credit_amount: 0, year_of_recapture: 2 },
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── Output Routing ────────────────────────────────────────────────────────────

Deno.test("output_routes_to_schedule2", () => {
  const result = compute([{ original_credit_amount: 5000, year_of_recapture: 2 }]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule2");
});

Deno.test("output_field_line17a_investment_credit_recapture_has_correct_value", () => {
  const result = compute([{ original_credit_amount: 5000, year_of_recapture: 2 }]);
  const s2 = findSchedule2(result);
  // year 2 = 80% of 5000 = 4000
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 4000);
});

// ── Smoke Test ────────────────────────────────────────────────────────────────

Deno.test("smoke_test_realistic_solar_panel_recapture", () => {
  // Taxpayer claimed $12,000 investment credit on solar panels placed in service 2022.
  // Sold the property in 2024 (year 3 of recapture period). 60% recaptured.
  const result = compute([{
    description: "Rooftop solar array",
    date_placed_in_service: "2022-04-01",
    original_credit_amount: 12000,
    year_of_recapture: 3,
    recapture_reason: RecaptureReason.Disposed,
  }]);
  const s2 = findSchedule2(result);
  assertEquals(s2?.fields.line17a_investment_credit_recapture, 7200);
});
