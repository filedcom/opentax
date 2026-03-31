import { assertEquals } from "@std/assert";
import { form5695 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form5695.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Part I — Residential Clean Energy (30%, no annual cap) ──────────────────

Deno.test("Part I — solar electric only: 30% credit", () => {
  const result = compute({ solar_electric_cost: 20_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 6_000);
});

Deno.test("Part I — solar water heater: 30% credit", () => {
  const result = compute({ solar_water_heater_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 1_500);
});

Deno.test("Part I — multiple items combined", () => {
  // Solar $10k + geothermal $15k + battery $8k = $33k × 30% = $9,900
  const result = compute({
    solar_electric_cost: 10_000,
    geothermal_cost: 15_000,
    battery_storage_cost: 8_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 9_900);
});

Deno.test("Part I — fuel cell property: 30% credit (no kW capacity provided)", () => {
  const result = compute({ fuel_cell_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 3_000);
});

Deno.test("Part I — fuel cell: $500/½-kW cap applied when kW capacity provided", () => {
  // 2 kW capacity → cap = $2,000; $10,000 × 30% = $3,000 → capped at $2,000
  const result = compute({ fuel_cell_cost: 10_000, fuel_cell_kw_capacity: 2 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part I — fuel cell: cap not binding when credit is below cap", () => {
  // 5 kW → cap = $5,000; $10,000 × 30% = $3,000 → $3,000 (below cap)
  const result = compute({ fuel_cell_cost: 10_000, fuel_cell_kw_capacity: 5 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 3_000);
});

Deno.test("Part I — battery storage: qualifies when kWh capacity ≥ 3 kWh", () => {
  const result = compute({ battery_storage_cost: 5_000, battery_storage_kwh_capacity: 3 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 1_500);
});

Deno.test("Part I — battery storage: excluded when kWh capacity < 3 kWh", () => {
  const result = compute({ battery_storage_cost: 5_000, battery_storage_kwh_capacity: 2 });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("Part I — battery storage: qualifies when kWh capacity not provided (no threshold check)", () => {
  const result = compute({ battery_storage_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 1_500);
});

Deno.test("Part I — prior year carryforward added to credit", () => {
  // $10,000 solar → $3,000 credit + $500 carryforward = $3,500
  const result = compute({ solar_electric_cost: 10_000, prior_year_carryforward: 500 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 3_500);
});

Deno.test("Part I — prior year carryforward alone (no current-year costs)", () => {
  const result = compute({ prior_year_carryforward: 750 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 750);
});

Deno.test("Part I — no annual cap applies (large amount)", () => {
  // $200,000 solar installation → $60,000 credit (no cap)
  const result = compute({ solar_electric_cost: 200_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 60_000);
});

// ─── Part II — Windows/Doors/Insulation ──────────────────────────────────────

Deno.test("Part II — windows: $600 cap applies", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = compute({ windows_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — windows: below cap", () => {
  // $1,000 × 30% = $300, below $600 cap
  const result = compute({ windows_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 300);
});

Deno.test("Part II — 2 exterior doors: $250 each, max $500", () => {
  // 2 doors × $250/door = $500 max, $2,000 × 30% = $600 → capped at $500
  const result = compute({ exterior_doors_cost: 2_000, exterior_doors_count: 2 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 500);
});

Deno.test("Part II — 1 exterior door: $250 cap", () => {
  // 1 door × $250 = $250, $600 × 30% = $180 → $180 (below per-door limit)
  const result = compute({ exterior_doors_cost: 600, exterior_doors_count: 1 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 180);
});

Deno.test("Part II — insulation: no sub-limit, counts toward $1,200 annual cap", () => {
  // $4,000 × 30% = $1,200, at annual cap
  const result = compute({ insulation_cost: 4_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 1_200);
});

// ─── Part II — HVAC items (separate $600 caps each) ──────────────────────────

Deno.test("Part II — central_ac_cost: $600 sub-limit", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = compute({ central_ac_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — gas_water_heater_cost: $600 sub-limit", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = compute({ gas_water_heater_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — furnace_boiler_cost: $600 sub-limit", () => {
  const result = compute({ furnace_boiler_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — panelboard_cost: $600 sub-limit", () => {
  const result = compute({ panelboard_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — central AC + gas water heater: independent $600 caps", () => {
  // central_ac $2,000 × 30% = $600 (capped) + gas water heater $1,000 × 30% = $300 → $900
  const result = compute({ central_ac_cost: 2_000, gas_water_heater_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 900);
});

// ─── Part II — Heat pump + biomass ($2,000 combined cap) ─────────────────────

Deno.test("Part II — heat pump: part of $2,000 combined cap", () => {
  // $10,000 × 30% = $3,000, capped at $2,000
  const result = compute({ heat_pump_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part II — heat pump water heater: part of $2,000 combined cap", () => {
  const result = compute({ heat_pump_water_heater_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part II — biomass: $2,000 separate cap (not counted toward $1,200)", () => {
  // $8,000 biomass × 30% = $2,400, capped at $2,000
  const result = compute({ biomass_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part II — heat pump + biomass combined under $2,000 cap", () => {
  // heat_pump $4,000 + biomass $8,000 = $12,000 × 30% = $3,600 → capped at $2,000
  const result = compute({ heat_pump_cost: 4_000, biomass_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part II — biomass + windows: biomass independent of $1,200 annual cap", () => {
  // Windows: $5,000 × 30% = $1,500, capped at $600
  // Biomass: $8,000 × 30% = $2,400, capped at $2,000
  // Total = $600 + $2,000 = $2,600
  const result = compute({ windows_cost: 5_000, biomass_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_600);
});

// ─── Part II — Energy Audit ───────────────────────────────────────────────────

Deno.test("Part II — energy audit: $150 cap", () => {
  // $1,000 × 30% = $300, capped at $150
  const result = compute({ energy_audit_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 150);
});

// ─── Annual Cap Enforcement ───────────────────────────────────────────────────

Deno.test("Part II — combined standard items exceed $1,200 annual cap", () => {
  // Windows: $600 + central AC: $600 + audit: $150 = $1,350 → capped at $1,200
  const result = compute({
    windows_cost: 5_000,       // → $600 (capped)
    central_ac_cost: 5_000,    // → $600 (capped)
    energy_audit_cost: 2_000,  // → $150 (capped)
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 1_200);
});

// ─── Part I + Part II Combined ────────────────────────────────────────────────

Deno.test("Part I + Part II combined — total of both", () => {
  // Part I: solar $10,000 → $3,000
  // Part II: windows $5,000 → $600 (capped)
  // Total: $3,600
  const result = compute({
    solar_electric_cost: 10_000,
    windows_cost: 5_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 3_600);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule3 line5_residential_energy", () => {
  const result = compute({ solar_electric_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3 !== undefined, true);
  assertEquals("line5_residential_energy" in (s3?.fields ?? {}), true);
});
