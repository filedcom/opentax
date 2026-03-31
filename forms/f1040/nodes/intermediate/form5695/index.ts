import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Part I — Residential Clean Energy (IRC §25D) ──────────────────────────
  // Solar electric property (§25D(a)(1))
  solar_electric_cost: z.number().nonnegative().optional(),
  // Solar water heating property (§25D(a)(2))
  solar_water_heater_cost: z.number().nonnegative().optional(),
  // Fuel cell property (§25D(a)(5))
  fuel_cell_cost: z.number().nonnegative().optional(),
  // Fuel cell kilowatt capacity — used to apply $500/½-kW dollar cap (§25D(b)(1))
  fuel_cell_kw_capacity: z.number().nonnegative().optional(),
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

type Form5695Input = z.infer<typeof inputSchema>;

// ─── Part I Helpers ───────────────────────────────────────────────────────────

function eligibleBatteryCost(cost: number | undefined, kwhCapacity: number | undefined): number {
  if (cost === undefined) return 0;
  // If capacity is explicitly provided and below threshold, battery does not qualify
  if (kwhCapacity !== undefined && kwhCapacity < BATTERY_MIN_KWH) return 0;
  return cost;
}

function fuelCellCredit(cost: number | undefined, kwCapacity: number | undefined): number {
  if (!cost) return 0;
  const credit = Math.round(cost * PART_I_RATE);
  if (kwCapacity !== undefined && kwCapacity > 0) {
    return Math.min(credit, Math.round(kwCapacity * FUEL_CELL_CAP_PER_KW));
  }
  return credit;
}

function partICredit(input: Form5695Input): number {
  const batteryCost = eligibleBatteryCost(input.battery_storage_cost, input.battery_storage_kwh_capacity);
  const otherCost =
    (input.solar_electric_cost ?? 0) +
    (input.solar_water_heater_cost ?? 0) +
    (input.small_wind_cost ?? 0) +
    (input.geothermal_cost ?? 0) +
    batteryCost;
  const otherCredit = Math.round(otherCost * PART_I_RATE);
  const fcCredit = fuelCellCredit(input.fuel_cell_cost, input.fuel_cell_kw_capacity);
  const carryforward = input.prior_year_carryforward ?? 0;
  return otherCredit + fcCredit + carryforward;
}

// ─── Part II Helpers ──────────────────────────────────────────────────────────

function windowsCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), PER_ITEM_CAP);
}

function doorsCredit(cost: number, count: number): number {
  const perDoorCap = count > 0 ? count * EXTERIOR_DOOR_PER_DOOR_CAP : EXTERIOR_DOOR_TOTAL_CAP;
  const cap = Math.min(perDoorCap, EXTERIOR_DOOR_TOTAL_CAP);
  return Math.min(Math.round(cost * PART_II_RATE), cap);
}

function perItemCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), PER_ITEM_CAP);
}

function energyAuditCredit(cost: number): number {
  return Math.min(Math.round(cost * PART_II_RATE), ENERGY_AUDIT_CAP);
}

function heatPumpBiomassCredit(hpCost: number, hpWhCost: number, biomassCost: number): number {
  return Math.min(Math.round((hpCost + hpWhCost + biomassCost) * PART_II_RATE), HEAT_PUMP_BIOMASS_CAP);
}

// Part II: standard items subject to per-item caps and $1,200 annual cap;
// heat pump + heat pump water heater + biomass have a separate $2,000 combined cap.
function partIICredit(input: Form5695Input): number {
  const winCredit = windowsCredit(input.windows_cost ?? 0);
  const doorCredit = doorsCredit(input.exterior_doors_cost ?? 0, input.exterior_doors_count ?? 0);
  const insCredit = Math.round((input.insulation_cost ?? 0) * PART_II_RATE);
  const acCredit = perItemCredit(input.central_ac_cost ?? 0);
  const gasWhCredit = perItemCredit(input.gas_water_heater_cost ?? 0);
  const furnaceCredit = perItemCredit(input.furnace_boiler_cost ?? 0);
  const panelCredit = perItemCredit(input.panelboard_cost ?? 0);
  const auditCredit = energyAuditCredit(input.energy_audit_cost ?? 0);

  const standardItems = winCredit + doorCredit + insCredit + acCredit + gasWhCredit + furnaceCredit + panelCredit + auditCredit;
  const cappedStandard = Math.min(standardItems, PART_II_ANNUAL_CAP);

  const hpBiomass = heatPumpBiomassCredit(
    input.heat_pump_cost ?? 0,
    input.heat_pump_water_heater_cost ?? 0,
    input.biomass_cost ?? 0,
  );

  return cappedStandard + hpBiomass;
}

function buildOutputs(partI: number, partII: number): NodeOutput[] {
  const total = partI + partII;
  if (total === 0) return [];
  return [output(schedule3, { line5_residential_energy: total })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form5695Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form5695";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form5695Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const partI = partICredit(input);
    const partII = partIICredit(input);
    return { outputs: buildOutputs(partI, partII) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form5695 = new Form5695Node();
