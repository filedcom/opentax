import { filedOwnedScheduleC } from "../../../../owned-business-filing.ts";
import { patronFiledBusinessLines } from "../../../deductions/business/qbi_patron/calculation.ts";
import { assertPatrScheduleCIncome } from "../f1099patr/schedule-c-source.ts";
import type { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { schedule_se } from "../../../../intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { schedule1a } from "../../../../intermediate/forms/deductions/additional/schedule1a/index.ts";
import { form8995 } from "../../../../intermediate/forms/deductions/business/form8995/index.ts";
import { internalForm8990ScheduleCPass } from "../../../../intermediate/forms/deductions/business/form8990/schedule-c-pass.ts";
import { sameStagedScheduleCSource } from "../../../../intermediate/forms/deductions/business/form8990/two-stage.ts";
import { form8582 } from "../../../../intermediate/forms/income/business/form8582/index.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";
import { form461 } from "../../../../intermediate/forms/income/business/form461/index.ts";
import { eitc } from "../../../../intermediate/forms/credits/earned-income/eitc/index.ts";
import { f8812 } from "../../../credits/child/f8812/index.ts";
import { form7206 } from "../../../../intermediate/forms/adjustments/health/form7206/index.ts";
import { schedule_j_calculation } from "../../../../intermediate/forms/taxes/income-averaging/schedule_j/index.ts";
import { scheduleJFishingScheduleCSource } from "../../../../../2025/domains/taxes/income-averaging/schedule-j/schedule_j_activity_sources.ts";
import { assertDistinctMiningSources, miningCostAdjustment } from "./mining.ts";
import { longTermContractAdjustment } from "./long_term_contract.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";
import {
  assertScheduleCConditionalAnswers,
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
  assertScheduleCConditionalAnswers,
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
  const miningAdjustment = miningCostAdjustment(item);
  if (miningAdjustment > 0) {
    outputs.push(output(form6251, {
      line2q_mining_costs: miningAdjustment,
    }));
  }
  const contractAdjustment = longTermContractAdjustment(item);
  if (contractAdjustment > 0) {
    outputs.push(output(form6251, {
      line2p_long_term_contracts: contractAdjustment,
    }));
  }
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
    schedule1a,
    form8995,
    form8582,
    form6251,
    form461,
    eitc,
    f8812,
    form7206,
    schedule_j_calculation,
  ]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    // Validate schema — throws on invalid data (negative amounts, bad enums)
    inputSchema.parse(input);
    assertDistinctMiningSources(input.schedule_cs);
    const statutoryTotals = new Map<string, number>();
    for (const source of input.statutory_w2_sources ?? []) {
      statutoryTotals.set(
        source.business_reference,
        (statutoryTotals.get(source.business_reference) ?? 0) + source.amount,
      );
    }
    for (const [reference, wages] of statutoryTotals) {
      const matches = input.schedule_cs.filter((item) =>
        item.business_reference === reference
      );
      if (
        matches.length !== 1 || matches[0].statutory_employee !== true ||
        !matches[0].proprietor_recipient ||
        matches[0].line_1_gross_receipts !== wages
      ) {
        throw new Error(
          "Statutory W-2 wages need one matching Schedule C activity with exact box 1 receipts",
        );
      }
    }
    if ((input.line1_gross_receipts ?? 0) > 0) {
      throw new Error(
        "Schedule C top-level gross receipts need business-linked source rows",
      );
    }
    assertPatrScheduleCIncome(
      input.patron_distribution_sources ?? [],
      input.schedule_cs,
    );
    const receiptsByBusiness = new Map<string, number>();
    for (
      const source of [
        ...(input.attorney_fee_sources ?? []),
        ...(input.f1099m_receipt_sources ?? []),
        ...(input.f1099nec_receipt_sources ?? []),
        ...(input.f1099k_receipt_sources ?? []),
      ]
    ) {
      receiptsByBusiness.set(
        source.business_reference,
        (receiptsByBusiness.get(source.business_reference) ?? 0) +
          source.amount,
      );
    }
    for (const [reference, receipts] of receiptsByBusiness) {
      const matches = input.schedule_cs.filter((item) =>
        item.business_reference === reference
      );
      if (
        matches.length !== 1 ||
        !matches[0].proprietor_recipient ||
        matches[0].line_f_accounting_method !== "cash" ||
        matches[0].line_1_gross_receipts < receipts
      ) {
        throw new Error(
          "1099 receipts need one matching Schedule C business with cash-basis accounting whose gross receipts include them",
        );
      }
    }
    const refundsByBusiness = new Map<string, number>();
    const processorFeesByBusiness = new Map<string, number>();
    for (const source of input.f1099k_receipt_sources ?? []) {
      const refunds = source.customer_refunds_review ?? [];
      if (
        new Set(refunds.map((refund) => refund.refund_transaction_id)).size !==
          refunds.length
      ) {
        throw new Error(
          "1099-K customer refund transaction IDs must be unique",
        );
      }
      const total = refunds.reduce((sum, refund) => sum + refund.amount, 0);
      if (total > source.amount) {
        throw new Error("1099-K customer refunds exceed business receipts");
      }
      if (total > 0) {
        refundsByBusiness.set(
          source.business_reference,
          (refundsByBusiness.get(source.business_reference) ?? 0) + total,
        );
      }
      const processorFees = source.processor_fees_review?.amount ?? 0;
      if (processorFees > source.amount) {
        throw new Error("1099-K processor fees exceed business receipts");
      }
      if (processorFees > 0) {
        processorFeesByBusiness.set(
          source.business_reference,
          (processorFeesByBusiness.get(source.business_reference) ?? 0) +
            processorFees,
        );
      }
    }
    for (const [reference, refunds] of refundsByBusiness) {
      const business = input.schedule_cs.find((item) =>
        item.business_reference === reference
      );
      if (business?.line_2_returns_allowances !== refunds) {
        throw new Error("1099-K customer refunds must equal Schedule C line 2");
      }
    }
    for (const [reference, fees] of processorFeesByBusiness) {
      const business = input.schedule_cs.find((item) =>
        item.business_reference === reference
      );
      if (business?.line_10_commissions_fees !== fees) {
        throw new Error("1099-K processor fees must equal Schedule C line 10");
      }
    }
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
    items.forEach(assertScheduleCConditionalAnswers);
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
    const netProfits = atRisk.map((result, index) =>
      input.patron_filing_review
        ? patronFiledBusinessLines("schedule_c", items[index]).profit
        : (ctx.taxYear === 2025
          ? filedOwnedScheduleC(
            items[index],
            false,
            reductions.get(items[index].business_reference ?? "") ?? 0,
          )?.profit
          : undefined) ?? result.atRiskNet
    );
    const fishingEvidenceItems = items.filter((item) =>
      item.schedule_j_fishing_evidence !== undefined
    );
    if (fishingEvidenceItems.length > 0) {
      const evidence = fishingEvidenceItems[0].schedule_j_fishing_evidence!;
      if (
        items.length !== 1 ||
        items[0].business_reference !== evidence.business_reference
      ) {
        throw new Error(
          "Schedule J fishing evidence needs exactly one matching Schedule C business",
        );
      }
      const source = scheduleJFishingScheduleCSource(items[0], {
        catch_sales_record_reference: evidence.catch_sales_record_reference,
        harvested_fish_entered_commerce_verified:
          evidence.harvested_fish_entered_commerce_verified,
        scientific_research_vessel: evidence.scientific_research_vessel,
      });
      if (source.at_risk_net !== netProfits[0]) {
        throw new Error(
          "Schedule J fishing profit needs reconciled employment-credit reductions",
        );
      }
      outputs.push(this.outputNodes.output(schedule_j_calculation, {
        fishing_net_profit: source.at_risk_net,
      }));
    }
    outputs.push(this.outputNodes.output(schedule1a, {
      qualified_tips_schedule_c_businesses: items.map((item, index) => ({
        business_reference: item.business_reference,
        proprietor_recipient: item.proprietor_recipient,
        line31_net_profit: netProfits[index],
        ...(item.qbi_specified_service === true
          ? { specified_service_business: true as const }
          : {}),
      })),
    }));
    outputs.push(this.outputNodes.output(form7206, {
      schedule_c_source: {
        ...(input.wotc_wage_reductions?.length && items.every((item) =>
            item.qbi_wotc_filing_review &&
            item.line_f_accounting_method === "cash" &&
            item.line_g_material_participation === true &&
            item.line_32_at_risk === "a" && !item.at_risk_simplified
          ) &&
            Object.keys(input).every((key) =>
              [
                "schedule_cs",
                "filing_status",
                "f1099nec_receipt_sources",
                "wotc_wage_reductions",
              ].includes(key)
            )
          ? { reviewed_wotc_source: true }
          : {}),
        unadjusted_source: Object.keys(input).every((key) =>
          key === "schedule_cs" || key === "patron_distribution_sources" ||
          key === "patron_filing_review" || key === "filing_status" ||
          key === "f1099nec_receipt_sources"
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
          ...((reductions.get(item.business_reference ?? "") ?? 0) > 0 && {
            wotc_wage_reduction: reductions.get(item.business_reference ?? ""),
          }),
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

    if (input.filing_status === "mfj") {
      outputs.push(
        this.outputNodes.output(schedule_se, {
          owner_business_sources: items.flatMap((item, index) => {
            if (isSeExempt(item)) return [];
            if (!item.proprietor_recipient || !item.business_reference) {
              throw new Error(
                "Joint Schedule SE needs each Schedule C proprietor and activity source",
              );
            }
            return [{
              recipient: item.proprietor_recipient,
              source_reference: item.business_reference,
              kind: "schedule_c",
              net_profit: netProfits[index],
              gross_business_income: computeGrossIncome(item),
              business_name: item.line_c_business_name,
              ein: item.line_d_ein?.replace(/\D/g, ""),
              qbi_no_other_adjustments_confirmed:
                item.qbi_no_other_adjustments_confirmed === true,
            }];
          }),
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

    // Per-item downstream routing (passive, at-risk, depletion, interest).
    // Form 6251 takes one signed scalar for each line, even when several
    // businesses contribute property workpapers to the same adjustment.
    const amtAdjustments = {
      line2d_depletion: 0,
      line2p_long_term_contracts: 0,
      line2q_mining_costs: 0,
    };
    for (let i = 0; i < items.length; i++) {
      for (const row of deductionOutputs(items[i], netProfits[i])) {
        if (row.nodeType !== form6251.nodeType) {
          outputs.push(row);
          continue;
        }
        for (
          const key of Object.keys(amtAdjustments) as Array<
            keyof typeof amtAdjustments
          >
        ) {
          const value = row.fields[key];
          if (typeof value === "number") amtAdjustments[key] += value;
        }
      }
    }
    const combinedAmt = Object.fromEntries(
      Object.entries(amtAdjustments).filter(([, value]) => value !== 0),
    );
    if (Object.keys(combinedAmt).length > 0) {
      outputs.push({ nodeType: form6251.nodeType, fields: combinedAmt });
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
