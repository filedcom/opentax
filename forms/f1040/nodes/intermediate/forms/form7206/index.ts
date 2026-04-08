import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { LTC_PREMIUM_LIMITS_2025 } from "../../../config/2025.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Net profit from self-employment (from Schedule C/F/SE) before this deduction
  // Used to cap the deduction — cannot exceed net SE profit
  se_net_profit: z.number().nonnegative().optional(),

  // Self-employed health insurance premiums paid (medical, dental, vision)
  // Cannot include premiums paid through subsidized employer plan
  health_insurance_premiums: z.number().nonnegative().optional(),

  // Long-term care insurance premiums paid
  ltc_premiums: z.number().nonnegative().optional(),

  // Age of taxpayer (for LTC premium age-based limit)
  taxpayer_age: z.number().int().nonnegative().optional(),

  // Long-term care insurance premiums for spouse
  ltc_premiums_spouse: z.number().nonnegative().optional(),

  // Age of spouse (for LTC premium age-based limit)
  spouse_age: z.number().int().nonnegative().optional(),

  // Net Premium Tax Credit (PTC) received (from Form 8962)
  // The deduction is reduced by any PTC received (IRC §162(l)(2)(B))
  premium_tax_credit: z.number().nonnegative().optional(),
});

type Form7206Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function ltcLimit(age: number): number {
  for (const bracket of LTC_PREMIUM_LIMITS_2025) {
    if (age <= bracket.maxAge) return bracket.limit;
  }
  return LTC_PREMIUM_LIMITS_2025[LTC_PREMIUM_LIMITS_2025.length - 1].limit;
}

// Eligible LTC premiums — capped by age-based limit
function eligibleLtcPremiums(premiums: number, age: number): number {
  return Math.min(premiums, ltcLimit(age));
}

// Total deductible premiums before profit cap and PTC reduction
function totalEligiblePremiums(input: Form7206Input): number {
  const healthPremiums = input.health_insurance_premiums ?? 0;

  // LTC for taxpayer
  const ltcTaxpayer = input.ltc_premiums ?? 0;
  const ageTaxpayer = input.taxpayer_age ?? 0;
  const eligibleLtcTaxpayer = ltcTaxpayer > 0
    ? eligibleLtcPremiums(ltcTaxpayer, ageTaxpayer)
    : 0;

  // LTC for spouse
  const ltcSpouse = input.ltc_premiums_spouse ?? 0;
  const ageSpouse = input.spouse_age ?? 0;
  const eligibleLtcSpouse = ltcSpouse > 0
    ? eligibleLtcPremiums(ltcSpouse, ageSpouse)
    : 0;

  return healthPremiums + eligibleLtcTaxpayer + eligibleLtcSpouse;
}

function computeDeduction(input: Form7206Input): number {
  const eligible = totalEligiblePremiums(input);
  if (eligible <= 0) return 0;

  // Reduce by any Premium Tax Credit received (IRC §162(l)(2)(B))
  const afterPtc = Math.max(0, eligible - (input.premium_tax_credit ?? 0));
  if (afterPtc <= 0) return 0;

  // Cap at net SE profit (deduction cannot create a loss from SE)
  const seProfit = input.se_net_profit ?? 0;
  return Math.min(afterPtc, seProfit);
}

function buildOutput(deduction: number): NodeOutput[] {
  if (deduction <= 0) return [];
  return [
    output(schedule1, { line17_se_health_insurance: deduction }),
    output(agi_aggregator, { line17_se_health_insurance: deduction }),
  ];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form7206Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form7206";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form7206Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const deduction = computeDeduction(input);
    return { outputs: buildOutput(deduction) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form7206 = new Form7206Node();
