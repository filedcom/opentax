import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 2120 — Multiple Support Declaration
// Used when multiple persons together provide more than 50% of a dependent's support,
// but no single person provides more than 50% alone (IRC §152(d)(3)).
// Administrative form only — no tax computation outputs.

export const inputSchema = z.object({
  // Name of the person being supported (the dependent)
  dependent_name: z.string().optional(),
  // SSN of the person being supported
  dependent_ssn: z.string().optional(),
  // Calendar year for this declaration
  calendar_year: z.number().int().min(1900).max(2099).optional(),
  // Name of the taxpayer claiming the dependency exemption/deduction
  claiming_taxpayer_name: z.string().optional(),
  // SSN of the taxpayer claiming the dependency exemption/deduction
  claiming_taxpayer_ssn: z.string().optional(),
  // Names of other persons who provided support but agree not to claim the dependent
  providing_party_names: z.array(z.string()).optional(),
});

class F2120Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2120";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f2120 = new F2120Node();
