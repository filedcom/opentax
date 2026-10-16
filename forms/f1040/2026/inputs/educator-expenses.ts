import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { schedule1_2026 } from "../nodes/schedule1.ts";
import { schedule_a_2026 } from "../nodes/schedule-a.ts";
import {
  calculateEducatorSources2026,
  educatorClaim2026Schema,
  educatorSource2026Schema,
} from "./educator-source.ts";
export { educatorClaim2026Schema } from "./educator-source.ts";
export const inputSchema = educatorClaim2026Schema.partial().extend(
  educatorSource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
  }).shape,
).strict();
class EducatorExpenses2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "educator_expenses";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    agi_2026,
    schedule1_2026,
    schedule_a_2026,
  ]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.formType !== "f1040" || ctx.taxYear !== 2026) {
      throw new Error("Educator expenses need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (
      input.tax_year === undefined && input.educators === undefined &&
      input.expenses === undefined
    ) return { outputs: [] };
    const result = calculateEducatorSources2026(
      educatorSource2026Schema.parse(input),
    );
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "agi_aggregator",
          fields: { line11_educator_expenses: result.schedule1Line11 },
        },
        {
          nodeType: "schedule1",
          fields: { line11_educator_expenses: result.schedule1Line11 },
        },
        {
          nodeType: "schedule_a",
          fields: { educator_source_2026: result.source_input },
        },
      ],
    };
  }
}
export const educator_expenses_2026 = new EducatorExpenses2026Node();
