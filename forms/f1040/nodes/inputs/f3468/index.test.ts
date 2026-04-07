import { assertEquals, assertAlmostEquals } from "@std/assert";
import { f3468 } from "./index.ts";

function compute(input: Parameters<typeof f3468.compute>[1]) {
  return f3468.compute({ taxYear: 2025 }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_solar_basis", () => {
  const result = f3468.inputSchema.safeParse({ solar_energy_property_basis: -1000 });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_negative_rehab_qre", () => {
  const result = f3468.inputSchema.safeParse({ rehab_certified_historic_qre: -500 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_all_optional_empty_object", () => {
  const result = f3468.inputSchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("schema_accepts_valid_full_input", () => {
  const result = f3468.inputSchema.safeParse({
    rehab_certified_historic_qre: 100000,
    solar_energy_property_basis: 50000,
    fuel_cell_property_basis: 20000,
    fuel_cell_capacity_kw: 10,
    microturbine_property_basis: 15000,
    microturbine_capacity_kw: 30,
    advanced_energy_project_basis: 200000,
    advanced_energy_project_has_doe_allocation: true,
    clean_electricity_basis: 80000,
  });
  assertEquals(result.success, true);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("empty_input_produces_no_output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("all_zero_values_produce_no_output", () => {
  const result = compute({
    solar_energy_property_basis: 0,
    rehab_certified_historic_qre: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── §47 Rehabilitation Credit ─────────────────────────────────────────────────

Deno.test("rehab_certified_historic_20pct", () => {
  // $100,000 × 20% = $20,000
  const result = compute({ rehab_certified_historic_qre: 100_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20_000);
});

Deno.test("rehab_certified_historic_small_amount", () => {
  // $1,000 × 20% = $200
  const result = compute({ rehab_certified_historic_qre: 1_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 200);
});

// ── §48 Energy Credit — Solar ─────────────────────────────────────────────────

Deno.test("solar_energy_property_30pct", () => {
  // $50,000 × 30% = $15,000
  const result = compute({ solar_energy_property_basis: 50_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 15_000);
});

Deno.test("fiber_optic_solar_30pct", () => {
  // $20,000 × 30% = $6,000
  const result = compute({ fiber_optic_solar_basis: 20_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 6_000);
});

// ── §48 Energy Credit — Fuel Cell ─────────────────────────────────────────────

Deno.test("fuel_cell_30pct_no_cap_when_no_capacity", () => {
  // $10,000 × 30% = $3,000 (no capacity → no cap)
  const result = compute({ fuel_cell_property_basis: 10_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3_000);
});

Deno.test("fuel_cell_rate_equals_cap_boundary", () => {
  // basis=$100,000 → 30% = $30,000
  // cap: 10 kW / 0.5 × $1,500 = 20 × $1,500 = $30,000
  // min($30,000, $30,000) = $30,000 — cap exactly meets rate (boundary case)
  const result = compute({ fuel_cell_property_basis: 100_000, fuel_cell_capacity_kw: 10 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 30_000);
});

Deno.test("fuel_cell_cap_lower_than_rate", () => {
  // basis=$200,000 → 30% = $60,000
  // cap: 5 kW / 0.5 × $1,500 = 10 × $1,500 = $15,000
  // min($60,000, $15,000) = $15,000
  const result = compute({ fuel_cell_property_basis: 200_000, fuel_cell_capacity_kw: 5 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 15_000);
});

// ── §48 Energy Credit — Microturbine ─────────────────────────────────────────

Deno.test("microturbine_10pct_no_cap_when_no_capacity", () => {
  // $50,000 × 10% = $5,000
  const result = compute({ microturbine_property_basis: 50_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5_000);
});

Deno.test("microturbine_capped_by_capacity", () => {
  // basis=$100,000 → 10% = $10,000
  // cap: 30 kW × $200 = $6,000
  // min($10,000, $6,000) = $6,000
  const result = compute({ microturbine_property_basis: 100_000, microturbine_capacity_kw: 30 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 6_000);
});

Deno.test("microturbine_rate_lower_than_cap", () => {
  // basis=$10,000 → 10% = $1,000
  // cap: 100 kW × $200 = $20,000
  // min($1,000, $20,000) = $1,000
  const result = compute({ microturbine_property_basis: 10_000, microturbine_capacity_kw: 100 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1_000);
});

// ── §48 Energy Credit — Other Property Types ─────────────────────────────────

Deno.test("small_wind_30pct", () => {
  const result = compute({ small_wind_property_basis: 40_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 12_000);
});

Deno.test("geothermal_heat_pump_10pct", () => {
  const result = compute({ geothermal_heat_pump_basis: 30_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3_000);
});

Deno.test("chp_property_10pct", () => {
  const result = compute({ chp_property_basis: 80_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 8_000);
});

Deno.test("waste_energy_recovery_20pct", () => {
  const result = compute({ waste_energy_recovery_basis: 60_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 12_000);
});

Deno.test("offshore_wind_30pct", () => {
  const result = compute({ offshore_wind_basis: 500_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 150_000);
});

// ── §48C Advanced Energy Project ─────────────────────────────────────────────

Deno.test("advanced_energy_without_doe_allocation_no_credit", () => {
  const result = compute({
    advanced_energy_project_basis: 500_000,
    advanced_energy_project_has_doe_allocation: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("advanced_energy_without_doe_flag_no_credit", () => {
  // No doe flag means no credit
  const result = compute({ advanced_energy_project_basis: 500_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("advanced_energy_with_doe_allocation_30pct", () => {
  // $200,000 × 30% = $60,000
  const result = compute({
    advanced_energy_project_basis: 200_000,
    advanced_energy_project_has_doe_allocation: true,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 60_000);
});

// ── §48E Clean Electricity ────────────────────────────────────────────────────

Deno.test("clean_electricity_30pct", () => {
  // $100,000 × 30% = $30,000
  const result = compute({ clean_electricity_basis: 100_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 30_000);
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_components_sum_correctly", () => {
  // solar: $50,000 × 30% = $15,000
  // rehab: $100,000 × 20% = $20,000
  // geothermal: $30,000 × 10% = $3,000
  // total = $38,000
  const result = compute({
    solar_energy_property_basis: 50_000,
    rehab_certified_historic_qre: 100_000,
    geothermal_heat_pump_basis: 30_000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 38_000);
});

Deno.test("all_components_aggregate_to_single_schedule3_output", () => {
  const result = compute({
    rehab_certified_historic_qre: 100_000,   // 20% = 20,000
    solar_energy_property_basis: 50_000,      // 30% = 15,000
    small_wind_property_basis: 10_000,        // 30% = 3,000
    clean_electricity_basis: 100_000,         // 30% = 30,000
    advanced_energy_project_basis: 100_000,
    advanced_energy_project_has_doe_allocation: true, // 30% = 30,000
  });
  // total = 20,000 + 15,000 + 3,000 + 30,000 + 30,000 = 98,000
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertAlmostEquals(result.outputs[0]?.fields.line6z_general_business_credit as number, 98_000);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("routes_to_schedule3_node_type", () => {
  const result = compute({ solar_energy_property_basis: 10_000 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

Deno.test("credit_uses_line6z_field", () => {
  // $10,000 × 30% = $3,000
  const result = compute({ solar_energy_property_basis: 10_000 });
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit, 3_000);
});

Deno.test("produces_exactly_one_output_for_multiple_credits", () => {
  const result = compute({
    solar_energy_property_basis: 10_000,
    geothermal_heat_pump_basis: 20_000,
  });
  assertEquals(result.outputs.length, 1);
});
