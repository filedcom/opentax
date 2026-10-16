import {
  combinedQbiCalculator2026,
  combinedQbiSource2026Schema,
  reconcileCombinedBusiness2026,
  resolveCombinedQbi2026,
} from "../inputs/combined-qbi.ts";
import { businessLossSource2026Schema } from "../inputs/business-loss-source.ts";
import {
  childTaxInput2026Schema,
  resolveChildTax2026,
} from "../inputs/child-tax.ts";
import {
  businessQbiCalculator2026,
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "../inputs/business-qbi.ts";
import { businessChildIncome2026 } from "../inputs/business-child-income.ts";
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
import { roundWholeDollars } from "../../whole-dollars.ts";

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
  child_tax_source_2026: childTaxInput2026Schema.optional(),
  taxpayer_dob: z.string().date().optional(),
  standard_deduction_eligible: z.boolean(),
  dependent_earned_income: money.optional(),
  wage_income_from_agi: z.number().finite().optional(),
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
  combined_qbi_sources_2026: combinedQbiSource2026Schema.optional(),
  business_loss_sources_2026: businessLossSource2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema.optional(),
  qbi_activity_pending: z.boolean().optional(),
}).strict();

export function calculateDeductionSelection2026(
  rawInput: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(rawInput);
  const combined = input.combined_qbi_sources_2026
    ? resolveCombinedQbi2026(input.combined_qbi_sources_2026)
    : undefined;
  if (combined && input.business_sources_2026) {
    reconcileCombinedBusiness2026(
      input.business_sources_2026,
      combined.source_input,
    );
  }
  if (
    combined && input.business_loss_sources_2026 &&
    JSON.stringify(input.business_loss_sources_2026) !==
      JSON.stringify(combined.land.loss.finalized_sources)
  ) {
    throw new Error(
      "Combined QBI needs identical loss sources; duplicate owners are invalid",
    );
  }
  if (
    combined &&
    (input.child_tax_source_2026 ||
      (input.taxpayer_dob && input.taxpayer_dob > "2003-01-01" &&
        input.filing_status !== FilingStatus.MFJ))
  ) {
    throw new Error(
      "Land dispositions need coordinated child-tax income and loss-addback sources",
    );
  }
  const childTax = input.child_tax_source_2026
    ? resolveChildTax2026(input.child_tax_source_2026)
    : undefined;
  if (
    childTax &&
    (childTax.source_input.child_context.filing_status !==
        input.filing_status ||
      childTax.source_input.child_context.taxpayer_dob !== input.taxpayer_dob ||
      childTax.source_input.income_context.agi !== input.agi ||
      childTax.source_input.income_context.total_income !==
        input.form8615_total_income ||
      childTax.source_input.income_context.wages !==
        input.wage_income_from_agi ||
      JSON.stringify(childTax.source_input.business_sources_2026) !==
        JSON.stringify(input.business_sources_2026))
  ) {
    throw new Error(
      "Child-tax review must reconcile the deduction owner's identity and income sources",
    );
  }
  const businessAmounts = input.business_sources_2026
    ? resolveBusinessQbi2026(input.business_sources_2026).business
    : combined?.business?.business;
  if (
    businessAmounts &&
    (input.wage_income_from_agi === undefined ||
      input.dependent_earned_income !==
        Math.max(
          0,
          input.wage_income_from_agi + businessAmounts.schedule1_line3 -
            businessAmounts.schedule1_line15,
        ))
  ) {
    throw new Error(
      "Dependent earned income must reconcile wages, Schedule C net and the actual SE deduction",
    );
  }
  let unearned = (input.form8615_total_income ?? input.agi) -
    (input.dependent_earned_income ?? 0);
  let businessChildWorkpaper:
    | ReturnType<typeof businessChildIncome2026>
    | undefined;
  if (
    input.business_sources_2026 && input.taxpayer_dob &&
    input.taxpayer_dob > "2003-01-01" &&
    input.filing_status !== FilingStatus.MFJ
  ) {
    businessChildWorkpaper = businessChildIncome2026(
      input.business_sources_2026,
    );
    unearned = roundWholeDollars(
      (input.form8615_total_income ?? input.agi) +
        businessChildWorkpaper.loss_addback -
        input.wage_income_from_agi! -
        businessChildWorkpaper.earned_income_for_line1 -
        (input.form8615_early_withdrawal_penalty ?? 0),
    );
  }
  // The public source graph supplies DOB. Do not open the dependent wage
  // deduction route by silently applying ordinary rates to a potential 8615
  // return. Parent/student/support evidence is supplied by the child-tax route;
  // the annual threshold and January 1 boundary are from i8615 (2026).
  if (
    input.taxpayer_dob && input.taxpayer_dob > "2003-01-01" &&
    input.filing_status !== FilingStatus.MFJ &&
    unearned > 2700 && !childTax?.eligibility
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
  if (capital?.land && !combined) {
    throw new Error(
      "Land dispositions need their QBI and loss-limit owners before deduction finalization",
    );
  }
  if (
    combined && (!capital ||
      combined.land.loss.finalized_sources.filing_status !==
        input.filing_status ||
      JSON.stringify(capital.source_input) !==
        JSON.stringify(combined.land.loss.finalized_sources.capital_sources))
  ) {
    throw new Error(
      "Combined QBI and deduction selection need identical finalized capital sources and owners",
    );
  }
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
  if ((input.business_sources_2026 || combined) && input.agi < 0) {
    throw new Error(
      "Business losses creating a negative AGI need the NOL/carryover owner",
    );
  }
  if (
    input.business_loss_sources_2026 &&
    ((!input.business_sources_2026 && !combined) ||
      JSON.stringify(input.business_loss_sources_2026.capital_sources) !==
        JSON.stringify(capital?.source_input))
  ) {
    throw new Error("Deduction and loss owners need identical capital sources");
  }
  const qbi = input.combined_qbi_sources_2026
    ? combinedQbiCalculator2026(input.combined_qbi_sources_2026)
    : input.business_sources_2026
    ? businessQbiCalculator2026(
      input.business_sources_2026,
      capital!.preferential_gain + capital!.qualified_dividends,
      input.business_loss_sources_2026,
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
  return {
    source_input: input,
    resolution: resolved,
    child_tax_review: childTax ?? null,
    combined_qbi_workpaper: combined ?? null,
    business_child_income_workpaper: businessChildWorkpaper ?? null,
    form8615_screened_unearned_income: Math.max(0, unearned),
  };
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
    const calculation = calculateDeductionSelection2026(rawInput);
    const { source_input: input, resolution: resolved } = calculation;
    const chosen = resolved.selected;
    // Both deduction candidates replay the same business and capital sources.
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: {
            resolution_2026: resolved,
            calculation_input_2026: input,
            business_child_income_workpaper_2026:
              calculation.business_child_income_workpaper,
            form8615_screened_unearned_income:
              calculation.form8615_screened_unearned_income,
          },
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
            ...(input.child_tax_source_2026
              ? {
                child_tax_source_2026: input.child_tax_source_2026,
                form8615_child_deduction: chosen.line12eStandardOrItemized,
              }
              : {}),
          },
        },
      ],
    };
  }
}
export const standard_deduction_2026 = new StandardDeduction2026Node();
