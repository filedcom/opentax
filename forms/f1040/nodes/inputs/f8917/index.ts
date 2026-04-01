import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8917 Tuition and Fees Deduction is EXPIRED.
// The Consolidated Appropriations Act of 2021 (P.L. 116-260, §104) permanently
// repealed IRC §222, effective for tax years after December 31, 2020.
// For TY2025, no federal deduction is available. The node captures data for
// completeness (state return reference) but produces zero federal output.

export const itemSchema = z.object({
  // Total qualified tuition and fees paid to eligible institutions
  tuition_and_fees_paid: z.number().nonnegative().optional(),
  // Student identification (informational only)
  student_name: z.string().optional(),
  student_ssn: z.string().optional(),
});

export const inputSchema = z.object({
  f8917s: z.array(itemSchema).min(1),
});

class F8917Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8917";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    // Validates input (throws on negative values via Zod)
    inputSchema.parse(input);

    // TY2025: IRC §222 repealed — no federal deduction output
    return { outputs: [] };
  }
}

export const f8917 = new F8917Node();
