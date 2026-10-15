import {
  businessQbiCalculator2026,
  businessReturnSource2026Schema,
} from "../inputs/business-qbi.ts";
import {
  calculateCapitalGains2026,
  capitalGainInput2026Schema,
} from "./capital-gains.ts";
import { form8960_2026 } from "./form8960.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
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
  taxpayer_dob: z.string().date().optional(),
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
  business_sources_2026: businessReturnSource2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema.optional(),
  qbi_activity_pending: z.boolean().optional(),
}).strict();

export function calculateDeductionSelection2026(
  rawInput: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(rawInput);
  // The public source graph supplies DOB. Do not open the dependent wage
  // deduction route by silently applying ordinary rates to a potential 8615
  // return. Parent/student/support eligibility and the child's tax owner remain
  // pending; the annual threshold and January 1 boundary are from i8615 (2026).
  if (
    input.taxpayer_dob && input.taxpayer_dob > "2003-01-01" &&
    input.filing_status !== FilingStatus.MFJ &&
    (input.form8615_total_income ?? input.agi) -
          (input.dependent_earned_income ?? 0) > 2700
  ) {
    throw new Error(
      "2026 Form 8615 source eligibility and child-tax calculation need review before deduction/tax finalization",
    );
  }
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
  const capital = input.capital_sources_2026
    ? calculateCapitalGains2026(input.capital_sources_2026)
    : undefined;
  if (input.business_sources_2026 && !capital) {
    throw new Error(
      "Business QBI needs the complete capital/qualified-dividend inventory, including zero",
    );
  }
  const business = input.business_sources_2026;
  if (
    business && (business.filing_status !== input.filing_status ||
      capital!.source_input.filing_status !== input.filing_status ||
      business.taxpayer_tin !==
        capital!.source_input.taxpayer_ssn.replaceAll("-", "") ||
      business.spouse_tin !==
        (input.filing_status === FilingStatus.MFJ
          ? capital!.source_input.spouse_ssn?.replaceAll("-", "")
          : undefined))
  ) {
    throw new Error(
      "QBI business, capital and deduction sources must have the same return owners",
    );
  }
  if (input.business_sources_2026 && input.agi < 0) {
    throw new Error(
      "Business losses creating a negative AGI need the NOL/carryover owner",
    );
  }
  const qbi = input.business_sources_2026
    ? businessQbiCalculator2026(
      input.business_sources_2026,
      capital!.preferential_gain + capital!.qualified_dividends,
    )
    : noQbi2026;
  const resolved = resolveDeductions2026({
    ...input,
    adjustedGrossIncome: input.agi,
    standardDeductionEligible: input.standard_deduction_eligible,
    spouseItemizes: input.mfs_spouse_itemizing,
    electItemized: input.force_itemized,
    itemized: input.itemized_before_overall_limit === undefined ? undefined : {
      beforeOverallLimit: input.itemized_before_overall_limit,
      taxes: input.itemized_taxes!,
    },
    nonitemizerCashContributions: input.nonitemizer_cash_contributions ?? 0,
    charitableContributionBase: input.charitable_contribution_base,
    schedule1aLine44: input.schedule1a_line44 ?? 0,
    schedule1aLine43: input.schedule1a_line43 ?? 0,
  }, qbi);
  return { source_input: input, resolution: resolved };
}

class StandardDeduction2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "standard_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    income_tax_2026,
    form8960_2026,
  ]);
  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("2026 deduction resolution needs f1040:2026 context");
    }
    const { source_input: input, resolution: resolved } =
      calculateDeductionSelection2026(rawInput);
    const chosen = resolved.selected;
    // Both deduction candidates replay the same business and capital sources.
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { resolution_2026: resolved, calculation_input_2026: input },
        },
        {
          nodeType: "form8960",
          fields: {
            taking_standard_deduction: chosen.method === "standard",
            itemized_before_overall_limit:
              input.itemized_before_overall_limit ?? 0,
            itemized_after_overall_limit: chosen.method === "itemized"
              ? chosen.line12eStandardOrItemized
              : 0,
          },
        },
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
