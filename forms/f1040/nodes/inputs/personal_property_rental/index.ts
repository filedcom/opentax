import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

export const itemSchema = z.object({
  property_description: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  rental_agreement_reference: z.string().trim().min(1),
  payment_record_reference: z.string().trim().min(1),
  gross_rent: z.number().int().positive(),
  deductible_expenses: z.number().int().nonnegative(),
  expense_workpaper_reference: z.string().trim().min(1).optional(),
  engaged_for_profit_reviewed: z.literal(true),
  not_trade_or_business_reviewed: z.literal(true),
  expenses_not_claimed_elsewhere: z.literal(true),
}).strict().superRefine((item, ctx) => {
  if (item.deductible_expenses > 0 && !item.expense_workpaper_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expense_workpaper_reference"],
      message: "Personal-property rental expenses need a reviewed workpaper",
    });
  }
});

export const inputSchema = z.object({
  personal_property_rentals: z.array(itemSchema).max(20),
});

export function personalPropertyRentalTotals(rawInput: unknown): {
  income: number;
  expenses: number;
} {
  const parsed = inputSchema.parse(rawInput);
  const sourceKeys = parsed.personal_property_rentals.map((item) =>
    `${item.rental_agreement_reference}:${item.payment_record_reference}`
  );
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    throw new Error("Personal-property rental source cannot be counted twice");
  }
  return parsed.personal_property_rentals.reduce(
    (sum, item) => ({
      income: sum.income + item.gross_rent,
      expenses: sum.expenses + item.deductible_expenses,
    }),
    { income: 0, expenses: 0 },
  );
}

class PersonalPropertyRentalNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "personal_property_rental";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const totals = personalPropertyRentalTotals(rawInput);
    if (totals.income === 0) return { outputs: [] };
    const fields = {
      line8l_personal_property_rent: totals.income,
      line24b_personal_property_expenses: totals.expenses,
    };
    return {
      outputs: [
        this.outputNodes.output(schedule1, fields),
        this.outputNodes.output(agi_aggregator, fields),
      ],
    };
  }
}

export const personal_property_rental = new PersonalPropertyRentalNode();
