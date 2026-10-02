import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

// Category 1 is an individual's direct tax ownership of an FDE or operation
// of a foreign branch. The parent Form 8858 and its possible Schedule M must
// be resolved before any such return can be filed from this product.
export const itemSchema = z.object({
  filing_category: z.literal("1_direct_owner_or_operator"),
  activity_kind: z.enum(["foreign_disregarded_entity", "foreign_branch"]),
  activity_reference: z.string().trim().min(1),
  individual_tin: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  related_party_transactions: z.boolean(),
}).strict();

export const inputSchema = z.object({
  activities: z.array(itemSchema).min(1),
}).strict().refine(
  (input) =>
    new Set(input.activities.map((item) => item.activity_reference)).size ===
      input.activities.length,
  "Form 8858 needs one distinct record per FDE or foreign branch",
);

export function assertForm8858FilingSource(source: unknown): void {
  if (source === undefined) return;
  const { activities } = inputSchema.parse(source);
  throw new Error(
    `Individual Form 8858 filing source (${activities.length} FDE/foreign branch activities) needs its Form 8858, applicable Schedule M, and income/credit reconciliation before export`,
  );
}

class F8858Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8858";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(raw);
    return { outputs: [] };
  }
}

export const f8858 = new F8858Node();
