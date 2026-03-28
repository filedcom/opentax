import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_a } from "../../intermediate/schedule_a/index.ts";
import { schedule_c } from "../../intermediate/schedule_c/index.ts";
import { schedule_e } from "../../intermediate/schedule_e/index.ts";

export const itemSchema = z.object({
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

export const inputSchema = z.object({
  f1098s: z.array(itemSchema).min(1),
});

class F1098Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a, schedule_e, schedule_c]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.f1098s) {
      const netInterest = (item.box1_mortgage_interest ?? 0) -
        (item.box4_refund_overpaid ?? 0);
      const box6 = item.box6_points_paid ?? 0;
      const box10 = item.box10_other ?? 0;
      const routing = item.for_routing ?? "schedule_a";

      if (netInterest > 0) {
        if (routing === "schedule_a") {
          out.add(schedule_a, { line8a_mortgage_interest_1098: netInterest });
        } else if (routing === "schedule_e") {
          out.add(schedule_e, { mortgage_interest: netInterest });
        } else if (routing === "schedule_c") {
          out.add(schedule_c, { line16a_interest_mortgage: netInterest });
        }
      }

      if (box6 > 0 && routing === "schedule_a") {
        out.add(schedule_a, { line8c_points_no_1098: box6 });
      }

      if (box10 > 0 && routing === "schedule_a") {
        out.add(schedule_a, { line5b_real_estate_tax: box10 });
      }

      // box5 MIP: NOT deductible for TY2025 — collected but not routed
    }

    return out.build();
  }
}

export const f1098 = new F1098Node();
