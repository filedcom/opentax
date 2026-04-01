import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 843 — Claim for Refund and Request for Abatement
// Administrative form only — does not produce tax computation outputs.
// Cannot be used for income tax refunds (use Form 1040-X for that).

export enum TaxType {
  Employment = "employment",
  Estate = "estate",
  Gift = "gift",
  Excise = "excise",
}

export enum ReasonForClaim {
  IrsError = "irs_error",
  ErroneousWrittenAdvice = "erroneous_written_advice",
  ReasonableCause = "reasonable_cause",
  Other = "other",
}

export const inputSchema = z.object({
  // Line 1: Calendar year for which taxes were paid/assessed
  calendar_year: z.number().int().min(1900).max(2099).optional(),
  // Line 1: Start of period
  period_from: z.string().optional(),
  // Line 1: End of period
  period_to: z.string().optional(),
  // Line 3: Type of tax (income tax excluded per IRS instructions)
  tax_type: z.nativeEnum(TaxType).optional(),
  // Line 4: IRC section under which penalty was assessed
  penalty_section: z.string().optional(),
  // Line 5a: Reason for claim
  reason_for_claim: z.nativeEnum(ReasonForClaim).optional(),
  // Line 7: Amount to be refunded or abated
  amount_to_be_refunded: z.number().nonnegative().optional(),
  // Line 7: Detailed explanation of claim
  explanation: z.string().optional(),
});

class F843Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f843";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f843 = new F843Node();
