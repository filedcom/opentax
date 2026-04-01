import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8857 — Request for Innocent Spouse Relief
// Used to request relief from joint and several liability under IRC §6015.
// Three relief types: innocent spouse (§6015(b)), separation of liability (§6015(c)),
// and equitable relief (§6015(f)).
// Administrative form only — no tax computation outputs.

export enum ReliefType {
  InnocentSpouse = "innocent_spouse",
  SeparationOfLiability = "separation_of_liability",
  Equitable = "equitable",
}

export const inputSchema = z.object({
  // Type of innocent spouse relief requested
  relief_type: z.nativeEnum(ReliefType).optional(),
  // Tax years for which relief is requested
  tax_years: z.array(z.number().int()).optional(),
  // Description of erroneous items attributable to the other spouse
  erroneous_items: z.array(z.string()).optional(),
  // Whether the requesting spouse knew or had reason to know of the understatement
  knowledge_indicator: z.boolean().optional(),
  // Whether paying the tax would cause economic hardship
  economic_hardship: z.boolean().optional(),
  // Name of the requesting spouse
  requesting_spouse_name: z.string().optional(),
  // SSN of the requesting spouse
  requesting_spouse_ssn: z.string().optional(),
});

class F8857Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8857";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f8857 = new F8857Node();
