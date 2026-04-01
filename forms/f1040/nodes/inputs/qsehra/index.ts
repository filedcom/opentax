import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form8962 } from "../../intermediate/forms/form8962/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// QSEHRA — Qualified Small Employer Health Reimbursement Arrangement
// IRC §9831(d); Notice 2017-67; IRC §36B(c)(2)(C)(iv)
//
// QSEHRA is an employer-funded HRA for small employers (< 50 FTE).
// Effect on PTC (Form 8962):
//   - If employee has MEC: QSEHRA is excluded from gross income, but the
//     amount OFFERED reduces the PTC dollar-for-dollar.
//   - If employee lacks MEC: QSEHRA amounts received are gross income (line 1a).
//
// TY2025 limits (Rev Proc 2024-40 §3.25):
//   - Self-only: $6,350
//   - Family: $12,800

// TY2025 QSEHRA limits
export const QSEHRA_LIMIT_SELF_ONLY = 6_350;
export const QSEHRA_LIMIT_FAMILY = 12_800;

export const inputSchema = z.object({
  // Annual QSEHRA amount offered by employer (used for PTC reduction)
  qsehra_amount_offered: z.number().nonnegative(),
  // Actual amount reimbursed/received during the year
  qsehra_amount_received: z.number().nonnegative(),
  // True if employee had Minimum Essential Coverage for the tax year
  has_minimum_essential_coverage: z.boolean(),
  // True if self-only coverage (vs. family) — determines annual limit
  is_self_only_coverage: z.boolean(),
});

type QsehraInput = z.infer<typeof inputSchema>;

function buildOutputs(input: QsehraInput): NodeOutput[] {
  const offered = input.qsehra_amount_offered;
  const received = input.qsehra_amount_received;

  if (input.has_minimum_essential_coverage) {
    // Employee has MEC: QSEHRA excluded from income, but reduces PTC
    if (offered === 0) return [];
    return [{
      nodeType: form8962.nodeType,
      fields: { qsehra_amount_offered: offered },
    }];
  } else {
    // No MEC: QSEHRA received is included in gross income (taxable)
    if (received === 0) return [];
    return [{
      nodeType: f1040.nodeType,
      fields: { line1a_wages: received },
    }];
  }
}

class QsehraNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qsehra";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8962, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: buildOutputs(parsed) };
  }
}

export const qsehra = new QsehraNode();
