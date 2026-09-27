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

export enum PassiveCreditCategory {
  ActiveRental = "active_rental",
  RehabilitationOrPre1990Housing = "rehabilitation_or_pre1990_housing",
  LowIncomeHousing = "low_income_housing_post1989",
  Other = "other",
}

const creditSourceSchema = z.object({
  activity_reference: z.string().trim().min(1),
  source_form: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  category: z.nativeEnum(PassiveCreditCategory),
  current_year_credit: z.number().int().nonnegative(),
  prior_unallowed_credit: z.number().int().nonnegative(),
  publicly_traded_partnership: z.boolean(),
}).refine(
  (source) => source.current_year_credit + source.prior_unallowed_credit > 0,
  { message: "Form 8582-CR source must have current or prior credit" },
);

type PassiveCreditSource = z.infer<typeof creditSourceSchema>;

function categoryCredit(
  sources: readonly PassiveCreditSource[],
  category: PassiveCreditCategory,
): number {
  return sources.filter((source) => source.category === category).reduce(
    (sum, source) =>
      sum + source.current_year_credit + source.prior_unallowed_credit,
    0,
  );
}

function categoryAmounts(
  sources: readonly PassiveCreditSource[],
  category: PassiveCreditCategory,
) {
  const matches = sources.filter((source) => source.category === category);
  const current = matches.reduce(
    (sum, source) => sum + source.current_year_credit,
    0,
  );
  const prior = matches.reduce(
    (sum, source) => sum + source.prior_unallowed_credit,
    0,
  );
  return { current, prior, total: current + prior };
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Source identity and current/prior amounts feed the four Part I worksheets.
  credit_sources: z.array(creditSourceSchema),

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

  // Form 8582 line 9 uses part of the dollar special allowance before this
  // credit worksheet computes Form 8582-CR line 14.
  form8582_line9_special_allowance_used: z.number().nonnegative().optional(),
  // Form 8582-CR line 15 worksheet: tax on taxable income less line 14.
  // The tax on unadjusted taxable income is regular_tax_all_income above.
  part_ii_tax_on_income_less_line14: z.number().nonnegative().optional(),
  mfs_lived_apart_all_year: z.boolean().optional(),

  // MFS filers who lived with their spouse cannot use Part II.
  filing_status: filingStatusSchema.optional(),
}).superRefine((input, ctx) => {
  const sourceIds = new Set<string>();
  input.credit_sources.forEach((source, index) => {
    const id = [
      source.activity_reference,
      source.source_form,
      source.source_document_reference,
      source.category,
    ].join(":");
    if (sourceIds.has(id)) {
      ctx.addIssue({
        code: "custom",
        path: ["credit_sources", index],
        message: "Form 8582-CR source activity is duplicated",
      });
    }
    sourceIds.add(id);
  });
  if (
    input.credit_sources.some((source) => source.publicly_traded_partnership)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["credit_sources"],
      message:
        "Form 8582-CR publicly traded partnerships need their separate limitation",
    });
  }
  if (
    categoryCredit(input.credit_sources, PassiveCreditCategory.ActiveRental) > 0
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

export function calculateForm8582CRPartI(raw: Form8582CRInput) {
  const input = inputSchema.parse(raw);
  const rental = categoryAmounts(
    input.credit_sources,
    PassiveCreditCategory.ActiveRental,
  );
  const rehabilitation = categoryAmounts(
    input.credit_sources,
    PassiveCreditCategory.RehabilitationOrPre1990Housing,
  );
  const housing = categoryAmounts(
    input.credit_sources,
    PassiveCreditCategory.LowIncomeHousing,
  );
  const other = categoryAmounts(
    input.credit_sources,
    PassiveCreditCategory.Other,
  );
  const line5 = rental.total + rehabilitation.total + housing.total +
    other.total;
  const line6 = Math.max(
    0,
    input.regular_tax_all_income - input.regular_tax_without_passive,
  );
  return {
    rental,
    rehabilitation,
    housing,
    other,
    line5,
    line6,
    line7: Math.max(0, line5 - line6),
  };
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Form 8582-CR Part II converts the dollar special allowance to tax before
// allowing any additional credit. The $25,000 figure is never itself a credit.
function calculatePartII(
  input: Form8582CRInput,
  partI: ReturnType<typeof calculateForm8582CRPartI>,
) {
  if (partI.rental.total === 0 || partI.line7 === 0) return undefined;
  if (
    input.filing_status === FilingStatus.MFS &&
    !input.mfs_lived_apart_all_year
  ) return undefined;
  const line8 = Math.min(partI.rental.total, partI.line7);
  const line9 = input.filing_status === FilingStatus.MFS
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
  const line10 = modifiedAgi;
  const line11 = Math.max(0, line9 - line10);
  const line12 = Math.min(
    max,
    PHASE_OUT_RATE * line11,
  );
  const line13 = lossAllowanceUsed;
  const line14 = Math.max(0, line12 - line13);
  let line15 = 0;
  if (line14 > 0) {
    const taxWithoutAllowance = input.part_ii_tax_on_income_less_line14;
    if (
      taxWithoutAllowance === undefined ||
      taxWithoutAllowance > input.regular_tax_all_income
    ) {
      throw new Error(
        "Form 8582-CR line 15 needs tax on income less the line 14 allowance",
      );
    }
    line15 = input.regular_tax_all_income - taxWithoutAllowance;
  }
  return {
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16: Math.min(line8, line15),
  };
}

export function calculateForm8582CR(raw: Form8582CRInput) {
  const input = inputSchema.parse(raw);
  const partI = calculateForm8582CRPartI(input);
  if (partI.line5 === 0) {
    return { partI, partII: undefined, line37: 0, suspendedCredit: 0 };
  }

  if (
    categoryCredit(
        input.credit_sources,
        PassiveCreditCategory.RehabilitationOrPre1990Housing,
      ) >
      0 ||
    categoryCredit(
        input.credit_sources,
        PassiveCreditCategory.LowIncomeHousing,
      ) >
      0
  ) {
    throw new Error(
      "Form 8582-CR rehabilitation and low-income housing credits need Parts III and IV",
    );
  }

  // This single taxpayer status cannot reclassify all activity credits.
  if (input.is_real_estate_professional === true) {
    throw new Error(
      "Form 8582-CR needs activity-level material participation for a real estate professional",
    );
  }

  const partII = calculatePartII(input, partI);
  const line37 = Math.min(partI.line5, partI.line6 + (partII?.line16 ?? 0));
  return {
    partI,
    partII,
    line37,
    suspendedCredit: partI.line5 - line37,
  };
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

    const lines = calculateForm8582CR(input);
    if (lines.partI.line5 === 0) return { outputs: [] };
    return {
      outputs: schedule3Output(lines.line37),
      ...(lines.suspendedCredit > 0
        ? { carryforwards: { suspended_pac_8582cr: lines.suspendedCredit } }
        : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582cr = new Form8582CRNode();
