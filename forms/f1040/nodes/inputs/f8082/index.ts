import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8082: Notice of Inconsistent Treatment or Administrative Adjustment Request (AAR)
// Filed by partners, S corp shareholders, or trust/estate beneficiaries who report items
// inconsistently with the entity's Schedule K-1. Also used for AAR under BBA audit procedures.
// IRC §6222, §6227; Reg. §301.6222(b)-1T.
// No tax computed — this is a notice/disclosure form that attaches to the return.

export enum EntityType {
  PARTNERSHIP = "PARTNERSHIP",
  S_CORP = "S_CORP",
  TRUST = "TRUST",
  ESTATE = "ESTATE",
}

// Per-item schema — each Form 8082 covers one inconsistent K-1 item
export const itemSchema = z.object({
  // Type of pass-through entity issuing the K-1
  entity_type: z.nativeEnum(EntityType),
  // Legal name of the pass-through entity
  entity_name: z.string(),
  // EIN of the pass-through entity
  entity_ein: z.string(),
  // Description of the K-1 item reported inconsistently (Form 8082 Part I col. a)
  schedule_k1_item_description: z.string(),
  // Amount as shown on the entity's Schedule K-1 (Form 8082 Part I col. b)
  amount_as_reported: z.number(),
  // Amount as reported on the taxpayer's return (Form 8082 Part I col. c)
  amount_as_claimed: z.number(),
  // Reason for inconsistent treatment (optional explanation)
  reason_for_inconsistency: z.string().optional(),
});

export const inputSchema = z.object({
  f8082s: z.array(itemSchema).min(1),
});

class F8082Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8082";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    // Validate input — throws on invalid data
    inputSchema.parse(input);

    // Form 8082 is a notice/disclosure form only.
    // No tax is computed and no downstream routing occurs.
    // The form attaches to the return to notify the IRS of inconsistent treatment.
    return { outputs: [] };
  }
}

export const f8082 = new F8082Node();
