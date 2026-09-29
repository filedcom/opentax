import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { internalForm8990ScheduleCPass } from "../../intermediate/forms/form8990/schedule-c-pass.ts";
import { sameStagedScheduleCSource } from "../../intermediate/forms/form8990/two-stage.ts";
import { form8582 } from "../../intermediate/forms/form8582/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form461 } from "../../intermediate/forms/form461/index.ts";
import { eitc } from "../../intermediate/forms/eitc/index.ts";
import { f8812 } from "../f8812/index.ts";
import { form7206 } from "../../intermediate/forms/form7206/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import {
  assertScheduleCInterestExempt,
  calculateScheduleCAtRiskNet,
  computeCOGS,
  computeGrossIncome,
  computeNetProfit,
  computeTotalExpenses,
  homeOfficeDeduction,
  inputSchema,
  isSeExempt,
  itemSchema,
  mealsDeductiblePct,
  projectForm8829ScheduleCItems,
  projectScheduleCItems,
  projectSection481aScheduleCItems,
  type ScheduleCItem,
  wagesLessEmploymentCredits,
  wotcReductionsByBusiness,
} from "./model.ts";

export {
  assertScheduleCInterestExempt,
  calculateScheduleCAtRiskNet,
  computeCOGS,
  computeGrossIncome,
  computeNetProfit,
  computeTotalExpenses,
  homeOfficeDeduction,
  inputSchema,
  itemSchema,
  mealsDeductiblePct,
  projectForm8829ScheduleCItems,
  projectScheduleCItems,
  projectSection481aScheduleCItems,
  wagesLessEmploymentCredits,
  wotcReductionsByBusiness,
};
export type { ScheduleCItem };

// ── TY2025 Constants ────────────────────────────────────────────────────────

const SE_TAX_THRESHOLD = 400; // Net profit >= $400 → Schedule SE
const CLERGY_SE_THRESHOLD = 108.28; // Clergy SE threshold (no Form 4361)
// Schedule SE line 4c threshold for the combined businesses. Clergy Schedule C income
// carries the lower church-employee threshold, so it sets the test for the whole return.
function seThreshold(items: readonly ScheduleCItem[]): number {
  return items.some((item) => item.clergy_schedule_c === true)
    ? CLERGY_SE_THRESHOLD
    : SE_TAX_THRESHOLD;
}

function amtDepletionOutputs(item: ScheduleCItem): NodeOutput[] {
  const regularDepletion = item.line_12_depletion ?? 0;
  const amtWorksheet = item.amt_depletion_worksheet;
  if (regularDepletion > 0 && !amtWorksheet) {
    throw new Error(
      "Schedule C line 12 depletion needs a reviewed property-level AMT depletion worksheet for Form 6251 line 2d",
    );
  }
  if (!amtWorksheet) return [];
  if (
    item.line_g_material_participation !== true ||
    item.line_32_at_risk === "b" || item.at_risk_simplified !== undefined
  ) {
    throw new Error(
      "Schedule C passive or at-risk-limited depletion needs an AMT activity refigure, not Form 6251 line 2d",
    );
  }
  const references = amtWorksheet.properties.map((property) =>
    property.property_reference
  );
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Schedule C AMT depletion property references must be unique",
    );
  }
  const worksheetRegular = amtWorksheet.properties.reduce(
    (sum, property) => sum + property.regular_allowed_depletion,
    0,
  );
  const worksheetAmt = amtWorksheet.properties.reduce(
    (sum, property) => sum + property.amt_allowed_depletion,
    0,
  );
  if (worksheetRegular !== regularDepletion) {
    throw new Error(
      "Schedule C AMT depletion worksheet regular total must match line 12",
    );
  }
  const line2d = worksheetRegular - worksheetAmt;
  return line2d === 0 ? [] : [output(form6251, { line2d_depletion: line2d })];
}

function deductionOutputs(
  item: ScheduleCItem,
  netProfit: number,
): NodeOutput[] {
  const outputs: NodeOutput[] = [...amtDepletionOutputs(item)];
  if (item.line_g_material_participation === false) {
    outputs.push(output(form8582, { passive_schedule_c: netProfit }));
  }
  return outputs;
}

// ── Node class ───────────────────────────────────────────────────────────────

class ScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule_se,
    form8995,
    form8582,
    form6251,
    form461,
    eitc,
    f8812,
    form7206,
  ]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    // Validate schema — throws on invalid data (negative amounts, bad enums)
    inputSchema.parse(input);
    if ((input.line_12_depletion ?? 0) > 0) {
      throw new Error(
        "Unlinked depletion worksheet amount needs a Schedule C business and property-level AMT refigure",
      );
    }

    if ((input.line16a_interest_mortgage ?? 0) > 0) {
      throw new Error(
        "Schedule C upstream mortgage interest needs a business-linked section 163(j) exemption",
      );
    }
    const items = projectScheduleCItems(input);
    const form8990Pass = internalForm8990ScheduleCPass(ctx);
    if (form8990Pass === undefined) {
      items.forEach((item) =>
        assertScheduleCInterestExempt(item, cfg.smallBizGrossReceipts)
      );
    } else if (
      ctx.taxYear !== 2025 ||
      items.length !== 1 ||
      !sameStagedScheduleCSource(input, form8990Pass.source)
    ) {
      throw new Error(
        "Schedule C Form 8990 pass needs its exact internally staged business source",
      );
    }

    if (items.length === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];

    // Per-item: compute net profit and collect per-item routing outputs
    const reductions = wotcReductionsByBusiness({
      ...input,
      schedule_cs: items,
    });
    const atRisk = items.map((item) =>
      calculateScheduleCAtRiskNet(
        item,
        reductions.get(item.business_reference ?? "") ?? 0,
      )
    );
    const netProfits = atRisk.map((result) => result.atRiskNet);
    outputs.push(this.outputNodes.output(form7206, {
      schedule_c_source: {
        unadjusted_source: Object.keys(input).every((key) =>
          key === "schedule_cs" || key === "filing_status"
        ) && items.every((item) =>
          item.at_risk_simplified === undefined &&
          item.line_32_at_risk !== "b"
        ),
        businesses: items.map((item, index) => ({
          ...(item.business_reference !== undefined && {
            business_reference: item.business_reference,
          }),
          ...(item.proprietor_recipient !== undefined && {
            proprietor_recipient: item.proprietor_recipient,
          }),
          line31_net_profit: netProfits[index],
        })),
      },
    }));

    // Aggregate net profits → single schedule1 output and AGI aggregator
    const totalNetProfit = netProfits.reduce((sum, p) => sum + p, 0);
    outputs.push(
      this.outputNodes.output(schedule1, { line3_schedule_c: totalNetProfit }),
    );
    outputs.push(
      this.outputNodes.output(agi_aggregator, {
        line3_schedule_c: totalNetProfit,
      }),
    );

    // Preserve the Schedule C business classification and limitation inputs so the
    // QBI node can select Form 8995 or 8995-A after taxable income is known.
    const nonSstbQbi = items.reduce(
      (sum, item, index) =>
        item.qbi_specified_service === true ? sum : sum + netProfits[index],
      0,
    );
    const sstbQbi = items.reduce(
      (sum, item, index) =>
        item.qbi_specified_service === true ? sum + netProfits[index] : sum,
      0,
    );
    const nonSstbWages = items.reduce(
      (sum, item) =>
        item.qbi_specified_service === true
          ? sum
          : sum + (item.qbi_w2_wages ?? 0),
      0,
    );
    const sstbWages = items.reduce(
      (sum, item) =>
        item.qbi_specified_service === true
          ? sum + (item.qbi_w2_wages ?? 0)
          : sum,
      0,
    );
    const nonSstbUbia = items.reduce(
      (sum, item) =>
        item.qbi_specified_service === true
          ? sum
          : sum + (item.qbi_unadjusted_basis ?? 0),
      0,
    );
    const sstbUbia = items.reduce(
      (sum, item) =>
        item.qbi_specified_service === true
          ? sum + (item.qbi_unadjusted_basis ?? 0)
          : sum,
      0,
    );
    if (
      nonSstbQbi !== 0 || sstbQbi !== 0 || nonSstbWages > 0 ||
      sstbWages > 0 || nonSstbUbia > 0 || sstbUbia > 0 ||
      netProfits.some((profit) => profit < 0)
    ) {
      outputs.push(this.outputNodes.output(form8995, {
        qbi_from_schedule_c: nonSstbQbi,
        sstb_qbi: sstbQbi,
        w2_wages: nonSstbWages,
        sstb_w2_wages: sstbWages,
        unadjusted_basis: nonSstbUbia,
        sstb_unadjusted_basis: sstbUbia,
        schedule_c_qbi_businesses: items.map((item, index) => ({
          business_reference: item.business_reference,
          business_name: item.line_c_business_name,
          ein: item.line_d_ein?.replace(/\D/g, ""),
          qbi: netProfits[index],
          w2_wages: item.qbi_w2_wages ?? 0,
          ubia: item.qbi_unadjusted_basis ?? 0,
          no_other_adjustments_confirmed:
            item.qbi_no_other_adjustments_confirmed === true,
          source_schedule_c: item,
        })),
      }));
    }

    // SE net profit counts as earned income for EITC (IRC §32(c)(2)(A)(ii)) and ACTC
    if (totalNetProfit > 0) {
      outputs.push(
        this.outputNodes.output(eitc, { se_net_profit: totalNetProfit }),
      );
      outputs.push(
        this.outputNodes.output(f8812, {
          auto_se_earned_income: totalNetProfit,
        }),
      );
    }

    // Schedule SE: combine the businesses first, then test the total.
    // i1040sse, More Than One Business: "If you had a loss in one business, it reduces the
    // income from another. Figure the combined SE tax on one Schedule SE." The $400 test is
    // on the combined line 4c, not on each business on its own.
    const seItems = items.filter((item) => !isSeExempt(item));
    const seNetProfit = items.reduce(
      (sum, item, i) => isSeExempt(item) ? sum : sum + netProfits[i],
      0,
    );
    if (seNetProfit >= seThreshold(seItems)) {
      outputs.push(
        this.outputNodes.output(schedule_se, {
          net_profit_schedule_c: seNetProfit,
        }),
      );
    }

    // Per-item downstream routing (passive, at-risk, depletion, interest)
    for (let i = 0; i < items.length; i++) {
      outputs.push(...deductionOutputs(items[i], netProfits[i]));
    }

    // Form 461 line 2 uses signed Schedule 1 line 3 after at-risk limits.
    // Its threshold is applied once after Schedule C and F are combined.
    outputs.push(this.outputNodes.output(form461, {
      line2_schedule_c: totalNetProfit,
      passive_loss_unresolved: items.some((item, index) =>
        !item.line_g_material_participation && netProfits[index] < 0
      ),
    }));

    return {
      outputs,
      carryforwards: Object.fromEntries(
        atRisk.flatMap((result, index) =>
          result.suspended > 0
            ? [[`schedule_c_at_risk_suspended_${index + 1}`, result.suspended]]
            : []
        ),
      ),
    };
  }
}

export const scheduleC = new ScheduleCNode();
