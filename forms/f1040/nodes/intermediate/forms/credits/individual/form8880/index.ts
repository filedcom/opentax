export { ableContributionReviewSchema } from "./able_contribution_review.ts";
export { employeeContributionReviewSchema } from "./employee_contribution_review.ts";
export { nonjointDistributionReviewSchema } from "./nonjoint_distribution_review.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { schedule3 } from "../../../../aggregation/general/return-assembly/schedule3/index.ts";
import {
  type Form8880Input,
  inputSchema,
  ownedDeferrals,
  ownedLine1Contributions,
} from "./calculation.ts";

export {
  assertEligibleContributor,
  calculateForm8880,
  eligibleW2DeferralAmount,
  inputSchema,
  jointDistributionReviewSchema,
  ownedDeferrals,
  ownedLine1Contributions,
} from "./calculation.ts";

class Form8880Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8880";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form8880Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const owned = ownedDeferrals(input);
    const line1 = ownedLine1Contributions(input);
    const contributions = line1.taxpayer + line1.spouse + owned.taxpayer +
      owned.spouse;
    if (contributions === 0 && !input.able_contribution_review) {
      return { outputs: [] };
    }
    return {
      outputs: [this.outputNodes.output(schedule3, { form8880_source: input })],
    };
  }
}

export const form8880 = new Form8880Node();
