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

// ─── Part I — Residential Clean Energy (30%, no cap) ─────────────────────────

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

Deno.test("Part I — fuel cell property: 30% credit", () => {
  const result = compute({ fuel_cell_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 3_000);
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

// ─── Part II — HVAC/Water Heater ─────────────────────────────────────────────

Deno.test("Part II — HVAC: $600 sub-limit", () => {
  // $5,000 HVAC × 30% = $1,500, capped at $600
  const result = compute({ hvac_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

Deno.test("Part II — water heater + HVAC combined: $600 cap", () => {
  // $2,000 HVAC + $1,000 water heater = $3,000 × 30% = $900, capped at $600
  const result = compute({ hvac_cost: 2_000, water_heater_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 600);
});

// ─── Part II — Biomass ────────────────────────────────────────────────────────

Deno.test("Part II — biomass: $2,000 separate cap (not counted toward $1,200)", () => {
  // $8,000 biomass × 30% = $2,400, capped at $2,000
  const result = compute({ biomass_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5_residential_energy, 2_000);
});

Deno.test("Part II — biomass + windows: biomass independent of $1,200 annual cap", () => {
  // Windows: $5,000 × 30% = $1,500, capped at $600
  // Biomass: $8,000 × 30% = $2,400, capped at $2,000
  // Total = $600 + $2,000 = $2,600 (windows counts toward $1,200 cap, biomass does not)
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

Deno.test("Part II — combined exceeds $1,200 annual cap", () => {
  // Windows: $600 + HVAC: $600 + audit: $150 = $1,350 → capped at $1,200
  const result = compute({
    windows_cost: 5_000,     // → $600 (capped)
    hvac_cost: 5_000,        // → $600 (capped)
    energy_audit_cost: 2_000, // → $150 (capped)
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
