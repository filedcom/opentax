import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

export const inputSchema = z.object({
  extension_filed: z.boolean().optional(),
  amount_paid_with_extension: z.number().nonnegative().optional(),
});

type EXTInput = z.infer<typeof inputSchema>;

class EXTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ext";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: EXTInput): NodeResult {
    const out = this.outputNodes.builder();

    if (
      input.amount_paid_with_extension !== undefined &&
      input.amount_paid_with_extension > 0
    ) {
      out.add(f1040, {
        line38_amount_paid_extension: input.amount_paid_with_extension,
      });
    }

    return out.build();
  }
}

export const ext = new EXTNode();
