import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { form6251_2026 } from "../nodes/form6251.ts";
import {
  calculateIsoSources2026,
  isoClaim2026Schema,
  isoSource2026Schema,
} from "./iso-source.ts";
export { isoClaim2026Schema } from "./iso-source.ts";
export const inputSchema = isoClaim2026Schema.partial().extend(
  isoSource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
  }).shape,
).strict();

class F3921Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3921";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form6251_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 3921 needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (
      input.tax_year === undefined && input.f3921s === undefined &&
      input.year_end_holdings_review === undefined
    ) {
      return { outputs: [] };
    }
    const result = calculateIsoSources2026(isoSource2026Schema.parse(input));
    const {
      filing_status: _status,
      taxpayer_ssn: _taxpayer,
      spouse_ssn: _spouse,
      ...claim
    } = result.source_input;
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        { nodeType: "form6251", fields: { iso_sources_2026: claim } },
      ],
    };
  }
}
export const f3921_2026 = new F3921Node2026();
