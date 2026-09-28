import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { normalizeArray } from "../../../utils.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";

const signedAmount = z.union([z.number(), z.array(z.number())]);

// This bounded path is valid only after the preparer has checked all of Form
// 461, not merely the available Schedule C and F nodes. In particular, lines
// 3-5 and 8 and the nonbusiness adjustments on lines 10-11 must be zero.
export const form461ScopeReviewSchema = z.object({
  only_schedule_c_and_f_business_items: z.literal(true),
  other_part_i_lines_zero: z.literal(true),
  part_ii_adjustments_zero: z.literal(true),
  post_at_risk_and_passive_limits_confirmed: z.literal(true),
  source_document_refs: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus).optional(),
  line2_schedule_c: signedAmount.optional(),
  line6_schedule_f: signedAmount.optional(),
  passive_loss_unresolved: z.union([z.boolean(), z.array(z.boolean())])
    .optional(),
  scope_review: form461ScopeReviewSchema.optional(),
}).strict();

type Form461Input = z.infer<typeof inputSchema>;

export const filedForm461Schema = z.object({
  line2_business_income_loss: z.number(),
  line3_capital_gain_loss: z.literal(0),
  line4_other_gain_loss: z.literal(0),
  line5_rental_income_loss: z.literal(0),
  line6_net_farm_profit_loss: z.number(),
  line8_other_income_gain_loss: z.literal(0),
  line9_total_income_loss: z.number(),
  line10_nonbusiness_income_gain: z.literal(0),
  line11_nonbusiness_deduction_loss: z.literal(0),
  line12_nonbusiness_total: z.literal(0),
  line13_adjustment: z.literal(0),
  line14_adjusted_total: z.number(),
  line15_threshold: z.union([z.literal(313000), z.literal(626000)]),
  line16_excess_business_loss: z.number(),
});

function sumAmount(value: Form461Input["line2_schedule_c"]): number {
  return normalizeArray(value).reduce((total, amount) => total + amount, 0);
}

class Form461Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form461";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(ctx: NodeContext, rawInput: Form461Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const hasBusinessSource = input.line2_schedule_c !== undefined ||
      input.line6_schedule_f !== undefined;
    if (!hasBusinessSource) return { outputs: [] };
    if (!input.filing_status) {
      throw new Error(
        "Form 461 needs the return filing status before applying the business-loss threshold",
      );
    }
    const line2 = sumAmount(input.line2_schedule_c);
    const line6 = sumAmount(input.line6_schedule_f);
    if (normalizeArray(input.passive_loss_unresolved).some(Boolean)) {
      throw new Error(
        "Form 461 needs the passive activity loss limitation resolved before using Schedule C/F losses",
      );
    }
    if (line2 >= 0 && line6 >= 0) return { outputs: [] };
    if (!input.scope_review) {
      throw new Error(
        "Form 461 C/F-only calculation needs a sourced review of other Part I items and Part II adjustments",
      );
    }
    const line9 = line2 + line6;
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) {
      throw new Error(`No Form 461 threshold for tax year ${ctx.taxYear}`);
    }
    const threshold = input.filing_status === FilingStatus.MFJ
      ? cfg.eblThresholdMfj
      : cfg.eblThresholdSingle;
    const line16 = line9 + threshold;
    // The IRS's per-line filing trigger is $156,500 for every filing status.
    const mustFile = line9 < -threshold || line2 < -156_500 ||
      line6 < -156_500;
    if (!mustFile) return { outputs: [] };

    const fields = filedForm461Schema.parse({
      line2_business_income_loss: line2,
      line3_capital_gain_loss: 0,
      line4_other_gain_loss: 0,
      line5_rental_income_loss: 0,
      line6_net_farm_profit_loss: line6,
      line8_other_income_gain_loss: 0,
      line9_total_income_loss: line9,
      line10_nonbusiness_income_gain: 0,
      line11_nonbusiness_deduction_loss: 0,
      line12_nonbusiness_total: 0,
      line13_adjustment: 0,
      line14_adjusted_total: line9,
      line15_threshold: threshold,
      line16_excess_business_loss: line16,
    });
    return {
      outputs: [
        { nodeType: this.nodeType, fields },
        ...(line16 < 0
          ? [this.outputNodes.output(schedule1, {
            line8p_excess_business_loss: -line16,
          })]
          : []),
      ],
      ...(line16 < 0
        ? { carryforwards: { excess_business_loss_nol_origin: -line16 } }
        : {}),
    };
  }
}

export const form461 = new Form461Node();
