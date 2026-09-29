import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { f3800 } from "../../../inputs/f3800/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { PassiveCreditReportingRoute } from "./credit-route.ts";
import {
  creditSourceSchema,
  PassiveCreditCategory,
  type PassiveCreditSource,
  PassiveCreditSourceOrigin,
  sourceAllocationSchema,
} from "./source.ts";

export { PassiveCreditReportingRoute } from "./credit-route.ts";
export { PassiveCreditCategory, PassiveCreditSourceOrigin } from "./source.ts";

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
const REHABILITATION_MAGI_UPPER = 250_000;
const MFS_REHABILITATION_MAGI_UPPER = 125_000;

function priorCredit(source: PassiveCreditSource): number {
  return source.prior_unallowed_credits.reduce(
    (sum, credit) => sum + credit.credit_amount,
    0,
  );
}

function reportedCategory(
  source: PassiveCreditSource,
  filingStatus: FilingStatus | undefined,
  mfsLivedApartAllYear: boolean | undefined,
): PassiveCreditCategory {
  return source.category === PassiveCreditCategory.ActiveRental &&
      filingStatus === FilingStatus.MFS && !mfsLivedApartAllYear
    ? PassiveCreditCategory.Other
    : source.category;
}

function categoryCredit(
  sources: readonly PassiveCreditSource[],
  category: PassiveCreditCategory,
): number {
  return sources.filter((source) => source.category === category).reduce(
    (sum, source) => sum + source.current_year_credit + priorCredit(source),
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
    (sum, source) => sum + priorCredit(source),
    0,
  );
  return { current, prior, total: current + prior };
}

/** Distribute a whole-dollar credit limit by the worksheet ratios exactly. */
function allocateWholeDollarCredits(
  balances: readonly number[],
  amount: number,
): number[] {
  const total = balances.reduce((sum, balance) => sum + balance, 0);
  if (
    balances.some((balance) => !Number.isSafeInteger(balance) || balance < 0) ||
    !Number.isSafeInteger(total) || !Number.isSafeInteger(amount) ||
    amount < 0 || amount > total
  ) {
    throw new Error(
      "Form 8582-CR allocation needs whole-dollar balances and an amount within them",
    );
  }
  if (total === 0) return balances.map(() => 0);
  const shares = balances.map((balance, index) => {
    const product = BigInt(balance) * BigInt(amount);
    return {
      index,
      quotient: Number(product / BigInt(total)),
      remainder: product % BigInt(total),
    };
  });
  const allocated = shares.map((share) => share.quotient);
  let remaining = amount - allocated.reduce((sum, value) => sum + value, 0);
  const ranked = [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
      ? -1
      : 1
  );
  for (const share of ranked) {
    if (remaining === 0) break;
    allocated[share.index]++;
    remaining--;
  }
  return allocated;
}

