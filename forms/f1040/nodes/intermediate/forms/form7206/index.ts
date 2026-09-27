import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { form8995 } from "../form8995/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { form8962 } from "../form8962/index.ts";
import {
  calculatePub974SingleBusinessIterative,
  pub974SingleBusinessSourceSchema,
} from "./pub974_worksheets.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Net profit from self-employment (from Schedule C/F/SE) before this deduction
  // Used to cap the deduction — cannot exceed net SE profit
  se_net_profit: z.number().nonnegative().optional(),

  // Self-employed health insurance premiums paid (medical, dental, vision)
  // Cannot include premiums paid through subsidized employer plan
  health_insurance_premiums: z.number().nonnegative().optional(),
  marketplace_ptc_premium_overlap: z.boolean().optional(),
  pub974_single_business: pub974SingleBusinessSourceSchema.optional(),

  // Long-term care insurance premiums paid
  ltc_premiums: z.number().nonnegative().optional(),

  // Age of taxpayer (for LTC premium age-based limit)
  taxpayer_age: z.number().int().nonnegative().optional(),

  // Long-term care insurance premiums for spouse
  ltc_premiums_spouse: z.number().nonnegative().optional(),

  // Age of spouse (for LTC premium age-based limit)
  spouse_age: z.number().int().nonnegative().optional(),
}).strict();

type Form7206Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function ltcLimit(
  age: number,
  limits: import("../../../config/index.ts").F1040Config["ltcPremiumLimits"],
): number {
  for (const bracket of limits) {
    if (age <= bracket.maxAge) return bracket.limit;
  }
  return limits[limits.length - 1].limit;
}

// Eligible LTC premiums — capped by age-based limit
function eligibleLtcPremiums(
  premiums: number,
  age: number,
  limits: import("../../../config/index.ts").F1040Config["ltcPremiumLimits"],
): number {
  return Math.min(premiums, ltcLimit(age, limits));
}

// Total deductible premiums before profit cap and PTC reduction
function totalEligiblePremiums(
  input: Form7206Input,
  limits: import("../../../config/index.ts").F1040Config["ltcPremiumLimits"],
): number {
  const healthPremiums = input.health_insurance_premiums ?? 0;

  // LTC for taxpayer
  const ltcTaxpayer = input.ltc_premiums ?? 0;
  const ageTaxpayer = input.taxpayer_age ?? 0;
  const eligibleLtcTaxpayer = ltcTaxpayer > 0
    ? eligibleLtcPremiums(ltcTaxpayer, ageTaxpayer, limits)
    : 0;

  // LTC for spouse
  const ltcSpouse = input.ltc_premiums_spouse ?? 0;
  const ageSpouse = input.spouse_age ?? 0;
  const eligibleLtcSpouse = ltcSpouse > 0
    ? eligibleLtcPremiums(ltcSpouse, ageSpouse, limits)
    : 0;

  return healthPremiums + eligibleLtcTaxpayer + eligibleLtcSpouse;
}

function computeDeduction(
  input: Form7206Input,
  limits: import("../../../config/index.ts").F1040Config["ltcPremiumLimits"],
): number {
  const eligible = totalEligiblePremiums(input, limits);
  if (eligible <= 0) return 0;

  // Cap at net SE profit (deduction cannot create a loss from SE)
  const seProfit = input.se_net_profit ?? 0;
  return Math.min(eligible, seProfit);
}

