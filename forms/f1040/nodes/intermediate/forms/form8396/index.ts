import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import {
  calculateForm8396Line3,
  type Form8396Source,
  form8396SourceSchema,
} from "./calculation.ts";

export { form8396SourceSchema as inputSchema } from "./calculation.ts";

class Form8396Node extends TaxNode<typeof form8396SourceSchema> {
  readonly nodeType = "form8396";
  readonly inputSchema = form8396SourceSchema;
  readonly outputNodes = new OutputNodes([scheduleA, schedule3, f1040]);

  compute(_ctx: NodeContext, rawInput: Form8396Source): NodeResult {
    const source = form8396SourceSchema.parse(rawInput);
    const line3 = calculateForm8396Line3(source);
    const prior = source.prior_2024_form8396;
    const priorCarryforward = (prior?.line14_2023_carryforward ?? 0) +
      (prior?.line16_2022_carryforward ?? 0) +
      (prior?.line17_2024_carryforward ?? 0);
    if (line3 + priorCarryforward === 0) return { outputs: [] };
    return {
      outputs: [
        output(f1040, { form8396_source: source }),
        output(schedule3, { form8396_source_credit_pending: true }),
        ...(line3 > 0
          ? [output(scheduleA, {
            form8396_interest_credit_reduction: line3,
            form8396_interest_reporting_line: source.interest_reporting_line,
          })]
          : []),
      ],
    };
  }
}

export const form8396 = new Form8396Node();
