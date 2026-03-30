import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// ─── TY2025 Constants (IRC §6426, §6427) ─────────────────────────────────────

export enum BiofuelType {
  // Alcohol mixture credit (§6426(b)): $0.45/gal for ethanol (≥190 proof)
  AlcoholMixture = "alcohol_mixture",
  // Biodiesel mixture credit (§6426(c)): $1.00/gal
  BiodieselMixture = "biodiesel_mixture",
  // Cellulosic biofuel credit (§40(b)(6)): $1.01/gal
  CellulosicBiofuel = "cellulosic_biofuel",
  // Second-generation biofuel (§40(b)(6)): $1.01/gal
  SecondGenerationBiofuel = "second_generation_biofuel",
  // Small agri-biodiesel producer (§40A(b)(2)): $0.10/gal
  SmallAgriProducer = "small_agri_producer",
}

// Credit rates per gallon (TY2025 — rates are set by statute)
const CREDIT_RATES: Record<BiofuelType, number> = {
  [BiofuelType.AlcoholMixture]: 0.45,
  [BiofuelType.BiodieselMixture]: 1.00,
  [BiofuelType.CellulosicBiofuel]: 1.01,
  [BiofuelType.SecondGenerationBiofuel]: 1.01,
  [BiofuelType.SmallAgriProducer]: 0.10,
};

// Per-fuel-type entry
const fuelEntrySchema = z.object({
  fuel_type: z.nativeEnum(BiofuelType),
  // Qualified gallons produced/sold
  gallons: z.number().nonnegative(),
  // Optional: override credit rate (taxpayer may use different statutory rate)
  credit_rate_override: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  fuel_entries: z.array(fuelEntrySchema).optional(),
});

type FuelEntry = z.infer<typeof fuelEntrySchema>;
type F6478Input = z.infer<typeof inputSchema>;

function entryCredit(entry: FuelEntry): number {
  const rate = entry.credit_rate_override ?? CREDIT_RATES[entry.fuel_type];
  return entry.gallons * rate;
}

function totalCredit(entries: FuelEntry[]): number {
  return entries.reduce((sum, e) => sum + entryCredit(e), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F6478Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f6478";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F6478Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const entries = input.fuel_entries ?? [];
    const credit = totalCredit(entries);
    return { outputs: buildOutputs(credit) };
  }
}

export const f6478 = new F6478Node();
