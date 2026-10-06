import {
  calculateIndependentOwnerHealth,
  independentOwnerHealthSourceSchema,
  reconcileIndependentOwnerHealthGraph,
} from "./independent-owner.ts";
import { ownerSourcesSchema } from "../schedule_se/owner-calculation.ts";
import {
  calculateSingleScheduleCForm7206,
  money,
  type SingleScheduleCPlan,
  singleScheduleCPlanSchema,
} from "./single-source.ts";
export {
  calculateSingleScheduleCForm7206,
  form7206LinesSchema,
  singleScheduleCPlanSchema,
} from "./single-source.ts";
export type { Form7206Lines, SingleScheduleCPlan } from "./single-source.ts";
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

export const inputSchema = z.object({
  single_schedule_c_plan: singleScheduleCPlanSchema.optional(),
  independent_schedule_c_plans: independentOwnerHealthSourceSchema.optional(),
  schedule_c_source: z.object({
    unadjusted_source: z.boolean(),
    businesses: z.array(
      z.object({
        business_reference: z.string().trim().min(1).optional(),
        proprietor_recipient: z.nativeEnum(TS).optional(),
        line31_net_profit: z.number().finite(),
      }).strict(),
    ).min(1),
  }).strict().optional(),
  schedule_se_source: z.object({
    net_profit_schedule_c: z.number().finite(),
    net_profit_schedule_f: z.number().finite(),
    farm_optional_method_elected: z.boolean(),
    line13_deduction: money,
    owner_source: ownerSourcesSchema.optional(),
  }).strict().optional(),
  schedule1_line16_source: money.optional(),
  marketplace_ptc_premium_overlap: z.boolean().optional(),
  pub974_single_business: pub974SingleBusinessSourceSchema.optional(),
}).strict();

type Form7206Input = z.infer<typeof inputSchema>;

export function reconcileSingleScheduleCGraphSource(
  fields: {
    schedule_c_source?: unknown;
    schedule_se_source?: unknown;
    schedule1_line16_source?: unknown;
    marketplace_ptc_premium_overlap?: unknown;
  },
  plan: SingleScheduleCPlan,
  computedSELine13: number,
): void {
  const scheduleC = inputSchema.shape.schedule_c_source.parse(
    fields.schedule_c_source,
  );
  const scheduleSE = inputSchema.shape.schedule_se_source.parse(
    fields.schedule_se_source,
  );
  const business = scheduleC?.businesses[0];
  if (
    fields.marketplace_ptc_premium_overlap !== false ||
    scheduleC?.unadjusted_source !== true ||
    scheduleC.businesses.length !== 1 ||
    !business ||
    business.business_reference !== plan.business_reference ||
    business.proprietor_recipient !== plan.recipient ||
    business.line31_net_profit !== plan.schedule_c_line31_net_profit ||
    !scheduleSE ||
    scheduleSE.net_profit_schedule_c !== plan.schedule_c_line31_net_profit ||
    scheduleSE.net_profit_schedule_f !== 0 ||
    scheduleSE.farm_optional_method_elected ||
    scheduleSE.line13_deduction !== computedSELine13 ||
    (fields.schedule1_line16_source ?? 0) !== 0
  ) {
    throw new Error(
      "Form 7206 prepared source checks differ from Schedule C, Schedule SE, or the identified plan",
    );
  }
}

