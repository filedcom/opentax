import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812_2026 } from "./f8812.ts";
import { calculateForm5695Carryforward2026 } from "../credit-resolution.ts";

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
}).strict();

export const creditResolutionInput2026Schema = z.object({
  schedule3_base: schedule3Base2026Schema.optional(),
  carryforward_from_2025_line16: amount.optional(),
  line16_income_tax: amount.optional(),
  schedule2_line3: amount.optional(),
  qualifying_children_count: z.number().int().nonnegative().optional(),
  other_dependents_count: z.number().int().nonnegative().optional(),
}).strict();

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
    const { schedule3_base: base } = input;
    if (!base) return { outputs: [] };
    const carryforward = input.carryforward_from_2025_line16;
    if (
      carryforward !== undefined && (
        input.line16_income_tax === undefined ||
        input.qualifying_children_count === undefined ||
        input.other_dependents_count === undefined
      )
    ) {
      throw new Error(
        "TY2026 Form 5695 needs calculated tax and dependent counts",
      );
    }
    if (
      carryforward !== undefined && (
        input.qualifying_children_count! + input.other_dependents_count! > 0
      )
    ) {
      throw new Error(
        "TY2026 Form 5695 with dependents needs provisional Schedule 8812 credit resolution",
      );
    }
    const form5695 = carryforward === undefined
      ? undefined
      : calculateForm5695Carryforward2026({
        carryforwardFrom2025Line16: carryforward,
        form1040Line18: input.line16_income_tax! + (input.schedule2_line3 ?? 0),
        earlierChildCredit: 0,
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
    const outputs = [
      this.outputNodes.output(f8812_2026, {
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
