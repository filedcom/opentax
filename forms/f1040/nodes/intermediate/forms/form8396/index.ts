import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { schedule_a } from "../../../inputs/schedule_a/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import {
  calculateForm8396Line3,
  form8396SourceSchema,
  type Form8396Source,
} from "./calculation.ts";

export { form8396SourceSchema as inputSchema } from "./calculation.ts";

class Form8396Node extends TaxNode<typeof form8396SourceSchema> {
  readonly nodeType = "form8396";
  readonly inputSchema = form8396SourceSchema;
  readonly outputNodes = new OutputNodes([schedule_a, schedule3, f1040]);

  compute(_ctx: NodeContext, rawInput: Form8396Source): NodeResult {
    const source = form8396SourceSchema.parse(rawInput);
    const line3 = calculateForm8396Line3(source);
    const priorCarryforward = source.carryforward_vintages.reduce(
      (sum, vintage) => sum + vintage.amount,
      0,
    );
    if (line3 + priorCarryforward === 0) return { outputs: [] };
    return {
      outputs: [
        output(f1040, { form8396_source: source }),
        output(schedule3, { form8396_source_credit_pending: true }),
        ...(line3 > 0
          ? [output(schedule_a, {
            form8396_interest_credit_reduction: line3,
            form8396_interest_reporting_line: source.interest_reporting_line,
          })]
          : []),
      ],
    };
  }
}

export const form8396 = new Form8396Node();
