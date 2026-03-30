import { assertEquals } from "@std/assert";
import { f7207, ComponentType } from "./index.ts";

function compute(input: Parameters<typeof f7207.compute>[0]) {
  return f7207.compute(input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_quantity", () => {
  const result = f7207.inputSchema.safeParse({
    components: [{ component_type: ComponentType.SolarModule, quantity: -100 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_empty_components", () => {
  const result = f7207.inputSchema.safeParse({ components: [] });
  assertEquals(result.success, true);
});

// ── Zero Cases ────────────────────────────────────────────────────────────────

Deno.test("no_components_produces_no_output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_quantity_produces_no_output", () => {
  const result = compute({ components: [{ component_type: ComponentType.SolarModule, quantity: 0 }] });
  assertEquals(result.outputs.length, 0);
});

// ── Solar Components ─────────────────────────────────────────────────────────

Deno.test("solar_module_007_per_watt", () => {
  // 1,000,000 W × $0.07 = $70,000
  const result = compute({ components: [{ component_type: ComponentType.SolarModule, quantity: 1_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 70000);
});

Deno.test("solar_cell_004_per_watt", () => {
  // 1,000,000 W × $0.04 = $40,000
  const result = compute({ components: [{ component_type: ComponentType.SolarCell, quantity: 1_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 40000);
});

Deno.test("thin_film_solar_cell_004_per_watt", () => {
  const result = compute({ components: [{ component_type: ComponentType.ThinFilmSolarCell, quantity: 500_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20000);
});

// ── Wind Components ───────────────────────────────────────────────────────────

Deno.test("wind_nacelle_005_per_watt", () => {
  // 2,000,000 W × $0.05 = $100,000
  const result = compute({ components: [{ component_type: ComponentType.WindNacelle, quantity: 2_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 100000);
});

Deno.test("wind_blade_002_per_watt", () => {
  const result = compute({ components: [{ component_type: ComponentType.WindBlade, quantity: 1_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20000);
});

Deno.test("wind_tower_003_per_watt", () => {
  const result = compute({ components: [{ component_type: ComponentType.WindTower, quantity: 1_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 30000);
});

// ── Battery Module ────────────────────────────────────────────────────────────

Deno.test("battery_module_00035_per_wh", () => {
  // 1,000,000 Wh × $0.0035 = $3,500
  const result = compute({ components: [{ component_type: ComponentType.BatteryModule, quantity: 1_000_000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 3500);
});

// ── Critical Minerals ─────────────────────────────────────────────────────────

Deno.test("critical_mineral_10pct_of_production_cost", () => {
  // $100k production cost × 10% = $10,000
  const result = compute({ components: [{ component_type: ComponentType.CriticalMineralOther, quantity: 100000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 10000);
});

// ── Credit Rate Override ──────────────────────────────────────────────────────

Deno.test("credit_rate_override_used_when_provided", () => {
  // Override to $0.05/W instead of default $0.07
  const result = compute({
    components: [{ component_type: ComponentType.SolarModule, quantity: 1_000_000, credit_rate_override: 0.05 }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_component_types_aggregate", () => {
  // Solar module 1MW × $0.07 = $70,000 + Battery 1MWh × $0.0035 = $3,500 → $73,500
  const result = compute({
    components: [
      { component_type: ComponentType.SolarModule, quantity: 1_000_000 },
      { component_type: ComponentType.BatteryModule, quantity: 1_000_000 },
    ],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 73500);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({ components: [{ component_type: ComponentType.SolarModule, quantity: 100000 }] });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
