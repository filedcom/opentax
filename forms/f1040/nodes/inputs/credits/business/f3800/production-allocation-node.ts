import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { f3800 } from "./index.ts";
import {
  type CurrentProductionAllocation,
  currentProductionAllocationSchema,
} from "./production-allocation.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

class CurrentProductionAllocationNode
  extends TaxNode<typeof currentProductionAllocationSchema> {
  readonly nodeType = "form3800_current_production_allocation";
  readonly inputSchema = currentProductionAllocationSchema;
  readonly outputNodes = new OutputNodes([f3800]);
  compute(_ctx: NodeContext, input: CurrentProductionAllocation) {
    return {
      outputs: [output(f3800, { current_production_allocation_review: input })],
    };
  }
}
export const currentProductionAllocationNode =
  new CurrentProductionAllocationNode();
