import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8911 — Alternative Fuel Vehicle Refueling Property Credit (IRC §30C)
// TY2025: 30% of cost of qualifying refueling property.
// Business property: max $100,000 per location → Schedule 3, Line 6z.
// Personal property: max $1,000 → Schedule 3, Line 6b (nonrefundable personal credit).
//
// Property types: EV charging stations, hydrogen, natural gas, propane.
// Business use % determines split between business and personal credit.

// TY2025 constants — IRC §30C
const CREDIT_RATE = 0.30;                    // 30% of cost
const BUSINESS_MAX_PER_LOCATION = 100_000;  // $100,000 business cap per location
const PERSONAL_MAX = 1_000;                 // $1,000 personal cap

export enum FuelType {
  ElectricCharging = "electric_charging",
  Hydrogen = "hydrogen",
  NaturalGas = "natural_gas",
  Propane = "propane",
}

export const inputSchema = z.object({
  // Total cost of qualifying refueling property placed in service
  cost: z.number().nonnegative(),
  // Business use percentage (0–1); remainder is personal use
  business_use_pct: z.number().min(0).max(1).optional(),
  // Type of alternative fuel property
  fuel_type: z.nativeEnum(FuelType).optional(),
  // Number of locations (for business cap; defaults to 1)
  num_locations: z.number().int().positive().optional(),
});

type F8911Input = z.infer<typeof inputSchema>;

function businessCredit(input: F8911Input): number {
  const businessPct = input.business_use_pct ?? 0;
  if (businessPct <= 0) return 0;

  const businessCost = input.cost * businessPct;
  const rawCredit = businessCost * CREDIT_RATE;
  const locations = input.num_locations ?? 1;
  const cap = BUSINESS_MAX_PER_LOCATION * locations;
  return Math.min(rawCredit, cap);
}

function personalCredit(input: F8911Input): number {
  const businessPct = input.business_use_pct ?? 0;
  const personalPct = 1 - businessPct;
  if (personalPct <= 0) return 0;

  const personalCost = input.cost * personalPct;
  const rawCredit = personalCost * CREDIT_RATE;
  return Math.min(rawCredit, PERSONAL_MAX);
}

function buildOutputs(busCredit: number, persCredit: number): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  // Business credit → Line 6z general business credit
  if (busCredit > 0) {
    outputs.push({ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: busCredit } });
  }
  // Personal credit → Line 6b nonrefundable personal credit (also on schedule3)
  // Note: schedule3 Line 6b is the alt fuel vehicle refueling property credit field
  if (persCredit > 0) {
    outputs.push({ nodeType: schedule3.nodeType, fields: { line6b_alt_fuel_vehicle_refueling: persCredit } });
  }
  return outputs;
}

class F8911Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8911";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8911Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.cost <= 0) return { outputs: [] };
    const busCredit = businessCredit(input);
    const persCredit = personalCredit(input);
    return { outputs: buildOutputs(busCredit, persCredit) };
  }
}

export const f8911 = new F8911Node();
