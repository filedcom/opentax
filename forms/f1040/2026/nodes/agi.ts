import {
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "../inputs/business-qbi.ts";
import { benefitElectionBridge2026Schema } from "../inputs/social-security-election.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import {
  agi_aggregator,
  computeSsaTaxable,
  inputSchema as sharedSchema,
  socialSecurityWorksheetIncome,
} from "../../nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { agi2026 } from "../../nodes/config/2026-agi.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

/** Audited income/adjustment bridges; activity-limit routes are added with their owners. */
export const inputSchema = sharedSchema.pick({
  line1a_wages: true,
  line1b_household_wages: true,
  line1h_other_earned: true,
  line1c_unreported_tips: true,
  line1e_taxable_dep_care: true,
  line1f_taxable_adoption_benefits: true,
  line1g_wages_8919: true,
  line2b_taxable_interest: true,
  line3b_ordinary_dividends: true,
  line4b_ira_taxable: true,
  line5b_pension_taxable: true,
  line6a_ss_gross: true,
  line6b_ss_taxable: true,
  tax_exempt_interest: true,
  mfs_lived_with_spouse: true,
  line7_capital_gain: true,
  line7a_cap_gain_distrib: true,
  line1_state_refund: true,
  line2a_alimony_received: true,
  line3_schedule_c: true,
  line4_other_gains: true,
  line5_schedule_e: true,
  line6_schedule_f: true,
  line7_unemployment: true,
  line8a_nol_deduction: true,
  line8c_cod_income: true,
  line8d_foreign_earned_income_exclusion: true,
  line8e_archer_msa_dist: true,
  line8i_prizes_awards: true,
  line8z_rtaa: true,
  line11_educator_expenses: true,
  line12_business_expenses: true,
  line13_hsa_deduction: true,
  line14_moving_expenses: true,
  line15_se_deduction: true,
  line16_sep_simple: true,
  line17_se_health_insurance: true,
  line18_early_withdrawal: true,
  line20_ira_deduction: true,
  line21_student_loan_interest: true,
  line23_archer_msa_deduction: true,
  line24f_501c18d: true,
}).extend({
  business_sources_2026: businessReturnSource2026Schema.optional(),
  filing_status: z.nativeEnum(FilingStatus),
  social_security_lump_sum: benefitElectionBridge2026Schema.optional(),
}).strict();