function allocateCreditsToSources(
  sources: readonly PassiveCreditSource[],
  specialByCategory: Readonly<Record<PassiveCreditCategory, number>>,
  unallowedTotal: number,
) {
  const totals = sources.map((source) =>
    source.current_year_credit + priorCredit(source)
  );
  const specialAllowed = sources.map(() => 0);
  const categories = [
    PassiveCreditCategory.ActiveRental,
    PassiveCreditCategory.RehabilitationOrPre1990Housing,
    PassiveCreditCategory.LowIncomeHousing,
    PassiveCreditCategory.Other,
  ] as const;
  for (const category of categories) {
    const indexes = sources.flatMap((source, index) =>
      source.category === category ? [index] : []
    );
    const shares = allocateWholeDollarCredits(
      indexes.map((index) => totals[index]),
      specialByCategory[category],
    );
    indexes.forEach((index, position) => {
      specialAllowed[index] = shares[position];
    });
  }
  const balances = totals.map((total, index) => total - specialAllowed[index]);
  const unallowed = allocateWholeDollarCredits(balances, unallowedTotal);
  return sources.map((source, index) => ({
    activity_reference: source.activity_reference,
    source_form: source.source_form,
    source_document_reference: source.source_document_reference,
    source_statement_reference: source.source_statement_reference,
    source_origin: source.source_origin,
    category: source.category,
    reporting_route: source.reporting_route,
    form3800_credit_line: source.form3800_credit_line,
    current_year_credit: source.current_year_credit,
    prior_unallowed_credits: source.prior_unallowed_credits,
    publicly_traded_partnership: source.publicly_traded_partnership,
    total_credit: totals[index],
    special_allowed_credit: specialAllowed[index],
    unallowed_credit: unallowed[index],
    allowed_credit: totals[index] - unallowed[index],
  }));
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Source identity and current/prior amounts feed the four Part I worksheets.
  credit_sources: z.array(creditSourceSchema),
  // Source nodes deposit this evidence so an entered passive credit cannot be
  // omitted from the activity calculation without a diagnostic.
  required_orphan_drug_k1_credits: z.array(z.object({
    source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
    source_ein: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    credit_amount: z.number().int().positive(),
  })).optional(),
  required_new_markets_k1_credits: z.array(z.object({
    source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
    source_ein: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    source_statement_reference: z.string().trim().min(1).optional(),
    credit_amount: z.number().int().positive(),
  })).optional(),
  required_new_markets_self_credits: z.array(z.object({
    activity_reference: z.string().trim().min(1),
    source_document_reference: z.string().trim().min(1),
    credit_amount: z.number().int().positive(),
  })).optional(),
  required_disabled_access_k1_credits: z.array(z.object({
    source_type: z.enum(["partnership", "s_corporation", "estate", "trust"]),
    source_ein: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    source_statement_reference: z.string().trim().min(1).optional(),
    credit_amount: z.number().finite().positive().refine((amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
    ),
  })).optional(),

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
  // Part III line 27 worksheet: tax after subtracting line 26 from taxable income.
  part_iii_tax_on_income_less_line26: z.number().nonnegative().optional(),
  // Part IV line 35 worksheet: tax after subtracting the remaining $25,000
  // ($12,500 MFS) allowance, net of Form 8582 line 9, from taxable income.
  part_iv_tax_on_income_less_remaining_allowance: z.number().nonnegative()
    .optional(),
  mfs_lived_apart_all_year: z.boolean().optional(),

  // MFS filers who lived with their spouse cannot use Parts II-IV.
  filing_status: filingStatusSchema.optional(),
}).superRefine((input, ctx) => {
  const k1Keys = new Set<string>();
  input.required_orphan_drug_k1_credits?.forEach((evidence, index) => {
    const key = [
      evidence.source_type,
      evidence.source_ein,
      evidence.source_document_reference,
    ].join(":");
    if (k1Keys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["required_orphan_drug_k1_credits", index],
        message: "Form 8582-CR orphan-drug K-1 source is duplicated",
      });
    }
    k1Keys.add(key);
    const matching = input.credit_sources.filter((source) =>
      source.source_form === "Form 8820" &&
      source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
      source.form3800_credit_line === "1h" &&
      source.source_document_reference === evidence.source_document_reference &&
      source.source_origin.kind === evidence.source_type &&
      source.source_origin.ein === evidence.source_ein
    );
    if (
      matching.reduce((sum, source) => sum + source.current_year_credit, 0) !==
        evidence.credit_amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_orphan_drug_k1_credits", index],
        message:
          "Form 8582-CR orphan-drug activity credits must match the passive K-1 amount",
      });
    }
  });
  const marketsK1Keys = new Set<string>();
  input.required_new_markets_k1_credits?.forEach((evidence, index) => {
    const key = [
      evidence.source_type,
      evidence.source_ein,
      evidence.source_document_reference,
      evidence.source_statement_reference ?? "",
    ].join(":");
    if (marketsK1Keys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["required_new_markets_k1_credits", index],
        message: "Form 8582-CR New Markets K-1 source is duplicated",
      });
    }
    marketsK1Keys.add(key);
    if (
      (evidence.source_type === "estate" || evidence.source_type === "trust") &&
      !evidence.source_statement_reference
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_new_markets_k1_credits", index],
        message:
          "Form 8582-CR estate/trust New Markets K-1 needs its code ZZ statement",
      });
    }
    const matching = input.credit_sources.filter((source) =>
      source.source_form === "Form 8874" &&
      source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
      source.form3800_credit_line === "1i" &&
      source.source_document_reference === evidence.source_document_reference &&
      (evidence.source_type === "partnership" ||
        evidence.source_type === "s_corporation" ||
        source.source_statement_reference ===
          evidence.source_statement_reference) &&
      source.source_origin.kind === evidence.source_type &&
      source.source_origin.ein === evidence.source_ein
    );
    if (
      matching.reduce((sum, source) => sum + source.current_year_credit, 0) !==
        evidence.credit_amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_new_markets_k1_credits", index],
        message:
          "Form 8582-CR New Markets activities must match the passive K-1 amount",
      });
    }
  });
  const marketsSelfKeys = new Set<string>();
  input.required_new_markets_self_credits?.forEach((evidence, index) => {
    const key = [
      evidence.activity_reference,
      evidence.source_document_reference,
    ].join(":");
    if (marketsSelfKeys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["required_new_markets_self_credits", index],
        message: "Form 8582-CR self-earned New Markets source is duplicated",
      });
    }
    marketsSelfKeys.add(key);
    const matching = input.credit_sources.filter((source) =>
      source.source_form === "Form 8874" &&
      source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
      source.form3800_credit_line === "1i" &&
      source.source_origin.kind === PassiveCreditSourceOrigin.Self &&
      source.activity_reference === evidence.activity_reference &&
      source.source_document_reference === evidence.source_document_reference
    );
    if (
      matching.length !== 1 ||
      matching[0].current_year_credit !== evidence.credit_amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_new_markets_self_credits", index],
        message:
          "Form 8582-CR self-earned New Markets activity must match the Form 8874 credit",
      });
    }
  });
  const accessK1Keys = new Set<string>();
  input.required_disabled_access_k1_credits?.forEach((evidence, index) => {
    const key = [
      evidence.source_type,
      evidence.source_ein,
      evidence.source_document_reference,
      evidence.source_statement_reference ?? "",
    ].join(":");
    if (accessK1Keys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["required_disabled_access_k1_credits", index],
        message: "Form 8582-CR disabled-access K-1 source is duplicated",
      });
    }
    accessK1Keys.add(key);
    if (
      (evidence.source_type === "estate" || evidence.source_type === "trust") &&
      !evidence.source_statement_reference
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_disabled_access_k1_credits", index],
        message:
          "Form 8582-CR estate/trust disabled-access K-1 needs its code ZZ statement",
      });
    }
    const matching = input.credit_sources.filter((source) =>
      source.source_form === "Form 8826" &&
      source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
      source.form3800_credit_line === "1e" &&
      source.source_document_reference === evidence.source_document_reference &&
      (evidence.source_type === "partnership" ||
        evidence.source_type === "s_corporation" ||
        source.source_statement_reference ===
          evidence.source_statement_reference) &&
      source.source_origin.kind === evidence.source_type &&
      source.source_origin.ein === evidence.source_ein
    );
    if (
      matching.reduce((sum, source) => sum + source.current_year_credit, 0) !==
        Math.round(evidence.credit_amount)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["required_disabled_access_k1_credits", index],
        message:
          "Form 8582-CR disabled-access activities must match the rounded passive K-1 amount",
      });
    }
  });
  const sourceIds = new Set<string>();
  input.credit_sources.forEach((source, index) => {
    const id = JSON.stringify([
      source.activity_reference,
      source.source_form,
      source.source_document_reference,
      source.category,
      source.reporting_route,
    ]);
    if (sourceIds.has(id)) {
      ctx.addIssue({
        code: "custom",
        path: ["credit_sources", index],
        message: "Form 8582-CR source activity is duplicated",
      });
    }
    sourceIds.add(id);
    if (
      (source.reporting_route === PassiveCreditReportingRoute.Form8834) !==
        (source.source_form === "Form 8834")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["credit_sources", index, "reporting_route"],
        message: "Form 8582-CR Form 8834 route must match its source form",
      });
    }
    if (
      source.category === PassiveCreditCategory.ActiveRental &&
      !(input.filing_status === FilingStatus.MFS &&
        input.mfs_lived_apart_all_year === false) &&
      source.prior_unallowed_credits.some((credit) =>
        credit.actively_participated_origin_year !== true
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["credit_sources", index, "prior_unallowed_credits"],
        message:
          "Form 8582-CR prior rental credit needs active participation in both years or a separate Other-category source",
      });
    }
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
  const specialAllowanceCredits =
    categoryCredit(input.credit_sources, PassiveCreditCategory.ActiveRental) +
    categoryCredit(
      input.credit_sources,
      PassiveCreditCategory.RehabilitationOrPre1990Housing,
    ) +
    categoryCredit(
      input.credit_sources,
      PassiveCreditCategory.LowIncomeHousing,
    );
  if (specialAllowanceCredits > 0) {
    if (input.filing_status === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["filing_status"],
        message: "Form 8582-CR special allowance needs filing status",
      });
    }
    const eligibleForSpecialAllowance = input.filing_status !==
        FilingStatus.MFS || input.mfs_lived_apart_all_year === true;
    if (eligibleForSpecialAllowance && input.modified_agi === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["modified_agi"],
        message: "Form 8582-CR special allowance needs modified AGI",
      });
    }
    if (
      eligibleForSpecialAllowance &&
      input.form8582_line9_special_allowance_used === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["form8582_line9_special_allowance_used"],
        message:
          "Form 8582-CR special allowance needs Form 8582 line 9, including zero",
      });
    }
    if (
      input.filing_status === FilingStatus.MFS &&
      input.mfs_lived_apart_all_year === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mfs_lived_apart_all_year"],
        message:
          "Form 8582-CR MFS special allowance needs the lived-apart answer",
      });
    }
  }
});

