import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8867 — Paid Preparer's Due Diligence Requirements
// Required for paid preparers when claiming EITC, CTC/ACTC, AOTC, or HOH.
// IRC §6695(g): $600 penalty per failure (TY2025, Rev. Proc. 2024-40 §3.57).
// This is a compliance/checklist form — it produces NO tax computation output.

// Credits/benefits that require Form 8867 due diligence (IRC §6695(g))
export enum CreditClaimed {
  EITC = "EITC",    // Earned Income Tax Credit
  CTC = "CTC",     // Child Tax Credit / Additional Child Tax Credit
  AOTC = "AOTC",   // American Opportunity Tax Credit
  HOH = "HOH",     // Head of Household filing status
}

export const itemSchema = z.object({
  // Which credits/benefits are claimed on the return (may be multiple)
  credits_claimed: z.array(z.nativeEnum(CreditClaimed)).optional(),
  // Preparer due diligence flags (checklist questions from Form 8867)
  taxpayer_interview_conducted: z.boolean().optional(),
  documentation_reviewed: z.boolean().optional(),
  knowledge_questions_satisfied: z.boolean().optional(),
  records_retained: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8867s: z.array(itemSchema).min(1),
});

class F8867Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8867";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    // Validates input (throws on invalid enum values via Zod)
    inputSchema.parse(input);

    // Compliance form only — no tax computation output
    return { outputs: [] };
  }
}

export const f8867 = new F8867Node();
