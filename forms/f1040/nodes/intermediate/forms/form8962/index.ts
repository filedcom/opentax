import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  FPL_BASE_2025,
  FPL_INCREMENT_2025,
} from "../../../config/2025.ts";

// ─── TY2025 Federal Poverty Level (2024 FPL used per IRS rules) ──────────────
// IRS uses the prior year FPL for ACA/PTC calculations.
// TY2025 uses 2024 FPL (48 contiguous states + DC):
// Base: $15,060; increment per person: $5,380
const FPL_BASE = FPL_BASE_2025;
const FPL_INCREMENT = FPL_INCREMENT_2025;

// ACA §36B: Applicable percentage table (household income as % of FPL → premium %)
// Income between 100% and 400% FPL qualifies (cliff eliminated TY2025 — extension applies)
// The applicable contribution percentage varies linearly between income brackets.
// IRC §36B(b)(3)(A); Rev Proc 2024-xx tables
type ApplicablePercentageBracket = {
  readonly minPct: number;
  readonly maxPct: number;
  readonly minContrib: number; // min premium contribution percentage
  readonly maxContrib: number; // max premium contribution percentage
};

// TY2025 applicable percentage table per Rev. Proc. 2024-57
// ARP/IRA extension (through TY2025): 400% cliff eliminated; all incomes capped at 8.5%
const APPLICABLE_PERCENTAGE_TABLE: readonly ApplicablePercentageBracket[] = [
  { minPct: 100, maxPct: 133, minContrib: 2.06, maxContrib: 2.06 }, // flat 2.06%
  { minPct: 133, maxPct: 150, minContrib: 3.09, maxContrib: 3.09 }, // flat 3.09%
  { minPct: 150, maxPct: 200, minContrib: 4.12, maxContrib: 6.18 }, // linear
  { minPct: 200, maxPct: 250, minContrib: 6.18, maxContrib: 8.24 }, // linear
  { minPct: 250, maxPct: 300, minContrib: 8.24, maxContrib: 8.50 }, // linear
  { minPct: 300, maxPct: 400, minContrib: 8.50, maxContrib: 8.50 }, // flat 8.5%
  // ARP/IRA extension (through TY2025): no cliff — incomes above 400% FPL capped at 8.5%
  { minPct: 400, maxPct: Infinity, minContrib: 8.50, maxContrib: 8.50 },
];

// IRC §36B(f)(2)(B): APTC repayment caps by household income as % of FPL
// "Single filer" = Single or MFS; "Other household" = MFJ, HOH, QSS
// Above 400% FPL (TY2025): no cap — ARP extension means 400%+ still eligible,
//   so full excess APTC is repaid with no limit
type RepaymentCapTier = {
  readonly maxPct: number;        // income pct upper bound (exclusive)
  readonly singleCap: number;
  readonly otherCap: number;
};

const REPAYMENT_CAP_TIERS: readonly RepaymentCapTier[] = [
  { maxPct: 200, singleCap: 350, otherCap: 700 },
  { maxPct: 300, singleCap: 875, otherCap: 1_750 },
  { maxPct: 400, singleCap: 1_400, otherCap: 2_800 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Household size for FPL calculation
  household_size: z.number().int().positive().optional(),

  // Household income (MAGI) for PTC purposes
  household_income: z.number().nonnegative().optional(),

  // Annual totals (used when no monthly detail provided)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),

  // Monthly detail arrays (12 elements each, indexed 0=Jan … 11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),

  // QSEHRA — Qualified Small Employer HRA amount offered (reduces PTC)
  // IRC §36B(c)(2)(C)(iv); Notice 2017-67 §IV.C
  // The annual QSEHRA amount offered reduces the PTC dollar-for-dollar.
  qsehra_amount_offered: z.number().nonnegative().optional(),

  // Filing status — used for IRC §36B(f)(2)(B) repayment cap (Single/MFS vs other)
  filing_status: filingStatusSchema.optional(),
});

type Form8962Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function federalPovertyLevel(householdSize: number): number {
  return FPL_BASE + FPL_INCREMENT * (householdSize - 1);
}

function applicableContributionPct(incomeAsFplPct: number): number {
  for (const bracket of APPLICABLE_PERCENTAGE_TABLE) {
    if (incomeAsFplPct >= bracket.minPct && incomeAsFplPct < bracket.maxPct) {
      // Linear interpolation within bracket
      const range = bracket.maxPct === Infinity
        ? 1
        : bracket.maxPct - bracket.minPct;
      const position = bracket.maxPct === Infinity
        ? 0
        : (incomeAsFplPct - bracket.minPct) / range;
      return (bracket.minContrib + position * (bracket.maxContrib - bracket.minContrib)) / 100;
    }
  }
  // Below 100% FPL — not eligible
  return Infinity;
}

