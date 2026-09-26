import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import {
  calculatedFuelCellAllocation,
  calculatedHomeImprovementCredit,
  type FuelCell,
  fuelCellSchema,
  type HomeImprovement,
  HomeImprovementKind,
  jointOccupancyStatementNode,
} from "../joint_occupancy_statement/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §25C, §25D) ───────────────────────────────────────

// Part I — Residential Clean Energy Credit (IRC §25D)
const PART_I_RATE = 0.30;
// Fuel cell: $500 per ½ kW capacity = $1,000/kW (§25D(b)(1))
const FUEL_CELL_CAP_PER_KW = 1_000;
// Battery storage must be ≥3 kWh to qualify (§25D(d)(7))
const BATTERY_MIN_KWH = 3;

// Part II — Energy Efficient Home Improvement Credit (IRC §25C)
const PART_II_RATE = 0.30;
// Overall annual cap for standard items (§25C(b)(1)(A))
const PART_II_ANNUAL_CAP = 1_200;
// Per-item cap: windows, central AC, gas water heater, furnace/boiler, panelboard (§25C(b)(1)(B))
const PER_ITEM_CAP = 600;
// Exterior doors: $250/door, $500 total (§25C(b)(3)(B))
const EXTERIOR_DOOR_PER_DOOR_CAP = 250;
const EXTERIOR_DOOR_TOTAL_CAP = 500;
// Home energy audit (§25C(b)(4))
const ENERGY_AUDIT_CAP = 150;
// Heat pump + heat pump water heater + biomass combined (§25C(b)(2))
const HEAT_PUMP_BIOMASS_CAP = 2_000;

const itemWithQmidSchema = z.object({
  cost: z.number().positive(),
  qmid: z.string().regex(/^[A-Z][0-9][A-Z][0-9]$/),
  joint_total_paid: z.number().positive().optional(),
});
const qmidSchema = z.string().regex(/^[A-Z][0-9][A-Z][0-9]$/);

export const sectionASchema = z.object({
  main_home_in_us: z.boolean(),
  original_user: z.boolean(),
  five_year_use: z.boolean(),
  home_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }),
  related_to_new_home: z.boolean(),
  insulation_cost: z.number().nonnegative().optional(),
  insulation_joint_total_paid: z.number().positive().optional(),
  exterior_doors: z.array(itemWithQmidSchema).optional(),
  windows: z.array(itemWithQmidSchema).optional(),
});

export const sectionBSchema = z.object({
  home_in_us: z.boolean(),
  originally_placed_in_service: z.boolean(),
  home_addresses: z.array(z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  })).min(1).max(4),
  central_air_conditioner: itemWithQmidSchema.optional(),
  other_central_air_conditioners: z.array(itemWithQmidSchema).optional(),
  water_heaters: z.array(itemWithQmidSchema).optional(),
  furnace_or_boiler: itemWithQmidSchema.optional(),
  other_furnaces_or_boilers: z.array(itemWithQmidSchema).optional(),
  heat_pump: itemWithQmidSchema.optional(),
  other_heat_pumps: z.array(itemWithQmidSchema).optional(),
  heat_pump_water_heater: itemWithQmidSchema.optional(),
  other_heat_pump_water_heaters: z.array(itemWithQmidSchema).optional(),
  biomass_stove_or_boiler: itemWithQmidSchema.optional(),
  other_biomass_stoves_or_boilers: z.array(itemWithQmidSchema).optional(),
  panelboard: z.object({
    cost: z.number().positive(),
    joint_total_paid: z.number().positive().optional(),
    qmids: z.array(qmidSchema).min(1).max(2),
    enabled_property_type_codes: z.array(
      z.enum(["A", "B", "C", "D", "E", "F", "G"]),
    )
      .min(1).max(7),
    meets_200_amp_and_nec: z.literal(true),
    enabled_property_qualified: z.literal(true),
    enabling_installed_year: z.union([z.literal(2024), z.literal(2025)]),
    enabled_installed_year: z.union([z.literal(2024), z.literal(2025)]),
  }).optional(),
});

