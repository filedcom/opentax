import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

export enum BiofuelType {
  AlcoholMixture = "alcohol_mixture",
  BiodieselMixture = "biodiesel_mixture",
  CellulosicBiofuel = "cellulosic_biofuel",
  SecondGenerationBiofuel = "second_generation_biofuel",
  SmallAgriProducer = "small_agri_producer",
}

// Existing gallons input is retained only to reject an active TY2025 claim.
// The 2025 Form 6478 line 3 fiscal-year pass-through allocation needs a
// separate, source-backed input and Form 3800 route.
const fuelEntrySchema = z.object({
  fuel_type: z.nativeEnum(BiofuelType),
  gallons: z.number().nonnegative(),
  credit_rate_override: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  fuel_entries: z.array(fuelEntrySchema).optional(),
}).strict();

type F6478Input = z.infer<typeof inputSchema>;

class F6478Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f6478";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F6478Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if ((input.fuel_entries?.length ?? 0) > 0) {
      throw new Error(
        "TY2025 Form 6478 production gallons are not eligible; only sourced fiscal-year pass-through line 3 allocations remain possible",
      );
    }
    return { outputs: [] };
  }
}

export const f6478 = new F6478Node();
