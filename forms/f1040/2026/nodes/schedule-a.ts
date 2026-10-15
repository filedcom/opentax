import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { standard_deduction_2026 } from "./standard_deduction.ts";
import {
  calculateScheduleA2026,
  scheduleASource2026Schema,
} from "../schedule-a.ts";
import { cashGift2026Schema } from "../inputs/cash-gift-source.ts";

/** Public expenses/reviews; owner, AGI, W-2 and gifts come from their source nodes. */
export const claimInputSchema = scheduleASource2026Schema.omit({
  filing_status: true,
  taxpayer_ssn: true,
  spouse_ssn: true,
  agi: true,
  w2_tax_sources: true,
  cash_gifts: true,
  salt_addbacks: true,
  form2555_line45_from_agi: true,
});
const reviewedGift = cashGift2026Schema.extend({
  charitable_amount: z.number().finite().nonnegative(),
  nonitemizer_eligible_amount: z.number().finite().nonnegative(),
  nonitemizer_exclusion: z.enum([
    "excluded_qcd",
    "unqualified_recipient",
    "recipient_excluded_from_170p",
  ]).optional(),
}).strict();
export const inputSchema = claimInputSchema.partial().extend({
  ...scheduleASource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    agi: true,
    w2_tax_sources: true,
    salt_addbacks: true,
    form2555_line45_from_agi: true,
  }).shape,
  cash_gift_sources_2026: z.array(reviewedGift).default([]),
}).strict();
class ScheduleA2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([standard_deduction_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule A needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.source_scope_review) {
      if (
        input.tax_year !== undefined || input.tax_election !== undefined ||
        (input.medical_payments?.length ?? 0) ||
        (input.tax_payments?.length ?? 0) ||
        input.cash_gift_sources_2026.length ||
        input.w2_tax_sources.some((row) =>
          row.box17_state_withheld + row.box19_local_withheld +
              row.mandatory_state_contributions.reduce(
                (n, part) => n + part.amount,
                0,
              ) > 0
        )
      ) {
        throw new Error(
          "Schedule A sources require the itemized expense inventory review",
        );
      }
      return { outputs: [] };
    }
    const { cash_gift_sources_2026, ...facts } = input;
    const calculation = calculateScheduleA2026(scheduleASource2026Schema.parse({
      ...facts,
      cash_gifts: cash_gift_sources_2026.map((row) =>
        cashGift2026Schema.strip().parse(row)
      ),
    }));
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "standard_deduction",
          fields: {
            itemized_before_overall_limit: calculation.beforeOverallLimit,
            itemized_taxes: calculation.lines.line7,
          },
        },
      ],
    };
  }
}
export const schedule_a_2026 = new ScheduleA2026Node();
