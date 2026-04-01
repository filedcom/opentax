import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8820 — Orphan Drug Credit (IRC §45C).
// Credit = 25% of qualified clinical testing expenses for FDA-designated orphan drugs.
// Rate reduced from 50% to 25% by TCJA (P.L. 115-97, §13401), effective TY2018+.
// Part of the General Business Credit (IRC §38(b)(20)).
// Routes to Schedule 3 line 6z (general business credit aggregation).
// Note: IRC §280C(b) requires reducing the expense deduction by the credit amount
// (basis reduction handled in business expense computation, not this node).

// TY2025 constant — IRC §45C(a); TCJA P.L. 115-97 §13401
const CREDIT_RATE = 0.25;

export const itemSchema = z.object({
  // Qualified clinical testing expenses for FDA-designated orphan drugs — Form 8820 Line 1
  qualified_clinical_testing_expenses: z.number().nonnegative().optional(),
  // Whether the taxpayer is a qualified small biotech company — informational for TY2025
  is_small_biotech: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8820s: z.array(itemSchema).min(1),
});

type F8820Items = z.infer<typeof itemSchema>[];

function totalExpenses(items: F8820Items): number {
  return items.reduce(
    (sum, item) => sum + (item.qualified_clinical_testing_expenses ?? 0),
    0,
  );
}

function computeCredit(expenses: number): number {
  return expenses * CREDIT_RATE;
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8820Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8820";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const expenses = totalExpenses(parsed.f8820s);
    const credit = computeCredit(expenses);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8820 = new F8820Node();
