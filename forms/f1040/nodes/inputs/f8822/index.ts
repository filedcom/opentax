import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

// Form 8822 — Change of Address
// Administrative form only — no tax outputs.

export const inputSchema = z.object({
  taxpayer_name: z.string(),
  ssn: z.string().optional(),
  old_address: z.string(),
  new_address: z.string(),
  new_city: z.string(),
  new_state: z.string().optional(),
  new_zip: z.string().optional(),
  new_country: z.string().optional(),
  spouse_name: z.string().optional(),
  spouse_ssn: z.string().optional(),
});

class F8822Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8822";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f8822 = new F8822Node();
