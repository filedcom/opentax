import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8835 — Renewable Electricity, Refined Coal, and Indian Coal Production Credit
// IRC §45: Production Tax Credit (PTC) for electricity from qualified renewable sources.
// IRA 2022 (§13101): Added prevailing wage and apprenticeship requirements for full rate.
// Credit flows to General Business Credit → Schedule 3 line 6z.

// TY2025 inflation-adjusted credit rates per Rev. Proc. 2024-40
// Full rate applies when meets_prevailing_wage AND meets_apprenticeship = true.
// Otherwise reduced rate = full rate / 5 per IRC §45(b)(6).
const FULL_RATE_HIGH = 0.028; // $0.028/kWh — WIND, SOLAR, GEOTHERMAL, BIOMASS_CLOSED
const FULL_RATE_LOW = 0.014; // $0.014/kWh — BIOMASS_OPEN, HYDRO, LANDFILL, MARINE
const REDUCED_RATE_HIGH = FULL_RATE_HIGH / 5; // $0.0056/kWh
const REDUCED_RATE_LOW = FULL_RATE_LOW / 5; // $0.0028/kWh

export enum EnergyType {
  Wind = "WIND",
  Solar = "SOLAR",
  Geothermal = "GEOTHERMAL",
  BiomassClosed = "BIOMASS_CLOSED",
  BiomassOpen = "BIOMASS_OPEN",
  Hydro = "HYDRO",
  Landfill = "LANDFILL",
  Marine = "MARINE",
}

// Energy types that use the full (high) base rate per IRC §45(d)
const HIGH_RATE_TYPES = new Set<EnergyType>([
  EnergyType.Wind,
  EnergyType.Solar,
  EnergyType.Geothermal,
  EnergyType.BiomassClosed,
]);

export const itemSchema = z.object({
  // Type of qualified energy source per IRC §45(d)
  energy_type: z.nativeEnum(EnergyType),
  // Total kWh produced during the tax year
  kwh_produced: z.number().nonnegative(),
  // kWh of electricity sold to unrelated party (credit is based on kwh_sold)
  kwh_sold: z.number().nonnegative(),
  // Date the qualified facility was first placed in service (ISO date string)
  facility_placed_in_service_date: z.string(),
  // Meets prevailing wage requirements per IRA 2022 IRC §45(b)(7)
  meets_prevailing_wage: z.boolean().optional(),
  // Meets apprenticeship requirements per IRA 2022 IRC §45(b)(8)
  meets_apprenticeship: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8835s: z.array(itemSchema).min(1),
});

type F8835Item = z.infer<typeof itemSchema>;

// Whether both IRA 2022 wage/apprenticeship requirements are satisfied
function meetsWageAndApprenticeship(item: F8835Item): boolean {
  return item.meets_prevailing_wage === true && item.meets_apprenticeship === true;
}

// Applicable credit rate per kWh
function creditRate(item: F8835Item): number {
  const isHighRate = HIGH_RATE_TYPES.has(item.energy_type);
  if (meetsWageAndApprenticeship(item)) {
    return isHighRate ? FULL_RATE_HIGH : FULL_RATE_LOW;
  }
  return isHighRate ? REDUCED_RATE_HIGH : REDUCED_RATE_LOW;
}

// Credit for one facility — uses kwh_sold per IRC §45(a)(1)
function facilityCredit(item: F8835Item): number {
  if (item.kwh_sold > item.kwh_produced) {
    throw new Error(
      `f8835: kwh_sold (${item.kwh_sold}) cannot exceed kwh_produced (${item.kwh_produced})`,
    );
  }
  return item.kwh_sold * creditRate(item);
}

function totalCredit(items: F8835Item[]): number {
  return items.reduce((sum, item) => sum + facilityCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8835Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8835";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f8835s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8835 = new F8835Node();
