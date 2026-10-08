import { assertEquals } from "@std/assert";
import { f5695 } from "./index.ts";

function compute(input: Parameters<typeof f5695.compute>[1]) {
  return f5695.compute({ taxYear: 2025, formType: "f1040" }, input);
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

// =============================================================================
// 2. Routing — always produces exactly one form5695 output
// =============================================================================

Deno.test("f5695: empty input produces one form5695 output (pass-through)", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "form5695");
});

Deno.test("f5695: solar cost routes to form5695 with correct value", () => {
  const result = compute({ solar_electric_cost: 20_000 });
  const out = findOutput(result, "form5695");
  assertEquals(
    (out!.fields as Record<string, number>).solar_electric_cost,
    20_000,
  );
});

// =============================================================================
// 3. Part I field pass-through — all fields forwarded with exact values
// =============================================================================

Deno.test("f5695: all Part I fields route to form5695 with exact values", () => {
  const result = compute({
    solar_electric_cost: 10_000,
    solar_water_heater_cost: 5_000,
    fuel_cell_cost: 3_000,
    fuel_cell_kw_capacity: 2,
    small_wind_cost: 2_000,
    geothermal_cost: 8_000,
    battery_storage_cost: 4_000,
    battery_storage_kwh_capacity: 5,
    prior_year_carryforward: 1_000,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    number
  >;
  assertEquals(fields.solar_electric_cost, 10_000);
  assertEquals(fields.solar_water_heater_cost, 5_000);
  assertEquals(fields.fuel_cell_cost, 3_000);
  assertEquals(fields.fuel_cell_kw_capacity, 2);
  assertEquals(fields.small_wind_cost, 2_000);
  assertEquals(fields.geothermal_cost, 8_000);
  assertEquals(fields.battery_storage_cost, 4_000);
  assertEquals(fields.battery_storage_kwh_capacity, 5);
  assertEquals(fields.prior_year_carryforward, 1_000);
});

// =============================================================================
// 4. Part II field pass-through — all fields forwarded with exact values
// =============================================================================

Deno.test("f5695: all Part II fields route to form5695 with exact values", () => {
  const result = compute({
    windows_cost: 2_000,
    exterior_doors_cost: 1_000,
    exterior_doors_count: 2,
    insulation_cost: 500,
    central_ac_cost: 3_000,
    gas_water_heater_cost: 1_500,
    furnace_boiler_cost: 2_000,
    panelboard_cost: 1_200,
    heat_pump_cost: 5_000,
    heat_pump_water_heater_cost: 2_500,
    biomass_cost: 4_000,
    energy_audit_cost: 600,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    number
  >;
  assertEquals(fields.windows_cost, 2_000);
  assertEquals(fields.exterior_doors_cost, 1_000);
  assertEquals(fields.exterior_doors_count, 2);
  assertEquals(fields.insulation_cost, 500);
  assertEquals(fields.central_ac_cost, 3_000);
  assertEquals(fields.gas_water_heater_cost, 1_500);
  assertEquals(fields.furnace_boiler_cost, 2_000);
  assertEquals(fields.panelboard_cost, 1_200);
  assertEquals(fields.heat_pump_cost, 5_000);
  assertEquals(fields.heat_pump_water_heater_cost, 2_500);
  assertEquals(fields.biomass_cost, 4_000);
  assertEquals(fields.energy_audit_cost, 600);
});

Deno.test("f5695: itemized Section A facts reach the calculation node", () => {
  const section = {
    main_home_in_us: true,
    original_user: true,
    five_year_use: true,
    home_address: {
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    related_to_new_home: false,
    exterior_doors: [{ cost: 500, qmid: "A1B2" }],
  };
  const fields =
    findOutput(compute({ part_ii_section_a: section }), "form5695")!.fields;
  assertEquals(fields.part_ii_section_a, section);
});

Deno.test("f5695: itemized Section B facts reach the calculation node", () => {
  const section = {
    home_in_us: true,
    originally_placed_in_service: true,
    home_addresses: [{
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
    central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
  };
  const fields =
    findOutput(compute({ part_ii_section_b: section }), "form5695")!.fields;
  assertEquals(fields.part_ii_section_b, section);
});

Deno.test("f5695: qualified audit facts reach the calculation node", () => {
  const audit = {
    cost: 600,
    main_home_in_us: true,
    written_report: true,
    certified_auditor: true,
  } as const;
  const fields =
    findOutput(compute({ part_ii_energy_audit: audit }), "form5695")!.fields;
  assertEquals(fields.part_ii_energy_audit, audit);
});

// =============================================================================
// 5. Selective pass-through — undefined fields omitted, provided fields exact
// =============================================================================

Deno.test("f5695: only provided fields forwarded — undefined fields absent", () => {
  const result = compute({ solar_electric_cost: 5_000 });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    unknown
  >;
  assertEquals(fields.solar_electric_cost, 5_000);
  assertEquals(fields.geothermal_cost, undefined);
  assertEquals(fields.windows_cost, undefined);
  assertEquals(fields.heat_pump_cost, undefined);
});

Deno.test("f5695: prior_year_carryforward forwarded exactly", () => {
  const result = compute({ prior_year_carryforward: 750 });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    number
  >;
  assertEquals(fields.prior_year_carryforward, 750);
});

Deno.test("f5695: battery_storage_kwh_capacity forwarded for eligibility check downstream", () => {
  // Below 3 kWh threshold — input node forwards the value; form5695 applies the eligibility rule
  const result = compute({
    battery_storage_cost: 2_000,
    battery_storage_kwh_capacity: 1.5,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    number
  >;
  assertEquals(fields.battery_storage_cost, 2_000);
  assertEquals(fields.battery_storage_kwh_capacity, 1.5);
});

Deno.test("f5695: fuel_cell_kw_capacity forwarded for cap computation downstream", () => {
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = compute({
    fuel_cell_cost: 10_000,
    fuel_cell_kw_capacity: 3,
    fuel_cell_home_in_us: true,
    fuel_cell_home_address: home,
    fuel_cell_joint_occupancy: false,
    fuel_cell_total_joint_occupants_paid: undefined,
  });
  const fields = findOutput(result, "form5695")!.fields as Record<
    string,
    unknown
  >;
  assertEquals(fields.fuel_cell_cost, 10_000);
  assertEquals(fields.fuel_cell_kw_capacity, 3);
  assertEquals(fields.fuel_cell_home_in_us, true);
  assertEquals(fields.fuel_cell_home_address, home);
  assertEquals(fields.fuel_cell_joint_occupancy, false);
  assertEquals(fields.fuel_cell_total_joint_occupants_paid, undefined);
});

Deno.test("f5695: joint-occupancy total reaches the calculation node", () => {
  const result = compute({
    fuel_cell_cost: 12_000,
    fuel_cell_kw_capacity: 5,
    fuel_cell_joint_occupancy: true,
    fuel_cell_total_joint_occupants_paid: 20_000,
  });
  const fields = findOutput(result, "form5695")!.fields;
  assertEquals(fields.fuel_cell_total_joint_occupants_paid, 20_000);
});

// =============================================================================
// 6. Output count — exactly one output per compute call
// =============================================================================

Deno.test("f5695: always produces exactly one output regardless of fields provided", () => {
  assertEquals(compute({}).outputs.length, 1);
  assertEquals(compute({ solar_electric_cost: 1_000 }).outputs.length, 1);
  assertEquals(compute({ heat_pump_cost: 5_000 }).outputs.length, 1);
  assertEquals(
    compute({ solar_electric_cost: 10_000, windows_cost: 2_000 }).outputs
      .length,
    1,
  );
});