export const energyAuditSchema = z.object({
  cost: z.number().positive(),
  joint_total_paid: z.number().positive().optional(),
  main_home_in_us: z.literal(true),
  written_report: z.literal(true),
  certified_auditor: z.literal(true),
});

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  part_i_home_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).optional(),
  part_i_tax_limit: z.number().nonnegative().optional(),
  part_ii_tax_limit: z.number().nonnegative().optional(),
  part_ii_joint_occupancy: z.boolean().optional(),
  // ── Part I — Residential Clean Energy (IRC §25D) ──────────────────────────
  // Solar electric property (§25D(a)(1))
  solar_electric_cost: z.number().nonnegative().optional(),
  // Solar water heating property (§25D(a)(2))
  solar_water_heater_cost: z.number().nonnegative().optional(),
  // Fuel cell property (§25D(a)(5))
  fuel_cell_cost: z.number().nonnegative().optional(),
  // Fuel cell kilowatt capacity — used to apply $500/½-kW dollar cap (§25D(b)(1))
  fuel_cell_kw_capacity: z.number().nonnegative().optional(),
  fuel_cell_home_in_us: z.boolean().optional(),
  fuel_cell_home_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).optional(),
  fuel_cell_joint_occupancy: z.boolean().optional(),
  fuel_cell_total_joint_occupants_paid: z.number().int().positive().optional(),
  // Small wind energy property (§25D(a)(3))
  small_wind_cost: z.number().nonnegative().optional(),
  // Geothermal heat pump property (§25D(a)(4))
  geothermal_cost: z.number().nonnegative().optional(),
  // Battery storage technology (§25D(d)(7))
  battery_storage_cost: z.number().nonnegative().optional(),
  // Battery storage capacity in kWh — must be ≥3 kWh to qualify (§25D(d)(7))
  battery_storage_kwh_capacity: z.number().nonnegative().optional(),
  // Unused §25D credit carried forward from prior year (§25D(c))
  prior_year_carryforward: z.number().nonnegative().optional(),

  // ── Part II — Energy Efficient Home Improvement (IRC §25C) ────────────────
  part_ii_section_a: sectionASchema.optional(),
  part_ii_section_b: sectionBSchema.optional(),
  part_ii_energy_audit: energyAuditSchema.optional(),
  // Windows/skylights (§25C(c)(2)(B); $600 cap)
  windows_cost: z.number().nonnegative().optional(),
  // Exterior doors (§25C(c)(2)(A); $250/door, $500 total)
  exterior_doors_cost: z.number().nonnegative().optional(),
  // Number of exterior doors (for per-door $250 cap)
  exterior_doors_count: z.number().int().nonnegative().optional(),
  // Insulation/air sealing (§25C(c)(1); counts toward $1,200 annual cap)
  insulation_cost: z.number().nonnegative().optional(),
  // Central air conditioner (§25C(d)(1); $600 cap)
  central_ac_cost: z.number().nonnegative().optional(),
  // Natural gas/propane/oil water heater (§25C(d)(2); $600 cap)
  gas_water_heater_cost: z.number().nonnegative().optional(),
  // Gas/propane/oil furnace or hot water boiler (§25C(d)(3); $600 cap)
  furnace_boiler_cost: z.number().nonnegative().optional(),
  // Panelboard/subpanelboard enabling property (§25C(d)(5); $600 cap)
  panelboard_cost: z.number().nonnegative().optional(),
  // Electric/natural gas heat pump (§25C(d)(4); part of $2,000 combined cap)
  heat_pump_cost: z.number().nonnegative().optional(),
  // Heat pump water heater (§25C(d)(4); part of $2,000 combined cap)
  heat_pump_water_heater_cost: z.number().nonnegative().optional(),
  // Biomass stove/boiler (§25C(d)(6); part of $2,000 combined cap)
  biomass_cost: z.number().nonnegative().optional(),
  // Home energy audit (§25C(b)(4); $150 cap)
  energy_audit_cost: z.number().nonnegative().optional(),
});

export type Form5695Input = z.infer<typeof inputSchema>;

type SectionBItem = z.infer<typeof itemWithQmidSchema>;

function qualifiedItems(
  primary: SectionBItem | undefined,
  others: ReadonlyArray<SectionBItem> | undefined,
  label: string,
): SectionBItem[] {
  if ((others?.length ?? 0) > 0 && !primary) {
    throw new Error(`Form 5695 ${label} needs its most expensive item`);
  }
  return [...(primary ? [primary] : []), ...(others ?? [])].sort((a, b) =>
    b.cost - a.cost
  );
}