class Agi2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "agi_aggregator";
  readonly inputSchema = inputSchema;
  readonly outputNodes = agi_aggregator.outputNodes;
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "f8863"];
  }

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("2026 AGI needs f1040:2026 context");
    }
    const parsed = inputSchema.parse(rawInput);
    // Repeated sources for one printed line are added before rounding; signed
    // halves use the same helper as the 2026 finalizer.
    const normalized = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        if (typeof value === "number" || Array.isArray(value)) {
          const values = Array.isArray(value) ? value : [value];
          if (values.some((amount) => !Number.isFinite(amount))) {
            throw new Error("AGI amounts must be finite");
          }
          const amount = roundWholeDollars(
            values.reduce((sum, part) => sum + part, 0),
          );
          if (!Number.isSafeInteger(amount)) {
            throw new Error("AGI amount exceeds whole-dollar range");
          }
          return [key, amount];
        }
        return [key, value];
      }),
    );
    // These two sources share one printed capital-gain line.
    if (
      parsed.line7_capital_gain !== undefined ||
      parsed.line7a_cap_gain_distrib !== undefined
    ) {
      normalized.line7_capital_gain = roundWholeDollars(
        (parsed.line7_capital_gain ?? 0) +
          (parsed.line7a_cap_gain_distrib ?? 0),
      );
      normalized.line7a_cap_gain_distrib = undefined;
    }
    const input = inputSchema.parse(normalized);
    if ((input.line21_student_loan_interest ?? 0) > 2_500) {
      throw new Error(
        "Student-loan input must be the eligible amount capped at $2,500",
      );
    }
    let socialSecurityWorksheet;
    let lumpSumElection;
    if (input.social_security_lump_sum && input.line6a_ss_gross === undefined) {
      throw new Error("Lump-sum comparison needs current net benefits");
    }
    if (input.line6a_ss_gross !== undefined) {
      if (input.line6a_ss_gross < 0) {
        throw new Error(
          "Negative net benefits need repayment deduction or credit review",
        );
      }
      if (
        input.filing_status === FilingStatus.MFS &&
        input.mfs_lived_with_spouse === undefined
      ) {
        throw new Error(
          "MFS Social Security needs the full-year spouse residence answer",
        );
      }
      if (
        (input.line20_ira_deduction ?? 0) > 0 &&
        input.line6b_ss_taxable === undefined
      ) {
        throw new Error(
          "IRA deduction with Social Security needs coordinated Pub. 590-A worksheets",
        );
      }
      const income = socialSecurityWorksheetIncome(input);
      const calculated = roundWholeDollars(computeSsaTaxable(
        input.line6a_ss_gross,
        income.other_income + income.foreign_earned_income_exclusion -
          income.adjustments_except_student_loan,
        input.tax_exempt_interest ?? 0,
        input.filing_status === FilingStatus.MFJ,
        input.filing_status === FilingStatus.MFS &&
          input.mfs_lived_with_spouse === true,
      ));
      const election = input.social_security_lump_sum;
      if (election) {
        if (
          input.line6b_ss_taxable !== undefined ||
          roundWholeDollars(election.net_benefits_before_rounding) !==
            input.line6a_ss_gross
        ) {
          throw new Error(
            "Lump-sum worksheet must own taxable benefits and reconcile to current source benefits",
          );
        }
        const currentBenefits = Math.max(
          0,
          roundWholeDollars(
            (Math.round(election.net_benefits_before_rounding * 100) -
              Math.round(election.lump_sum_payments * 100)) / 100,
          ),
        );
        const currentTaxable = roundWholeDollars(computeSsaTaxable(
          currentBenefits,
          income.other_income + income.foreign_earned_income_exclusion -
            income.adjustments_except_student_loan,
          input.tax_exempt_interest ?? 0,
          input.filing_status === FilingStatus.MFJ,
          input.filing_status === FilingStatus.MFS &&
            input.mfs_lived_with_spouse === true,
        ));
        const alternative = election.additional_taxable_benefits === undefined
          ? undefined
          : currentTaxable + election.additional_taxable_benefits;
        const elected = election.method === "use_if_lower" &&
          alternative !== undefined && alternative < calculated;
        lumpSumElection = {
          ...election,
          current_year_benefits_excluding_lump_sums: currentBenefits,
          current_year_taxable_benefits: currentTaxable,
          ordinary_taxable_benefits: calculated,
          election_taxable_benefits: alternative,
          elected,
          taxable_benefits: elected ? alternative! : calculated,
        };
      }
      // Coordinated IRA may later supply an internal final amount. Public
      // sources cannot assert current taxable benefits or override an election.
      const taxable = lumpSumElection?.taxable_benefits ??
        input.line6b_ss_taxable ?? calculated;
      if (
        taxable < 0 || taxable > roundWholeDollars(.85 * input.line6a_ss_gross)
      ) {
        throw new Error("Taxable Social Security exceeds the benefit limit");
      }
      socialSecurityWorksheet = {
        net_benefits: input.line6a_ss_gross,
        ...income,
        tax_exempt_interest: input.tax_exempt_interest ?? 0,
        ordinary_taxable_benefits: calculated,
        taxable_benefits: taxable,
        ...(lumpSumElection ? { lump_sum_election: lumpSumElection } : {}),
      };
      // Resolve SSA before the shared SLI phaseout. SLI does not reduce the
      // SSA worksheet, so the calculation is ordered rather than iterative.
      input.line6b_ss_taxable = taxable;
    }
    const { business_sources_2026, ...sharedInput } = input;
    const business = business_sources_2026
      ? resolveBusinessQbi2026(business_sources_2026).business
      : undefined;
    if (
      business &&
      (business.source_input.filing_status !== input.filing_status ||
        business.schedule1_line3 !== (input.line3_schedule_c ?? 0) ||
        business.schedule1_line15 !== (input.line15_se_deduction ?? 0))
    ) {
      throw new Error(
        "AGI business amounts disagree with retained business sources",
      );
    }
    const result = agi_aggregator.computeWithConfig(ctx, sharedInput, agi2026);
    let additionalIncome = 0;
    let adjustments = 0;
    let studentLoan = 0;
    const wageIncome = [
      input.line1a_wages,
      input.line1b_household_wages,
      input.line1c_unreported_tips,
      input.line1e_taxable_dep_care,
      input.line1f_taxable_adoption_benefits,
      input.line1g_wages_8919,
      input.line1h_other_earned,
    ].reduce<number>(
      (sum, value) =>
        sum +
        (Array.isArray(value) ? value.reduce((a, b) => a + b, 0) : value ?? 0),
      0,
    );
    const outputs = result.outputs.map((output) => {
      if (output.nodeType === "f8812" || output.nodeType === "eitc") {
        return {
          ...output,
          fields: {
            ...output.fields,
            wage_income_from_agi: wageIncome,
            ...(business_sources_2026 ? { business_sources_2026 } : {}),
            [
              output.nodeType === "eitc"
                ? "unsupported_eic_activity"
                : "unsupported_earned_income_activity"
            ]: [
              business ? 0 : input.line3_schedule_c,
              input.line6_schedule_f,
              ...(output.nodeType === "eitc"
                ? [
                  input.line5_schedule_e,
                  input.line4_other_gains,
                  input.line4b_ira_taxable,
                  input.line5b_pension_taxable,
                ]
                : []),
              business ? 0 : input.line15_se_deduction,
              input.line8d_foreign_earned_income_exclusion,
            ].some((v) => (v ?? 0) !== 0),
          },
        };
      }
      if (output.nodeType === "f1040") {
        const { line11_agi: _legacy, ...fields } = output.fields;
        if (Object.hasOwn(fields, "line9_total_income")) {
          additionalIncome = Number(fields.line8_additional_income ?? 0);
          adjustments = Number(fields.line10_adjustments ?? 0);
        }
        return { nodeType: "f1040", fields };
      }
      if (
        output.nodeType === "schedule1a" || output.nodeType === "schedule_a"
      ) {
        return {
          ...output,
          fields: {
            ...output.fields,
            form2555_line45_from_agi:
              input.line8d_foreign_earned_income_exclusion ?? 0,
            ...(output.nodeType === "schedule_a"
              ? {
                educator_adjustment_from_agi: input.line11_educator_expenses ??
                  0,
              }
              : {}),
          },
        };
      }
      if (output.nodeType === "form8960") {
        return {
          ...output,
          fields: {
            ...output.fields,
            foreign_earned_income_exclusion_from_agi:
              input.line8d_foreign_earned_income_exclusion ?? 0,
            other_niit_income_pending: [
              input.line4b_ira_taxable,
              input.line5b_pension_taxable,
              business ? 0 : input.line3_schedule_c,
              input.line4_other_gains,
              input.line5_schedule_e,
              input.line6_schedule_f,
              input.line8a_nol_deduction,
              input.line1_state_refund,
            ].some((v) => (v ?? 0) !== 0),
            early_withdrawal_penalty_from_agi: input.line18_early_withdrawal ??
              0,
            taxable_interest_from_agi: input.line2b_taxable_interest ?? 0,
            ordinary_dividends_from_agi: input.line3b_ordinary_dividends ?? 0,
            capital_gain_from_agi: input.line7_capital_gain ?? 0,
          },
        };
      }
      if (output.nodeType === "standard_deduction") {
        return {
          ...output,
          fields: {
            ...output.fields,
            // The dependent worksheet uses Schedule C net, including statutory
            // expenses, less deductible half-SE tax. It is not EIC gross income.
            wage_income_from_agi: wageIncome,
            ...([
                business ? 0 : input.line3_schedule_c,
                input.line6_schedule_f,
                business ? 0 : input.line15_se_deduction,
                input.line8d_foreign_earned_income_exclusion,
              ].some((v) => (v ?? 0) !== 0)
              ? {}
              : {
                dependent_earned_income: Math.max(
                  0,
                  wageIncome + (business?.schedule1_line3 ?? 0) -
                    (business?.schedule1_line15 ?? 0),
                ),
              }),
            qbi_activity_pending: [
              business ? 0 : input.line3_schedule_c,
              input.line5_schedule_e,
              input.line6_schedule_f,
            ].some((amount) => amount !== undefined && amount !== 0),
          },
        };
      }
      if (output.nodeType === "schedule1") {
        studentLoan = Number(output.fields.line21_student_loan_interest ?? 0);
        return {
          nodeType: "schedule1",
          fields: { line21_student_loan_interest_from_agi: studentLoan },
        };
      }
      return output;
    });
    const earned = outputs.find((o) => o.nodeType === "f8812")?.fields;
    outputs.push({
      nodeType: "f8863",
      fields: {
        agi: earned?.auto_agi,
        earned_income_from_agi: wageIncome,
        ...(business_sources_2026 ? { business_sources_2026 } : {}),
        unsupported_earned_income_activity: [
          business ? 0 : input.line3_schedule_c,
          input.line6_schedule_f,
          business ? 0 : input.line15_se_deduction,
          input.line8d_foreign_earned_income_exclusion,
        ].some((v) => (v ?? 0) !== 0),
      },
    });
    outputs.push({
      nodeType: "f2441",
      fields: {
        wage_income_from_agi: earned?.wage_income_from_agi ?? 0,
        ...(business_sources_2026 ? { business_sources_2026 } : {}),
        unsupported_earned_income_activity: [
          business ? 0 : input.line3_schedule_c,
          input.line6_schedule_f,
          business ? 0 : input.line15_se_deduction,
          input.line8d_foreign_earned_income_exclusion,
        ].some((v) => (v ?? 0) !== 0),
      },
    });
    outputs.push({
      nodeType: "schedule1",
      fields: {
        agi_schedule1_line10: additionalIncome,
        agi_schedule1_line26: adjustments,
        ...(studentLoan === 0
          ? { line21_student_loan_interest_from_agi: 0 }
          : {}),
      },
    });
    if (socialSecurityWorksheet) {
      outputs.push({
        nodeType: "agi_aggregator",
        fields: {
          social_security_worksheet_2026: socialSecurityWorksheet,
        },
      });
      outputs.push({
        nodeType: "f1040",
        fields: {
          // The shared aggregator suppresses zero amounts; 1040 line 6b needs 0.
          ...(input.line6b_ss_taxable === 0 ? { line6b_ss_taxable: 0 } : {}),
          line6c_lump_sum_election: lumpSumElection?.elected ?? false,
          line6d_mfs_lived_apart: input.filing_status === FilingStatus.MFS &&
            input.mfs_lived_with_spouse === false,
        },
      });
    }
    return { outputs };
  }
}

export const agi_2026 = new Agi2026Node();
