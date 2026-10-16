import { TaxNode } from "../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../core/types/node-context.ts";
import { buildStartNode } from "../start.ts";
import { inputNodes } from "./inputs.ts";
import { claimInputSchema as scheduleAClaim } from "./nodes/schedule-a.ts";
const base = buildStartNode(inputNodes, { routeLegacyJointSeOwners: false });
/** Route the original medical inventory before AGI; Schedule A consumes AGI
 * later, so a Schedule A-to-HSA edge would create a calculation cycle. */
class SourceStart2026 extends TaxNode<typeof base.inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = base.inputSchema;
  readonly outputNodes = base.outputNodes;
  compute(ctx: NodeContext, input: Record<string, unknown>) {
    const result = base.compute(ctx, input);
    if (input.hsa_accounts) {
      return {
        ...result,
        outputs: [...result.outputs, {
          nodeType: "hsa_accounts",
          fields: {
            schedule_a_medical_sources: input.schedule_a
              ? scheduleAClaim.parse(input.schedule_a).medical_payments ?? []
              : [],
          },
        }],
      };
    }
    return result;
  }
}
export const sourceStart2026 = new SourceStart2026();