export function sectionBQualifiedItems(
  section: Form5695Input["part_ii_section_b"],
) {
  return {
    centralAirConditioners: qualifiedItems(
      section?.central_air_conditioner,
      section?.other_central_air_conditioners,
      "central air conditioners",
    ),
    waterHeaters: [...(section?.water_heaters ?? [])].sort((a, b) =>
      b.cost - a.cost
    ),
    furnacesOrBoilers: qualifiedItems(
      section?.furnace_or_boiler,
      section?.other_furnaces_or_boilers,
      "furnaces or boilers",
    ),
    heatPumps: qualifiedItems(
      section?.heat_pump,
      section?.other_heat_pumps,
      "heat pumps",
    ),
    heatPumpWaterHeaters: qualifiedItems(
      section?.heat_pump_water_heater,
      section?.other_heat_pump_water_heaters,
      "heat pump water heaters",
    ),
    biomassStovesOrBoilers: qualifiedItems(
      section?.biomass_stove_or_boiler,
      section?.other_biomass_stoves_or_boilers,
      "biomass stoves or boilers",
    ),
  };
}

// ─── Part I Helpers ───────────────────────────────────────────────────────────

function eligibleBatteryCost(
  cost: number | undefined,
  kwhCapacity: number | undefined,
): number {
  if (cost === undefined) return 0;
  if (cost > 0 && kwhCapacity === undefined) {
    throw new Error("Form 5695 battery storage cost requires kWh capacity");
  }
  if ((kwhCapacity ?? 0) < BATTERY_MIN_KWH) return 0;
  return cost;
}

function fuelCellCredit(
  cost: number | undefined,
  kwCapacity: number | undefined,
): number {
  if (!cost) return 0;
  if (kwCapacity === undefined) {
    throw new Error("Form 5695 fuel cell cost requires kW capacity");
  }
  if (kwCapacity < 0.5 || !Number.isInteger(kwCapacity * 2)) {
    throw new Error(
      "Form 5695 fuel cell capacity must be at least 0.5 kW in half-kW increments",
    );
  }
  const credit = Math.round(cost * PART_I_RATE);
  return Math.min(credit, Math.round(kwCapacity * FUEL_CELL_CAP_PER_KW));
}

function jointFuelCell(input: Form5695Input): FuelCell | undefined {
  if (!input.fuel_cell_joint_occupancy) {
    if (input.fuel_cell_total_joint_occupants_paid !== undefined) {
      throw new Error(
        "Form 5695 total joint-occupant payment requires joint occupancy",
      );
    }
    return undefined;
  }
  if (
    !input.fuel_cell_cost || !input.fuel_cell_kw_capacity ||
    !input.fuel_cell_total_joint_occupants_paid
  ) {
    throw new Error(
      "Form 5695 joint-occupancy fuel cell claim needs filer cost, kW capacity, and all-occupant payments",
    );
  }
  return fuelCellSchema.parse({
    kw_capacity: input.fuel_cell_kw_capacity,
    paid: input.fuel_cell_cost,
    total_joint_occupants_paid: input.fuel_cell_total_joint_occupants_paid,
  });
}

export function computeForm5695PartIAmounts(input: Form5695Input) {
  const jointCell = jointFuelCell(input);
  if ((input.fuel_cell_cost ?? 0) > 0) {
    if (input.fuel_cell_home_in_us !== true || !input.fuel_cell_home_address) {
      throw new Error(
        "Form 5695 fuel cell claim needs an affirmative main-home-in-US answer and address",
      );
    }
    if (input.fuel_cell_joint_occupancy === undefined) {
      throw new Error(
        "Form 5695 fuel cell claim needs its joint-occupancy answer",
      );
    }
  }
  const batteryCost = eligibleBatteryCost(
    input.battery_storage_cost,
    input.battery_storage_kwh_capacity,
  );
  const otherCost = (input.solar_electric_cost ?? 0) +
    (input.solar_water_heater_cost ?? 0) +
    (input.small_wind_cost ?? 0) +
    (input.geothermal_cost ?? 0) +
    batteryCost;
  const otherCredit = Math.round(otherCost * PART_I_RATE);
  const fuelCellCost = jointCell
    ? calculatedFuelCellAllocation(jointCell).allocatedCost
    : input.fuel_cell_cost ?? 0;
  const fcCredit = fuelCellCredit(
    fuelCellCost,
    input.fuel_cell_kw_capacity,
  );
  const carryforward = input.prior_year_carryforward ?? 0;
  const available = otherCredit + fcCredit + carryforward;
  if (available > 0 && input.part_i_tax_limit === undefined) {
    throw new Error("Form 5695 Part I needs its tax-liability limit");
  }
  const allowed = Math.min(available, input.part_i_tax_limit ?? 0);
  return {
    batteryCost,
    fuelCellCost,
    otherCost,
    otherCredit,
    fuelCellStandardCredit: Math.round(
      fuelCellCost * PART_I_RATE,
    ),
    fuelCellCapacityLimit: Math.round(
      (input.fuel_cell_kw_capacity ?? 0) * FUEL_CELL_CAP_PER_KW,
    ),
    fuelCellCredit: fcCredit,
    carryforward,
    available,
    allowed,
    carryforwardToNextYear: available - allowed,
  };
}

