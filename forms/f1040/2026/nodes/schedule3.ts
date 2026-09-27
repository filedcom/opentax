import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  inputSchema as sharedSchedule3InputSchema,
} from "../../nodes/intermediate/aggregation/schedule3/index.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812_2026 } from "./f8812.ts";

const amount = z.number().finite().nonnegative();
export const schedule3Input2026Schema = sharedSchedule3InputSchema.omit({
  line5b_energy_efficient_home: true,
}).extend({
  line13a_form2439: amount.optional(),
  line13b_section1341: amount.optional(),
  line13c_form3800_elective_payment: amount.optional(),
  line13d_deferred_section965: amount.optional(),
  line13e_form1062: amount.optional(),
  line13z_other_refundable: amount.optional(),
  line13z_description: z.string().trim().min(1).optional(),
  line6z_other_nonrefundable: amount.optional(),
  line6z_description: z.string().trim().min(1).optional(),
}).strict();

type Input = z.infer<typeof schedule3Input2026Schema>;
const sum = (value: number | number[] | undefined) =>
  value === undefined
    ? 0
    : Array.isArray(value)
    ? value.reduce((total, part) => total + part, 0)
    : value;

export function calculateSchedule3_2026(input: Input) {
  const line1 = (input.line1_foreign_tax_credit ?? 0) +
    sum(input.line1_foreign_tax_1099);
  const line6a = sum(input.line6a_general_business_credit) +
    sum(input.line6a_low_income_housing_credit);
  const line6f = sum(input.line6f_clean_vehicle_credit);
  const line6m = sum(input.line6m_prev_owned_clean_vehicle_credit);
  const line7 = line6a +
    (input.line6b_prior_year_min_tax_credit ?? 0) +
    (input.line6c_adoption_credit ?? 0) +
    (input.line6d_elderly_disabled_credit ?? 0) +
    line6f +
    (input.line6g_mortgage_interest_credit ?? 0) +
    (input.line6h_dc_homebuyer_credit ?? 0) +
    (input.line6i_qualified_electric_vehicle_credit ?? 0) +
    (input.line6j_alt_fuel_vehicle_refueling ?? 0) +
    (input.line6k_tax_credit_bonds ?? 0) +
    (input.line6l_form8978_credit ?? 0) +
    line6m + (input.line6z_other_nonrefundable ?? 0);
  const line8 = line1 +
    (input.line2_childcare_credit ?? 0) +
    (input.line3_education_credit ?? 0) +
    (input.line4_retirement_savings_credit ?? 0) +
    (input.line5a_residential_clean_energy ?? 0) + line7;
  const line14 = (input.line13a_form2439 ?? 0) +
    (input.line13b_section1341 ?? 0) +
    (input.line13c_form3800_elective_payment ?? 0) +
    (input.line13d_deferred_section965 ?? 0) +
    (input.line13e_form1062 ?? 0) +
    (input.line13z_other_refundable ?? 0);
  const line15 = (input.line9_premium_tax_credit ?? 0) +
    (input.line10_amount_paid_extension ?? 0) +
    (input.line11_excess_ss ?? 0) +
    (input.line12_fuel_tax_credit ?? 0) + line14;
  return { line1, line6a, line6f, line6m, line7, line8, line14, line15 };
}

class Schedule3Node2026 extends TaxNode<typeof schedule3Input2026Schema> {
  readonly nodeType = "schedule3";
  readonly inputSchema = schedule3Input2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof schedule3Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule 3 requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    if (
      input.form3800_source_credit_pending ||
      input.form8912_source_credit_pending ||
      input.form8859_source_credit_pending ||
      input.form8834_source_credit_pending
    ) {
      throw new Error("TY2026 Schedule 3 source credit needs finalization");
    }
    if (
      input.line6z_other_nonrefundable && !input.line6z_description ||
      input.line13z_other_refundable && !input.line13z_description
    ) {
      throw new Error("TY2026 Schedule 3 other credit needs a description");
    }
    const lines = calculateSchedule3_2026(input);
    const outputs: NodeOutput[] = [this.outputNodes.output(f8812_2026, {
      auto_schedule3_credit_lines: {
        schedule3_line1: lines.line1,
        schedule3_line2: input.line2_childcare_credit ?? 0,
        schedule3_line3: input.line3_education_credit ?? 0,
        schedule3_line4: input.line4_retirement_savings_credit ?? 0,
        schedule3_line6d: input.line6d_elderly_disabled_credit ?? 0,
        schedule3_line6f: lines.line6f,
        schedule3_line6l: input.line6l_form8978_credit ?? 0,
        schedule3_line6m: lines.line6m,
        schedule3_line5a: input.line5a_residential_clean_energy ?? 0,
        schedule3_line6c: input.line6c_adoption_credit ?? 0,
        schedule3_line6g: input.line6g_mortgage_interest_credit ?? 0,
        schedule3_line6h: input.line6h_dc_homebuyer_credit ?? 0,
      },
    })];
    if (lines.line8 > 0 || lines.line15 > 0) {
      outputs.push(this.outputNodes.output(
        f1040_2026_node,
        lines.line8 > 0
          ? {
            line20_nonrefundable_credits: lines.line8,
            ...(lines.line15 > 0 && { line31_other_payments: lines.line15 }),
          }
          : { line31_other_payments: lines.line15 },
      ));
      outputs.push({
        nodeType: this.nodeType,
        fields: {
          ...input,
          line1_total: lines.line1,
          line6a_total: lines.line6a,
          line6f_total: lines.line6f,
          line6m_total: lines.line6m,
          line7_total: lines.line7,
          line8_total: lines.line8,
          line14_total: lines.line14,
          line15_total: lines.line15,
        },
      });
    }
    return { outputs };
  }
}

export const schedule3_2026 = new Schedule3Node2026();
