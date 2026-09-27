import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { calculateNewMarketsRecapture, recaptureSchema } from "./recapture.ts";

export const inputSchema = z.object({
  recaptures: z.array(recaptureSchema).min(1),
}).strict().superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.recaptures.forEach((recapture, index) => {
    const key = [
      recapture.cde_ein,
      recapture.initial_investment_date,
      recapture.investment_reference,
    ].join(":");
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recaptures", index],
        message: "Duplicate New Markets recapture notice and investment",
      });
    }
    seen.add(key);
  });
});

export type F8874RecaptureInput = z.infer<typeof inputSchema>;

export function calculateForm8874Recapture(raw: F8874RecaptureInput): number {
  const input = inputSchema.parse(raw);
  const total = input.recaptures.reduce(
    (sum, recapture) =>
      sum + calculateNewMarketsRecapture(recapture).schedule2Line17a,
    0,
  );
  if (!Number.isSafeInteger(total)) {
    throw new Error("New Markets recapture exceeds safe whole dollars");
  }
  return total;
}

class F8874RecaptureNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8874_recapture";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: F8874RecaptureInput): NodeResult {
    const total = calculateForm8874Recapture(rawInput);
    return {
      outputs: total > 0
        ? [output(schedule2, { line17a_new_markets_credit_recapture: total })]
        : [],
    };
  }
}

export const f8874_recapture = new F8874RecaptureNode();
