import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812_2026 } from "./f8812.ts";
import { filingStatusSchema } from "../../nodes/types.ts";
import {
  calculateCreditLimitWorksheetALine5_2026,
  calculateEarnedIncomeWorksheet,
  calculateProvisionalSchedule8812Lines,
} from "../../nodes/inputs/f8812/index.ts";
import { f8812Facts2026Schema } from "../credit-facts.ts";
import {
  calculateCreditLimitWorksheetB2026,
  calculateForm5695Carryforward2026,
} from "../credit-resolution.ts";

const amount = z.number().finite().nonnegative();
export const schedule3Base2026Schema = z.object({
  line1_total: amount,
  line2_childcare_credit: amount,
  line3_education_credit: amount,
  line4_retirement_savings_credit: amount,
  line6c_adoption_credit: amount,
  line6d_elderly_disabled_credit: amount,
  line6f_clean_vehicle_credit: amount,
  line6g_mortgage_interest_credit: amount,
  line6h_dc_homebuyer_credit: amount,
  line6l_form8978_credit: amount,
  line6m_prev_owned_clean_vehicle_credit: amount,
  line8_before_form5695: amount,
  line15_total: amount,
  line11_excess_ss: amount,
}).strict();

export const creditResolutionInput2026Schema = z.object({
  schedule3_base: schedule3Base2026Schema.optional(),
  carryforward_from_2025_line16: amount.optional(),
  line16_income_tax: amount.optional(),
  schedule2_line3: amount.optional(),
  qualifying_children_count: z.number().int().nonnegative().optional(),
  other_dependents_count: z.number().int().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  agi: z.number().finite().optional(),
  w2_earned_income: amount.optional(),
  schedule2_line16c: amount.optional(),
  schedule2_line17c: amount.optional(),
  credit_facts: f8812Facts2026Schema.optional(),
}).strict();

const zeroBase = schedule3Base2026Schema.parse({
  line1_total: 0,
  line2_childcare_credit: 0,
  line3_education_credit: 0,
  line4_retirement_savings_credit: 0,
  line6c_adoption_credit: 0,
  line6d_elderly_disabled_credit: 0,
  line6f_clean_vehicle_credit: 0,
  line6g_mortgage_interest_credit: 0,
  line6h_dc_homebuyer_credit: 0,
  line6l_form8978_credit: 0,
  line6m_prev_owned_clean_vehicle_credit: 0,
  line8_before_form5695: 0,
  line15_total: 0,
  line11_excess_ss: 0,
});

class CreditResolutionNode2026 extends TaxNode<
  typeof creditResolutionInput2026Schema
