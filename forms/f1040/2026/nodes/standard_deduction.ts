import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { inputSchema as sharedSchema } from "../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";
import { income_tax_2026 } from "./income-tax.ts";
import { f1040_2026_node } from "./f1040.ts";
import { noQbi2026, resolveDeductions2026 } from "../deduction-resolution.ts";

const money = z.number().finite().nonnegative();
/** Internal upstream results; none of these calculated totals is a public input. */
export const inputSchema = sharedSchema.pick({
  filing_status: true,
  taxpayer_age_65_or_older: true,
  taxpayer_blind: true,
  spouse_age_65_or_older: true,
  spouse_blind: true,
  taxpayer_can_be_claimed_as_dependent: true,
  mfs_spouse_itemizing: true,
  force_itemized: true,
}).extend({
  agi: z.number().finite(),
  standard_deduction_eligible: z.boolean(),
  dependent_earned_income: money.optional(),
  // Retain AGI's child-tax metadata; a 2026 Form 8615 owner must review it.
  form8615_total_income: z.number().finite().optional(),
  form8615_early_withdrawal_penalty: money.optional(),
  itemized_before_overall_limit: money.optional(),
  itemized_taxes: money.optional(),
  nonitemizer_cash_contributions: money.optional(),
  charitable_contribution_base: z.number().finite().optional(),
  schedule1a_line44: money.optional(),
  schedule1a_line43: money.optional(),
  // QBI must be computed inside the joint resolver, not deposited as an amount
  // that may have been calculated against the wrong deduction candidate.
  qbi_deduction: z.never().optional(),
  qbi_activity_pending: z.boolean().optional(),
}).strict();

class StandardDeduction2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "standard_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    income_tax_2026,
  ]);
  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("2026 deduction resolution needs f1040:2026 context");
    }
    const input = inputSchema.parse(rawInput);
    if (input.qbi_activity_pending) {
      throw new Error(
        "2026 QBI source owner must participate in joint deduction resolution",
      );
    }
    if (
      (input.itemized_before_overall_limit === undefined) !==
        (input.itemized_taxes === undefined)
    ) {
      throw new Error(
        "Schedule A requires both its pre-limit total and line 7 taxes, including zero",
      );
    }
    const resolved = resolveDeductions2026({
      ...input,
      adjustedGrossIncome: input.agi,
      standardDeductionEligible: input.standard_deduction_eligible,
      spouseItemizes: input.mfs_spouse_itemizing,
      electItemized: input.force_itemized,
      itemized: input.itemized_before_overall_limit === undefined
        ? undefined
        : {
          beforeOverallLimit: input.itemized_before_overall_limit,
          taxes: input.itemized_taxes!,
        },
      nonitemizerCashContributions: input.nonitemizer_cash_contributions ?? 0,
      charitableContributionBase: input.charitable_contribution_base,
      schedule1aLine44: input.schedule1a_line44 ?? 0,
      schedule1aLine43: input.schedule1a_line43 ?? 0,
    }, noQbi2026);
    const chosen = resolved.selected;
    // This node's current graph adapter covers no-QBI returns. The QBI owner
    // must call the same resolver with its actual form calculator when wired.
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { resolution_2026: resolved } },
        {
          nodeType: "f1040",
          fields: {
            deduction_method: chosen.method,
            standard_deduction: chosen.method === "standard"
              ? chosen.line12eStandardOrItemized
              : 0,
            itemized_deductions: chosen.method === "itemized"
              ? chosen.line12eStandardOrItemized
              : 0,
            nonitemizer_cash_contributions: chosen.line12fNonitemizerCharity,
            schedule1a_line44: chosen.line13aSchedule1a,
            qbi_deduction: chosen.line13bQbi,
          },
        },
        {
          nodeType: "income_tax_calculation",
          fields: {
            filing_status: input.filing_status,
            taxable_income: chosen.line15TaxableIncome,
            taking_standard_deduction: chosen.method === "standard",
            form6251_line1a: chosen.form6251Line1a,
            form6251_line1b: chosen.form6251Line1b,
            form6251_line2a: chosen.form6251Line2a,
          },
        },
      ],
    };
  }
}
export const standard_deduction_2026 = new StandardDeduction2026Node();
