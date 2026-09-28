import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// The existing gallons fields cannot establish a TY2025 Form 8864 credit.
// Biodiesel/renewable-diesel/SAF credits expired after 2024. The surviving
// small agri-biodiesel producer credit needs sale/use date and qualification
// facts that these inputs do not carry. Retain the fields only to reject an
// asserted claim instead of silently discarding it.
export const inputSchema = z.object({
  gallons_biodiesel: z.number().nonnegative().optional(),
  gallons_agri_biodiesel: z.number().nonnegative().optional(),
  gallons_renewable_diesel: z.number().nonnegative().optional(),
  gallons_saf: z.number().nonnegative().optional(),
  saf_ghg_reduction_percentage: z.number().nonnegative().optional(),
}).strict();

type F8864Input = z.infer<typeof inputSchema>;

class F8864Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8864";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8864Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (Object.values(input).some((value) => value !== undefined)) {
      throw new Error(
        "TY2025 Form 8864 fuel credit needs a dated, qualified source and Form 3800 filing route; unsourced gallons are not eligible",
      );
    }
    return { outputs: [] };
  }
}

export const f8864 = new F8864Node();
