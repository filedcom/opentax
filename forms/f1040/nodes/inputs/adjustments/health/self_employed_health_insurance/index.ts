import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { form7206 } from "../../../../intermediate/forms/adjustments/health/form7206/index.ts";

// Premiums go to Form 7206, which limits them by the return's own business
// earnings (Schedule C net profit less the SE tax and retirement deductions).

// ── Per-item schema ───────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Total health insurance premiums paid — medical, dental, and vision
  // coverage for the taxpayer, spouse, and dependents
  premiums_paid: z.number().nonnegative(),
  // Premiums paid for months the owner was eligible for a subsidized
  // employer plan; Form 7206 line 1 leaves them out.
  employer_plan_eligible_month_premiums: z.number().nonnegative().optional(),
});

// ── Input schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  items: z.array(itemSchema).min(1),
  marketplace_ptc_premium_overlap: z.boolean(),
}).strict().superRefine((input, ctx) => {
  if (input.marketplace_ptc_premium_overlap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["marketplace_ptc_premium_overlap"],
      message:
        "Marketplace PTC overlap requires the Publication 974 deduction calculation; do not enter a premium-only deduction",
    });
  }
  if (
    input.items.some((item) =>
      (item.employer_plan_eligible_month_premiums ?? 0) > item.premiums_paid
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message:
        "Employer-plan-eligible month premiums cannot exceed premiums paid",
    });
  }
});

type SehiInput = z.infer<typeof inputSchema>;

// ── Node class ────────────────────────────────────────────────────────────────

class SelfEmployedHealthInsuranceNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "self_employed_health_insurance";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form7206]);

  compute(_ctx: NodeContext, rawInput: SehiInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.marketplace_ptc_premium_overlap) {
      throw new Error(
        "Self-employed health insurance Marketplace PTC overlap requires Publication 974 deduction calculation",
      );
    }
    const premiums = input.items.reduce(
      (sum, item) =>
        sum + item.premiums_paid -
        (item.employer_plan_eligible_month_premiums ?? 0),
      0,
    );
    if (premiums <= 0) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(form7206, {
          premium_only_premiums: premiums,
        }),
      ],
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const self_employed_health_insurance =
  new SelfEmployedHealthInsuranceNode();