// ─── Part II Helpers ──────────────────────────────────────────────────────────

function windowsCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), PER_ITEM_CAP);
}

function doorsCredit(cost: number, count: number): number {
  const perDoorCap = count > 0
    ? count * EXTERIOR_DOOR_PER_DOOR_CAP
    : EXTERIOR_DOOR_TOTAL_CAP;
  const cap = Math.min(perDoorCap, EXTERIOR_DOOR_TOTAL_CAP);
  return Math.min(Math.round(cost * PART_II_RATE), cap);
}

function perItemCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), PER_ITEM_CAP);
}

function energyAuditCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), ENERGY_AUDIT_CAP);
}

function heatPumpBiomassCredit(
  hpCost: number,
  hpWhCost: number,
  biomassCost: number,
): number {
  return Math.min(
    Math.round((hpCost + hpWhCost + biomassCost) * PART_II_RATE),
    HEAT_PUMP_BIOMASS_CAP,
  );
}

function allOccupantsPaid(
  input: Form5695Input,
  paid: number,
  total: number | undefined,
  label: string,
): number {
  if (!input.part_ii_joint_occupancy) {
    if (total !== undefined) {
      throw new Error(`${label} joint payment needs Part II joint occupancy`);
    }
    return paid;
  }
  if (total === undefined || total < paid) {
    throw new Error(
      `${label} needs all-occupant payments at least as large as the filer payment`,
    );
  }
  if (!Number.isInteger(paid) || !Number.isInteger(total)) {
    throw new Error(`${label} joint payments must be whole-dollar amounts`);
  }
  return total;
}

function paymentItem(
  kind: HomeImprovementKind,
  maximumCredit: number,
  paid: number,
  total: number,
  explanation?: string,
): HomeImprovement {
  return {
    kind,
    maximum_credit_allowed: maximumCredit,
    paid,
    total_joint_occupants_paid: total,
    ...(explanation ? { explanation } : {}),
  };
}

function partIIPaymentItems(input: Form5695Input): HomeImprovement[] {
  const sectionA = input.part_ii_section_a;
  const sectionB = input.part_ii_section_b;
  const qualified = sectionBQualifiedItems(sectionB);
  const audit = input.part_ii_energy_audit;
  if (
    sectionA?.insulation_joint_total_paid !== undefined &&
    !sectionA.insulation_cost
  ) {
    throw new Error("Insulation joint payment needs a claimed insulation cost");
  }
  const items: HomeImprovement[] = [];
  if (sectionA?.insulation_cost) {
    items.push(paymentItem(
      HomeImprovementKind.Insulation,
      PART_II_ANNUAL_CAP,
      sectionA.insulation_cost,
      allOccupantsPaid(
        input,
        sectionA.insulation_cost,
        sectionA.insulation_joint_total_paid,
        "Insulation",
      ),
    ));
  }
  for (const door of sectionA?.exterior_doors ?? []) {
    items.push(paymentItem(
      HomeImprovementKind.ExteriorDoors,
      EXTERIOR_DOOR_PER_DOOR_CAP,
      door.cost,
      allOccupantsPaid(
        input,
        door.cost,
        door.joint_total_paid,
        `Exterior door ${door.qmid}`,
      ),
      `Exterior door QMID ${door.qmid}`,
    ));
  }
  const windows = sectionA?.windows ?? [];
  if (windows.length > 0) {
    const paid = windows.reduce((sum, item) => sum + item.cost, 0);
    const total = windows.reduce(
      (sum, item) =>
        sum +
        allOccupantsPaid(
          input,
          item.cost,
          item.joint_total_paid,
          `Window ${item.qmid}`,
        ),
      0,
    );
    items.push(
      paymentItem(
        HomeImprovementKind.WindowsOrSkylights,
        PER_ITEM_CAP,
        paid,
        total,
      ),
    );
  }
  const appendPropertyItems = (
    kind: HomeImprovementKind,
    maximumCredit: number,
    properties: ReadonlyArray<SectionBItem>,
    label: string,
  ) => {
    for (const property of properties) {
      items.push(paymentItem(
        kind,
        maximumCredit,
        property.cost,
        allOccupantsPaid(
          input,
          property.cost,
          property.joint_total_paid,
          `${label} ${property.qmid}`,
        ),
        `${label} QMID ${property.qmid}`,
      ));
    }
  };
  appendPropertyItems(
    HomeImprovementKind.CentralAirConditioners,
    PER_ITEM_CAP,
    qualified.centralAirConditioners,
    "Central air conditioner",
  );
  appendPropertyItems(
    HomeImprovementKind.WaterHeaters,
    PER_ITEM_CAP,
    qualified.waterHeaters,
    "Water heater",
  );
  appendPropertyItems(
    HomeImprovementKind.FurnaceOrBoilers,
    PER_ITEM_CAP,
    qualified.furnacesOrBoilers,
    "Furnace or boiler",
  );
  const panelboard = sectionB?.panelboard;
  if (panelboard) {
    items.push(paymentItem(
      HomeImprovementKind.BoardsCircuitsOrFeeders,
      PER_ITEM_CAP,
      panelboard.cost,
      allOccupantsPaid(
        input,
        panelboard.cost,
        panelboard.joint_total_paid,
        "Panelboard",
      ),
    ));
  }
  if (audit) {
    items.push(paymentItem(
      HomeImprovementKind.HomeEnergyAudits,
      ENERGY_AUDIT_CAP,
      audit.cost,
      allOccupantsPaid(
        input,
        audit.cost,
        audit.joint_total_paid,
        "Home energy audit",
      ),
    ));
  }
  appendPropertyItems(
    HomeImprovementKind.HeatPumpsBiomass,
    HEAT_PUMP_BIOMASS_CAP,
    qualified.heatPumps,
    "Heat pump",
  );
  appendPropertyItems(
    HomeImprovementKind.HeatPumpsBiomass,
    HEAT_PUMP_BIOMASS_CAP,
    qualified.heatPumpWaterHeaters,
    "Heat pump water heater",
  );
  appendPropertyItems(
    HomeImprovementKind.HeatPumpsBiomass,
    HEAT_PUMP_BIOMASS_CAP,
    qualified.biomassStovesOrBoilers,
    "Biomass stove or boiler",
  );
  if (input.part_ii_joint_occupancy && items.length === 0) {
    throw new Error(
      "Form 5695 Part II joint occupancy needs itemized property",
    );
  }
  return items;
}