function totalPremium(input: Form8962Input): number {
  if (input.monthly_premiums) {
    return input.monthly_premiums.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_premium ?? 0;
}

function totalSlcsp(input: Form8962Input): number {
  if (input.monthly_slcsps) {
    return input.monthly_slcsps.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_slcsp ?? 0;
}

function totalAptc(input: Form8962Input): number {
  if (input.monthly_aptcs) {
    return input.monthly_aptcs.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_aptc ?? 0;
}

// Annual applicable premium = household income × applicable contribution %
function applicablePremium(income: number, incomePct: number): number {
  const contrib = applicableContributionPct(incomePct);
  if (contrib === Infinity) return 0;
  return income * contrib;
}

// Allowed PTC = max(0, min(actual_premium, SLCSP - applicable_premium))
// IRS Form 8962 line 11: max premium assistance = SLCSP - required contribution;
// allowed = lesser of enrollment premium or max premium assistance (IRC §36B(b)(2)(A))
function allowedPtc(slcsp: number, actualPremium: number, applicable: number): number {
  return Math.max(0, Math.min(actualPremium, slcsp - applicable));
}

// IRC §36B(f)(2)(B): cap on excess APTC repayment liability
// Returns null when no cap applies (income ≥ 400% FPL)
function repaymentCap(
  incomePct: number,
  status: FilingStatus | undefined,
): number | null {
  const isSingle = status === FilingStatus.Single || status === FilingStatus.MFS;
  for (const tier of REPAYMENT_CAP_TIERS) {
    if (incomePct < tier.maxPct) {
      return isSingle ? tier.singleCap : tier.otherCap;
    }
  }
  return null; // ≥ 400% FPL — no cap
}

function buildOutputs(
  netPtc: number,
  excessAptc: number,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  if (netPtc > 0) {
    outputs.push(output(schedule3, { line9_premium_tax_credit: Math.round(netPtc) }));
  }

  if (excessAptc > 0) {
    outputs.push(output(schedule2, { line2_excess_advance_premium: Math.round(excessAptc) }));
  }

  return outputs;
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8962Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8962";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, schedule2]);

  compute(_ctx: NodeContext, rawInput: Form8962Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const premium = totalPremium(input);
    const slcsp = totalSlcsp(input);
    const aptc = totalAptc(input);
    const income = input.household_income ?? 0;
    const size = input.household_size ?? 1;

    // If no income or no premium data provided, nothing to compute
    if (income <= 0 || (premium === 0 && slcsp === 0 && aptc === 0)) {
      // If there's only APTC data (repayment scenario), handle it
      if (aptc > 0 && income <= 0) {
        // Can't determine eligibility without income — return excess APTC
        return { outputs: buildOutputs(0, aptc) };
      }
      return { outputs: [] };
    }

    const fpl = federalPovertyLevel(size);
    const incomePct = (income / fpl) * 100;

    // Below 100% FPL — generally not eligible (except CO-OP states)
    // Above 400% FPL — ARP extension through TY2025 caps at 8.5%
    const contrib = applicableContributionPct(incomePct);
    if (contrib === Infinity) {
      // Below 100% FPL — any APTC received must be repaid
      if (aptc > 0) {
        return { outputs: buildOutputs(0, aptc) };
      }
      return { outputs: [] };
    }

    const applicable = applicablePremium(income, incomePct);
    const allowed = allowedPtc(slcsp, premium, applicable);

    // QSEHRA reduces PTC dollar-for-dollar (IRC §36B(c)(2)(C)(iv))
    const qsehra = input.qsehra_amount_offered ?? 0;
    // Effective allowed PTC after QSEHRA reduction (floor at 0 — QSEHRA cannot create liability)
    const allowedAfterQsehra = Math.max(0, allowed - qsehra);

    // Net PTC = allowed (after QSEHRA) - APTC already received
    const netPtc = allowedAfterQsehra - aptc;

    if (netPtc >= 0) {
      // Net credit owed to taxpayer
      return { outputs: buildOutputs(netPtc, 0) };
    } else {
      // Excess APTC received — apply IRC §36B(f)(2)(B) repayment cap
      const rawExcess = -netPtc;
      const cap = repaymentCap(incomePct, input.filing_status);
      const cappedExcess = cap !== null ? Math.min(rawExcess, cap) : rawExcess;
      return { outputs: buildOutputs(0, cappedExcess) };
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8962 = new Form8962Node();
