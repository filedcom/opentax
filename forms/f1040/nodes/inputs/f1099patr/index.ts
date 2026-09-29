import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

import { distributionTotal, inputSchema, type PATRItems } from "./schema.ts";
export { inputSchema, itemSchema } from "./schema.ts";

function totalFederalWithheld(items: PATRItems): number {
  return items.reduce(
    (sum, item) => sum + (item.box4_federal_withheld ?? 0),
    0,
  );
}

function farmOutputs(items: PATRItems): NodeOutput[] {
  const farmSources = items.flatMap((item) => {
    const treatment = item.distribution_treatment;
    if (treatment?.kind !== "farm" || distributionTotal(item) === 0) return [];
    return [{
      farm_id: treatment.farm_id,
      kind: "1099patr_cooperative" as const,
      amount: distributionTotal(item),
      taxable_amount: treatment.verified_taxable_amount,
    }];
  });
  return farmSources.length > 0
    ? [output(schedule_f, { farm_sources: farmSources })]
    : [];
}

function f1040Output(items: PATRItems): NodeOutput[] {
  const withheld = totalFederalWithheld(items);
  if (withheld === 0) return [];
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

class F1099PATRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099patr";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_f, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099patrs } = parsed;

    const outputs: NodeOutput[] = [
      ...farmOutputs(f1099patrs),
      ...f1040Output(f1099patrs),
    ];

    // Preserve specified-cooperative source for the Form 8995-A/Schedule D
    // filing cross-check. This does not create a second tax or MeF document.
    if (
      f1099patrs.some((item) =>
        (item.trade_or_business === true ||
          item.distribution_treatment?.kind === "farm") &&
        item.box13_specified_cooperative === true &&
        (item.box7_qualified_payments ?? 0) > 0
      )
    ) {
      outputs.push({ nodeType: this.nodeType, fields: parsed });
    }

    return { outputs };
  }
}

export const f1099patr = new F1099PATRNode();
