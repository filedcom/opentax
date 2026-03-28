import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  lender_name: z.string(),
  box1_mortgage_interest: z.number().nonnegative().optional(),
  box2_outstanding_principal: z.number().nonnegative().optional(),
  box3_origination_date: z.string().optional(),
  box4_refund_overpaid: z.number().nonnegative().optional(),
  box5_mip: z.number().nonnegative().optional(),
  box6_points_paid: z.number().nonnegative().optional(),
  box10_other: z.number().nonnegative().optional(),
  for_routing: z.enum(["schedule_a", "schedule_e", "schedule_c"]).optional(),
});

type F1098Input = z.infer<typeof inputSchema>;

class F1098Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule_a",
    "schedule_e",
    "schedule_c",
  ] as const;

  compute(input: F1098Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const netInterest =
      (input.box1_mortgage_interest ?? 0) - (input.box4_refund_overpaid ?? 0);
    const box6 = input.box6_points_paid ?? 0;
    const box10 = input.box10_other ?? 0;
    const routing = input.for_routing ?? "schedule_a";

    // Route net mortgage interest based on for_routing
    if (netInterest > 0) {
      if (routing === "schedule_a") {
        outputs.push({
          nodeType: "schedule_a",
          input: { line8a_mortgage_interest_1098: netInterest },
        });
      } else if (routing === "schedule_e") {
        outputs.push({
          nodeType: "schedule_e",
          input: { mortgage_interest: netInterest },
        });
      } else if (routing === "schedule_c") {
        outputs.push({
          nodeType: "schedule_c",
          input: { line16a_interest_mortgage: netInterest },
        });
      }
    }

    // box6 points paid → schedule_a only
    if (box6 > 0 && routing === "schedule_a") {
      outputs.push({
        nodeType: "schedule_a",
        input: { line8c_points_no_1098: box6 },
      });
    }

    // box10 real estate taxes from escrow → schedule_a only
    if (box10 > 0 && routing === "schedule_a") {
      outputs.push({
        nodeType: "schedule_a",
        input: { line5b_real_estate_tax: box10 },
      });
    }

    // box5 MIP: NOT deductible for TY2025 — collected but not routed

    return { outputs };
  }
}

export const f1098 = new F1098Node();
