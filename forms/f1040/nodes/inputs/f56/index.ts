import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 56 — Notice Concerning Fiduciary Relationship (IRC §6903)
// Administrative form filed to notify the IRS when a fiduciary relationship
// is established or terminated. No tax computation or routing outputs.

export enum FiduciaryType {
  Executor = "executor",
  Administrator = "administrator",
  Trustee = "trustee",
  Guardian = "guardian",
  Conservator = "conservator",
  Receiver = "receiver",
  Assignee = "assignee",
  Other = "other",
}

export const inputSchema = z.object({
  // Part I, Line 1 — Type of fiduciary relationship (Form 56, Boxes 1a–1g + other)
  fiduciary_type: z.nativeEnum(FiduciaryType),
  // Part I — Name of the fiduciary
  fiduciary_name: z.string(),
  // Part I — Street address, city, state, zip of fiduciary
  fiduciary_address: z.string(),
  // Part I — Name of estate or trust (if applicable)
  estate_or_trust_name: z.string().optional(),
  // Part I, Line 2a — Date fiduciary authority becomes effective (MM/DD/YYYY)
  effective_date: z.string(),
  // Part III, Line 7 — Date fiduciary authority is revoked/terminated (if applicable)
  revocation_termination_date: z.string().optional(),
});

class F56Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f56";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — establishes fiduciary notification with IRS.
    // No tax computations or downstream routing outputs.
    return { outputs: [] };
  }
}

export const f56 = new F56Node();
