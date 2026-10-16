import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateSaversCredit2026,
  saversCreditSource2026Schema,
} from "../inputs/savers-credit-source.ts";

/** Only reviewed source records are intake; owners, wages, AGI and tax are graph facts. */
export const saversCreditClaim2026Schema = saversCreditSource2026Schema.pick({
  claim: true,
});
const whole = z.number().int().nonnegative();
export const inputSchema = saversCreditSource2026Schema.omit({
  finalized_tax: true,
})
  .partial({ claim: true }).extend({
    wage_sources: saversCreditSource2026Schema.shape.wage_sources.default([]),
    regular_tax: whole,
    schedule2_part1_tax: whole.default(0),
    finalized_dependent_care_credit: whole.default(0),
    finalized_education_credit: whole.default(0),
    finalized_schedule_r_credit: whole.default(0),
    foreign_agi_addback: z.literal(0).optional(),
  }).strict();
class Form8880Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8880";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["f8812", "form1062"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("Form 8880 needs f1040:2026 context");
    }
    const {
      regular_tax,
      schedule2_part1_tax,
      finalized_dependent_care_credit,
      finalized_education_credit,
      finalized_schedule_r_credit,
      foreign_agi_addback: _foreign,
      ...source
    } = inputSchema.parse(raw);
    const r = source.claim
      ? calculateSaversCredit2026({
        ...source,
        claim: source.claim,
        finalized_tax: {
          line18: regular_tax + schedule2_part1_tax,
          schedule3_line1: 0,
          schedule3_line2: finalized_dependent_care_credit,
          schedule3_line3: finalized_education_credit,
          schedule3_line6d: finalized_schedule_r_credit,
          schedule3_line6l: 0,
        },
      })
      : undefined;
    return {
      outputs: [
        {
          nodeType: "f8812",
          fields: {
            finalized_savers_credit: r?.lines.line12 ?? 0,
            ...(r
              ? {
                savers_inventory_reference_from_source:
                  r.source_input.claim.record_reference,
              }
              : {}),
          },
        },
        ...(r
          ? [
            { nodeType: this.nodeType, fields: { calculation_2026: r } },
            { nodeType: "form1062", fields: { savers: r.source_input } },
          ]
          : []),
      ],
    };
  }
}
export const form8880_2026 = new Form8880Node2026();
