import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
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

type F1098Item = z.infer<typeof itemSchema>;

function mortgageInterestOutput(netInterest: number, routing: string): NodeOutput[] {
  if (netInterest <= 0) return [];
  if (routing === "schedule_e") return [{ nodeType: schedule_e.nodeType, input: { mortgage_interest: netInterest } }];
  if (routing === "schedule_c") return [{ nodeType: schedule_c.nodeType, input: { line16a_interest_mortgage: netInterest } }];
  return [{ nodeType: schedule_a.nodeType, input: { line8a_mortgage_interest_1098: netInterest } }];
}

function f1098ItemOutputs(item: F1098Item): NodeOutput[] {
  const netInterest = (item.box1_mortgage_interest ?? 0) - (item.box4_refund_overpaid ?? 0);
  const box6 = item.box6_points_paid ?? 0;
  const box10 = item.box10_other ?? 0;
  const routing = item.for_routing ?? "schedule_a";
  // box5 MIP: NOT deductible for TY2025 — collected but not routed
  return [
    ...mortgageInterestOutput(netInterest, routing),
    ...(box6 > 0 && routing === "schedule_a" ? [{ nodeType: schedule_a.nodeType, input: { line8c_points_no_1098: box6 } }] : []),
    ...(box10 > 0 && routing === "schedule_a" ? [{ nodeType: schedule_a.nodeType, input: { line5b_real_estate_tax: box10 } }] : []),
  ];
}

class F1098Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a, schedule_e, schedule_c]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.f1098s.flatMap(f1098ItemOutputs) };
  }
}

export const f1098 = new F1098Node();
