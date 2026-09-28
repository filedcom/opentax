import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { z } from "zod";
import {
  form2210FBoxBInputSchema,
} from "../../../2025/form2210f_box_b.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

export const inputSchema = z.object({ source: form2210FBoxBInputSchema }).strict();

class F2210FNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2210f";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: unknown): NodeResult {
    const { source } = inputSchema.parse(rawInput);
    return {
      outputs: [this.outputNodes.output(f1040, {
        f2210f_box_b_source: source,
      })],
    };
  }
}

export const f2210f = new F2210FNode();
