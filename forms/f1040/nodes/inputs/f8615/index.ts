import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { type F8615Input, inputSchema } from "./schema.ts";

export { inputSchema };

class F8615InputNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8615";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([income_tax_calculation]);

  compute(_ctx: NodeContext, rawInput: F8615Input): NodeResult {
    const source = inputSchema.parse(rawInput);
    return {
      outputs: [this.outputNodes.output(income_tax_calculation, {
        form8615_source: source,
      })],
    };
  }
}

export const f8615 = new F8615InputNode();