// Part II: standard items subject to per-item caps and $1,200 annual cap;
// heat pump + heat pump water heater + biomass have a separate $2,000 combined cap.
export function computeForm5695PartIIAmounts(input: Form5695Input) {
  const sectionA = input.part_ii_section_a;
  const sectionB = input.part_ii_section_b;
  const qualified = sectionBQualifiedItems(sectionB);
  const audit = input.part_ii_energy_audit;
  if (
    input.part_ii_joint_occupancy && [
      input.windows_cost,
      input.exterior_doors_cost,
      input.insulation_cost,
      input.central_ac_cost,
      input.gas_water_heater_cost,
      input.furnace_boiler_cost,
      input.panelboard_cost,
      input.heat_pump_cost,
      input.heat_pump_water_heater_cost,
      input.biomass_cost,
      input.energy_audit_cost,
    ].some((cost) => (cost ?? 0) > 0)
  ) {
    throw new Error(
      "Form 5695 Part II joint occupancy needs itemized property payments",
    );
  }
  if (sectionA) {
    if (
      (input.windows_cost ?? 0) > 0 ||
      (input.exterior_doors_cost ?? 0) > 0 ||
      (input.insulation_cost ?? 0) > 0
    ) {
      throw new Error(
        "Form 5695 cannot mix itemized Section A with flat totals",
      );
    }
    if (
      !sectionA.main_home_in_us || !sectionA.original_user ||
      !sectionA.five_year_use || sectionA.related_to_new_home
    ) {
      throw new Error(
        "Form 5695 Section A eligibility answers do not support the claim",
      );
    }
  }
  if (sectionB) {
    if (
      (input.central_ac_cost ?? 0) > 0 ||
      (input.gas_water_heater_cost ?? 0) > 0 ||
      (input.furnace_boiler_cost ?? 0) > 0 ||
      (input.panelboard_cost ?? 0) > 0 ||
      (input.heat_pump_cost ?? 0) > 0 ||
      (input.heat_pump_water_heater_cost ?? 0) > 0 ||
      (input.biomass_cost ?? 0) > 0
    ) {
      throw new Error(
        "Form 5695 cannot mix itemized Section B with flat totals",
      );
    }
    if (!sectionB.home_in_us || !sectionB.originally_placed_in_service) {
      throw new Error(
        "Form 5695 Section B eligibility answers do not support the claim",
      );
    }
    const panelboard = sectionB.panelboard;
    if (panelboard) {
      if (
        Math.max(
            panelboard.enabling_installed_year,
            panelboard.enabled_installed_year,
          ) !== 2025 ||
        new Set(panelboard.enabled_property_type_codes).size !==
          panelboard.enabled_property_type_codes.length
      ) {
        throw new Error(
          "Form 5695 panelboard needs distinct enabled-property codes and 2025 or consecutive-year timing",
        );
      }
      if (panelboard.enabled_installed_year === 2025) {
        const currentYearCodes = new Set([
          ...(sectionA?.windows?.length ? ["A"] : []),
          ...(qualified.centralAirConditioners.length ? ["B"] : []),
          ...(qualified.waterHeaters.length ? ["C"] : []),
          ...(qualified.furnacesOrBoilers.length ? ["D"] : []),
          ...(qualified.heatPumps.length ? ["E"] : []),
          ...(qualified.heatPumpWaterHeaters.length ? ["F"] : []),
          ...(qualified.biomassStovesOrBoilers.length ? ["G"] : []),
        ]);
        if (
          panelboard.enabled_property_type_codes.some((code) =>
            !currentYearCodes.has(code)
          )
        ) {
          throw new Error(
            "Form 5695 panelboard enabled-property code needs a matching 2025 property item",
          );
        }
      }
    }
  }
  if (audit && (input.energy_audit_cost ?? 0) > 0) {
    throw new Error(
      "Form 5695 cannot mix qualified audit facts with a flat audit total",
    );
  }
  const paymentItems = partIIPaymentItems(input);
  const sharedCredit = (kind: HomeImprovementKind): number =>
    paymentItems
      .filter((item) => item.kind === kind)
      .reduce((sum, item) => sum + calculatedHomeImprovementCredit(item), 0);
  const winCredit = sectionA
    ? input.part_ii_joint_occupancy
      ? sharedCredit(HomeImprovementKind.WindowsOrSkylights)
      : windowsCredit(
        (sectionA.windows ?? []).reduce((sum, item) => sum + item.cost, 0),
      )
    : windowsCredit(input.windows_cost ?? 0);
  const sortedDoors = [...(sectionA?.exterior_doors ?? [])].sort((a, b) =>
    b.cost - a.cost
  );
  const firstDoorCredit = sortedDoors[0]
    ? input.part_ii_joint_occupancy
      ? calculatedHomeImprovementCredit(paymentItem(
        HomeImprovementKind.ExteriorDoors,
        EXTERIOR_DOOR_PER_DOOR_CAP,
        sortedDoors[0].cost,
        allOccupantsPaid(
          input,
          sortedDoors[0].cost,
          sortedDoors[0].joint_total_paid,
          "First exterior door",
        ),
      ))
      : Math.min(
        Math.round(sortedDoors[0].cost * PART_II_RATE),
        EXTERIOR_DOOR_PER_DOOR_CAP,
      )
    : 0;
  const otherDoorsCredit = input.part_ii_joint_occupancy
    ? sortedDoors.slice(1).reduce(
      (sum, door) =>
        sum + calculatedHomeImprovementCredit(paymentItem(
          HomeImprovementKind.ExteriorDoors,
          EXTERIOR_DOOR_PER_DOOR_CAP,
          door.cost,
          allOccupantsPaid(
            input,
            door.cost,
            door.joint_total_paid,
            `Exterior door ${door.qmid}`,
          ),
        )),
      0,
    )
    : Math.round(
      sortedDoors.slice(1).reduce((sum, item) => sum + item.cost, 0) *
        PART_II_RATE,
    );
  const doorPaymentItems = paymentItems.filter((item) =>
    item.kind === HomeImprovementKind.ExteriorDoors
  );
  const jointDoorTotalCredit = doorPaymentItems.length > 0
    ? calculatedHomeImprovementCredit(paymentItem(
      HomeImprovementKind.ExteriorDoors,
      EXTERIOR_DOOR_TOTAL_CAP,
      doorPaymentItems.reduce((sum, item) => sum + item.paid, 0),
      doorPaymentItems.reduce(
        (sum, item) => sum + item.total_joint_occupants_paid,
        0,
      ),
    ))
    : 0;
  const doorCredit = sectionA && sortedDoors.length > 0
    ? input.part_ii_joint_occupancy
      ? Math.min(firstDoorCredit + otherDoorsCredit, jointDoorTotalCredit)
      : Math.min(
        Math.min(
          Math.round(sortedDoors[0].cost * PART_II_RATE),
          EXTERIOR_DOOR_PER_DOOR_CAP,
        ) +
          Math.round(
            sortedDoors.slice(1).reduce((sum, item) => sum + item.cost, 0) *
              PART_II_RATE,
          ),
        EXTERIOR_DOOR_TOTAL_CAP,
      )
    : doorsCredit(
      input.exterior_doors_cost ?? 0,
      input.exterior_doors_count ?? 0,
    );
  const insCredit = input.part_ii_joint_occupancy
    ? sharedCredit(HomeImprovementKind.Insulation)
    : Math.min(
      Math.round(
        (sectionA?.insulation_cost ?? input.insulation_cost ?? 0) *
          PART_II_RATE,
      ),
      PART_II_ANNUAL_CAP,
    );
  const acCredit = input.part_ii_joint_occupancy
    ? Math.min(
      sharedCredit(HomeImprovementKind.CentralAirConditioners),
      PER_ITEM_CAP,
    )
    : perItemCredit(
      sectionB
        ? qualified.centralAirConditioners.reduce(
          (sum, item) => sum + item.cost,
          0,
        )
        : input.central_ac_cost ?? 0,
    );
  const gasWhCredit = input.part_ii_joint_occupancy
    ? Math.min(sharedCredit(HomeImprovementKind.WaterHeaters), PER_ITEM_CAP)
    : perItemCredit(
      sectionB
        ? qualified.waterHeaters.reduce((sum, item) => sum + item.cost, 0)
        : input.gas_water_heater_cost ?? 0,
    );
  const furnaceCredit = input.part_ii_joint_occupancy
    ? Math.min(sharedCredit(HomeImprovementKind.FurnaceOrBoilers), PER_ITEM_CAP)
    : perItemCredit(
      sectionB
        ? qualified.furnacesOrBoilers.reduce(
          (sum, item) => sum + item.cost,
          0,
        )
        : input.furnace_boiler_cost ?? 0,
    );
  const panelCredit = input.part_ii_joint_occupancy
    ? sharedCredit(HomeImprovementKind.BoardsCircuitsOrFeeders)
    : perItemCredit(
      sectionB?.panelboard?.cost ?? input.panelboard_cost ?? 0,
    );
  const auditCredit = input.part_ii_joint_occupancy
    ? sharedCredit(HomeImprovementKind.HomeEnergyAudits)
    : energyAuditCredit(
      audit?.cost ?? input.energy_audit_cost ?? 0,
    );

  const standardItems = winCredit + doorCredit + insCredit + acCredit +
    gasWhCredit + furnaceCredit + panelCredit + auditCredit;
  const standardPaymentItems = paymentItems.filter((item) =>
    item.kind !== HomeImprovementKind.HeatPumpsBiomass
  );
  const cappedStandard = input.part_ii_joint_occupancy &&
      standardItems > PART_II_ANNUAL_CAP
    ? Math.min(
      standardItems,
      Math.round(
        PART_II_ANNUAL_CAP *
          standardPaymentItems.reduce((sum, item) => sum + item.paid, 0) /
          standardPaymentItems.reduce(
            (sum, item) => sum + item.total_joint_occupants_paid,
            0,
          ),
      ),
    )
    : Math.min(standardItems, PART_II_ANNUAL_CAP);

  const hpBiomass = input.part_ii_joint_occupancy
    ? Math.min(
      sharedCredit(HomeImprovementKind.HeatPumpsBiomass),
      HEAT_PUMP_BIOMASS_CAP,
    )
    : heatPumpBiomassCredit(
      sectionB
        ? qualified.heatPumps.reduce((sum, item) => sum + item.cost, 0)
        : input.heat_pump_cost ?? 0,
      sectionB
        ? qualified.heatPumpWaterHeaters.reduce(
          (sum, item) => sum + item.cost,
          0,
        )
        : input.heat_pump_water_heater_cost ?? 0,
      sectionB
        ? qualified.biomassStovesOrBoilers.reduce(
          (sum, item) => sum + item.cost,
          0,
        )
        : input.biomass_cost ?? 0,
    );

  const available = cappedStandard + hpBiomass;
  if (available > 0 && input.part_ii_tax_limit === undefined) {
    throw new Error("Form 5695 Part II needs its tax-liability limit");
  }
  return {
    windowsCredit: winCredit,
    firstDoorCredit,
    otherDoorsCredit,
    doorsCredit: doorCredit,
    insulationCredit: insCredit,
    centralAirCredit: acCredit,
    waterHeaterCredit: gasWhCredit,
    furnaceCredit,
    panelboardCredit: panelCredit,
    auditCredit,
    standardSubtotal: standardItems,
    cappedStandard,
    heatPumpBiomass: hpBiomass,
    available,
    allowed: Math.min(available, input.part_ii_tax_limit ?? 0),
  };
}