type Form8582CRInput = z.infer<typeof inputSchema>;

export function calculateForm8582CRPartI(raw: Form8582CRInput) {
  const input = inputSchema.parse(raw);
  const sources = input.credit_sources.map((source) => ({
    ...source,
    category: reportedCategory(
      source,
      input.filing_status,
      input.mfs_lived_apart_all_year,
    ),
  }));
  const rental = categoryAmounts(
    sources,
    PassiveCreditCategory.ActiveRental,
  );
  const rehabilitation = categoryAmounts(
    sources,
    PassiveCreditCategory.RehabilitationOrPre1990Housing,
  );
  const housing = categoryAmounts(
    sources,
    PassiveCreditCategory.LowIncomeHousing,
  );
  const other = categoryAmounts(
    sources,
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

function calculatePartIII(
  input: Form8582CRInput,
  partI: ReturnType<typeof calculateForm8582CRPartI>,
  partII: ReturnType<typeof calculatePartII>,
) {
  if (partI.rehabilitation.total === 0) return undefined;
  if (
    input.filing_status === FilingStatus.MFS &&
    !input.mfs_lived_apart_all_year
  ) return undefined;
  const line17 = partI.line7;
  const line18 = partII?.line16 ?? 0;
  const line19 = Math.max(0, line17 - line18);
  const line20 = Math.min(partI.rehabilitation.total, line19);
  const mfs = input.filing_status === FilingStatus.MFS;
  const modifiedAgi = input.modified_agi;
  const lossAllowanceUsed = input.form8582_line9_special_allowance_used;
  if (modifiedAgi === undefined || lossAllowanceUsed === undefined) {
    throw new Error("Form 8582-CR Part III needs MAGI and Form 8582 line 9");
  }
  const skipPhaseout = partII !== undefined &&
    modifiedAgi <= (mfs ? 50_000 : 100_000);
  const line21 = skipPhaseout
    ? undefined
    : mfs
    ? MFS_REHABILITATION_MAGI_UPPER
    : REHABILITATION_MAGI_UPPER;
  const line22 = skipPhaseout ? undefined : modifiedAgi;
  const line23 = line21 === undefined
    ? undefined
    : Math.max(0, line21 - modifiedAgi);
  const line24 = line23 === undefined ? undefined : Math.min(
    mfs ? MFS_ALLOWANCE_MAX : RENTAL_ALLOWANCE_MAX,
    line23 * PHASE_OUT_RATE,
  );
  const line25 = skipPhaseout ? undefined : lossAllowanceUsed;
  const line26 = line24 === undefined
    ? undefined
    : Math.max(0, line24 - lossAllowanceUsed);
  let line27 = 0;
  if (line20 > 0 && skipPhaseout) {
    line27 = partII?.line15 ?? 0;
  } else if (line20 > 0 && (line26 ?? 0) > 0) {
    const taxWithoutAllowance = input.part_iii_tax_on_income_less_line26;
    if (
      taxWithoutAllowance === undefined ||
      taxWithoutAllowance > input.regular_tax_all_income
    ) {
      throw new Error(
        "Form 8582-CR line 27 needs tax on income less the line 26 allowance",
      );
    }
    line27 = input.regular_tax_all_income - taxWithoutAllowance;
  }
  const line28 = line18;
  const line29 = Math.max(0, line27 - line28);
  return {
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30: Math.min(line20, line29),
  };
}

function calculatePartIV(
  input: Form8582CRInput,
  partI: ReturnType<typeof calculateForm8582CRPartI>,
  partII: ReturnType<typeof calculatePartII>,
  partIII: ReturnType<typeof calculatePartIII>,
) {
  if (partI.housing.total === 0) return undefined;
  if (
    input.filing_status === FilingStatus.MFS &&
    !input.mfs_lived_apart_all_year
  ) return undefined;
  const line31 = partIII?.line19 ??
    Math.max(0, partI.line7 - (partII?.line16 ?? 0));
  const line32 = partIII?.line30 ?? 0;
  const line33 = Math.max(0, line31 - line32);
  const line34 = Math.min(partI.housing.total, line33);
  const lossAllowanceUsed = input.form8582_line9_special_allowance_used;
  if (lossAllowanceUsed === undefined) {
    throw new Error("Form 8582-CR Part IV needs Form 8582 line 9");
  }
  const allowance = input.filing_status === FilingStatus.MFS
    ? MFS_ALLOWANCE_MAX
    : RENTAL_ALLOWANCE_MAX;
  const remainingAllowance = Math.max(0, allowance - lossAllowanceUsed);
  let line35 = 0;
  if (line34 > 0 && remainingAllowance > 0) {
    const taxWithoutAllowance =
      input.part_iv_tax_on_income_less_remaining_allowance;
    if (
      taxWithoutAllowance === undefined ||
      taxWithoutAllowance > input.regular_tax_all_income
    ) {
      throw new Error(
        "Form 8582-CR line 35 needs tax on income less the remaining allowance",
      );
    }
    line35 = Math.max(
      0,
      input.regular_tax_all_income - taxWithoutAllowance -
        (partII?.line16 ?? 0) - (partIII?.line30 ?? 0),
    );
  }
  return {
    line31,
    line32,
    line33,
    line34,
    line35,
    line36: Math.min(line34, line35),
  };
}

export function calculateForm8582CR(raw: Form8582CRInput) {
  const input = inputSchema.parse(raw);
  const partI = calculateForm8582CRPartI(input);
  if (partI.line5 === 0) {
    return {
      partI,
      partII: undefined,
      partIII: undefined,
      partIV: undefined,
      line37: 0,
      suspendedCredit: 0,
      sourceAllocations: [],
      allowedByReportingRoute: {
        [PassiveCreditReportingRoute.Form3800Line3]: 0,
        [PassiveCreditReportingRoute.Form3800Line24]: 0,
        [PassiveCreditReportingRoute.Form3800Line33]: 0,
        [PassiveCreditReportingRoute.Form8834]: 0,
      },
    };
  }

  // This single taxpayer status cannot reclassify all activity credits.
  if (input.is_real_estate_professional === true) {
    throw new Error(
      "Form 8582-CR needs activity-level material participation for a real estate professional",
    );
  }

  const partII = calculatePartII(input, partI);
  const partIII = calculatePartIII(input, partI, partII);
  const partIV = calculatePartIV(input, partI, partII, partIII);
  const line37 = Math.min(
    partI.line5,
    partI.line6 + (partII?.line16 ?? 0) + (partIII?.line30 ?? 0) +
      (partIV?.line36 ?? 0),
  );
  const suspendedCredit = partI.line5 - line37;
  const sourceAllocations = allocateCreditsToSources(
    input.credit_sources.map((source) => ({
      ...source,
      category: reportedCategory(
        source,
        input.filing_status,
        input.mfs_lived_apart_all_year,
      ),
    })),
    {
      [PassiveCreditCategory.ActiveRental]: partII?.line16 ?? 0,
      [PassiveCreditCategory.RehabilitationOrPre1990Housing]: partIII?.line30 ??
        0,
      [PassiveCreditCategory.LowIncomeHousing]: partIV?.line36 ?? 0,
      [PassiveCreditCategory.Other]: 0,
    },
    suspendedCredit,
  );
  const allowedByReportingRoute = {
    [PassiveCreditReportingRoute.Form3800Line3]: 0,
    [PassiveCreditReportingRoute.Form3800Line24]: 0,
    [PassiveCreditReportingRoute.Form3800Line33]: 0,
    [PassiveCreditReportingRoute.Form8834]: 0,
  };
  for (const source of sourceAllocations) {
    allowedByReportingRoute[source.reporting_route] += source.allowed_credit;
  }
  return {
    partI,
    partII,
    partIII,
    partIV,
    line37,
    suspendedCredit,
    sourceAllocations,
    allowedByReportingRoute,
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8582CRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582cr";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: Form8582CRInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const lines = calculateForm8582CR(input);
    if (lines.partI.line5 === 0) return { outputs: [] };
    if (
      lines.allowedByReportingRoute[PassiveCreditReportingRoute.Form8834] > 0
    ) {
      throw new Error(
        "Form 8582-CR allowed Form 8834 credit needs its separate filing route and tax limit",
      );
    }
    const businessSources = lines.sourceAllocations.filter((source) =>
      source.reporting_route !== PassiveCreditReportingRoute.Form8834
    ).map((source) => sourceAllocationSchema.parse(source));
    return {
      outputs: businessSources.length > 0
        ? [output(f3800, { passive_source_allocations: businessSources })]
        : [],
      ...(lines.suspendedCredit > 0
        ? { carryforwards: { suspended_pac_8582cr: lines.suspendedCredit } }
        : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8582cr = new Form8582CRNode();
