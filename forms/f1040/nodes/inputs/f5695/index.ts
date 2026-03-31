import { z } from "zod";
import type { AtLeastOne, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { output } from "../../../../../core/types/tax-node.ts";
import { form5695 } from "../../intermediate/form5695/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Input node that collects raw cost data from the taxpayer and passes it
// to the intermediate form5695 node for credit computation.

export const inputSchema = z.object({
  // Part I — Residential Clean Energy Credit (IRC §25D)
  solar_electric_cost: z.number().nonnegative().optional(),
  solar_water_heater_cost: z.number().nonnegative().optional(),
  fuel_cell_cost: z.number().nonnegative().optional(),
  // Fuel cell kW capacity — used to apply $500/½-kW cap (§25D(b)(1))
  fuel_cell_kw_capacity: z.number().nonnegative().optional(),
  small_wind_cost: z.number().nonnegative().optional(),
  geothermal_cost: z.number().nonnegative().optional(),
  battery_storage_cost: z.number().nonnegative().optional(),
  // Battery capacity in kWh — must be ≥3 kWh to qualify (§25D(d)(7))
  battery_storage_kwh_capacity: z.number().nonnegative().optional(),
  // Unused §25D credit from prior year (§25D(c))
  prior_year_carryforward: z.number().nonnegative().optional(),

  // Part II — Energy Efficient Home Improvement Credit (IRC §25C)
  windows_cost: z.number().nonnegative().optional(),
  exterior_doors_cost: z.number().nonnegative().optional(),
  exterior_doors_count: z.number().int().nonnegative().optional(),
  insulation_cost: z.number().nonnegative().optional(),
  // Central AC — $600 cap (§25C(d)(1))
  central_ac_cost: z.number().nonnegative().optional(),
  // Gas/propane/oil water heater — $600 cap (§25C(d)(2))
  gas_water_heater_cost: z.number().nonnegative().optional(),
  // Gas/propane/oil furnace or boiler — $600 cap (§25C(d)(3))
  furnace_boiler_cost: z.number().nonnegative().optional(),
  // Enabling property (panelboards ≥200 amp) — $600 cap (§25C(d)(5))
  panelboard_cost: z.number().nonnegative().optional(),
  // Electric/natural gas heat pump — part of $2,000 combined cap (§25C(d)(4))
  heat_pump_cost: z.number().nonnegative().optional(),
  // Heat pump water heater — part of $2,000 combined cap (§25C(d)(4))
  heat_pump_water_heater_cost: z.number().nonnegative().optional(),
  // Biomass stove/boiler — part of $2,000 combined cap (§25C(d)(6))
  biomass_cost: z.number().nonnegative().optional(),
  energy_audit_cost: z.number().nonnegative().optional(),
});

type F5695Input = z.infer<typeof inputSchema>;

class F5695InputNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5695";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form5695]);

  compute(_ctx: NodeContext, rawInput: F5695Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const fields: z.infer<typeof form5695["inputSchema"]> = {};
    if (input.solar_electric_cost !== undefined) fields.solar_electric_cost = input.solar_electric_cost;
    if (input.solar_water_heater_cost !== undefined) fields.solar_water_heater_cost = input.solar_water_heater_cost;
    if (input.fuel_cell_cost !== undefined) fields.fuel_cell_cost = input.fuel_cell_cost;
    if (input.fuel_cell_kw_capacity !== undefined) fields.fuel_cell_kw_capacity = input.fuel_cell_kw_capacity;
    if (input.small_wind_cost !== undefined) fields.small_wind_cost = input.small_wind_cost;
    if (input.geothermal_cost !== undefined) fields.geothermal_cost = input.geothermal_cost;
    if (input.battery_storage_cost !== undefined) fields.battery_storage_cost = input.battery_storage_cost;
    if (input.battery_storage_kwh_capacity !== undefined) fields.battery_storage_kwh_capacity = input.battery_storage_kwh_capacity;
    if (input.prior_year_carryforward !== undefined) fields.prior_year_carryforward = input.prior_year_carryforward;
    if (input.windows_cost !== undefined) fields.windows_cost = input.windows_cost;
    if (input.exterior_doors_cost !== undefined) fields.exterior_doors_cost = input.exterior_doors_cost;
    if (input.exterior_doors_count !== undefined) fields.exterior_doors_count = input.exterior_doors_count;
    if (input.insulation_cost !== undefined) fields.insulation_cost = input.insulation_cost;
    if (input.central_ac_cost !== undefined) fields.central_ac_cost = input.central_ac_cost;
    if (input.gas_water_heater_cost !== undefined) fields.gas_water_heater_cost = input.gas_water_heater_cost;
    if (input.furnace_boiler_cost !== undefined) fields.furnace_boiler_cost = input.furnace_boiler_cost;
    if (input.panelboard_cost !== undefined) fields.panelboard_cost = input.panelboard_cost;
    if (input.heat_pump_cost !== undefined) fields.heat_pump_cost = input.heat_pump_cost;
    if (input.heat_pump_water_heater_cost !== undefined) fields.heat_pump_water_heater_cost = input.heat_pump_water_heater_cost;
    if (input.biomass_cost !== undefined) fields.biomass_cost = input.biomass_cost;
    if (input.energy_audit_cost !== undefined) fields.energy_audit_cost = input.energy_audit_cost;

    return {
      outputs: [output(form5695, fields as AtLeastOne<z.infer<typeof form5695["inputSchema"]>>)],
    };
  }
}

export const f5695 = new F5695InputNode();
