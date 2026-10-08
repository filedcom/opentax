import { calculateCharitableNaturalResource } from "../../../../../inputs/deductions/charitable/f8283/natural-resource-source.ts";
import { schedule1a } from "../../../deductions/additional/schedule1a/index.ts";
import { form7206 } from "../../../adjustments/health/form7206/index.ts";
import { filedOwnedScheduleF } from "../../../../../owned-business-filing.ts";
import { patronFiledBusinessLines } from "../../../../../inputs/deductions/business/qbi_patron/calculation.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../../../aggregation/general/return-assembly/agi_aggregator/index.ts";
import { schedule1 } from "../../../../../outputs/general/return-assembly/schedule1/index.ts";
import { schedule_se } from "../../../taxes/self-employment/schedule_se/index.ts";
import { form8995 } from "../../../deductions/business/form8995/index.ts";
import { form8582 } from "../form8582/index.ts";
import { form461 } from "../form461/index.ts";
import { schedule_j_calculation } from "../../../taxes/income-averaging/schedule_j/index.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";

// ── TY2025 Constants ──────────────────────────────────────────────────────────

// IRC §1402(b) — minimum net farm profit to owe SE tax
const SE_TAX_THRESHOLD = 400;

export * from "./model.ts";
import {
  calculateScheduleFAtRiskNet,
  computeGrossIncome,
  inputSchema,
  projectScheduleFItems,
  reconcileFarmSources,
  type ScheduleFItem,
  wotcReductionsByFarm,
} from "./model.ts";

// Per-item routing outputs (QBI, passive, at-risk)
function perItemOutputs(
  item: ScheduleFItem,
  netProfit: number,
  wotcReduction = 0,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  // Form 8995 (QBI): only when net profit > 0
  if (netProfit > 0 || item.qbi_wotc_filing_review) {
    outputs.push(output(form8995, {
      schedule_f_qbi_businesses: [{
        business_reference: item.farm_id,
        business_name: item.line_c_farm_name,
        ein: item.line_d_ein?.replace(/\D/g, ""),
        qbi: netProfit,
        ...(wotcReduction > 0 ? { wotc_wage_reduction: wotcReduction } : {}),
        w2_wages: item.qbi_w2_wages ?? 0,
        ubia: item.qbi_unadjusted_basis ?? 0,
        no_other_adjustments_confirmed:
          item.qbi_no_other_adjustments_confirmed === true,
        source_schedule_f: item,
      }],
    }));
  }

  // Form 8582 (passive): only when material participation = false
  if (item.line_e_material_participation === false) {
    outputs.push(output(form8582, { passive_schedule_f: netProfit }));
  }

  return outputs;
}

// ── Node class ────────────────────────────────────────────────────────────────

class ScheduleFNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_f";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      schedule1,
      schedule1a,
      agi_aggregator,
      schedule_se,
      form8995,
      form7206,
      form8582,
      form461,
      schedule_j_calculation,
    ]);
  }

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    reconcileFarmSources(input);

    if (input.schedule_fs.length === 0) {
      return { outputs: [] };
    }

    const reductions = wotcReductionsByFarm(input);
    const filedItems = projectScheduleFItems(input);
    const atRisk = filedItems.map((item) =>
      calculateScheduleFAtRiskNet(
        item,
        reductions.get(item.farm_id ?? "") ?? 0,
      )
    );
    const netProfits = atRisk.map((result, index) =>
      filedItems[index].qbi_wotc_filing_review
        ? patronFiledBusinessLines(
          "schedule_f",
          filedItems[index],
          reductions.get(input.schedule_fs[index].farm_id ?? "") ?? 0,
        ).profit
        : (input.patron_filing_review || input.independent_patron_reviews)
        ? patronFiledBusinessLines("schedule_f", filedItems[index])
          .profit
        : (ctx.taxYear === 2025
          ? filedOwnedScheduleF(
            filedItems[index],
            input.farm_optional_method_elected === true,
            reductions.get(input.schedule_fs[index].farm_id ?? "") ?? 0,
          )?.profit
          : undefined) ?? result.atRiskNet
    );
    const propertyNet = netProfits.reduce((sum, p) => sum + p, 0);
    const totalNetProfit = propertyNet;

    // Only emit outputs when there is actual activity (non-zero result)
    const hasActivity = atRisk.some((result) => result.preliminaryNet !== 0) ||
      input.schedule_fs.some((item) => computeGrossIncome(item) !== 0);

    if (!hasActivity) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];
    outputs.push(output(form7206, {
      schedule_f_source: {
        regular_source: input.farm_optional_method_elected !== true &&
          !input.patron_filing_review &&
          input.schedule_fs.every((f) =>
            f.accounting_method === "cash" &&
            f.line_e_material_participation === true &&
            f.line36_at_risk === "a" && !f.at_risk_simplified
          ),
        businesses: input.schedule_fs.map((f, index) => ({
          farm_id: f.farm_id,
          proprietor_recipient: f.proprietor_recipient,
          line34_net_profit: netProfits[index],
        })),
      },
    }));

    outputs.push(this.outputNodes.output(schedule1a, {
      qualified_tips_schedule_f_businesses: filedItems.map((f, index) => ({
        farm_id: f.farm_id,
        proprietor_recipient: f.proprietor_recipient,
        line34_net_profit: netProfits[index],
        accounting_method: f.accounting_method,
        material_participation: f.line_e_material_participation,
      })),
    }));

    // Schedule 1 line 6: aggregate net farm profit/loss (always when there is activity)
    outputs.push(
      this.outputNodes.output(schedule1, { line6_schedule_f: totalNetProfit }),
    );
    outputs.push(
      this.outputNodes.output(agi_aggregator, {
        line6_schedule_f: totalNetProfit,
      }),
    );
    outputs.push(this.outputNodes.output(schedule_j_calculation, {
      farm_net_profit: totalNetProfit,
      farm_activity_count: input.schedule_fs.length,
      farm_positive_activity_count: netProfits.filter((profit) => profit > 0)
        .length,
    }));

    // Keep the actual farm identity rows and their totals in one retained contribution.
    const routed = filedItems.flatMap((item, index) =>
      perItemOutputs(
        item,
        netProfits[index],
        reductions.get(item.farm_id ?? "") ?? 0,
      )
    );
    outputs.push(...routed.filter((row) => row.nodeType !== form8995.nodeType));
    const qualified = filedItems.map((item, index) => ({
      item,
      profit: netProfits[index],
    })).filter((row) => row.profit > 0 || row.item.qbi_wotc_filing_review);
    if (qualified.length) {
      outputs.push(output(form8995, {
        schedule_f_qbi_businesses: routed.filter((row) =>
          row.nodeType === form8995.nodeType
        ).flatMap((row) => row.fields.schedule_f_qbi_businesses as any[]),
        qbi_from_schedule_f: qualified.reduce(
          (sum, row) => sum + row.profit,
          0,
        ),
        w2_wages: qualified.reduce(
          (sum, row) => sum + (row.item.qbi_w2_wages ?? 0),
          0,
        ),
        unadjusted_basis: qualified.reduce(
          (sum, row) => sum + (row.item.qbi_unadjusted_basis ?? 0),
          0,
        ),
      }));
    }

    if (input.owner_filing_status === "mfj") {
      outputs.push(
        this.outputNodes.output(schedule_se, {
          owner_business_sources: input.schedule_fs.map((item, index) => {
            if (!item.proprietor_recipient || !item.farm_id) {
              throw new Error(
                "Joint Schedule SE needs each farm proprietor and source activity",
              );
            }
            return {
              recipient: item.proprietor_recipient,
              source_reference: item.farm_id,
              kind: "schedule_f",
              business_name: item.line_c_farm_name,
              ein: item.line_d_ein?.replace(/\D/g, ""),
              qbi_no_other_adjustments_confirmed:
                item.qbi_no_other_adjustments_confirmed === true,
              net_profit: input.farm_optional_method_elected === true
                ? atRisk[index].preliminaryNet
                : netProfits[index],
              ...(input.farm_optional_method_elected === true
                ? {
                  farm_optional_method_elected: true,
                  gross_farm_income: computeGrossIncome(item),
                }
                : {}),
            };
          }),
        }),
      );
    }
    if (input.farm_optional_method_elected === true) {
      // 2025 Schedule SE Part II footnotes: gross farm income comes from
      // Schedule F line 9, and net farm profit from line 34, before the
      // subsequent at-risk limitation. One election covers all Schedule Fs.
      const grossFarmIncome = input.schedule_fs.reduce(
        (sum, item) => sum + computeGrossIncome(item),
        0,
      );
      const line34NetFarmProfit = atRisk.reduce(
        (sum, result) => sum + result.preliminaryNet,
        0,
      );
      outputs.push(this.outputNodes.output(schedule_se, {
        farm_optional_method_elected: true,
        gross_farm_income: Math.max(0, grossFarmIncome),
        net_profit_schedule_f: line34NetFarmProfit,
      }));
    } else if (totalNetProfit >= SE_TAX_THRESHOLD) {
      // Schedule SE line 1a takes the net of all Schedule F activities.
      outputs.push(this.outputNodes.output(schedule_se, {
        net_profit_schedule_f: totalNetProfit,
      }));
    }

    // Form 461 line 6 uses signed Schedule 1 line 6 after at-risk limits.
    // The return-wide threshold is applied by Form 461, not per farm.
    outputs.push(this.outputNodes.output(form461, {
      line6_schedule_f: totalNetProfit,
      passive_loss_unresolved: input.schedule_fs.some((item, index) =>
        item.line_e_material_participation === false && netProfits[index] < 0
      ),
    }));

    return {
      outputs,
      carryforwards: Object.fromEntries(
        [
          ...input.schedule_fs.flatMap((item) => {
            if (!item.donated_natural_resource_property_source) return [];
            const carry = calculateCharitableNaturalResource(
              item.donated_natural_resource_property_source,
            ).current_year.conservation_carry;
            return carry > 0
              ? [[
                `schedule_f_section175_conservation_${item.farm_id}_${ctx.taxYear}`,
                carry,
              ]]
              : [];
          }),
          ...atRisk.flatMap((result, index) =>
            result.suspended > 0
              ? [[
                `schedule_f_at_risk_suspended_${index + 1}`,
                result.suspended,
              ]]
              : []
          ),
        ],
      ),
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const schedule_f = new ScheduleFNode();
