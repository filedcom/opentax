import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { f3800 } from "./index.ts";
import {
  type CurrentOrphanAllocation,
  currentOrphanAllocationSchema,
} from "./current-allocation.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

class CurrentOrphanAllocationNode
  extends TaxNode<typeof currentOrphanAllocationSchema> {
  readonly nodeType = "form3800_current_orphan_allocation";
  readonly inputSchema = currentOrphanAllocationSchema;
  readonly outputNodes = new OutputNodes([f3800]);
  compute(_ctx: NodeContext, input: CurrentOrphanAllocation) {
    return {
      outputs: [output(f3800, { current_orphan_allocation_review: input })],
    };
  }
}
export const currentOrphanAllocationNode = new CurrentOrphanAllocationNode();
