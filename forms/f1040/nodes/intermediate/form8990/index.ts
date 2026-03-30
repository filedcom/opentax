import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// ─── TY2025 Constants ─────────────────────────────────────────────────────────

// IRC §163(j)(1)(B): applicable percentage for ATI limitation
const ATI_APPLICABLE_PERCENTAGE = 0.30;

// IRC §163(j)(3), §448(c): small business gross receipts threshold for TY2025
// (Rev. Proc. 2025-28 inflation adjustment)
const SMALL_BIZ_GROSS_RECEIPTS_THRESHOLD = 31_000_000;

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  // Part I, Line 1: Current year business interest expense (not including floor plan)
  // IRC §163(j)(5); excludes disallowed carryforwards and floor plan financing interest
  business_interest_expense: z.number().nonnegative().optional(),

  // Part I, Line 2: Disallowed BIE carryforward from prior year Form 8990, line 31
  // Note: does not apply to partnerships (per line 2 instructions)
  prior_disallowed_carryforward: z.number().nonnegative().optional(),

  // Part I, Line 4: Floor plan financing interest expense
  // IRC §163(j)(9): floor plan interest is not subject to the §163(j) limitation;
  // it is separately deductible and also expands the line 29 cap
  floor_plan_interest: z.number().nonnegative().optional(),

  // Part II, Line 6: Tentative taxable income (computed as if all BIE were deductible)
  // May be negative (net operating loss situation)
  tentative_taxable_income: z.number().optional(),

  // Part II, Line 9: NOL deduction under §172 carried forward or carried back
  nol_deduction: z.number().nonnegative().optional(),

  // Part II, Line 10: QBI deduction allowed under §199A (Form 8990 add-back for ATI)
  qbi_deduction: z.number().nonnegative().optional(),

  // Part II, Line 11: Depreciation/amortization/depletion attributable to a trade or business
  // TY2025: reinstated by P.L. 119-21 (OBBBA) for tax years beginning after 2024
  depreciation_amortization: z.number().nonnegative().optional(),

  // Part III, Line 23: Current year business interest income (directly paid to taxpayer)
  // Does not include interest from excepted trades/businesses or investment income
  business_interest_income: z.number().nonnegative().optional(),

  // Average annual gross receipts for 3 prior tax years (§448(c) gross receipts test)
  // Used to determine small business taxpayer exemption under §163(j)(3)
  // When omitted, taxpayer is treated as subject to the limitation (conservative)
  avg_gross_receipts: z.number().nonnegative().optional(),

  // Whether the taxpayer is a tax shelter as defined in §448(d)(3)
  // Tax shelters cannot use the small business exemption
  is_tax_shelter: z.boolean().optional(),
});

type Form8990Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// §163(j)(3): small business taxpayer exemption
// Exempt if avg gross receipts <= threshold AND not a tax shelter
function isSmallBusinessExempt(input: Form8990Input): boolean {
  if (input.is_tax_shelter === true) return false;
  const avgReceipts = input.avg_gross_receipts;
  if (avgReceipts === undefined) return false;
  return avgReceipts <= SMALL_BIZ_GROSS_RECEIPTS_THRESHOLD;
}

// Part I, Line 5: Total BIE subject to limitation
// = current year BIE + prior year disallowed carryforward
function totalBie(input: Form8990Input): number {
  return (input.business_interest_expense ?? 0) + (input.prior_disallowed_carryforward ?? 0);
}

// Part II, Line 22: Adjusted Taxable Income (ATI)
// = tentative taxable income
//   + BIE (line 8 — add back current year only, not carryforward)
//   + NOL deduction (line 9)
//   + QBI deduction §199A (line 10)
//   + depreciation/amortization/depletion (line 11 — TY2025 reinstated)
//   - business interest income (line 18)
// Floored at zero for individuals and corporations (per line 22 instructions)
function computeAti(input: Form8990Input): number {
  const tti = input.tentative_taxable_income ?? 0;
  const bie = input.business_interest_expense ?? 0;
  const nol = input.nol_deduction ?? 0;
  const qbi = input.qbi_deduction ?? 0;
  const dep = input.depreciation_amortization ?? 0;
  const bii = input.business_interest_income ?? 0;

  const raw = tti + bie + nol + qbi + dep - bii;
  return Math.max(0, raw);
}

// Part IV, Line 26: ATI × applicable percentage (30%)
function atiLimit(ati: number): number {
  return ati * ATI_APPLICABLE_PERCENTAGE;
}

// Part IV, Line 29: Maximum deductible BIE
// = 30% × ATI + floor plan interest + business interest income
function maxDeductible(input: Form8990Input, atiLimitAmt: number): number {
  return atiLimitAmt + (input.floor_plan_interest ?? 0) + (input.business_interest_income ?? 0);
}

// Part IV, Line 30: Allowed BIE deduction = min(total BIE, max deductible)
function allowedBie(total: number, maxDeduct: number): number {
  return Math.min(total, maxDeduct);
}

// Part IV, Line 31: Disallowed BIE (carries forward to next year)
function disallowedBie(total: number, allowed: number): number {
  return Math.max(0, total - allowed);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8990Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8990";
  readonly inputSchema = inputSchema;
  // Disallowed BIE routes to Schedule 1 as a positive add-back,
  // reversing the upstream-posted deduction to the extent it exceeds the §163(j) cap.
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(rawInput: Form8990Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // §163(j)(3): small business taxpayers are fully exempt — no limitation
    if (isSmallBusinessExempt(input)) {
      return { outputs: [] };
    }

    const total = totalBie(input);

    // No BIE to limit
    if (total === 0) {
      return { outputs: [] };
    }

    const ati = computeAti(input);
    const atiLimitAmt = atiLimit(ati);
    const maxDeduct = maxDeductible(input, atiLimitAmt);
    const allowed = allowedBie(total, maxDeduct);
    const disallowed = disallowedBie(total, allowed);

    // BIE fully within allowable amount — no add-back needed
    if (disallowed === 0) {
      return { outputs: [] };
    }

    // Route disallowed amount to Schedule 1 as a positive add-back
    // (reduces the net deduction already posted by upstream node)
    return {
      outputs: [
        this.outputNodes.output(schedule1, { biz_interest_disallowed_add_back: disallowed }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8990 = new Form8990Node();