> {
  readonly nodeType = "credit_resolution";
  readonly inputSchema = creditResolutionInput2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof creditResolutionInput2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 credit resolution requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    const base = input.schedule3_base ?? zeroBase;
    const carryforward = input.carryforward_from_2025_line16;
    const creditCounts = (input.qualifying_children_count ?? 0) +
      (input.other_dependents_count ?? 0);
    if (
      !input.schedule3_base && carryforward === undefined && creditCounts === 0
    ) {
      return { outputs: [] };
    }
    if (
      (carryforward !== undefined || creditCounts > 0) && (
        input.line16_income_tax === undefined ||
        input.qualifying_children_count === undefined ||
        input.other_dependents_count === undefined
      )
    ) {
      throw new Error(
        "TY2026 credit resolution needs calculated tax and dependent counts",
      );
    }
    if (
      creditCounts > 0 &&
      (input.filing_status === undefined || input.agi === undefined)
    ) {
      throw new Error("TY2026 credit resolution needs filing status and AGI");
    }
    const form1040Line18 = (input.line16_income_tax ?? 0) +
      (input.schedule2_line3 ?? 0);
    const facts = input.credit_facts;
    if (facts?.files_form2555 === false && (facts.form2555_amounts ?? 0) > 0) {
      throw new Error("TY2026 credit facts disagree about Form 2555");
    }
    const provisional = creditCounts === 0
      ? undefined
      : calculateProvisionalSchedule8812Lines(2026, {
        filingStatus: input.filing_status!,
        agi: input.agi!,
        puertoRicoExcludedIncome: facts?.puerto_rico_excluded_income ?? 0,
        form2555Amounts: facts?.form2555_amounts ?? 0,
        form4563Amount: facts?.form4563_amount ?? 0,
        qualifyingChildrenCount: input.qualifying_children_count!,
        otherDependentsCount: input.other_dependents_count!,
      });
    const worksheetBeforeEnergy = {
      schedule3_line1: base.line1_total,
      schedule3_line2: base.line2_childcare_credit,
      schedule3_line3: base.line3_education_credit,
      schedule3_line4: base.line4_retirement_savings_credit,
      schedule3_line6d: base.line6d_elderly_disabled_credit,
      schedule3_line6f: base.line6f_clean_vehicle_credit,
      schedule3_line6l: base.line6l_form8978_credit,
      schedule3_line6m: base.line6m_prev_owned_clean_vehicle_credit,
      worksheet_b_applies: false as const,
    };
    const worksheetBApplies = input.qualifying_children_count! > 0 &&
      facts?.files_form2555 !== true &&
      (facts?.form2555_amounts ?? 0) === 0 && (
        carryforward !== undefined ||
        base.line6c_adoption_credit > 0 ||
        base.line6g_mortgage_interest_credit > 0 ||
        base.line6h_dc_homebuyer_credit > 0
      );
    let worksheetBLine14 = 0;
    if (worksheetBApplies && provisional!.line12 > 0) {
      if (!facts?.earned_income_worksheet) {
        throw new Error(
          "TY2026 Worksheet B needs the Earned Income Worksheet source facts",
        );
      }
      const earned = calculateEarnedIncomeWorksheet(
        facts.earned_income_worksheet,
      );
      if (
        input.w2_earned_income !== undefined &&
        earned.line1a !== input.w2_earned_income
      ) {
        throw new Error(
          "TY2026 Worksheet B wages disagree with W-2 earned wages",
        );
      }
      worksheetBLine14 = calculateCreditLimitWorksheetB2026({
        schedule8812Line12: provisional!.line12,
        qualifyingChildrenUnder17: input.qualifying_children_count!,
        earnedIncomeWorksheetLine7: earned.line7,
        bonaFidePuertoRicoResident: facts.bona_fide_pr_resident === true,
        filesForm2555: facts.files_form2555 === true,
        line7WithheldSocialSecurityMedicareRrta:
          facts.worksheet_b_line7_withheld_ss_medicare_rrta,
        schedule1Line15: facts.schedule1_line15 ?? 0,
        schedule2Line16c: input.schedule2_line16c ?? 0,
        schedule2Line17c: input.schedule2_line17c ?? 0,
        form1040Line27aEic: facts.form1040_line27a_eic ?? 0,
        schedule3Line11ExcessSocialSecurityRrta: base.line11_excess_ss,
      }).line14;
    }
    const earlierChildCredit = provisional === undefined
      ? 0
      : worksheetBApplies
      ? worksheetBLine14
      : Math.min(
        provisional.line12,
        calculateCreditLimitWorksheetALine5_2026(
          form1040Line18,
          worksheetBeforeEnergy,
        ),
      );
    const form5695 = carryforward === undefined
      ? undefined
      : calculateForm5695Carryforward2026({
        carryforwardFrom2025Line16: carryforward,
        form1040Line18,
        earlierChildCredit,
        schedule3Line6lForm8978: base.line6l_form8978_credit,
        schedule3Line1ForeignTax: base.line1_total,
        schedule3Line2DependentCare: base.line2_childcare_credit,
        schedule3Line6dElderlyDisabled: base.line6d_elderly_disabled_credit,
        schedule3Line3Education: base.line3_education_credit,
        schedule3Line4RetirementSavings: base.line4_retirement_savings_credit,
        schedule3Line6mPreviouslyOwnedVehicle:
          base.line6m_prev_owned_clean_vehicle_credit,
        schedule3Line6fCleanVehicle: base.line6f_clean_vehicle_credit,
        schedule3Line6gMortgageInterest: base.line6g_mortgage_interest_credit,
        schedule3Line6cAdoption: base.line6c_adoption_credit,
        schedule3Line6hDcHomebuyer: base.line6h_dc_homebuyer_credit,
      });
    const energyCredit = form5695?.line3_credit ?? 0;
    const finalSchedule3Line8 = base.line8_before_form5695 + energyCredit;
    const finalWorksheet = provisional === undefined
      ? undefined
      : worksheetBApplies
      ? {
        ...worksheetBeforeEnergy,
        worksheet_b_applies: true,
        worksheet_b_line14: worksheetBLine14,
        schedule3_line5a: energyCredit,
        schedule3_line6c: base.line6c_adoption_credit,
        schedule3_line6g: base.line6g_mortgage_interest_credit,
        schedule3_line6h: base.line6h_dc_homebuyer_credit,
      }
      : worksheetBeforeEnergy;
    const outputs = [
      this.outputNodes.output(f8812_2026, {
        ...(finalWorksheet && { credit_limit_worksheet_2026: finalWorksheet }),
        auto_schedule3_credit_lines: {
          schedule3_line1: base.line1_total,
          schedule3_line2: base.line2_childcare_credit,
          schedule3_line3: base.line3_education_credit,
          schedule3_line4: base.line4_retirement_savings_credit,
          schedule3_line6d: base.line6d_elderly_disabled_credit,
          schedule3_line6f: base.line6f_clean_vehicle_credit,
          schedule3_line6l: base.line6l_form8978_credit,
          schedule3_line6m: base.line6m_prev_owned_clean_vehicle_credit,
          schedule3_line5a: energyCredit,
          schedule3_line6c: base.line6c_adoption_credit,
          schedule3_line6g: base.line6g_mortgage_interest_credit,
          schedule3_line6h: base.line6h_dc_homebuyer_credit,
        },
      }),
    ];
    if (finalSchedule3Line8 > 0 || base.line15_total > 0) {
      outputs.push(this.outputNodes.output(
        f1040_2026_node,
        finalSchedule3Line8 > 0
          ? {
            line20_nonrefundable_credits: finalSchedule3Line8,
            ...(base.line15_total > 0 && {
              line31_other_payments: base.line15_total,
            }),
          }
          : { line31_other_payments: base.line15_total },
      ));
    }
    if (form5695) {
      outputs.push({ nodeType: "form5695", fields: form5695 });
    }
    return {
      outputs,
      ...(form5695 && {
        finalizations: [{
          nodeType: "schedule3",
          fields: {
            line5a_residential_clean_energy: energyCredit,
            line8_total: finalSchedule3Line8,
          },
        }],
      }),
      ...(form5695?.line4_to_2027 && {
        carryforwards: {
          form5695_residential_clean_energy_to_2027: form5695.line4_to_2027,
        },
      }),
    };
  }
}

export const credit_resolution_2026 = new CreditResolutionNode2026();
