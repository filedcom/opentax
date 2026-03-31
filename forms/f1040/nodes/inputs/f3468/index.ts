import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 3468 — Investment Credit (IRC §§47, 48, 48C, 48E)
// All credit components aggregate to Schedule 3, Line 6z (General Business Credit).

// TY2025 rates and caps
const REHAB_HISTORIC_RATE = 0.20;
const SOLAR_RATE = 0.30;
const FIBER_OPTIC_SOLAR_RATE = 0.30;
const FUEL_CELL_RATE = 0.30;
const FUEL_CELL_CAP_PER_HALF_KW = 1_500;   // $1,500 per 0.5 kW
const MICROTURBINE_RATE = 0.10;
const MICROTURBINE_CAP_PER_KW = 200;        // $200 per kW
const SMALL_WIND_RATE = 0.30;
const GEOTHERMAL_HEAT_PUMP_RATE = 0.10;
const CHP_RATE = 0.10;
const WASTE_ENERGY_RATE = 0.20;
const OFFSHORE_WIND_RATE = 0.30;
const ADVANCED_ENERGY_RATE = 0.30;
const CLEAN_ELECTRICITY_RATE = 0.30;

export const inputSchema = z.object({
  // Part I — §47 Rehabilitation Credit
  rehab_certified_historic_qre: z.number().nonnegative().optional(),

  // Part II — §48 Energy Credit
  solar_energy_property_basis: z.number().nonnegative().optional(),
  fiber_optic_solar_basis: z.number().nonnegative().optional(),
  fuel_cell_property_basis: z.number().nonnegative().optional(),
  fuel_cell_capacity_kw: z.number().nonnegative().optional(),
  microturbine_property_basis: z.number().nonnegative().optional(),
  microturbine_capacity_kw: z.number().nonnegative().optional(),
  small_wind_property_basis: z.number().nonnegative().optional(),
  geothermal_heat_pump_basis: z.number().nonnegative().optional(),
  chp_property_basis: z.number().nonnegative().optional(),
  waste_energy_recovery_basis: z.number().nonnegative().optional(),
  offshore_wind_basis: z.number().nonnegative().optional(),

  // Part V — §48C Advanced Energy Project Credit (requires DOE allocation)
  advanced_energy_project_basis: z.number().nonnegative().optional(),
  advanced_energy_project_has_doe_allocation: z.boolean().optional(),

  // Part VI — §48E Clean Electricity Investment Credit
  clean_electricity_basis: z.number().nonnegative().optional(),
});

type F3468Input = z.infer<typeof inputSchema>;

// ── §47 Rehabilitation Credit ─────────────────────────────────────────────────

function rehabCredit(input: F3468Input): number {
  return (input.rehab_certified_historic_qre ?? 0) * REHAB_HISTORIC_RATE;
}

// ── §48 Energy Credits ────────────────────────────────────────────────────────

function solarCredit(input: F3468Input): number {
  return (input.solar_energy_property_basis ?? 0) * SOLAR_RATE;
}

function fiberOpticSolarCredit(input: F3468Input): number {
  return (input.fiber_optic_solar_basis ?? 0) * FIBER_OPTIC_SOLAR_RATE;
}

function fuelCellCredit(input: F3468Input): number {
  const basis = input.fuel_cell_property_basis ?? 0;
  if (basis === 0) return 0;
  const rateCredit = basis * FUEL_CELL_RATE;
  if (input.fuel_cell_capacity_kw === undefined) return rateCredit;
  const cap = (input.fuel_cell_capacity_kw / 0.5) * FUEL_CELL_CAP_PER_HALF_KW;
  return Math.min(rateCredit, cap);
}

function microturbineCredit(input: F3468Input): number {
  const basis = input.microturbine_property_basis ?? 0;
  if (basis === 0) return 0;
  const rateCredit = basis * MICROTURBINE_RATE;
  if (input.microturbine_capacity_kw === undefined) return rateCredit;
  const cap = input.microturbine_capacity_kw * MICROTURBINE_CAP_PER_KW;
  return Math.min(rateCredit, cap);
}

function smallWindCredit(input: F3468Input): number {
  return (input.small_wind_property_basis ?? 0) * SMALL_WIND_RATE;
}

function geothermalHeatPumpCredit(input: F3468Input): number {
  return (input.geothermal_heat_pump_basis ?? 0) * GEOTHERMAL_HEAT_PUMP_RATE;
}

function chpCredit(input: F3468Input): number {
  return (input.chp_property_basis ?? 0) * CHP_RATE;
}

function wasteEnergyCredit(input: F3468Input): number {
  return (input.waste_energy_recovery_basis ?? 0) * WASTE_ENERGY_RATE;
}

function offshoreWindCredit(input: F3468Input): number {
  return (input.offshore_wind_basis ?? 0) * OFFSHORE_WIND_RATE;
}

// ── §48C Advanced Energy Project ─────────────────────────────────────────────

function advancedEnergyCredit(input: F3468Input): number {
  if (!input.advanced_energy_project_has_doe_allocation) return 0;
  return (input.advanced_energy_project_basis ?? 0) * ADVANCED_ENERGY_RATE;
}

// ── §48E Clean Electricity ────────────────────────────────────────────────────

function cleanElectricityCredit(input: F3468Input): number {
  return (input.clean_electricity_basis ?? 0) * CLEAN_ELECTRICITY_RATE;
}

// ── Aggregation & Output ──────────────────────────────────────────────────────

function totalCredit(input: F3468Input): number {
  return (
    rehabCredit(input) +
    solarCredit(input) +
    fiberOpticSolarCredit(input) +
    fuelCellCredit(input) +
    microturbineCredit(input) +
    smallWindCredit(input) +
    geothermalHeatPumpCredit(input) +
    chpCredit(input) +
    wasteEnergyCredit(input) +
    offshoreWindCredit(input) +
    advancedEnergyCredit(input) +
    cleanElectricityCredit(input)
  );
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F3468Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3468";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f3468.pdf";

  compute(_ctx: NodeContext, rawInput: F3468Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f3468 = new F3468Node();
