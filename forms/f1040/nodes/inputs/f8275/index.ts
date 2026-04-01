import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8275 — Disclosure Statement
// Used to disclose items or positions on a return to avoid accuracy-related penalties
// under IRC §6662. Form 8275-R is for positions contrary to Treasury Regulations.
// Administrative form only — no tax computation outputs.

export enum DisclosureType {
  Position = "position",
  Regulation = "regulation",
}

export const inputSchema = z.object({
  // Whether this is Form 8275 (position disclosure) or Form 8275-R (regulation position)
  disclosure_type: z.nativeEnum(DisclosureType).optional(),
  // Form or schedule where the disclosed item appears (e.g., "Schedule C", "1040")
  form_or_schedule: z.string().optional(),
  // Line number on the form/schedule
  line_number: z.string().optional(),
  // Description of the disclosed item or position
  item_description: z.string().optional(),
  // Dollar amount of the disclosed item (may be absent for pure position disclosures)
  amount: z.number().nonnegative().optional(),
  // Detailed explanation of the disclosed item or position (Part II)
  information_summary: z.string().optional(),
  // Revenue ruling or regulation number (primarily for Form 8275-R)
  revenue_ruling: z.string().optional(),
});

class F8275Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8275";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f8275 = new F8275Node();
