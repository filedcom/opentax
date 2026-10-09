import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

import {
  computeCredit,
  inputSchema,
  validDisabilityEvidence,
} from "./calculation.ts";
export {
  computeCredit,
  inputSchema,
  validDisabilityEvidence,
} from "./calculation.ts";

class ScheduleRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const credit = computeCredit(parsed);

    if (credit === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      output(schedule3, {
        line6d_elderly_disabled_credit: credit,
        schedule_r_source: parsed,
      }),
    ];
    const taxpayerDisability = parsed.taxpayer_disabled === true &&
      parsed.taxpayer_age_65_or_older !== true;
    const spouseDisability = parsed.spouse_disabled === true &&
      parsed.spouse_age_65_or_older !== true;
    if (
      (taxpayerDisability || spouseDisability) &&
      (!taxpayerDisability ||
        validDisabilityEvidence(parsed.taxpayer_disability_evidence)) &&
      (!spouseDisability ||
        validDisabilityEvidence(parsed.spouse_disability_evidence))
    ) {
      outputs.push(output(f1040, { schedule_r_disability_qualified: true }));
    }

    return { outputs };
  }
}

export const schedule_r = new ScheduleRNode();
