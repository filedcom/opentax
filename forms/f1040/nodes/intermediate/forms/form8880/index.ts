import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import {
  type Form8880Input,
  inputSchema,
  ownedDeferrals,
} from "./calculation.ts";

export {
  assertEligibleContributor,
  calculateForm8880,
  eligibleW2DeferralAmount,
  inputSchema,
  jointDistributionReviewSchema,
  ownedDeferrals,
} from "./calculation.ts";

class Form8880Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8880";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form8880Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const owned = ownedDeferrals(input);
    const contributions = (input.ira_contributions_taxpayer ?? 0) +
      (input.ira_contributions_spouse ?? 0) + owned.taxpayer + owned.spouse;
    if (contributions === 0) return { outputs: [] };
    return {
      outputs: [this.outputNodes.output(schedule3, { form8880_source: input })],
    };
  }
}

export const form8880 = new Form8880Node();
