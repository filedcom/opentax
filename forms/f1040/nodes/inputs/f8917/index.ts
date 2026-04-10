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
  tuition_and_fees_paid: z.number().nonnegative().optional()
    .describe("Total qualified tuition and fees paid (Form 8917 Line 1)"),
  // Student identification (informational only)
  student_name: z.string().optional()
    .describe("Student name (Form 8917 Column (a))"),
  student_ssn: z.string().optional()
    .describe("Student SSN (Form 8917 Column (b))"),
  // EIN of eligible institution — required to confirm the institution is an eligible
  // educational institution under IRC §25A(f)(2); relevant for state returns that
  // still allow the deduction
  institution_ein: z.string().optional()
    .describe("Employer identification number of eligible educational institution"),
  // Academic period during which the student was enrolled — affects whether
  // payments qualify (must be for an academic period beginning in the tax year
  // or the first 3 months of the following year; IRC §25A(g)(4))
  academic_period: z.string().optional()
    .describe("Academic period for which tuition/fees were paid (e.g., 'Fall 2020', 'Spring 2021')"),
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
