import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 6198 receives at-risk loss data from upstream nodes (schedule_c, schedule_e)
// and computes the deductible vs. suspended portions under IRC §465.
//
// Upstream senders:
//   schedule_c  → { schedule_c_loss: number }   (negative; only when "not all at risk" box)
//   schedule_e  → { prior_unallowed: number }    (positive; prior year suspended losses)

const inputSchema = z.object({
  // Current-year net loss from the at-risk activity (negative number or zero).
  // Includes only the loss portion; income is separate (current_year_income).
  schedule_c_loss: z.number().nonpositive().optional(),
  // Net loss from Schedule F farming activity (negative number; at-risk box 36b)
  schedule_f_loss: z.number().nonpositive().optional(),

  // Prior-year at-risk losses that were suspended and carried forward.
  prior_unallowed: z.number().nonnegative().optional(),

  // Income or gains from the activity for the current year (Part I lines 1–4).
  // A positive value offsets the loss before the at-risk limit is applied.
  current_year_income: z.number().nonnegative().optional(),

  // Amount at risk at year end (Part II line 10b or Part III line 19b).
  // The deductible loss cannot exceed this amount (IRC §465(a)(1)).
  amount_at_risk: z.number().nonnegative().optional(),
});

type Form6198Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Total loss from the activity for the year (absolute value).
// = |schedule_c_loss| + |schedule_f_loss| + prior_unallowed − current_year_income
// A positive result means there is a net loss subject to limitation.
function netLossAmount(input: Form6198Input): number {
  const currentLoss = Math.abs(input.schedule_c_loss ?? 0) + Math.abs(input.schedule_f_loss ?? 0);
  const priorCarryforward = input.prior_unallowed ?? 0;
  const income = input.current_year_income ?? 0;
  return Math.max(0, currentLoss + priorCarryforward - income);
}

// Amount disallowed (suspended to next year).
function disallowedLoss(totalLoss: number, atRisk: number): number {
  return Math.max(0, totalLoss - atRisk);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6198Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6198";
  readonly inputSchema = inputSchema;
  // Disallowed (suspended) losses are added back to Schedule 1 as a positive
  // adjustment, reversing the upstream-posted at-risk loss to the extent it
  // exceeds the taxpayer's amount at risk.
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form6198Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const totalLoss = netLossAmount(input);

    // No loss to limit — report all items in full (Part IV line 21 instruction).
    if (totalLoss === 0) {
      return { outputs: [] };
    }

    const atRisk = input.amount_at_risk ?? 0;
    const disallowed = disallowedLoss(totalLoss, atRisk);

    // Loss is fully within at-risk amount — no limitation needed.
    if (disallowed === 0) {
      return { outputs: [] };
    }

    // Disallowed portion: add back to Schedule 1 as a positive adjustment
    // (reduces the net loss already posted by the upstream node).
    return {
      outputs: [
        this.outputNodes.output(schedule1, { at_risk_disallowed_add_back: disallowed }),
        this.outputNodes.output(agi_aggregator, { at_risk_disallowed_add_back: disallowed }),
      ],
      carryforwards: { suspended_at_risk_loss_6198: disallowed },
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6198 = new Form6198Node();
