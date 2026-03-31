import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §45X — Advanced Manufacturing Production Credit) ───

export enum ComponentType {
  // Solar energy components
  SolarModule = "solar_module",           // $0.07/W of capacity
  SolarCell = "solar_cell",              // $0.04/W of capacity
  ThinFilmSolarCell = "thin_film_solar_cell", // $0.04/W
  // Wind energy components
  WindBlade = "wind_blade",             // $0.02/W of nameplate capacity
  WindNacelle = "wind_nacelle",          // $0.05/W
  WindTower = "wind_tower",             // $0.03/W
  WindOffshoreFoundation = "wind_offshore_foundation", // $0.04/W
  // Inverters
  InverterCentralOver1Mw = "inverter_central_over_1mw",   // $0.0025/W
  InverterCentralUnder1Mw = "inverter_central_under_1mw", // $0.0025/W
  InverterString = "inverter_string",    // $0.0015/W
  InverterMicroUnder65W = "inverter_micro_under_65w",   // $0.002/W
  InverterMicroOver65W = "inverter_micro_over_65w",     // $0.002/W
  InverterGamut = "inverter_gamut",      // $0.0015/W
  // Battery modules (grid-scale)
  BatteryModule = "battery_module",       // $0.0035/Wh of capacity
  // Critical minerals
  CriticalMineralOther = "critical_mineral_other", // 10% of production costs
}

// Credit rates per unit (watts or Wh or cost fraction)
// Units: $/W for power components, $/Wh for battery, fraction for minerals
const CREDIT_RATES: Record<ComponentType, number> = {
  [ComponentType.SolarModule]: 0.07,
  [ComponentType.SolarCell]: 0.04,
  [ComponentType.ThinFilmSolarCell]: 0.04,
  [ComponentType.WindBlade]: 0.02,
  [ComponentType.WindNacelle]: 0.05,
  [ComponentType.WindTower]: 0.03,
  [ComponentType.WindOffshoreFoundation]: 0.04,
  [ComponentType.InverterCentralOver1Mw]: 0.0025,
  [ComponentType.InverterCentralUnder1Mw]: 0.0025,
  [ComponentType.InverterString]: 0.0015,
  [ComponentType.InverterMicroUnder65W]: 0.002,
  [ComponentType.InverterMicroOver65W]: 0.002,
  [ComponentType.InverterGamut]: 0.0015,
  [ComponentType.BatteryModule]: 0.0035,
  [ComponentType.CriticalMineralOther]: 0.10, // 10% of production_cost
};

// Per-component entry
const componentSchema = z.object({
  component_type: z.nativeEnum(ComponentType),
  // For power components: capacity in watts; for battery: capacity in Wh; for minerals: production cost in $
  quantity: z.number().nonnegative(),
  // Optional override for credit rate (e.g., phased-down rate in later years)
  credit_rate_override: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  components: z.array(componentSchema).optional(),
});

type ComponentEntry = z.infer<typeof componentSchema>;
type F7207Input = z.infer<typeof inputSchema>;

function componentCredit(entry: ComponentEntry): number {
  const rate = entry.credit_rate_override ?? CREDIT_RATES[entry.component_type];
  return entry.quantity * rate;
}

function totalCredit(entries: ComponentEntry[]): number {
  return entries.reduce((sum, e) => sum + componentCredit(e), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F7207Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f7207";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F7207Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const entries = input.components ?? [];
    const credit = totalCredit(entries);
    return { outputs: buildOutputs(credit) };
  }
}

export const f7207 = new F7207Node();
