import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { w2 } from "../w2/index.ts";
import { type F8958Input, inputSchema } from "./source.ts";

export {
  AllocationBasis,
  allocationItemSchema,
  CommunityPropertyState,
  Form8958Line,
  inputSchema,
  prepareF8958Allocation,
} from "./source.ts";

class F8958Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8958";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([w2]);

  compute(_ctx: NodeContext, rawInput: F8958Input): NodeResult {
    const source = inputSchema.parse(rawInput);
    return {
      outputs: [this.outputNodes.output(w2, { f8958_allocation: source })],
    };
  }
}

export const f8958 = new F8958Node();
