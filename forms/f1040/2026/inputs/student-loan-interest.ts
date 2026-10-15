import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { agi_2026 } from "../nodes/agi.ts";
import {
  calculateStudentLoanSources2026,
  studentLoanClaim2026Schema,
  studentLoanSource2026Schema,
} from "./student-loan-source.ts";
export { studentLoanClaim2026Schema } from "./student-loan-source.ts";
export const inputSchema = studentLoanClaim2026Schema.partial().extend(
  studentLoanSource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    taxpayer_can_be_claimed_as_dependent: true,
    spouse_can_be_claimed_as_dependent: true,
  }).shape,
).strict();
class StudentLoanInterest2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "student_loan_interest";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([agi_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Student-loan interest needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (
      input.tax_year === undefined && input.loans === undefined &&
      input.f1098es === undefined
    ) return { outputs: [] };
    const calculation = calculateStudentLoanSources2026(
      studentLoanSource2026Schema.parse(input),
    );
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "agi_aggregator",
          fields: {
            line21_student_loan_interest: calculation.interest_before_magi,
          },
        },
      ],
    };
  }
}
export const student_loan_interest_2026 = new StudentLoanInterest2026Node();
