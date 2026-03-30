import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { eitc } from "../../intermediate/eitc/index.ts";
import { f8812 } from "../f8812/index.ts";
import { f8863 } from "../f8863/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8862 — Information to Claim Certain Credits After Disallowance
//
// Taxpayers must file this form to reclaim EITC, CTC/ACTC, or AOTC after
// the IRS disallowed the credit in a prior year (e.g., due to an audit).
// This input node signals eligibility restoration to the downstream credit nodes.

export const inputSchema = z.object({
  // Which credits were previously disallowed and are being reclaimed
  claim_eitc: z.boolean().optional(),
  claim_ctc: z.boolean().optional(),       // Child Tax Credit / ACTC (Form 8812)
  claim_aotc: z.boolean().optional(),      // American Opportunity Tax Credit (Form 8863)

  // Part I: Year of disallowance
  eitc_disallowed_year: z.number().int().nonnegative().optional(),
  ctc_disallowed_year: z.number().int().nonnegative().optional(),
  aotc_disallowed_year: z.number().int().nonnegative().optional(),

  // Part II: EITC — qualifying children eligibility re-certification
  eitc_qualifying_children_count: z.number().int().min(0).max(3).optional(),

  // Part III: CTC qualifying children count
  ctc_qualifying_children_count: z.number().int().nonnegative().optional(),

  // Part IV: AOTC — student eligibility re-certification
  aotc_student_count: z.number().int().nonnegative().optional(),
});

type F8862Input = z.infer<typeof inputSchema>;

function eitcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_eitc) return [];
  // Signal to the eitc node that disallowance has been cleared via Form 8862.
  return [{ nodeType: eitc.nodeType, fields: { form8862_filed: true } }];
}

function ctcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_ctc) return [];
  return [{ nodeType: f8812.nodeType, fields: { form8862_filed: true } }];
}

function aotcOutput(input: F8862Input): NodeOutput[] {
  if (!input.claim_aotc) return [];
  return [{ nodeType: f8863.nodeType, fields: { form8862_filed: true } }];
}

class F8862Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8862";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([eitc, f8812, f8863]);

  compute(_ctx: NodeContext, rawInput: F8862Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const outputs: NodeOutput[] = [
      ...eitcOutput(input),
      ...ctcOutput(input),
      ...aotcOutput(input),
    ];
    return { outputs };
  }
}

export const f8862 = new F8862Node();
