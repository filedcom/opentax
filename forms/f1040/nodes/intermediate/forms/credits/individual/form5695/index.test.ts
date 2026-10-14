import { assertEquals, assertThrows } from "@std/assert";
import { form5695 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form5695.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function computeWithSufficientTax(input: Record<string, unknown>) {
  return compute({
    ...input,
    part_i_tax_limit: 1_000_000,
    part_ii_tax_limit: 1_000_000,
  });
}

const fuelCellHome = {
  fuel_cell_home_in_us: true,
  fuel_cell_home_address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  fuel_cell_joint_occupancy: false,
};

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function energyCredit(fields: Record<string, unknown> | undefined): number {
  const clean = fields?.["line5a_residential_clean_energy"];
  const improvement = fields?.["line5b_energy_efficient_home"];
  return (typeof clean === "number" ? clean : 0) +
    (typeof improvement === "number" ? improvement : 0);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = computeWithSufficientTax({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("positive Part I credit requires its tax-liability limit", () => {
  assertThrows(
    () => compute({ solar_electric_cost: 10_000 }),
    Error,
    "Part I needs its tax-liability limit",
  );
});

Deno.test("positive Part II credit requires its tax-liability limit", () => {
  assertThrows(
    () => compute({ insulation_cost: 1_000 }),
    Error,
    "Part II needs its tax-liability limit",
  );
});

Deno.test("Part I and Part II credits are separately limited by tax", () => {
  const result = compute({
    solar_electric_cost: 10_000,
    insulation_cost: 1_000,
    part_i_tax_limit: 1_000,
    part_ii_tax_limit: 200,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.fields.line5a_residential_clean_energy, 1_000);
  assertEquals(s3?.fields.line5b_energy_efficient_home, 200);
});

// ─── Part I — Residential Clean Energy (30%, no annual cap) ──────────────────

Deno.test("Part I — solar electric only: 30% credit", () => {
  const result = computeWithSufficientTax({ solar_electric_cost: 20_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 6_000);
  assertEquals(s3?.fields.line5a_residential_clean_energy, 6_000);
  assertEquals(s3?.fields.line5b_energy_efficient_home, undefined);
});

Deno.test("Part I — solar water heater: 30% credit", () => {
  const result = computeWithSufficientTax({ solar_water_heater_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 1_500);
});

Deno.test("Part I — multiple items combined", () => {
  // Solar $10k + geothermal $15k + battery $8k = $33k × 30% = $9,900
  const result = computeWithSufficientTax({
    solar_electric_cost: 10_000,
    geothermal_cost: 15_000,
    battery_storage_cost: 8_000,
    battery_storage_kwh_capacity: 3,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 9_900);
});

Deno.test("Part I — fuel cell cost without kW capacity is rejected", () => {
  assertThrows(
    () => compute({ fuel_cell_cost: 10_000, ...fuelCellHome }),
    Error,
    "requires kW capacity",
  );
});

Deno.test("Part I — fuel cell: $500/½-kW cap applied when kW capacity provided", () => {
  // 2 kW capacity → cap = $2,000; $10,000 × 30% = $3,000 → capped at $2,000
  const result = computeWithSufficientTax({
    fuel_cell_cost: 10_000,
    fuel_cell_kw_capacity: 2,
    ...fuelCellHome,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_000);
});

Deno.test("Part I — fuel cell: cap not binding when credit is below cap", () => {
  // 5 kW → cap = $5,000; $10,000 × 30% = $3,000 → $3,000 (below cap)
  const result = computeWithSufficientTax({
    fuel_cell_cost: 10_000,
    fuel_cell_kw_capacity: 5,
    ...fuelCellHome,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 3_000);
});

Deno.test("Part I — battery storage: qualifies when kWh capacity ≥ 3 kWh", () => {
  const result = computeWithSufficientTax({
    battery_storage_cost: 5_000,
    battery_storage_kwh_capacity: 3,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 1_500);
});

Deno.test("Part I — battery storage: excluded when kWh capacity < 3 kWh", () => {
  const result = computeWithSufficientTax({
    battery_storage_cost: 5_000,
    battery_storage_kwh_capacity: 2,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("Part I — battery storage without kWh capacity is rejected", () => {
  assertThrows(
    () => compute({ battery_storage_cost: 5_000 }),
    Error,
    "requires kWh capacity",
  );
});

Deno.test("Part I — fuel cell capacity below 0.5 kW is rejected", () => {
  assertThrows(
    () =>
      computeWithSufficientTax({
        fuel_cell_cost: 10_000,
        fuel_cell_kw_capacity: 0,
        ...fuelCellHome,
      }),
    Error,
    "at least 0.5 kW",
  );
});

Deno.test("Part I — fuel cell capacity must be in half-kW increments", () => {
  assertThrows(
    () =>
      computeWithSufficientTax({
        fuel_cell_cost: 10_000,
        fuel_cell_kw_capacity: 0.75,
        ...fuelCellHome,
      }),
    Error,
    "half-kW increments",
  );
});

Deno.test("Part I — fuel cell needs main-home facts and an occupancy answer", () => {
  assertThrows(
    () =>
      computeWithSufficientTax({
        fuel_cell_cost: 1_000,
        fuel_cell_kw_capacity: 1,
      }),
    Error,
    "main-home-in-US",
  );
  assertThrows(
    () =>
      computeWithSufficientTax({
        fuel_cell_cost: 1_000,
        fuel_cell_kw_capacity: 1,
        fuel_cell_home_in_us: true,
        fuel_cell_home_address: fuelCellHome.fuel_cell_home_address,
      }),
    Error,
    "joint-occupancy answer",
  );
});

Deno.test("Part I — prior year carryforward added to credit", () => {
  // $10,000 solar → $3,000 credit + $500 carryforward = $3,500
  const result = computeWithSufficientTax({
    solar_electric_cost: 10_000,
    prior_year_carryforward: 500,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 3_500);
});

Deno.test("Part I joint fuel cell allocates cost and emits a statement", () => {
  const result = computeWithSufficientTax({
    fuel_cell_cost: 12_000,
    fuel_cell_kw_capacity: 5,
    fuel_cell_home_in_us: true,
    fuel_cell_home_address: fuelCellHome.fuel_cell_home_address,
    fuel_cell_joint_occupancy: true,
    fuel_cell_total_joint_occupants_paid: 20_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 3_001);
  assertEquals(
    findOutput(result, "joint_occupancy_statement")?.fields,
    {
      statements: [{
        fuel_cell_properties: [{
          kw_capacity: 5,
          paid: 12_000,
          total_joint_occupants_paid: 20_000,
        }],
      }],
    },
  );
});

Deno.test("Part I joint fuel cell rejects missing or impossible payment shares", () => {
  const claim = {
    fuel_cell_cost: 12_000,
    fuel_cell_kw_capacity: 5,
    fuel_cell_home_in_us: true,
    fuel_cell_home_address: fuelCellHome.fuel_cell_home_address,
    fuel_cell_joint_occupancy: true,
  };
  assertThrows(() => computeWithSufficientTax(claim));
  assertThrows(() =>
    computeWithSufficientTax({
      ...claim,
      fuel_cell_total_joint_occupants_paid: 10_000,
    })
  );
});

Deno.test("Part I — prior year carryforward alone (no current-year costs)", () => {
  const result = computeWithSufficientTax({ prior_year_carryforward: 750 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 750);
});

Deno.test("Part I — no annual cap applies (large amount)", () => {
  // $200,000 solar installation → $60,000 credit (no cap)
  const result = computeWithSufficientTax({ solar_electric_cost: 200_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 60_000);
});

// ─── Part II — Windows/Doors/Insulation ──────────────────────────────────────

Deno.test("Part II — windows: $600 cap applies", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = computeWithSufficientTax({ windows_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 600);
  assertEquals(s3?.fields.line5a_residential_clean_energy, undefined);
  assertEquals(s3?.fields.line5b_energy_efficient_home, 600);
});

Deno.test("Part II itemized Section A applies first-door cap before the total cap", () => {
  const result = compute({
    part_ii_section_a: {
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
      exterior_doors: [
        { cost: 10, qmid: "C3D4" },
        { cost: 5_000, qmid: "A1B2" },
      ],
      windows: [{ cost: 600, qmid: "E5F6" }],
      insulation_cost: 400,
    },
    part_ii_tax_limit: 1_000,
  });
  const s3 = findOutput(result, "schedule3");
  // Doors: $250 + $3, not the old aggregate formula's $500.
  assertEquals(s3?.fields.line5b_energy_efficient_home, 553);
});

Deno.test("Part II joint occupancy allocates property and annual limits from shared payments", () => {
  const result = compute({
    part_ii_joint_occupancy: true,
    part_ii_section_a: {
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
      insulation_cost: 2_000,
      insulation_joint_total_paid: 4_000,
      exterior_doors: [
        { cost: 1_000, qmid: "A1B2", joint_total_paid: 2_000 },
        { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
      ],
      windows: [{ cost: 2_000, qmid: "E5F6", joint_total_paid: 4_000 }],
    },
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      central_air_conditioner: {
        cost: 2_000,
        qmid: "G7H8",
        joint_total_paid: 4_000,
      },
      heat_pump: {
        cost: 5_000,
        qmid: "I9J0",
        joint_total_paid: 10_000,
      },
    },
    part_ii_tax_limit: 10_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 1_600);
  const statement = findOutput(result, "joint_occupancy_statement")?.fields;
  assertEquals(Array.isArray(statement?.statements), true);
});

Deno.test("Part II joint occupancy rejects missing and smaller all-occupant payments", () => {
  const claim = {
    part_ii_joint_occupancy: true,
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
    },
    part_ii_tax_limit: 10_000,
  };
  assertThrows(() => compute(claim));
  assertThrows(() =>
    compute({
      ...claim,
      part_ii_section_b: {
        ...claim.part_ii_section_b,
        central_air_conditioner: {
          cost: 2_000,
          qmid: "A1B2",
          joint_total_paid: 1_000,
        },
      },
    })
  );
});

Deno.test("Part II does not ignore joint totals without a joint-occupancy answer", () => {
  assertThrows(() =>
    compute({
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "A1B2",
          joint_total_paid: 4_000,
        },
      },
      part_ii_tax_limit: 10_000,
    })
  );
});

Deno.test("Part II joint occupancy needs at least one genuinely shared payment", () => {
  assertThrows(() =>
    compute({
      part_ii_joint_occupancy: true,
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "A1B2",
          joint_total_paid: 2_000,
        },
      },
      part_ii_tax_limit: 10_000,
    })
  );
});

Deno.test("Part II joint occupancy allocates water heater and furnace limits separately", () => {
  const result = compute({
    part_ii_joint_occupancy: true,
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      water_heaters: [{
        cost: 2_000,
        qmid: "A1B2",
        joint_total_paid: 4_000,
      }],
      furnace_or_boiler: {
        cost: 2_000,
        qmid: "C3D4",
        joint_total_paid: 4_000,
      },
    },
    part_ii_tax_limit: 10_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 600);
});

Deno.test("Part II joint occupancy allocates the combined central AC limit across overflow units", () => {
  const result = compute({
    part_ii_joint_occupancy: true,
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      central_air_conditioner: {
        cost: 1_000,
        qmid: "A1B2",
        joint_total_paid: 2_000,
      },
      other_central_air_conditioners: [
        { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
        { cost: 1_000, qmid: "E5F6", joint_total_paid: 2_000 },
      ],
    },
    part_ii_tax_limit: 10_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 600);
  const statements = findOutput(result, "joint_occupancy_statement")?.fields
    ?.statements as
      | Array<{
        home_improvements?: Array<{ paid: number; explanation?: string }>;
      }>
      | undefined;
  assertEquals(statements?.[0]?.home_improvements?.[0]?.paid, 1_000);
  assertEquals(statements?.[0]?.home_improvements?.[1]?.paid, 1_000);
  assertEquals(statements?.[0]?.home_improvements?.[2]?.paid, 1_000);
  assertEquals(
    statements?.[0]?.home_improvements?.[0]?.explanation?.includes("line 22d"),
    true,
  );
});

Deno.test("Part II extra QMID units require a primary item", () => {
  assertThrows(
    () =>
      compute({
        part_ii_section_b: {
          home_in_us: true,
          originally_placed_in_service: true,
          home_addresses: [{
            line1: "1 Test Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
          }],
          other_heat_pumps: [{ cost: 1_000, qmid: "A1B2" }],
        },
        part_ii_tax_limit: 10_000,
      }),
    Error,
    "needs its most expensive item",
  );
});

Deno.test("Part II joint occupancy allocates a home energy audit cap", () => {
  const result = compute({
    part_ii_joint_occupancy: true,
    part_ii_energy_audit: {
      cost: 1_000,
      joint_total_paid: 2_000,
      main_home_in_us: true,
      written_report: true,
      certified_auditor: true,
    },
    part_ii_tax_limit: 10_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 75);
});

Deno.test("Part II joint occupancy allocates panelboard and heat pump independently", () => {
  const result = compute({
    part_ii_joint_occupancy: true,
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      panelboard: {
        cost: 2_000,
        joint_total_paid: 4_000,
        qmids: ["A1B2"],
        enabled_property_type_codes: ["E"],
        meets_200_amp_and_nec: true,
        enabled_property_qualified: true,
        enabling_installed_year: 2025,
        enabled_installed_year: 2025,
      },
      heat_pump: {
        cost: 2_000,
        qmid: "C3D4",
        joint_total_paid: 4_000,
      },
    },
    part_ii_tax_limit: 10_000,
  });
  assertEquals(energyCredit(findOutput(result, "schedule3")?.fields), 900);
});

Deno.test("Part II itemized Section A rejects ineligible and mixed flat claims", () => {
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
  assertThrows(
    () =>
      compute({
        part_ii_section_a: { ...section, original_user: false },
        part_ii_tax_limit: 1_000,
      }),
    Error,
    "eligibility",
  );
  assertThrows(
    () =>
      compute({
        part_ii_section_a: section,
        exterior_doors_cost: 500,
        part_ii_tax_limit: 1_000,
      }),
    Error,
    "cannot mix",
  );
});

Deno.test("Part II — windows: below cap", () => {
  // $1,000 × 30% = $300, below $600 cap
  const result = computeWithSufficientTax({ windows_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 300);
});

Deno.test("Part II — 2 exterior doors: $250 each, max $500", () => {
  // 2 doors × $250/door = $500 max, $2,000 × 30% = $600 → capped at $500
  const result = computeWithSufficientTax({
    exterior_doors_cost: 2_000,
    exterior_doors_count: 2,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 500);
});

Deno.test("Part II — 1 exterior door: $250 cap", () => {
  // 1 door × $250 = $250, $600 × 30% = $180 → $180 (below per-door limit)
  const result = computeWithSufficientTax({
    exterior_doors_cost: 600,
    exterior_doors_count: 1,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 180);
});

Deno.test("Part II — insulation: no sub-limit, counts toward $1,200 annual cap", () => {
  // $4,000 × 30% = $1,200, at annual cap
  const result = computeWithSufficientTax({ insulation_cost: 4_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 1_200);
});

// ─── Part II — HVAC items (separate $600 caps each) ──────────────────────────

Deno.test("Part II — central_ac_cost: $600 sub-limit", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = computeWithSufficientTax({ central_ac_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 600);
});

Deno.test("Part II itemized Section B applies standard and heat-pump limits separately", () => {
  const result = compute({
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [{
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
      central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
      water_heaters: [{ cost: 1_000, qmid: "C3D4" }],
      furnace_or_boiler: { cost: 2_000, qmid: "E5F6" },
      heat_pump: { cost: 2_000, qmid: "G7H8" },
      heat_pump_water_heater: { cost: 2_000, qmid: "J9K0" },
      biomass_stove_or_boiler: { cost: 2_000, qmid: "L1M2" },
    },
    part_ii_tax_limit: 3_500,
  });
  const s3 = findOutput(result, "schedule3");
  // Standard 600 + 300 + 600 is capped at 1,200. Heat-pump group is 1,800.
  assertEquals(s3?.fields.line5b_energy_efficient_home, 3_000);
});

Deno.test("Part II itemized Section B rejects ineligible and mixed flat claims", () => {
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
  assertThrows(
    () =>
      compute({
        part_ii_section_b: { ...section, home_in_us: false },
        part_ii_tax_limit: 1_000,
      }),
    Error,
    "eligibility",
  );
  assertThrows(
    () =>
      compute({
        part_ii_section_b: section,
        central_ac_cost: 2_000,
        part_ii_tax_limit: 1_000,
      }),
    Error,
    "cannot mix",
  );
});

Deno.test("Part II panelboard and qualified audit use explicit eligibility facts", () => {
  const section = {
    home_in_us: true,
    originally_placed_in_service: true,
    home_addresses: [{
      line1: "1 Test Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
    central_air_conditioner: { cost: 1_000, qmid: "A1B2" },
    panelboard: {
      cost: 2_000,
      qmids: ["C3D4"],
      enabled_property_type_codes: ["B"],
      meets_200_amp_and_nec: true,
      enabled_property_qualified: true,
      enabling_installed_year: 2025,
      enabled_installed_year: 2025,
    },
  };
  const result = compute({
    part_ii_section_b: section,
    part_ii_energy_audit: {
      cost: 600,
      main_home_in_us: true,
      written_report: true,
      certified_auditor: true,
    },
    part_ii_tax_limit: 2_000,
  });
  assertEquals(
    findOutput(result, "schedule3")?.fields.line5b_energy_efficient_home,
    1_050,
  );
  assertThrows(
    () =>
      compute({
        part_ii_section_b: {
          ...section,
          panelboard: {
            ...section.panelboard,
            enabling_installed_year: 2024,
            enabled_installed_year: 2024,
          },
        },
        part_ii_tax_limit: 2_000,
      }),
    Error,
    "timing",
  );
  assertThrows(
    () =>
      compute({
        part_ii_section_b: {
          ...section,
          panelboard: {
            ...section.panelboard,
            enabled_property_type_codes: ["E"],
          },
        },
        part_ii_tax_limit: 2_000,
      }),
    Error,
    "matching 2025 property",
  );
});

Deno.test("Part II qualified audit can stand alone without line 21 property answers", () => {
  const result = compute({
    part_ii_energy_audit: {
      cost: 600,
      main_home_in_us: true,
      written_report: true,
      certified_auditor: true,
    },
    part_ii_tax_limit: 200,
  });
  assertEquals(
    findOutput(result, "schedule3")?.fields.line5b_energy_efficient_home,
    150,
  );
});

Deno.test("Part II — gas_water_heater_cost: $600 sub-limit", () => {
  // $5,000 × 30% = $1,500, capped at $600
  const result = computeWithSufficientTax({ gas_water_heater_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 600);
});

Deno.test("Part II — furnace_boiler_cost: $600 sub-limit", () => {
  const result = computeWithSufficientTax({ furnace_boiler_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 600);
});

Deno.test("Part II — panelboard_cost: $600 sub-limit", () => {
  const result = computeWithSufficientTax({ panelboard_cost: 5_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 600);
});

Deno.test("Part II — central AC + gas water heater: independent $600 caps", () => {
  // central_ac $2,000 × 30% = $600 (capped) + gas water heater $1,000 × 30% = $300 → $900
  const result = computeWithSufficientTax({
    central_ac_cost: 2_000,
    gas_water_heater_cost: 1_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 900);
});

// ─── Part II — Heat pump + biomass ($2,000 combined cap) ─────────────────────

Deno.test("Part II — heat pump: part of $2,000 combined cap", () => {
  // $10,000 × 30% = $3,000, capped at $2,000
  const result = computeWithSufficientTax({ heat_pump_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_000);
});

Deno.test("Part II — heat pump water heater: part of $2,000 combined cap", () => {
  const result = computeWithSufficientTax({
    heat_pump_water_heater_cost: 8_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_000);
});

Deno.test("Part II — biomass: $2,000 separate cap (not counted toward $1,200)", () => {
  // $8,000 biomass × 30% = $2,400, capped at $2,000
  const result = computeWithSufficientTax({ biomass_cost: 8_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_000);
});

Deno.test("Part II — heat pump + biomass combined under $2,000 cap", () => {
  // heat_pump $4,000 + biomass $8,000 = $12,000 × 30% = $3,600 → capped at $2,000
  const result = computeWithSufficientTax({
    heat_pump_cost: 4_000,
    biomass_cost: 8_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_000);
});

Deno.test("Part II — biomass + windows: biomass independent of $1,200 annual cap", () => {
  // Windows: $5,000 × 30% = $1,500, capped at $600
  // Biomass: $8,000 × 30% = $2,400, capped at $2,000
  // Total = $600 + $2,000 = $2,600
  const result = computeWithSufficientTax({
    windows_cost: 5_000,
    biomass_cost: 8_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 2_600);
});

// ─── Part II — Energy Audit ───────────────────────────────────────────────────

Deno.test("Part II — energy audit: $150 cap", () => {
  // $1,000 × 30% = $300, capped at $150
  const result = computeWithSufficientTax({ energy_audit_cost: 1_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 150);
});

// ─── Annual Cap Enforcement ───────────────────────────────────────────────────

Deno.test("Part II — combined standard items exceed $1,200 annual cap", () => {
  // Windows: $600 + central AC: $600 + audit: $150 = $1,350 → capped at $1,200
  const result = computeWithSufficientTax({
    windows_cost: 5_000, // → $600 (capped)
    central_ac_cost: 5_000, // → $600 (capped)
    energy_audit_cost: 2_000, // → $150 (capped)
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 1_200);
});

// ─── Part I + Part II Combined ────────────────────────────────────────────────

Deno.test("Part I + Part II combined — total of both", () => {
  // Part I: solar $10,000 → $3,000
  // Part II: windows $5,000 → $600 (capped)
  // Total: $3,600
  const result = computeWithSufficientTax({
    solar_electric_cost: 10_000,
    windows_cost: 5_000,
  });
  const s3 = findOutput(result, "schedule3");
  assertEquals(energyCredit(s3?.fields), 3_600);
  assertEquals(s3?.fields.line5a_residential_clean_energy, 3_000);
  assertEquals(s3?.fields.line5b_energy_efficient_home, 600);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes clean-energy credit to Schedule 3 line 5a", () => {
  const result = computeWithSufficientTax({ solar_electric_cost: 10_000 });
  const s3 = findOutput(result, "schedule3");
  assertEquals(s3?.nodeType, "schedule3");
  assertEquals(energyCredit(s3?.fields), 3_000);
});
