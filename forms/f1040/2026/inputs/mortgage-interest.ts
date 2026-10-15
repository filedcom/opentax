import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { schedule_a_2026 } from "../nodes/schedule-a.ts";
import {
  calculateMortgageSources2026,
  mortgageClaim2026Schema,
  mortgageSource2026Schema,
} from "./mortgage-source.ts";
export { mortgageClaim2026Schema } from "./mortgage-source.ts";
export const inputSchema = mortgageClaim2026Schema.partial().extend(
  mortgageSource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
  }).shape,
).strict();
class MortgageInterest2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "mortgage_interest";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.formType !== "f1040" || ctx.taxYear !== 2026) {
      throw new Error("Mortgage interest needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (
      input.tax_year === undefined && input.loans === undefined &&
      input.properties === undefined
    ) return { outputs: [] };
    const result = calculateMortgageSources2026(
      mortgageSource2026Schema.parse(input),
    );
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "schedule_a",
          fields: { mortgage_source_2026: result.source_input },
        },
      ],
    };
  }
}
export const mortgage_interest_2026 = new MortgageInterest2026Node();
