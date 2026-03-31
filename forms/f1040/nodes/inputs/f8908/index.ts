import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §45L — Energy Efficient Home Credit) ───────────────

// Credit amounts per qualifying home (TY2025 under IRA-expanded §45L)
// Tier 1: Meets 50% energy savings standard (ENERGY STAR certified): $2,500
const CREDIT_50PCT_STANDARD = 2_500;
// Tier 2: Zero Energy Ready Home (DOE ZERH): $5,000
const CREDIT_ZERO_ENERGY_READY = 5_000;

export enum ConstructionType {
  // Single-family home
  SingleFamily = "single_family",
  // Manufactured home
  ManufacturedHome = "manufactured_home",
  // Multifamily dwelling unit
  Multifamily = "multifamily",
}

export enum EnergyCertification {
  // Meets ENERGY STAR requirements with 50% energy savings
  EnergyStar50Pct = "energy_star_50pct",
  // DOE Zero Energy Ready Home (ZERH) certification
  ZeroEnergyReady = "zero_energy_ready",
  // ENERGY STAR Multifamily (45 ACH threshold)
  EnergyStar45Ach = "energy_star_45ach",
}

// Per-home item schema
export const itemSchema = z.object({
  // Address / identifier of the home
  home_address: z.string().optional(),
  construction_type: z.nativeEnum(ConstructionType),
  energy_certification: z.nativeEnum(EnergyCertification),
  // Credit amount per home — may be provided directly if taxpayer computed it
  credit_amount_override: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8908s: z.array(itemSchema).min(1),
});

type F8908Item = z.infer<typeof itemSchema>;

function homeCredit(item: F8908Item): number {
  if (item.credit_amount_override !== undefined) {
    return item.credit_amount_override;
  }
  if (item.energy_certification === EnergyCertification.ZeroEnergyReady) {
    return CREDIT_ZERO_ENERGY_READY;
  }
  return CREDIT_50PCT_STANDARD;
}

function totalCredit(items: F8908Item[]): number {
  return items.reduce((sum, item) => sum + homeCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8908Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8908";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f8908s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8908 = new F8908Node();
