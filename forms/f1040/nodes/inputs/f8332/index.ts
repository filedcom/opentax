import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

// Form 8332 — Release/Revocation of Release of Claim to Exemption for Child by Custodial Parent
// Administrative form only — no tax outputs.

const childSchema = z.object({
  name: z.string(),
  ssn: z.string().optional(),
});

export const inputSchema = z.object({
  custodial_parent_name: z.string(),
  custodial_parent_ssn: z.string().optional(),
  noncustodial_parent_name: z.string(),
  noncustodial_parent_ssn: z.string().optional(),
  children: z.array(childSchema).min(1),
  tax_years_released: z.union([z.literal("all_future"), z.array(z.number().int())]),
  is_revocation: z.boolean().optional(),
});

class F8332Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8332";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f8332 = new F8332Node();
