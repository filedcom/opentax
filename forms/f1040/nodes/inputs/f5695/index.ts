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
  small_wind_cost: z.number().nonnegative().optional(),
  geothermal_cost: z.number().nonnegative().optional(),
  battery_storage_cost: z.number().nonnegative().optional(),

  // Part II — Energy Efficient Home Improvement Credit (IRC §25C)
  windows_cost: z.number().nonnegative().optional(),
  exterior_doors_cost: z.number().nonnegative().optional(),
  exterior_doors_count: z.number().int().nonnegative().optional(),
  insulation_cost: z.number().nonnegative().optional(),
  hvac_cost: z.number().nonnegative().optional(),
  water_heater_cost: z.number().nonnegative().optional(),
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

    // Build a fields object with only the defined keys so TypeScript is satisfied.
    // form5695 owns the credit computation logic.
    const fields: z.infer<typeof form5695["inputSchema"]> = {};
    if (input.solar_electric_cost !== undefined) fields.solar_electric_cost = input.solar_electric_cost;
    if (input.solar_water_heater_cost !== undefined) fields.solar_water_heater_cost = input.solar_water_heater_cost;
    if (input.fuel_cell_cost !== undefined) fields.fuel_cell_cost = input.fuel_cell_cost;
    if (input.small_wind_cost !== undefined) fields.small_wind_cost = input.small_wind_cost;
    if (input.geothermal_cost !== undefined) fields.geothermal_cost = input.geothermal_cost;
    if (input.battery_storage_cost !== undefined) fields.battery_storage_cost = input.battery_storage_cost;
    if (input.windows_cost !== undefined) fields.windows_cost = input.windows_cost;
    if (input.exterior_doors_cost !== undefined) fields.exterior_doors_cost = input.exterior_doors_cost;
    if (input.exterior_doors_count !== undefined) fields.exterior_doors_count = input.exterior_doors_count;
    if (input.insulation_cost !== undefined) fields.insulation_cost = input.insulation_cost;
    if (input.hvac_cost !== undefined) fields.hvac_cost = input.hvac_cost;
    if (input.water_heater_cost !== undefined) fields.water_heater_cost = input.water_heater_cost;
    if (input.biomass_cost !== undefined) fields.biomass_cost = input.biomass_cost;
    if (input.energy_audit_cost !== undefined) fields.energy_audit_cost = input.energy_audit_cost;

    return {
      outputs: [output(form5695, fields as AtLeastOne<z.infer<typeof form5695["inputSchema"]>>)],
    };
  }
}

export const f5695 = new F5695InputNode();