function buildOutput(deduction: number): NodeOutput[] {
  if (deduction <= 0) return [];
  return [
    output(schedule1, { line17_se_health_insurance: deduction }),
    output(agi_aggregator, { line17_se_health_insurance: deduction }),
    // This deduction is attributable to the trade or business, so it reduces QBI.
    // i8995, Determining Your Qualified Business Income: the items to consider include
    // the "self-employment health insurance deduction".
    output(form8995, { se_health_insurance_deduction: deduction }),
  ];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form7206Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form7206";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    form8995,
    form8962,
  ]);

  compute(ctx: NodeContext, rawInput: Form7206Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    if (input.pub974_single_business) {
      if (
        ctx.taxYear !== 2025 ||
        input.marketplace_ptc_premium_overlap !== true ||
        input.se_net_profit !== undefined ||
        input.health_insurance_premiums !== undefined ||
        input.ltc_premiums !== undefined ||
        input.ltc_premiums_spouse !== undefined ||
        input.taxpayer_age !== undefined || input.spouse_age !== undefined
      ) {
        throw new Error(
          "Form 7206 Publication 974 route needs only verified 2025 single-business source facts and positive Marketplace overlap",
        );
      }
      const source = input.pub974_single_business;
      const business = source.worksheet_w.business;
      if (business.kind !== "self_employed") {
        throw new Error(
          "Form 7206 Publication 974 filed route needs one Schedule C business",
        );
      }
      const result = calculatePub974SingleBusinessIterative(source);
      const f = source.form8962_source;
      return {
        outputs: [
          ...buildOutput(result.schedule1_line17_deduction),
          output(form8962, {
            pub974_reconciliation: {
              monthly_premiums: f.monthly_premiums!,
              monthly_slcsps: f.monthly_slcsps!,
              monthly_aptcs: f.monthly_aptcs!,
              specified_policy_months:
                source.worksheet_w.specified_policy_months,
              form1095a_coverage_months: source.form1095a_coverage_months,
              worksheet_x_source: {
                form1040_line9_total_income:
                  source.worksheet_x.form1040_line9_total_income,
                form1040_line2a_tax_exempt_interest:
                  source.worksheet_x.form1040_line2a_tax_exempt_interest,
                form1040_nontaxable_social_security:
                  source.worksheet_x.form1040_nontaxable_social_security,
                form2555_lines45_and_50:
                  source.worksheet_x.form2555_lines45_and_50,
                schedule1_adjustments_except_line17:
                  source.worksheet_x.schedule1_adjustments_except_line17,
              },
              ...(source.worksheet_w.business.kind === "self_employed"
                ? {
                  worksheet_w_line15_se_tax_deduction:
                    source.worksheet_w.business
                      .schedule1_line15_se_tax_deduction,
                  worksheet_w_line16_retirement_deduction:
                    source.worksheet_w.business
                      .establishing_business_schedule1_line16_retirement_deduction,
                }
                : {}),
              worksheet_w_business_earned_income:
                business.establishing_business_earned_income,
              schedule1_line17_final_deduction:
                result.schedule1_line17_deduction,
              taxpayer_modified_agi: result.form8962_fields
                .taxpayer_modified_agi as number,
              dependents_modified_agi:
                source.worksheet_x.required_filing_dependents_modified_agi,
              household_size: source.worksheet_x.household_size,
              fpl_region: source.worksheet_x.fpl_region,
              filing_status: source.worksheet_x.filing_status,
              total_premium_tax_credit: result.form8962_fields
                .total_premium_tax_credit as number,
              specified_premiums: result.worksheet_w.line1_specified_premiums,
              specified_deduction: result.schedule1_line17_deduction -
                result.worksheet_w.line14_nonspecified_deduction,
            },
          }),
        ],
        finalizations: [{
          nodeType: this.nodeType,
          fields: { pub974_form7206_omit: true },
        }],
      };
    }
    if (
      input.health_insurance_premiums &&
      input.marketplace_ptc_premium_overlap === undefined
    ) {
      throw new Error(
        "Form 7206 health premiums require Marketplace PTC overlap review",
      );
    }
    if (input.marketplace_ptc_premium_overlap) {
      throw new Error(
        "Form 7206 Marketplace PTC overlap requires Publication 974 deduction calculation",
      );
    }
    const deduction = computeDeduction(input, cfg.ltcPremiumLimits);
    return { outputs: buildOutput(deduction) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form7206 = new Form7206Node();
