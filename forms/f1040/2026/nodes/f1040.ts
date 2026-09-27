import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  type NodeOutput,
  type NodeResult,
  TaxNode,
} from "../../../../core/types/tax-node.ts";
import { filingStatusSchema } from "../../nodes/types.ts";
import { calculateDeductions2026 } from "../deductions.ts";
import { calculateSettlement2026 } from "../settlement.ts";
import { schedule3a } from "./schedule3a.ts";

const amount = z.number().finite().nonnegative();

/** TY2026 Form 1040 core return lines. Inputs are final upstream amounts. */
export const inputSchema = z.object({
  filing_status: filingStatusSchema,
  line9_total_income: z.number().finite(),
  line10_adjustments: amount.default(0),
  deduction_method: z.enum(["standard", "itemized"]),
  standard_deduction: amount.default(0),
  itemized_deductions: amount.default(0),
  nonitemizer_cash_contributions: amount.default(0),
  schedule1a_line44: amount.default(0),
  qbi_deduction: amount.default(0),
  line16_income_tax: amount.default(0),
  line17_additional_taxes: amount.default(0),
  line19_child_tax_credit: amount.default(0),
  line20_nonrefundable_credits: amount.default(0),
  line23_other_taxes: amount.default(0),
  form1062_line15: amount.default(0),
  line25d_total_withholding: amount.default(0),
  line26_estimated_payments: amount.default(0),
  line27a_eic: amount.default(0),
  line28_actc: amount.default(0),
  line29_refundable_aotc: amount.default(0),
  line30_refundable_adoption: amount.default(0),
  line31_other_payments: amount.default(0),
  schedule2_line20: amount.default(0),
  wants_federal_public_benefit: z.boolean().optional(),
  eligible_for_federal_public_benefit: z.boolean().optional(),
}).strict();

class F10402026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3a]);

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 1040 node requires f1040:2026 context");
    }
    const input = inputSchema.parse(rawInput);
    const line11Agi = input.line9_total_income - input.line10_adjustments;
    const deductions = calculateDeductions2026({
      filingStatus: input.filing_status,
      adjustedGrossIncome: line11Agi,
      method: input.deduction_method,
      standardDeduction: input.standard_deduction,
      itemizedDeductions: input.itemized_deductions,
      nonitemizerCashContributions: input.nonitemizer_cash_contributions,
      schedule1aLine44: input.schedule1a_line44,
      qbiDeduction: input.qbi_deduction,
    });
    const line18TotalTaxBeforeCredits = input.line16_income_tax +
      input.line17_additional_taxes;
    const line21CreditsTotal = input.line19_child_tax_credit +
      input.line20_nonrefundable_credits;
    const line22TaxAfterCredits = Math.max(
      0,
      line18TotalTaxBeforeCredits - line21CreditsTotal,
    );
    const settlement = calculateSettlement2026({
      line22TaxAfterCredits,
      line23OtherTaxes: input.line23_other_taxes,
      form1062Line15: input.form1062_line15,
      line25dWithholding: input.line25d_total_withholding,
      line26EstimatedPayments: input.line26_estimated_payments,
      line27aEic: input.line27a_eic,
      line28Actc: input.line28_actc,
      line29RefundableAotc: input.line29_refundable_aotc,
      line30RefundableAdoption: input.line30_refundable_adoption,
      line31OtherPayments: input.line31_other_payments,
      schedule2Line20: input.schedule2_line20,
      wantsFederalPublicBenefit: input.wants_federal_public_benefit,
      eligibleForFederalPublicBenefit:
        input.eligible_for_federal_public_benefit,
    });
    const outputs: NodeOutput[] = [{
      nodeType: this.nodeType,
      fields: {
        line9_total_income: input.line9_total_income,
        line10_adjustments: input.line10_adjustments,
        line11_agi: line11Agi,
        line12e_standard_or_itemized: deductions.line12eStandardOrItemized,
        line12f_nonitemizer_charity: deductions.line12fNonitemizerCharity,
        line13a_schedule1a: deductions.line13aSchedule1a,
        line13b_qbi: deductions.line13bQbi,
        line14_total_deductions: deductions.line14TotalDeductions,
        line15_taxable_income: deductions.line15TaxableIncome,
        line16_income_tax: input.line16_income_tax,
        line17_additional_taxes: input.line17_additional_taxes,
        line18_total_tax_before_credits: line18TotalTaxBeforeCredits,
        line19_child_tax_credit: input.line19_child_tax_credit,
        line20_nonrefundable_credits: input.line20_nonrefundable_credits,
        line21_credits_total: line21CreditsTotal,
        line22_tax_after_credits: line22TaxAfterCredits,
        line23_other_taxes: input.line23_other_taxes,
        line24a_total_tax: settlement.line24aTotalTax,
        line24b_form1062: settlement.line24bForm1062,
        line24c_total_tax: settlement.line24cTaxIncludingForm1062,
        line25d_total_withholding: input.line25d_total_withholding,
        line26_estimated_payments: input.line26_estimated_payments,
        line27a_eic: input.line27a_eic,
        line28_actc: input.line28_actc,
        line29_refundable_aotc: input.line29_refundable_aotc,
        line30_refundable_adoption: input.line30_refundable_adoption,
        line31_other_payments: input.line31_other_payments,
        line32a_refundable_credits: settlement.line32aRefundableCredits,
        line32b_public_benefit_reduction:
          settlement.line32bFederalPublicBenefitReduction,
        line32c_net_refundable_credits: settlement.line32cNetRefundableCredits,
        line33_total_payments: settlement.line33TotalPayments,
        line34_overpayment: settlement.line34Overpayment,
        line35a_refund: settlement.line34Overpayment,
        line37_amount_owed: settlement.line37AmountOwed,
      },
    }];
    if (settlement.schedule3a) {
      outputs.push({
        nodeType: schedule3a.nodeType,
        fields: {
          line1a_refundable_credits: settlement.schedule3a.line1a,
          line1b_other_payments: settlement.schedule3a.line1b,
          line2_eligible_refundable_credits: settlement.schedule3a.line2,
          line3_total_tax: settlement.schedule3a.line3,
          line4_schedule2_line20: settlement.schedule3a.line4,
          line5_tax_offset: settlement.schedule3a.line5,
          line6_federal_public_benefit:
            settlement.schedule3a.line6FederalPublicBenefit,
          line7_wants_benefit: input.wants_federal_public_benefit,
          line8_eligible: input.eligible_for_federal_public_benefit,
          line8_disallowed_benefit:
            settlement.schedule3a.line8DisallowedBenefit,
        },
      });
    }
    return { outputs };
  }
}

export const f1040_2026_node = new F10402026Node();