function partIIJointStatementItems(
  input: Form5695Input,
  amounts: ReturnType<typeof computeForm5695PartIIAmounts>,
): HomeImprovement[] {
  if (!input.part_ii_joint_occupancy) return [];
  const allItems = partIIPaymentItems(input);
  const shared = allItems.filter((item) =>
    item.paid < item.total_joint_occupants_paid
  );
  if (shared.length === 0) {
    throw new Error(
      "Form 5695 Part II joint occupancy needs a shared property payment for its statement",
    );
  }
  const doors = allItems.filter((item) =>
    item.kind === HomeImprovementKind.ExteriorDoors
  );
  const combinedDoors = doors.length > 1 &&
      doors.some((item) => item.paid < item.total_joint_occupants_paid)
    ? [paymentItem(
      HomeImprovementKind.ExteriorDoors,
      EXTERIOR_DOOR_TOTAL_CAP,
      doors.reduce((sum, item) => sum + item.paid, 0),
      doors.reduce((sum, item) => sum + item.total_joint_occupants_paid, 0),
      `All qualifying exterior doors combined; Form 5695 line 19h is ${amounts.doorsCredit} after individual and combined limits`,
    )]
    : [];
  const standardItems = allItems.filter((item) =>
    item.kind !== HomeImprovementKind.HeatPumpsBiomass
  );
  const annualExplanation = amounts.standardSubtotal > PART_II_ANNUAL_CAP
    ? `Annual $1,200 limit: filer paid ${
      standardItems.reduce((sum, item) => sum + item.paid, 0)
    } of ${
      standardItems.reduce((sum, item) =>
        sum + item.total_joint_occupants_paid, 0)
    }; line 28 allocated credit is ${amounts.cappedStandard}.`
    : undefined;
  const categoryCaps = new Map<HomeImprovementKind, [number, string]>([
    [HomeImprovementKind.CentralAirConditioners, [PER_ITEM_CAP, "22d"]],
    [HomeImprovementKind.WaterHeaters, [PER_ITEM_CAP, "23d"]],
    [HomeImprovementKind.FurnaceOrBoilers, [PER_ITEM_CAP, "24d"]],
    [HomeImprovementKind.HeatPumpsBiomass, [HEAT_PUMP_BIOMASS_CAP, "29h"]],
  ]);
  const explainedKinds = new Set<HomeImprovementKind>();
  return [...shared, ...combinedDoors].map((item, index) => {
    const category = categoryCaps.get(item.kind);
    const combinedCredit = allItems
      .filter((property) => property.kind === item.kind)
      .reduce(
        (sum, property) => sum + calculatedHomeImprovementCredit(property),
        0,
      );
    const categoryExplanation = category && !explainedKinds.has(item.kind) &&
        combinedCredit > category[0]
      ? `Form 5695 line ${
        category[1]
      } limits the combined allocated credit for this property category to $${
        category[0]
      }.`
      : undefined;
    explainedKinds.add(item.kind);
    const explanation = [
      item.explanation,
      categoryExplanation,
      annualExplanation && index === 0 ? annualExplanation : undefined,
    ].filter(Boolean).join(" ");
    return explanation ? { ...item, explanation } : item;
  });
}

