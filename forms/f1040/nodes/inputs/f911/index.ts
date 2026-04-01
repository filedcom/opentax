import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 911 — Request for Taxpayer Advocate Service Assistance
// Filed when a taxpayer experiences significant hardship due to IRS actions.
// TAS is an independent organization within the IRS.
// Administrative form only — no tax computation or output routing.
// (IRS Form 911 Instructions)

export enum HardshipType {
  EconomicHardship = "economic_hardship",
  SystemicProblem = "systemic_problem",
  FairTreatment = "fair_treatment",
  Other = "other",
}

export const inputSchema = z.object({
  hardship_type: z.nativeEnum(HardshipType),
  taxpayer_description: z.string(),
  requested_relief: z.string(),
  contact_info: z.string().optional(),
});

class F911Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f911";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f911 = new F911Node();
