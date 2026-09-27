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

const PHASE_OUT_RATE = 0.50; // IRC §469(i)(3)(B)
const RENTAL_ALLOWANCE_MAX = 25_000; // IRC §469(i)(2)
const MAGI_UPPER_THRESHOLD = 150_000; // IRC §469(i)(3)(A)
const MFS_ALLOWANCE_MAX = 12_500; // IRC §469(i)(5)(B)
const MFS_MAGI_UPPER = 75_000; // IRC §469(i)(5)(B)

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total current-year passive activity credits from all sources (Part I lines
  // 1a, 2a, 3a, and 4a, before the separate prior-year amount below).
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

  // This fact alone does not make every rental activity nonpassive; each
  // activity must separately satisfy material participation.
  is_real_estate_professional: z.boolean().optional(),

  // True if taxpayer actively participated in rental real estate activity
  // Required to claim Part II special allowance; IRC §469(i)(6)
  has_active_rental_participation: z.boolean().optional(),

  // Credits specifically from rental real estate with active participation
  // Used for Part II special allowance calculation
  rental_real_estate_credits: z.number().nonnegative().optional(),

  // Form 8582 line 9 uses part of the dollar special allowance before this
  // credit worksheet computes Form 8582-CR line 14.
  form8582_line9_special_allowance_used: z.number().nonnegative().optional(),
  // Form 8582-CR line 15 worksheet: tax on taxable income less line 14.
  // The tax on unadjusted taxable income is regular_tax_all_income above.
  part_ii_tax_on_income_less_line14: z.number().nonnegative().optional(),
  mfs_lived_apart_all_year: z.boolean().optional(),

  // MFS filers who lived with their spouse cannot use Part II.
  filing_status: filingStatusSchema.optional(),

  // Prior-year unallowed PAC carryforward from Form 8582-CR prior years
  // IRC §469(b)
  prior_unallowed_credits: z.number().nonnegative().optional(),
}).superRefine((input, ctx) => {
  if (
    (input.rental_real_estate_credits ?? 0) >
      input.total_passive_credits + (input.prior_unallowed_credits ?? 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["rental_real_estate_credits"],
      message: "Form 8582-CR rental credits exceed total available credits",
    });
  }
  if (
    input.has_active_rental_participation &&
    (input.rental_real_estate_credits ?? 0) > 0
  ) {
    if (input.filing_status === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["filing_status"],
        message: "Form 8582-CR Part II needs filing status",
      });
    }
    if (input.modified_agi === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["modified_agi"],
        message: "Form 8582-CR Part II needs modified AGI",
      });
    }
    if (input.form8582_line9_special_allowance_used === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["form8582_line9_special_allowance_used"],
        message: "Form 8582-CR Part II needs Form 8582 line 9, including zero",
      });
    }
    if (
      input.filing_status === FilingStatus.MFS &&
      input.mfs_lived_apart_all_year === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mfs_lived_apart_all_year"],
        message: "Form 8582-CR MFS Part II needs the lived-apart answer",
      });
    }
  }
});

type Form8582CRInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Tax attributable to net passive income = difference in regular tax
// Form 8582-CR Part I, Line 6
function taxAttributableToPassive(input: Form8582CRInput): number {
  return Math.max(
    0,
    input.regular_tax_all_income - input.regular_tax_without_passive,
  );
}

function totalCreditsAvailable(input: Form8582CRInput): number {
  return input.total_passive_credits + (input.prior_unallowed_credits ?? 0);
}

// Form 8582-CR Part II converts the dollar special allowance to tax before
// allowing any additional credit. The $25,000 figure is never itself a credit.
function specialAllowanceCredit(
  input: Form8582CRInput,
  remainingCredits: number,
): number {
  if (!input.has_active_rental_participation) return 0;
  if (
    input.filing_status === FilingStatus.MFS &&
    !input.mfs_lived_apart_all_year
  ) return 0;
  const line8 = Math.min(
    input.rental_real_estate_credits ?? 0,
    remainingCredits,
  );
  if (line8 === 0) return 0;
  const upper = input.filing_status === FilingStatus.MFS
    ? MFS_MAGI_UPPER
    : MAGI_UPPER_THRESHOLD;
  const max = input.filing_status === FilingStatus.MFS
    ? MFS_ALLOWANCE_MAX
    : RENTAL_ALLOWANCE_MAX;
  const modifiedAgi = input.modified_agi;
  const lossAllowanceUsed = input.form8582_line9_special_allowance_used;
  if (modifiedAgi === undefined || lossAllowanceUsed === undefined) {
    throw new Error("Form 8582-CR Part II needs MAGI and Form 8582 line 9");
  }
  const line12 = Math.min(
    max,
    PHASE_OUT_RATE * Math.max(0, upper - modifiedAgi),
  );
  const line14 = Math.max(
    0,
    line12 - lossAllowanceUsed,
  );
  if (line14 === 0) return 0;
  const taxWithoutAllowance = input.part_ii_tax_on_income_less_line14;
  if (
    taxWithoutAllowance === undefined ||
    taxWithoutAllowance > input.regular_tax_all_income
  ) {
    throw new Error(
      "Form 8582-CR line 15 needs tax on income less the line 14 allowance",
    );
  }
  return Math.min(line8, input.regular_tax_all_income - taxWithoutAllowance);
}

function computeAllowedCredit(input: Form8582CRInput): number {
  const available = totalCreditsAvailable(input);
  if (available === 0) return 0;

  // This single taxpayer status cannot reclassify all activity credits.
  if (input.is_real_estate_professional === true) {
    throw new Error(
      "Form 8582-CR needs activity-level material participation for a real estate professional",
    );
  }

  // Base: credits allowed up to tax attributable to passive income
  const taxAttr = taxAttributableToPassive(input);
  const baseAllowed = Math.min(available, taxAttr);

  // Additional Part II credit is limited by tax on the dollar allowance.
  const special = specialAllowanceCredit(
    input,
    Math.max(0, available - taxAttr),
  );

  // Total allowed = base + any special allowance credit above the base
  // But total cannot exceed total available
  const totalAllowed = Math.min(available, baseAllowed + special);
  return totalAllowed;
}

function schedule3Output(allowedCredit: number): NodeOutput[] {
  if (allowedCredit <= 0) return [];
  return [{
    nodeType: schedule3.nodeType,
    fields: { line6a_general_business_credit: allowedCredit },
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
      ...(suspendedPac > 0
        ? { carryforwards: { suspended_pac_8582cr: suspendedPac } }
        : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582cr = new Form8582CRNode();