function buildOutputs(partI: number, partII: number): NodeOutput[] {
  if (partI === 0 && partII === 0) return [];
  if (partI === 0) {
    return [output(schedule3, { line5b_energy_efficient_home: partII })];
  }
  if (partII === 0) {
    return [output(schedule3, { line5a_residential_clean_energy: partI })];
  }
  return [output(schedule3, {
    line5a_residential_clean_energy: partI,
    line5b_energy_efficient_home: partII,
  })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form5695Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form5695";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule3,
    jointOccupancyStatementNode,
  ]);

  compute(_ctx: NodeContext, rawInput: Form5695Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const partI = computeForm5695PartIAmounts(input).allowed;
    const partIIAmounts = computeForm5695PartIIAmounts(input);
    const partII = partIIAmounts.allowed;
    const jointCell = jointFuelCell(input);
    const jointHomeItems = partIIJointStatementItems(input, partIIAmounts);
    const statements = jointCell || jointHomeItems.length > 0
      ? [output(jointOccupancyStatementNode, {
        statements: [{
          ...(jointCell ? { fuel_cell_properties: [jointCell] } : {}),
          ...(jointHomeItems.length > 0
            ? { home_improvements: jointHomeItems }
            : {}),
        }],
      })]
      : [];
    return { outputs: [...buildOutputs(partI, partII), ...statements] };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form5695 = new Form5695Node();
