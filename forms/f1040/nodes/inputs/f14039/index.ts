import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 14039 — Identity Theft Affidavit
// Filed when a taxpayer suspects their SSN was used fraudulently.
// Triggers the IRS Identity Protection Program.
// Administrative form only — no tax computation or output routing.
// (IRS Form 14039 Instructions)

export enum IncidentType {
  FilingDisruption = "filing_disruption",
  Other = "other",
}

export const inputSchema = z.object({
  incident_type: z.nativeEnum(IncidentType),
  identity_theft_description: z.string(),
  police_report_number: z.string().optional(),
  date_of_incident: z.string().optional(),
});

class F14039Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f14039";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f14039 = new F14039Node();
