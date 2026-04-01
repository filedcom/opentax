import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// PPP Loan Forgiveness — Informational/Passthrough Node
//
// PPP (Paycheck Protection Program) loan forgiveness is excluded from federal
// gross income under CARES Act §1106(i) (P.L. 116-136) and CAA 2021 §276
// (P.L. 116-260, enacted December 27, 2020).
//
// Under current law (post-CAA 2021 §276), expenses paid with forgiven PPP
// proceeds ARE fully deductible — Congress reversed IRS Notice 2020-32 which
// had disallowed those deductions. No federal income line is affected.
//
// This node is informational only: it validates input and returns no outputs.
// State tax engines may read the stored forgiven_amount for non-conforming
// state calculations. Rev. Proc. 2021-48 (2021-49 I.R.B. 764) provides three
// timing election options; forgiveness_year supports that tracking.

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Required: amount of PPP loan principal forgiven by lender (fully excluded)
  // CARES Act §1106(i); CAA 2021 §276(a)
  forgiven_amount: z.number().nonnegative(),

  // Optional: SBA-assigned loan number — administrative reference only
  loan_number: z.string().optional(),

  // Optional: tax year when forgiveness was received/accrued
  // Used for Rev. Proc. 2021-48 timing election tracking
  // Rev. Proc. 2021-48 §3, 2021-49 I.R.B. 764
  forgiveness_year: z.number().int().optional(),
});

export const inputSchema = z.object({
  ppp_forgivenesses: z.array(itemSchema).min(1),
});

// ── Node class ────────────────────────────────────────────────────────────────

class PppForgivenessNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ppp_forgiveness";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    // Validate input — throws on schema violations (negative amounts, bad types)
    inputSchema.parse(input);

    // PPP forgiveness is entirely excluded from federal gross income.
    // No income added, no deductions reduced (CAA 2021 §276 preserved all deductions).
    // Informational node only — no federal output.
    return { outputs: [] };
  }
}

export const ppp_forgiveness = new PppForgivenessNode();
