import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// Form 8582-CR — Passive Activity Credit Limitations
// Mirrors Form 8582 (passive losses) but applies to passive activity credits (PAC).
// Limits credits to the tax attributable to passive income plus a special allowance
// for active rental real estate participants.
// IRC §469(d)(2); Form 8582-CR instructions (Rev. December 2024)

// ─── Constants — IRC §469(i) thresholds (not inflation-adjusted) ─────────────

const PHASE_OUT_RATE = 0.50;                // IRC §469(i)(3)(B)
const RENTAL_ALLOWANCE_MAX = 25_000;        // IRC §469(i)(2)
const MAGI_LOWER_THRESHOLD = 100_000;       // IRC §469(i)(3)(A)
const MAGI_UPPER_THRESHOLD = 150_000;       // IRC §469(i)(3)(A)
const MFS_ALLOWANCE_MAX = 12_500;           // IRC §469(i)(5)(B)
const MFS_MAGI_LOWER = 50_000;              // IRC §469(i)(5)(B)
const MFS_MAGI_UPPER = 75_000;              // IRC §469(i)(5)(B)

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total current-year passive activity credits from all sources (Part I, Line 5)
  total_passive_credits: z.number().nonnegative(),

  // Regular tax computed on all income including passive net income
  // Part I, Line 6 (full tax side)
  regular_tax_all_income: z.number().nonnegative(),

  // Regular tax computed on income excluding net passive income
  // Part I, Line 6 (ex-passive side)
  regular_tax_without_passive: z.number().nonnegative(),

  // MAGI for Part II rental real estate phase-out calculation
  // IRC §469(i)(3)
  modified_agi: z.number().nonnegative().optional(),

  // True if taxpayer qualifies as real estate professional per IRC §469(c)(7)
  // Real estate professionals have their rental activities treated as nonpassive
  is_real_estate_professional: z.boolean().optional(),

  // True if taxpayer actively participated in rental real estate activity
  // Required to claim Part II special allowance; IRC §469(i)(6)
  has_active_rental_participation: z.boolean().optional(),

  // Credits specifically from rental real estate with active participation
  // Used for Part II special allowance calculation
  rental_real_estate_credits: z.number().nonnegative().optional(),

  // Filing status — MFS filers are ineligible for Part II special allowance
  // IRC §469(i)(5)(A)
  filing_status: filingStatusSchema.optional(),

  // Prior-year unallowed PAC carryforward from Form 8582-CR prior years
  // IRC §469(b)
  prior_unallowed_credits: z.number().nonnegative().optional(),
});

type Form8582CRInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Tax attributable to net passive income = difference in regular tax
// Form 8582-CR Part I, Line 6
function taxAttributableToPassive(input: Form8582CRInput): number {
  return Math.max(0, input.regular_tax_all_income - input.regular_tax_without_passive);
}

function totalCreditsAvailable(input: Form8582CRInput): number {
  return input.total_passive_credits + (input.prior_unallowed_credits ?? 0);
}

function isMfsIneligible(input: Form8582CRInput): boolean {
  // MFS filers who lived with spouse at any time are ineligible for Part II
  // Conservative: treat all MFS as ineligible
  return input.filing_status === FilingStatus.MFS;
}

// Special allowance for rental real estate credits (Part II)
// IRC §469(i): up to $25,000 for active participants below MAGI thresholds
function specialAllowanceCredit(input: Form8582CRInput, rentalCredits: number): number {
  if (!input.has_active_rental_participation) return 0;
  if (isMfsIneligible(input)) return 0;
  if (input.modified_agi === undefined) return 0;

  const magi = input.modified_agi;
  const lower = MAGI_LOWER_THRESHOLD;
  const upper = MAGI_UPPER_THRESHOLD;
  const max = RENTAL_ALLOWANCE_MAX;

  // MAGI above upper threshold → no allowance
  if (magi >= upper) return 0;

  // Cap credit at max allowance or actual rental credits
  const baseAllowance = Math.min(rentalCredits, max);

  // MAGI at or below lower threshold → full allowance
  if (magi <= lower) return baseAllowance;

  // Phase-out: 50% of excess MAGI over lower threshold
  const reduction = PHASE_OUT_RATE * (magi - lower);
  const phasedAllowance = Math.max(0, max - reduction);
  return Math.min(rentalCredits, phasedAllowance);
}

function computeAllowedCredit(input: Form8582CRInput): number {
  const available = totalCreditsAvailable(input);
  if (available === 0) return 0;

  // Real estate professional: activity is nonpassive — all credits allowed
  if (input.is_real_estate_professional === true) {
    return available;
  }

  // Base: credits allowed up to tax attributable to passive income
  const taxAttr = taxAttributableToPassive(input);
  const baseAllowed = Math.min(available, taxAttr);

  // Additional: special allowance for rental real estate credits (Part II)
  const rentalCredits = input.rental_real_estate_credits ?? 0;
  const special = specialAllowanceCredit(input, rentalCredits);

  // Total allowed = base + any special allowance credit above the base
  // But total cannot exceed total available
  const totalAllowed = Math.min(available, baseAllowed + special);
  return totalAllowed;
}

function schedule3Output(allowedCredit: number): NodeOutput[] {
  if (allowedCredit <= 0) return [];
  return [{
    nodeType: schedule3.nodeType,
    fields: { line6z_general_business_credit: allowedCredit },
  }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8582CRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582cr";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form8582CRInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const available = totalCreditsAvailable(input);
    if (available === 0) return { outputs: [] };

    const allowedCredit = computeAllowedCredit(input);
    const suspendedPac = available - allowedCredit;
    return {
      outputs: schedule3Output(allowedCredit),
      ...(suspendedPac > 0 ? { carryforwards: { suspended_pac_8582cr: suspendedPac } } : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582cr = new Form8582CRNode();
