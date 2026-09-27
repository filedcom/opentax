import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  type NodeOutput,
  type NodeResult,
  TaxNode,
} from "../../../../core/types/tax-node.ts";
import { identityInputSchema } from "../identity.ts";
import { calculateDeductions2026 } from "../deductions.ts";
import { calculateSettlement2026 } from "../settlement.ts";
import { schedule3a } from "./schedule3a.ts";

const amount = z.number().finite().nonnegative();
const accumulableAmount = z.union([amount, z.array(amount)]);
const accumulableSignedAmount = z.union([
  z.number().finite(),
  z.array(z.number().finite()),
]);

function sumAmount(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  return Array.isArray(value)
    ? value.reduce((sum, part) => sum + part, 0)
    : value;
}

/** TY2026 Form 1040 core return lines. Inputs are final upstream amounts. */
export const inputSchema = identityInputSchema.extend({
  line1a_wages: accumulableAmount.optional(),
  line1b_household_wages: amount.optional(),
  line1c_unreported_tips: amount.optional(),
  line1d_medicaid_waiver: amount.optional(),
  line1e_taxable_dep_care: amount.optional(),
  line1f_taxable_adoption_benefits: amount.optional(),
  line1g_wages_8919: amount.optional(),
  line1h_other_earned: z.number().finite().optional(),
  line1i_combat_pay: amount.optional(),
  line2a_tax_exempt: accumulableAmount.optional(),
  line2b_taxable_interest: z.number().finite().optional(),
  line3a_qualified_dividends: accumulableAmount.optional(),
  line3b_ordinary_dividends: accumulableSignedAmount.optional(),
  line4a_ira_gross: amount.optional(),
  line4b_ira_taxable: z.number().finite().optional(),
  line5a_pension_gross: amount.optional(),
  line5b_pension_taxable: z.number().finite().optional(),
  line5c_rollover: z.boolean().optional(),
  line6a_ss_gross: amount.optional(),
  line6b_ss_taxable: amount.optional(),
  line7_capital_gain: z.number().finite().optional(),
  line7a_cap_gain_distrib: amount.optional(),
  line8_additional_income: z.number().finite().optional(),
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
  credit_limit_schedule2_line1z: amount.default(0),
  line19_child_tax_credit: amount.default(0),
  schedule8812_finalized: z.boolean().optional(),
  line20_nonrefundable_credits: amount.default(0),
  line23_other_taxes: amount.default(0),
  form1062_line15: amount.default(0),
  line25a_w2_withheld: amount.default(0),
  line25b_withheld_1099: accumulableAmount.default(0),
  line25c_other_withheld: amount.default(0),
  line26_estimated_payments: amount.default(0),
  line27a_eic: amount.default(0),
  line27b_clergy_schedule_se: z.boolean().optional(),
  line27c_declines_eic: z.boolean().optional(),
  line28_actc: amount.default(0),
  line29_refundable_aotc: amount.default(0),
  line30_refundable_adoption: amount.default(0),
  line31_other_payments: amount.default(0),
  line36_apply_to_2027: amount.default(0),
  line38_underpayment_penalty: amount.default(0),
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
    if (
      input.qualifying_child_tax_credit_count > 0 ||
      input.other_dependent_count > 0
    ) {
      if (input.schedule8812_finalized !== true) {
        throw new Error(
          "TY2026 dependents need the 2026 child-credit finalization path",
        );
      }
    }
    if (input.credit_limit_schedule2_line1z > 0) {
      throw new Error(
        "TY2026 Schedule 2 credit-limit tax needs the 2026 credit finalization path",
      );
    }
    if (input.line27c_declines_eic && input.line27a_eic > 0) {
      throw new Error("Form 1040 line 27c cannot decline a claimed EIC");
    }
    const line11Agi = input.line9_total_income - input.line10_adjustments;
    const wageLines = [
      input.line1a_wages,
      input.line1b_household_wages,
      input.line1c_unreported_tips,
      input.line1d_medicaid_waiver,
      input.line1e_taxable_dep_care,
      input.line1f_taxable_adoption_benefits,
      input.line1g_wages_8919,
      input.line1h_other_earned,
    ];
    const line1zWages = wageLines.some((value) => value !== undefined)
      ? wageLines.reduce<number>((sum, value) => sum + sumAmount(value), 0)
      : undefined;
    const line7aCapitalGain = input.line7_capital_gain === undefined &&
        input.line7a_cap_gain_distrib === undefined
      ? undefined
      : (input.line7_capital_gain ?? 0) +
        (input.line7a_cap_gain_distrib ?? 0);
    const line7bScheduleDNotRequired =
      (input.line7a_cap_gain_distrib ?? 0) > 0 &&
      input.line7_capital_gain === undefined;
    const line25dWithholding = input.line25a_w2_withheld +
      sumAmount(input.line25b_withheld_1099) + input.line25c_other_withheld;
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
      line25dWithholding,
      line26EstimatedPayments: input.line26_estimated_payments,
      line27aEic: input.line27a_eic,
      line28Actc: input.line28_actc,
      line29RefundableAotc: input.line29_refundable_aotc,
      line30RefundableAdoption: input.line30_refundable_adoption,
      line31OtherPayments: input.line31_other_payments,
      line36ApplyTo2027: input.line36_apply_to_2027,
      schedule2Line20: input.schedule2_line20,
      wantsFederalPublicBenefit: input.wants_federal_public_benefit,
      eligibleForFederalPublicBenefit:
        input.eligible_for_federal_public_benefit,
    });
    const outputs: NodeOutput[] = [{
      nodeType: this.nodeType,
      fields: {
        ...identityInputSchema.parse(input),
        line1a_wages: input.line1a_wages === undefined
          ? undefined
          : sumAmount(input.line1a_wages),
        line1b_household_wages: input.line1b_household_wages,
        line1c_unreported_tips: input.line1c_unreported_tips,
        line1d_medicaid_waiver: input.line1d_medicaid_waiver,
        line1e_taxable_dep_care: input.line1e_taxable_dep_care,
        line1f_taxable_adoption_benefits:
          input.line1f_taxable_adoption_benefits,
        line1g_wages_8919: input.line1g_wages_8919,
        line1h_other_earned: input.line1h_other_earned,
        line1i_combat_pay: input.line1i_combat_pay,
        line1z_total_wages: line1zWages,
        line2a_tax_exempt: input.line2a_tax_exempt === undefined
          ? undefined
          : sumAmount(input.line2a_tax_exempt),
        line2b_taxable_interest: input.line2b_taxable_interest,
        line3a_qualified_dividends:
          input.line3a_qualified_dividends === undefined
            ? undefined
            : sumAmount(input.line3a_qualified_dividends),
        line3b_ordinary_dividends: input.line3b_ordinary_dividends === undefined
          ? undefined
          : sumAmount(input.line3b_ordinary_dividends),
        line4a_ira_gross: input.line4a_ira_gross,
        line4b_ira_taxable: input.line4b_ira_taxable,
        line5a_pension_gross: input.line5a_pension_gross,
        line5b_pension_taxable: input.line5b_pension_taxable,
        line5c_rollover: input.line5c_rollover,
        line6a_ss_gross: input.line6a_ss_gross,
        line6b_ss_taxable: input.line6b_ss_taxable,
        line7a_capital_gain: line7aCapitalGain,
        line7b_schedule_d_not_required: line7bScheduleDNotRequired,
        line8_additional_income: input.line8_additional_income,
        line9_total_income: input.line9_total_income,
        line10_adjustments: input.line10_adjustments,
        line11a_agi: line11Agi,
        line11b_agi: line11Agi,
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
        line25a_w2_withheld: input.line25a_w2_withheld,
        line25b_withheld_1099: sumAmount(input.line25b_withheld_1099),
        line25c_other_withheld: input.line25c_other_withheld,
        line25d_total_withholding: line25dWithholding,
        line26_estimated_payments: input.line26_estimated_payments,
        line27a_eic: input.line27a_eic,
        line27b_clergy_schedule_se: input.line27b_clergy_schedule_se,
        line27c_declines_eic: input.line27c_declines_eic,
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
        line35a_refund: settlement.line35aRefund,
        line36_apply_to_2027: settlement.line36ApplyTo2027,
        line37_amount_owed: settlement.line37AmountOwed,
        line38_underpayment_penalty: input.line38_underpayment_penalty,
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