function buildOutput(
  deduction: number,
  source?: SingleScheduleCPlan,
): NodeOutput[] {
  if (deduction <= 0 && !source) return [];
  return [
    output(schedule1, { line17_se_health_insurance: deduction }),
    output(agi_aggregator, { line17_se_health_insurance: deduction }),
    // This deduction is attributable to the trade or business, so it reduces QBI.
    // i8995, Determining Your Qualified Business Income: the items to consider include
    // the "self-employment health insurance deduction".
    output(form8995, {
      se_health_insurance_deduction: deduction,
      ...(source ? { joint_owner_health_plan_source: source } : {}),
    }),
  ];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form7206Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form7206";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      schedule1,
      agi_aggregator,
      form8995,
      form8962,
    ]);
  }

  compute(ctx: NodeContext, rawInput: Form7206Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    if (input.independent_schedule_c_plans) {
      if (
        ctx.taxYear !== 2025 || input.single_schedule_c_plan ||
        input.pub974_single_business
      ) {
        throw new Error(
          "Independent health plans require only their actual ordinary owner source family",
        );
      }
      const family = calculateIndependentOwnerHealth(
        input.independent_schedule_c_plans,
        input.schedule_se_source?.owner_source,
        cfg.ssWageBase,
      );
      reconcileIndependentOwnerHealthGraph(input, family);
      return {
        outputs: [
          output(schedule1, { line17_se_health_insurance: family.deduction }),
          output(agi_aggregator, {
            line17_se_health_insurance: family.deduction,
          }),
          output(form8995, {
            se_health_insurance_deduction: family.deduction,
            joint_owner_health_plans_source: family.source,
          }),
          {
            nodeType: this.nodeType,
            fields: {
              independent_schedule_c_plans: family.source,
              independent_plan_filing_rows: family.rows,
            },
          },
        ],
      };
    }
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
      const scheduleCBusinesses = input.schedule_c_source?.businesses;
      const scheduleCBusiness = scheduleCBusinesses?.[0];
      const scheduleSE = input.schedule_se_source;
      if (
        input.schedule_c_source?.unadjusted_source !== true ||
        scheduleCBusinesses?.length !== 1 || !scheduleCBusiness ||
        scheduleCBusiness.business_reference !==
          business.establishing_business_reference ||
        scheduleCBusiness.proprietor_recipient !== TS.T ||
        scheduleCBusiness.line31_net_profit !==
          business.establishing_business_earned_income ||
        scheduleCBusiness.line31_net_profit !==
          business.all_profitable_business_earned_income ||
        !scheduleSE ||
        scheduleSE.net_profit_schedule_c !==
          scheduleCBusiness.line31_net_profit ||
        scheduleSE.net_profit_schedule_f !== 0 ||
        scheduleSE.farm_optional_method_elected ||
        scheduleSE.line13_deduction !==
          business.schedule1_line15_se_tax_deduction ||
        (input.schedule1_line16_source ?? 0) !==
          business.establishing_business_schedule1_line16_retirement_deduction
      ) {
        throw new Error(
          "Publication 974 Worksheet W business income and deductions must match the identified Schedule C, Schedule SE, and retirement source",
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
              form1095a_policy_months: source.form1095a_policy_months,
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
              worksheet_x_repayment_limit:
                result.worksheet_x.line25_repayment_limit,
              specified_premiums: result.worksheet_w.line1_specified_premiums,
              attributable_specified_ptc: result.attributable_specified_ptc,
              specified_deduction: result.schedule1_line17_deduction -
                result.worksheet_w.line14_nonspecified_deduction,
            },
          }),
        ],
      };
    }
    const source = input.single_schedule_c_plan;
    if (!source) {
      if (
        input.pub974_single_business === undefined &&
        input.marketplace_ptc_premium_overlap === undefined
      ) return { outputs: [] };
      throw new Error("Form 7206 requires one identified Schedule C plan");
    }
    if (input.marketplace_ptc_premium_overlap !== false) {
      throw new Error(
        "Form 7206 Marketplace PTC overlap requires Publication 974 deduction calculation",
      );
    }
    const businesses = input.schedule_c_source?.businesses;
    const business = businesses?.[0];
    const se = input.schedule_se_source;
    if (
      input.schedule_c_source?.unadjusted_source !== true ||
      businesses?.length !== 1 || !business ||
      business.business_reference !== source.business_reference ||
      business.proprietor_recipient !== source.recipient ||
      business.line31_net_profit <= 0 ||
      business.line31_net_profit !== source.schedule_c_line31_net_profit ||
      !se || se.net_profit_schedule_c !== business.line31_net_profit ||
      se.net_profit_schedule_f !== 0 || se.farm_optional_method_elected ||
      se.line13_deduction !== source.schedule1_line15_se_tax_deduction ||
      (input.schedule1_line16_source ?? 0) !==
        source.schedule1_line16_retirement_deduction ||
      (input.schedule1_line16_source ?? 0) !== 0
    ) {
      throw new Error(
        "Form 7206 one-plan filing needs one owner-matched Schedule C, its computed Schedule SE line 13, and zero retirement deduction",
      );
    }
    const lines = calculateSingleScheduleCForm7206(source);
    return {
      outputs: [
        ...buildOutput(lines.line14, source),
        {
          nodeType: this.nodeType,
          fields: {
            single_schedule_c_plan: source,
            recipient_name: source.recipient === TS.S
              ? source.spouse_identity!.name
              : source.taxpayer_identity.name,
            recipient_ssn:
              (source.recipient === TS.S
                ? source.spouse_identity!.ssn
                : source.taxpayer_identity.ssn).replaceAll("-", ""),
            ...lines,
          },
        },
      ],
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form7206 = new Form7206Node();
