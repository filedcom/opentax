import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1310 — Statement of Person Claiming Refund Due a Deceased Taxpayer
// Administrative form only — no tax outputs.

export enum ClaimantType {
  SpouseFilingJointly = "spouse_joint",
  CourtAppointedRepresentative = "court_appointed",
  Other = "other",
}

export const inputSchema = z.object({
  deceased_name: z.string(),
  deceased_ssn: z.string(),
  date_of_death: z.string(),
  claimant_name: z.string(),
  claimant_type: z.nativeEnum(ClaimantType),
  court_certificate_attached: z.boolean().optional(),
  proof_of_death_attached: z.boolean().optional(),
});

class F1310Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1310";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f1310 = new F1310Node();
