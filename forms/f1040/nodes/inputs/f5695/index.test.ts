import { assertEquals } from "@std/assert";
import { f5695 } from "./index.ts";

function compute(input: Parameters<typeof f5695.compute>[1]) {
  return f5695.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f5695: empty object is valid — all fields optional", () => {
  const parsed = f5695.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f5695: negative solar_electric_cost rejected", () => {
  const parsed = f5695.inputSchema.safeParse({ solar_electric_cost: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f5695: negative windows_cost rejected", () => {
  const parsed = f5695.inputSchema.safeParse({ windows_cost: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f5695: negative exterior_doors_count rejected", () => {
  const parsed = f5695.inputSchema.safeParse({ exterior_doors_count: -1 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Routing — always produces exactly one form5695 output
// =============================================================================

Deno.test("f5695: empty input produces one form5695 output (pass-through)", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "form5695");
});

Deno.test("f5695: solar cost routes to form5695", () => {
  const result = compute({ solar_electric_cost: 20_000 });
  const out = findOutput(result, "form5695");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, number>).solar_electric_cost, 20_000);
});

Deno.test("f5695: all Part I fields route to form5695", () => {
  const result = compute({
    solar_electric_cost: 10_000,
    solar_water_heater_cost: 5_000,
    fuel_cell_cost: 3_000,
    small_wind_cost: 2_000,
    geothermal_cost: 8_000,
    battery_storage_cost: 4_000,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<string, number>;
  assertEquals(fields.solar_electric_cost, 10_000);
  assertEquals(fields.battery_storage_cost, 4_000);
});

Deno.test("f5695: all Part II fields route to form5695", () => {
  const result = compute({
    windows_cost: 2_000,
    exterior_doors_cost: 1_000,
    exterior_doors_count: 2,
    insulation_cost: 500,
    hvac_cost: 3_000,
    water_heater_cost: 1_500,
    biomass_cost: 4_000,
    energy_audit_cost: 600,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<string, number>;
  assertEquals(fields.windows_cost, 2_000);
  assertEquals(fields.exterior_doors_count, 2);
  assertEquals(fields.biomass_cost, 4_000);
});

// =============================================================================
// 3. Pass-through fidelity — no transformation applied
// =============================================================================

Deno.test("f5695: undefined fields pass as undefined (not zero)", () => {
  const result = compute({ solar_electric_cost: 5_000 });
  const fields = findOutput(result, "form5695")!.fields as Record<string, unknown>;
  assertEquals(fields.solar_electric_cost, 5_000);
  assertEquals(fields.geothermal_cost, undefined);
});
