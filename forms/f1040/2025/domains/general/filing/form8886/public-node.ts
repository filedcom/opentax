import { z } from "zod";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { publicSourceSchema } from "./source.ts";

/** Disclosure facts are retained separately; they never change tax amounts. */
class Form8886Node extends TaxNode<typeof publicSourceSchema> {
  readonly nodeType = "f8886";
  readonly inputSchema = publicSourceSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(
    _ctx: NodeContext,
    input: z.infer<typeof publicSourceSchema>,
  ): NodeResult {
    publicSourceSchema.parse(input);
    return { outputs: [] };
  }
}
export const f8886 = new Form8886Node();
