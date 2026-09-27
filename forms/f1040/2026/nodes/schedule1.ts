import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";

const signed = z.number().finite();
const nonnegative = signed.nonnegative();
const accumulated = z.union([signed, z.array(signed)]);

/** Source fields accepted by the dedicated TY2026 Schedule 1 sink. */
export const inputSchema = z.object({
  line1_state_refund: signed.optional(),
  line2a_alimony_received: nonnegative.optional(),
  line3_schedule_c: signed.optional(),
  line4_other_gains: signed.optional(),
  line5_schedule_e: accumulated.optional(),
  line6_schedule_f: signed.optional(),
  line7_unemployment: nonnegative.optional(),
  line7_repaid: nonnegative.optional(),
  line8a_nol_deduction: nonnegative.optional(),
  line8c_cod_income: signed.optional(),
  line8d_foreign_earned_income_exclusion: nonnegative.optional(),
  line8e_archer_msa_dist: nonnegative.optional(),
  line8i_prizes_awards: signed.optional(),
  line8p_excess_business_loss: nonnegative.optional(),
  line8z_rtaa: nonnegative.optional(),
  line8z_taxable_grants: nonnegative.optional(),
  line8z_other: signed.optional(),
  line8z_description: z.string().trim().min(1).optional(),
  line11_educator_expenses: nonnegative.optional(),
  line12_business_expenses: nonnegative.optional(),
  line13_hsa_deduction: nonnegative.optional(),
  line14_moving_expenses: nonnegative.optional(),
  line15_se_deduction: nonnegative.optional(),
  line16_sep_simple: nonnegative.optional(),
  line17_se_health_insurance: nonnegative.optional(),
  line18_early_withdrawal: nonnegative.optional(),
  // Existing student-loan sources use the old name. The AGI node supplies
  // the phaseout-adjusted amount that actually belongs on 2026 line 21.
  line19_student_loan_interest: nonnegative.optional(),
  line21_student_loan_interest_from_agi: nonnegative.optional(),
  line20_ira_deduction: nonnegative.optional(),
  line23_archer_msa_deduction: nonnegative.optional(),
  line24f_501c18d: nonnegative.optional(),
  agi_schedule1_line10: signed.optional(),
  agi_schedule1_line26: nonnegative.optional(),
  // These older source keys do not describe their 2026 printed lines.
  line8b_savings_bond_exclusion: nonnegative.optional(),
  line8g_child_interest_dividends: nonnegative.optional(),
  line8d_foreign_housing_deduction: nonnegative.optional(),
  line13_depreciation: nonnegative.optional(),
  line24h_dpad: nonnegative.optional(),
}).strict();

type Input = z.infer<typeof inputSchema>;

function sum(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  return Array.isArray(value)
    ? value.reduce((total, part) => total + part, 0)
    : value;
}

