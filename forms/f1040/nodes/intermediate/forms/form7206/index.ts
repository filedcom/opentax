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
import { TS } from "../../../types.ts";
import {
  calculatePub974SingleBusinessIterative,
  pub974SingleBusinessSourceSchema,
} from "./pub974_worksheets.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

const money = z.number().finite().nonnegative();

export const singleScheduleCPlanSchema = z.object({
  business_reference: z.string().trim().min(1),
  plan_identifier: z.string().trim().min(1),
  recipient: z.nativeEnum(TS),
  eligible_health_premiums: money.positive(),
  schedule_c_line31_net_profit: money.positive(),
  schedule1_line15_se_tax_deduction: money,
  schedule1_line16_retirement_deduction: money,
  plan_established_under_business: z.literal(true),
  eligible_premium_months_verified: z.literal(true),
  sole_positive_business_verified: z.literal(true),
  no_marketplace_overlap: z.literal(true),
  no_ltc_premiums: z.literal(true),
  no_form2555: z.literal(true),
  no_schedule_se_optional_method: z.literal(true),
  no_other_earned_income: z.literal(true),
}).strict();

export type SingleScheduleCPlan = z.infer<typeof singleScheduleCPlanSchema>;

export const form7206LinesSchema = z.object({
  line1: money,
  line2: money,
  line3: money,
  line4: money,
  line5: money,
  line6: z.number().min(0).max(1),
  line7: money,
  line8: money,
  line9: money,
  line10: money,
  line12: money,
  line13: money,
  line14: money,
});

export type Form7206Lines = z.infer<typeof form7206LinesSchema>;

export const inputSchema = z.object({
  single_schedule_c_plan: singleScheduleCPlanSchema.optional(),
  marketplace_ptc_premium_overlap: z.boolean().optional(),
  pub974_single_business: pub974SingleBusinessSourceSchema.optional(),
}).strict();

type Form7206Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

export function calculateSingleScheduleCForm7206(
  raw: SingleScheduleCPlan,
): Form7206Lines {
  const source = singleScheduleCPlanSchema.parse(raw);
  const profit = source.schedule_c_line31_net_profit;
  const seTax = source.schedule1_line15_se_tax_deduction;
  const retirement = source.schedule1_line16_retirement_deduction;
  if (seTax > profit || retirement > profit - seTax) {
    throw new Error(
      "Form 7206 Schedule 1 lines 15-16 exceed the establishing business income",
    );
  }
  const line10 = profit - seTax - retirement;
  return form7206LinesSchema.parse({
    line1: source.eligible_health_premiums,
    line2: 0,
    line3: source.eligible_health_premiums,
    line4: profit,
    line5: profit,
    line6: 1,
    line7: seTax,
    line8: profit - seTax,
    line9: retirement,
    line10,
    line12: 0,
    line13: line10,
    line14: Math.min(source.eligible_health_premiums, line10),
  });
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
        input.single_schedule_c_plan !== undefined
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
      };
    }
    const source = input.single_schedule_c_plan;
    if (!source) {
      if (Object.keys(input).length === 0) return { outputs: [] };
      throw new Error("Form 7206 requires one identified Schedule C plan");
    }
    if (input.marketplace_ptc_premium_overlap !== false) {
      throw new Error(
        "Form 7206 Marketplace PTC overlap requires Publication 974 deduction calculation",
      );
    }
    throw new Error(
      "Form 7206 one-plan filing is not source-reconciled: premium-month records, Schedule C owner, Schedule 1 lines 15-16, and return-wide exclusions are required",
    );
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form7206 = new Form7206Node();