class Schedule12026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule 1 requires f1040:2026 context");
    }
    const input: Input = inputSchema.parse(rawInput);
    for (
      const key of [
        "line8b_savings_bond_exclusion",
        "line8g_child_interest_dividends",
        "line8d_foreign_housing_deduction",
        "line13_depreciation",
        "line24h_dpad",
      ] as const
    ) {
      if ((input[key] ?? 0) > 0) {
        throw new Error(`TY2026 Schedule 1 cannot place legacy source ${key}`);
      }
    }
    if ((input.line8z_other ?? 0) !== 0 && !input.line8z_description) {
      throw new Error("TY2026 Schedule 1 line 8z needs an income type");
    }
    const line8zRows = [
      { description: "RTAA payments", amount: input.line8z_rtaa ?? 0 },
      {
        description: "Taxable grants",
        amount: input.line8z_taxable_grants ?? 0,
      },
      {
        description: input.line8z_description ?? "",
        amount: input.line8z_other ?? 0,
      },
    ].filter((row) => row.amount !== 0);
    const line8zTotal = line8zRows.reduce(
      (total, row) => total + row.amount,
      0,
    );
    if (
      (input.line7_repaid ?? 0) > 0 &&
      input.line7_unemployment === undefined
    ) {
      throw new Error("TY2026 Schedule 1 repayment needs net unemployment");
    }
    const adjustedSli = input.line21_student_loan_interest_from_agi ?? 0;
    if (
      input.line19_student_loan_interest !== undefined &&
      (input.line21_student_loan_interest_from_agi === undefined ||
        adjustedSli > input.line19_student_loan_interest)
    ) {
      throw new Error("TY2026 Schedule 1 needs adjusted student-loan interest");
    }
    const line9 = -(input.line8a_nol_deduction ?? 0) +
      (input.line8c_cod_income ?? 0) -
      (input.line8d_foreign_earned_income_exclusion ?? 0) +
      (input.line8e_archer_msa_dist ?? 0) +
      (input.line8i_prizes_awards ?? 0) +
      (input.line8p_excess_business_loss ?? 0) +
      line8zTotal;
    const line10 = (input.line1_state_refund ?? 0) +
      (input.line2a_alimony_received ?? 0) +
      (input.line3_schedule_c ?? 0) +
      (input.line4_other_gains ?? 0) + sum(input.line5_schedule_e) +
      (input.line6_schedule_f ?? 0) + (input.line7_unemployment ?? 0) + line9;
    const line26 = [
      input.line11_educator_expenses,
      input.line12_business_expenses,
      input.line13_hsa_deduction,
      input.line14_moving_expenses,
      input.line15_se_deduction,
      input.line16_sep_simple,
      input.line17_se_health_insurance,
      input.line18_early_withdrawal,
      input.line20_ira_deduction,
      adjustedSli,
      input.line23_archer_msa_deduction,
      input.line24f_501c18d,
    ].reduce<number>((total, value) => total + (value ?? 0), 0);
    if (
      (line10 !== 0 || line26 !== 0) &&
      (input.agi_schedule1_line10 === undefined ||
        input.agi_schedule1_line26 === undefined)
    ) {
      throw new Error("TY2026 Schedule 1 needs finalized AGI totals");
    }
    if (
      input.agi_schedule1_line10 !== undefined &&
        input.agi_schedule1_line10 !== line10 ||
      input.agi_schedule1_line26 !== undefined &&
        input.agi_schedule1_line26 !== line26
    ) {
      throw new Error("TY2026 Schedule 1 disagrees with AGI totals");
    }
    const hasPrintedData =
      Object.entries(input).some(([key, value]) =>
        !key.startsWith("agi_") &&
        key !== "line21_student_loan_interest_from_agi" &&
        key !== "line19_student_loan_interest" &&
        key !== "line8z_description" &&
        value !== undefined && value !== 0
      ) || adjustedSli !== 0;
    if (!hasPrintedData) return { outputs: [] };
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: {
          file_schedule1: true,
          ...input,
          line5_schedule_e: sum(input.line5_schedule_e),
          line8a_nol_deduction: input.line8a_nol_deduction === undefined
            ? undefined
            : -input.line8a_nol_deduction,
          line8d_foreign_earned_income_exclusion:
            input.line8d_foreign_earned_income_exclusion === undefined
              ? undefined
              : -input.line8d_foreign_earned_income_exclusion,
          line8z_total: line8zTotal,
          line8z_print_description: line8zRows.length > 1
            ? "See attached statement"
            : line8zRows[0]?.description,
          line8z_statement_rows: line8zRows.length > 1 ? line8zRows : undefined,
          line9_total_other_income: line9,
          line10_total_additional_income: line10,
          line21_student_loan_interest: adjustedSli,
          line25_total_other_adjustments: input.line24f_501c18d ?? 0,
          line26_total_adjustments: line26,
        },
      }],
    };
  }
}

export const schedule1_2026 = new Schedule12026Node();
