import {
  ownerW2WageSourceSchema,
  singleFarmSourceAmounts,
} from "../form8995a/single-farm-source.ts";
import {
  qualifiedTipQbiSourceSchema,
  reviewedQualifiedTipExclusions,
} from "./qualified-tips.ts";
import { farmWotcAdvancedFields } from "../form8995a/farm-wotc.ts";
import { jointOwnerQbi } from "./joint-owner.ts";
import { singleScheduleCPlanSchema } from "../form7206/single-source.ts";
import { independentOwnerHealthSourceSchema } from "../form7206/independent-owner.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../schedule_se/owner-calculation.ts";
import { inputSchema as patronReviewSchema } from "../../../inputs/qbi_patron/schema.ts";
import { patronSourceAmounts } from "../../../inputs/qbi_patron/calculation.ts";
import {
  qbiCapitalSourcesSchema,
  qbiCapitalTotal,
} from "../qbi-capital-sources.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { form8995a, type Form8995AInput } from "../form8995a/index.ts";
import { scheduleCQbiBusinessSchema } from "../form8995a/index.ts";
import {
  allocateSharedSeDeduction,
  reviewedMultipleScheduleCQbi,
  roundSignedQbiDollars,
} from "../../../inputs/schedule_c/qbi-multiple.ts";
import { reviewedWotcQbiWages } from "../../../inputs/schedule_c/qbi-wotc.ts";
import { FilingStatus } from "../../../types.ts";
import {
  calculateScheduleFAtRiskNet,
  itemSchema as farmItemSchema,
} from "../schedule_f/model.ts";
import { calculateScheduleCAtRiskNet } from "../../../inputs/schedule_c/model.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR, type F1040Config } from "../../../config/index.ts";

// ── TY2025 Constants ─────────────────────────────────────────────────────────

const QBI_RATE = 0.20; // IRC §199A(a) — 20% of net QBI

// Several lines are assembled from more than one upstream node: line 12 from f1099div
// (qualified dividends) and schedule_d (net capital gain), and the Line 1(c) deductions
// from schedule_se, form7206 and sep_retirement. Declaring those fields accumulable
// prevents a Zod parse failure when two deposit; sumField collapses the array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const scheduleFQbiBusinessSchema = z.object({
  business_reference: z.string().optional(),
  business_name: z.string().optional(),
  ein: z.string().optional(),
  qbi: z.number(),
  w2_wages: z.number().nonnegative().optional(),
  ubia: z.number().nonnegative().optional(),
  no_other_adjustments_confirmed: z.boolean(),
  source_schedule_f: z.unknown(),
  wotc_wage_reduction: z.number().positive().optional(),
}).strict();

// Schedule C keeps source cents until the Form 8995 line total is rounded.
// Form 8995-A retains its own whole-dollar business schema.
const scheduleCQbiBusinessWithCentsSchema = scheduleCQbiBusinessSchema.extend({
  qbi: z.number().finite(),
  w2_wages: z.number().finite().nonnegative(),
  ubia: z.number().finite().nonnegative(),
});

function sumField(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce((s: number, n: number) => s + n, 0);
  }
  return value;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  patron_source_review: patronReviewSchema.optional(),
  joint_se_source: ownerSourcesSchema.optional(),
  joint_owner_health_plan_source: singleScheduleCPlanSchema.optional(),
  joint_owner_health_plans_source: independentOwnerHealthSourceSchema
    .optional(),
  joint_owner_filing_rows: z.array(z.record(z.string(), z.unknown()))
    .optional(),
  // Net QBI or (loss) from sole proprietorships (Schedule C), netted across businesses
  qbi_from_schedule_c: accumulable(z.number()).optional(),
  // Net QBI or (loss) from farming (Schedule F)
  qbi_from_schedule_f: accumulable(z.number()).optional(),
  // QBI from pass-through rentals/partnerships (Schedule E)
  qbi: accumulable(z.number()).optional(),
  // W-2 wages and UBIA are carried forward when Form 8995-A is required.
  w2_wages: accumulable(z.number().nonnegative()).optional(),
  unadjusted_basis: accumulable(z.number().nonnegative()).optional(),
  // Specified service trade or business amounts stay separate for the phase-out.
  sstb_qbi: accumulable(z.number()).optional(),
  sstb_w2_wages: accumulable(z.number().nonnegative()).optional(),
  sstb_unadjusted_basis: accumulable(z.number().nonnegative()).optional(),
  // Section 199A dividends from REITs (Form 1099-DIV box 5)
  line6_sec199a_dividends: accumulable(z.number().nonnegative()).optional(),
  reit_dividend_sources: z.array(z.object({
    payer_name: z.string(),
    source_document_reference: z.string(),
    box1a: z.number(),
    box5: z.number(),
    ex_dividend_date: z.string().optional(),
    qualified_held_days_in_91_day_window: z.number().optional(),
    diminished_risk_days_excluded: z.number().optional(),
    no_related_payment_obligation_confirmed: z.boolean().optional(),
    review_reference: z.string().optional(),
    reviewed_on: z.string().optional(),
  })).optional(),
  // Taxable income before QBI deduction (AGI minus deductions).
  // When provided, caps QBI deduction at 20% of this amount (IRC §199A(a)).
  taxable_income: z.number().nonnegative().optional(),
  // Net capital gain (Form 1040 line 3a plus Schedule D) — reduces income limitation base
  net_capital_gain: accumulable(z.number().nonnegative()).optional(),
  qbi_capital_sources: qbiCapitalSourcesSchema.optional(),
  // Deductible part of self-employment tax (Schedule SE line 13) attributable to the
  // trade or business — reduces QBI on Line 1(c)
  se_tax_deduction: accumulable(z.number().nonnegative()).optional(),
  // Self-employed health insurance deduction (Schedule 1 line 17) — reduces QBI
  se_health_insurance_deduction: accumulable(z.number().nonnegative())
    .optional(),
  // Deduction for contributions to a qualified retirement plan (Schedule 1 line 16)
  // — reduces QBI
  retirement_plan_deduction: accumulable(z.number().nonnegative()).optional(),
  // Prior-year QBI net loss carryforward (must be zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  investment_interest_sources: z.array(z.unknown()).optional(),
  investment_dividend_sources: z.array(z.unknown()).optional(),
  investment_dividend_totals: z.object({
    ordinary: z.number().nonnegative(),
    qualified: z.number().nonnegative(),
    capital_gain_distributions: z.number().nonnegative(),
  }).strict().optional(),
  multi_business_filing_rows: z.array(
    z.object({
      business_reference: z.string(),
      business_name: z.string(),
      tin: z.object({ kind: z.enum(["ein", "ssn"]), value: z.string() }),
      qbi: z.number().int(),
      raw_qbi: z.number().finite(),
      se_tax_deduction: z.number().nonnegative(),
    }).strict(),
  ).optional(),
  schedule_c_qbi_businesses: z.array(scheduleCQbiBusinessWithCentsSchema)
    .optional(),
  schedule_f_qbi_businesses: z.array(scheduleFQbiBusinessSchema).optional(),
  single_farm_owner_w2_sources: z.array(ownerW2WageSourceSchema).optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
  qbi_not_patron_of_specified_cooperative_confirmed: z.literal(true).optional(),
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  spouse_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  // Prior-year REIT/PTP net loss carryforward (must be zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),
  // AGI — used to compute pre-QBI taxable income when taxable_income is not yet known
  agi: z.number().optional(),
  // Schedule 1-A reduces taxable income before the section 199A income cap.
  additional_deductions: z.number().nonnegative().optional(),
  itemized_deductions: z.number().nonnegative().optional(),
  force_itemized: z.boolean().optional(),
  mfs_spouse_itemizing: z.boolean().optional(),
  qualified_tip_qbi_source: qualifiedTipQbiSourceSchema.optional(),
  // Filing status — used to look up the standard deduction base for income limit
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // Age/blindness flags — used to compute the full standard deduction (including additional factors)
  // so the QBI income limit uses the actual deduction amount rather than only the base.
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),
});

export type Form8995Input = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Line 1(c)/Line 2: the net QBI or (loss) of every trade or business, reduced by the
// deductions attributable to them. i8995, Determining Your Qualified Business Income:
// the items to consider include the "deductible part of self-employment tax,
// self-employment health insurance deduction, and contributions to qualified
// retirement plans".
function businessDeductions(input: Form8995Input): number {
  return sumField(input.se_tax_deduction) +
    sumField(input.se_health_insurance_deduction) +
    sumField(input.retirement_plan_deduction);
}

function totalQbi(input: Form8995Input): number {
  return sumField(input.qbi_from_schedule_c) +
    sumField(input.qbi_from_schedule_f) +
    sumField(input.qbi) + sumField(input.sstb_qbi) -
    businessDeductions(input) -
    reviewedQualifiedTipExclusions(input.qualified_tip_qbi_source).total;
}

function netQbi(input: Form8995Input): number {
  return totalQbi(input) + (input.qbi_loss_carryforward ?? 0);
}

function qbiComponent(input: Form8995Input): number {
  const net = netQbi(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function netReit(input: Form8995Input): number {
  return sumField(input.line6_sec199a_dividends) +
    (input.reit_loss_carryforward ?? 0);
}

function reitComponent(input: Form8995Input): number {
  const net = netReit(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function totalBeforeLimit(input: Form8995Input): number {
  return qbiComponent(input) + reitComponent(input);
}

// Filing statuses for which spouse factors apply (same set as standard_deduction worksheet).
const SPOUSE_STATUSES = new Set<FilingStatus>([
  FilingStatus.MFJ,
  FilingStatus.MFS,
  FilingStatus.QSS,
]);

// Compute the effective standard deduction for a filing status, including age/blindness additions.
// This mirrors the logic in the standard_deduction worksheet so that the QBI income limit
// uses the same deduction amount that will ultimately be applied to taxable income.
function standardDeductionAmount(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const status = input.filing_status;
  if (status === undefined) return 0;
  const base = cfg.standardDeductionBase[status] ?? 0;
  const additionalPerFactor = cfg.standardDeductionAdditional[status] ?? 0;
  let factors = 0;
  if (input.taxpayer_age_65_or_older) factors += 1;
  if (input.taxpayer_blind) factors += 1;
  if (SPOUSE_STATUSES.has(status)) {
    if (input.spouse_age_65_or_older) factors += 1;
    if (input.spouse_blind) factors += 1;
  }
  return base + factors * additionalPerFactor;
}

function sourceDeductionAmount(input: Form8995Input, cfg: F1040Config): number {
  const itemized = input.itemized_deductions ?? 0;
  return input.force_itemized === true || input.mfs_spouse_itemizing === true
    ? itemized
    : Math.max(itemized, standardDeductionAmount(input, cfg));
}

function incomeLimitBase(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const capGain = qbiCapitalTotal(input);

  // Preferred: use explicit taxable_income (pre-QBI) when available
  if (input.taxable_income !== undefined) {
    return Math.max(0, input.taxable_income - capGain);
  }

  // Fallback: derive from AGI minus the full standard deduction (including age/blindness
  // additions) for the filing status. IRC §199A(a) caps the deduction at 20% of
  // (taxable income before QBI deduction). Using the full standard deduction amount
  // matches what the standard_deduction worksheet will compute.
  if (input.agi !== undefined) {
    const stdDed = sourceDeductionAmount(input, cfg);
    return Math.max(
      0,
      input.agi - stdDed - (input.additional_deductions ?? 0) - capGain,
    );
  }

  // No income information available — income limit cannot be applied; return Infinity
  // so the deduction is uncapped (will be corrected when agi is received).
  return Infinity;
}

function incomeLimit(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const base = incomeLimitBase(input, cfg);
  if (base === Infinity) return Infinity;
  return base * QBI_RATE;
}

function qbiDeduction(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const total = totalBeforeLimit(input);
  if (total <= 0) return 0;
  const limit = incomeLimit(input, cfg);
  if (limit === Infinity) return total;
  return Math.min(total, limit);
}

function hasQbiActivity(input: Form8995Input): boolean {
  return (
    input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) ===
      true ||
    sumField(input.qbi_from_schedule_c) !== 0 ||
    sumField(input.qbi_from_schedule_f) !== 0 ||
    sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    sumField(input.line6_sec199a_dividends) > 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  );
}

function taxableIncomeBeforeQbi(
  input: Form8995Input,
  cfg: F1040Config,
): number | undefined {
  if (input.taxable_income !== undefined) return input.taxable_income;
  if (input.agi === undefined || input.filing_status === undefined) {
    return undefined;
  }
  return Math.max(
    0,
    input.agi - sourceDeductionAmount(input, cfg) -
      (input.additional_deductions ?? 0),
  );
}

function qbiThreshold(
  filingStatus: FilingStatus,
  cfg: F1040Config,
): number {
  return filingStatus === FilingStatus.MFJ
    ? cfg.qbiThresholdMfj
    : cfg.qbiThresholdSingle;
}

/** No 8995-A is filed when all identified C/F businesses have a zero
 * deduction above the completed wage/property phase-in. */
function zeroLimitedMixedScheduleCF(
  input: Form8995Input,
  taxableIncome: number,
  cfg: F1040Config,
): boolean {
  const cs = input.schedule_c_qbi_businesses ?? [];
  const fs = input.schedule_f_qbi_businesses ?? [];
  if (
    input.filing_status !== FilingStatus.Single || cs.length !== 1 ||
    fs.length > 2 ||
    taxableIncome < cfg.qbiThresholdSingle + cfg.qbiPhaseInRange ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    totalQbi(input) <= 0 ||
    reviewedQualifiedTipExclusions(input.qualified_tip_qbi_source).total !==
      0 ||
    sumField(input.qbi) !== 0 || sumField(input.sstb_qbi) !== 0 ||
    sumField(input.w2_wages) !== 0 || sumField(input.unadjusted_basis) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    cs[0].source_schedule_c.proprietor_recipient !== "T" ||
    cs[0].source_schedule_c.line_g_material_participation !== true ||
    cs[0].no_other_adjustments_confirmed !== true ||
    fs.some((row) => {
      const source = farmItemSchema.parse(row.source_schedule_f);
      return source.proprietor_recipient !== "T" ||
        source.line_e_material_participation !== true ||
        row.no_other_adjustments_confirmed !== true ||
        row.w2_wages !== 0 || row.ubia !== 0 || row.wotc_wage_reduction ||
        row.qbi !== calculateScheduleFAtRiskNet(source).atRiskNet;
    }) ||
    cs[0].w2_wages !== 0 || cs[0].ubia !== 0 ||
    cs[0].wotc_wage_reduction !== undefined ||
    cs[0].qbi !==
      calculateScheduleCAtRiskNet(cs[0].source_schedule_c).atRiskNet ||
    sumField(input.qbi_from_schedule_c) !== cs[0].qbi ||
    sumField(input.qbi_from_schedule_f) !==
      fs.reduce((sum, row) => sum + row.qbi, 0)
  ) return false;
  return true;
}

function advancedFormOutput(
  input: Form8995Input,
  taxableIncome: number,
): NodeOutput {
  const farmWotc = farmWotcAdvancedFields(input, taxableIncome);
  if (farmWotc) return output(form8995a, farmWotc);

  if (
    input.schedule_c_qbi_businesses?.length === 2 &&
    input.schedule_c_qbi_businesses.every((b) =>
      b.source_schedule_c.qbi_wotc_filing_review
    )
  ) {
    const businesses = input.schedule_c_qbi_businesses;
    if (
      input.filing_status !== FilingStatus.MFJ || !input.joint_se_source ||
      new Set(businesses.map((b) => b.source_schedule_c.proprietor_recipient))
          .size !== 2 ||
      sumField(input.qbi_from_schedule_c) !==
        businesses.reduce((sum, b) => sum + b.qbi, 0)
    ) {
      throw new Error(
        "Two owned WOTC businesses need actual joint owners and source totals",
      );
    }
    const owned = ownedScheduleSE(
      input.joint_se_source,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    if (owned.deduction !== sumField(input.se_tax_deduction)) {
      throw new Error(
        "Two owned WOTC half-SE total differs from actual owners",
      );
    }
    const children = businesses.map((b) => {
      const half = owned.instances.find((row) =>
        row.recipient === (b.source_schedule_c.proprietor_recipient ?? "T")
      )?.line13;
      if (half === undefined) {
        throw new Error("Owned WOTC business lacks owner ScheduleSE");
      }
      const result = advancedFormOutput({
        ...input,
        schedule_c_qbi_businesses: [b],
        qbi_from_schedule_c: b.qbi,
        w2_wages: b.w2_wages,
        unadjusted_basis: b.ubia,
        se_tax_deduction: half,
      }, taxableIncome);
      return result.fields as Form8995AInput;
    });
    const wages = input.agi! - businesses.reduce((sum, b) => sum + b.qbi, 0) +
      owned.deduction;
    return output(form8995a, {
      ...children[0],
      single_schedule_c_source: undefined,
      business_filing_details: undefined,
      qbi: children.reduce((sum, c) => sum + (c.qbi ?? 0), 0),
      w2_wages: children.reduce(
        (sum, c) => sum + Math.round(c.w2_wages ?? 0),
        0,
      ),
      wotc_business_sources: children.map((c) => ({
        ...c.single_schedule_c_source!,
        joint_se_source: input.joint_se_source!,
        joint_wages_total: wages,
      })),
    });
  }
  const nonSstbQbi = sumField(input.qbi_from_schedule_c) +
    sumField(input.qbi_from_schedule_f) + sumField(input.qbi) -
    reviewedQualifiedTipExclusions(input.qualified_tip_qbi_source).total;
  const sstbQbi = sumField(input.sstb_qbi);
  if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    if (
      sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
      sstbQbi !== 0 || businessDeductions(input) !== 0 ||
      sumField(input.qbi_from_schedule_c) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.qbi,
          0,
        ) ||
      sumField(input.w2_wages) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.w2_wages,
          0,
        ) ||
      sumField(input.unadjusted_basis) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.ubia,
          0,
        )
    ) {
      throw new Error(
        "Form 8995-A Schedule C bounded route needs only its identified Schedule C QBI businesses and no separately attributable business deductions",
      );
    }
  }
  const deductions = businessDeductions(input);
  const positiveTotal = Math.max(0, nonSstbQbi) + Math.max(0, sstbQbi);
  const nonSstbShare = positiveTotal > 0
    ? Math.max(0, nonSstbQbi) / positiveTotal
    : 0;
  const sstbShare = positiveTotal > 0
    ? Math.max(0, sstbQbi) / positiveTotal
    : 0;

  const businesses = input.schedule_c_qbi_businesses;
  const business = businesses?.[0];
  let sourcedBusiness: Partial<Form8995AInput> = {};
  if (businesses?.some((row) => row.source_schedule_c.qbi_wotc_filing_review)) {
    // Finalized filing lines use whole dollars; source wages and AGI retain cents.
    taxableIncome = Math.round(taxableIncome);
    const review = business?.source_schedule_c.qbi_wotc_filing_review;
    if (
      businesses.length !== 1 || !business || !review ||
      (review.no_other_business_or_aggregation_confirmed !== true &&
        (!input.joint_se_source || review.no_aggregation_confirmed !== true ||
          JSON.stringify(review.reviewed_other_business_references) !==
            JSON.stringify(
              input.joint_se_source.businesses.filter((row) =>
                row.source_reference !== business.business_reference
              ).map((row) => row.source_reference),
            ))) ||
      !business.business_reference || !business.business_name ||
      !business.ein ||
      business.qbi <= 0 || !business.wotc_wage_reduction ||
      (input.filing_status !== FilingStatus.Single &&
        input.filing_status !== FilingStatus.MFJ) ||
      taxableIncome <=
        qbiThreshold(input.filing_status!, CONFIG_BY_YEAR[2025]) ||
      input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
      input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
      sumField(input.qbi_from_schedule_c) !== business.qbi ||
      sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
      sstbQbi !== 0 || qbiCapitalTotal(input) !== 0 ||
      sumField(input.line6_sec199a_dividends) !== 0 ||
      (input.qbi_loss_carryforward ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0 ||
      (input.filing_status === FilingStatus.Single && input.agi !==
          Math.round(business.qbi - sumField(input.se_tax_deduction))) ||
      (input.filing_status === FilingStatus.MFJ &&
        (!input.joint_se_source || !review.owner_ssn ||
          review.owner_ssn !==
            (business.source_schedule_c.proprietor_recipient === "S"
              ? input.spouse_ssn
              : input.taxpayer_ssn)?.replaceAll("-", ""))) ||
      sumField(input.se_health_insurance_deduction) !== 0 ||
      sumField(input.retirement_plan_deduction) !== 0
    ) {
      throw new Error(
        "Form 8995-A WOTC needs one reviewed positive Schedule C above threshold with its half-SE deduction",
      );
    }
    const wages = reviewedWotcQbiWages(
      business.source_schedule_c,
      business.wotc_wage_reduction,
    );
    const tipExclusion =
      reviewedQualifiedTipExclusions(input.qualified_tip_qbi_source).rows.find(
        (r) => r.business_reference === business.business_reference,
      )?.qbi_tip_exclusion ?? 0;
    const qbi = Math.round(
      business.qbi - sumField(input.se_tax_deduction) - tipExclusion,
    );
    sourcedBusiness = {
      qbi,
      business_filing_details: {
        business_name: business.business_name,
        ein: business.ein,
        business_qbi: qbi,
        business_w2_wages: wages,
        business_ubia: 0,
        one_non_sstb_business_confirmed: true,
        no_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed:
          review.no_ptp_or_loss_carryforward_confirmed,
        qualified_dividends_zero_confirmed:
          review.qualified_dividends_zero_confirmed,
        qbi_wages_ubia_sources_confirmed:
          review.all_business_payroll_included_confirmed,
        taxable_income_before_qbi_confirmed: true,
      },
      single_schedule_c_source: {
        business,
        se_tax_deduction: sumField(input.se_tax_deduction),
        ...(input.qualified_tip_qbi_source
          ? { qualified_tip_qbi_source: input.qualified_tip_qbi_source }
          : {}),
        ...(input.filing_status === FilingStatus.MFJ
          ? {
            joint_se_source: input.joint_se_source,
            joint_wages_total: input.agi! - business.qbi +
              sumField(input.se_tax_deduction),
          }
          : {}),
      },
      qbi_no_prior_loss_or_suspended_loss_confirmed:
        input.qbi_no_prior_loss_or_suspended_loss_confirmed,
    };
  }

  if (businesses?.some((row) => row.source_schedule_c.qbi_sstb_filing_review)) {
    const review = business?.source_schedule_c.qbi_sstb_filing_review;
    const owner = input.taxpayer_ssn?.replaceAll("-", "");
    if (
      !business || businesses.length !== 1 || !review || !owner ||
      review.owner_ssn !== owner ||
      (input.filing_status !== FilingStatus.Single &&
        input.filing_status !== FilingStatus.MFJ &&
        input.filing_status !== FilingStatus.MFS) ||
      (input.filing_status === FilingStatus.MFS && !review.mfs_filing_review) ||
      !business.business_name ||
      !business.ein || !business.business_reference ||
      business.source_schedule_c.proprietor_recipient !== "T" ||
      business.source_schedule_c.qbi_specified_service !== true ||
      nonSstbQbi !== 0 || sstbQbi !== business.qbi || business.qbi <= 0 ||
      business.wotc_wage_reduction !== undefined ||
      sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
      sumField(input.se_health_insurance_deduction) !== 0 ||
      sumField(input.retirement_plan_deduction) !== 0 ||
      input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
      input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
      qbiCapitalTotal(input) !== 0 ||
      sumField(input.line6_sec199a_dividends) !== 0 ||
      (input.qbi_loss_carryforward ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0
    ) {
      throw new Error(
        "SSTB Schedule C needs one identified taxpayer accounting business with only its filed half-SE adjustment",
      );
    }
    const qbi = business.qbi - sumField(input.se_tax_deduction);
    sourcedBusiness = {
      sstb_qbi: qbi,
      sstb_filing_details: {
        ...(input.filing_status === FilingStatus.MFS
          ? {
            mfs_owner_ssn: owner,
            mfs_allocation_source_reference:
              review.mfs_filing_review!.domicile_record_reference,
            mfs_no_spouse_share_confirmed: true as const,
          }
          : {}),
        business_name: business.business_name,
        ein: business.ein,
        business_qbi: qbi,
        business_w2_wages: business.w2_wages,
        business_ubia: business.ubia,
        one_non_ptp_sstb_confirmed: true,
        no_other_business_or_aggregation_confirmed: true,
        no_reit_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        qbi_wages_ubia_source_reference: review.review_reference,
        taxable_income_before_qbi_confirmed: true,
      },
      single_sstb_schedule_c_source: {
        business,
        owner_ssn: owner,
        se_tax_deduction: sumField(input.se_tax_deduction),
      },
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    };
  }

  if (input.patron_source_review) {
    const review = input.patron_source_review;
    const rows = review.business.kind === "schedule_c"
      ? input.schedule_c_qbi_businesses
      : input.schedule_f_qbi_businesses;
    const row = rows?.[0];
    if (
      !row || rows?.length !== 1 ||
      (input.filing_status !== FilingStatus.Single &&
        input.filing_status !== FilingStatus.MFJ) ||
      input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
      input.qbi_not_patron_of_specified_cooperative_confirmed === true ||
      sumField(input.qbi) !== 0 || sstbQbi !== 0 ||
      qbiCapitalTotal(input) !== 0 ||
      sumField(input.line6_sec199a_dividends) !== 0 ||
      (input.qbi_loss_carryforward ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0 ||
      (review.business.kind === "schedule_c"
        ? sumField(input.qbi_from_schedule_f) !== 0
        : sumField(input.qbi_from_schedule_c) !== 0)
    ) {
      throw new Error(
        "Patron public source needs one single-filer business, no other QBI activity and an explicit loss review",
      );
    }
    const source = {
      review,
      business_source: review.business.kind === "schedule_c"
        ? input.schedule_c_qbi_businesses![0].source_schedule_c
        : input.schedule_f_qbi_businesses![0].source_schedule_f,
      se_tax_deduction: sumField(input.se_tax_deduction),
      health_insurance_deduction: sumField(input.se_health_insurance_deduction),
      retirement_plan_deduction: sumField(input.retirement_plan_deduction),
    };
    const amounts = patronSourceAmounts(source);
    if (
      row.qbi !== amounts.profit || (review.business.kind === "schedule_c"
          ? sumField(input.qbi_from_schedule_c)
          : sumField(input.qbi_from_schedule_f)) !== amounts.profit ||
      Math.round(sumField(input.w2_wages)) !== amounts.wages ||
      sumField(input.unadjusted_basis) !== 0
    ) {
      throw new Error(
        "Patron business calculation differs from its retained Schedule C/F source",
      );
    }
    sourcedBusiness = {
      qbi: amounts.qbi,
      w2_wages: amounts.wages,
      unadjusted_basis: 0,
      patron_of_specified_cooperative: true,
      patron_business_source: source,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      business_filing_details: {
        business_name: amounts.name,
        ein: amounts.ein,
        business_qbi: amounts.qbi,
        business_w2_wages: amounts.wages,
        business_ubia: 0,
        one_non_sstb_business_confirmed: true,
        no_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        qbi_wages_ubia_sources_confirmed: true,
        taxable_income_before_qbi_confirmed: true,
      },
      patron_filing_details: {
        source_1099patr: review.source_1099patr,
        qbi_allocable_to_qualified_payments: amounts.qualified_qbi,
        w2_wages_allocable_to_qualified_payments: amounts.qualified_wages,
        one_cooperative_confirmed: true,
        allocation_worksheet_reference: review.allocation_worksheet_reference,
        allocation_worksheet_reviewed_by: review.reviewed_by,
        allocation_worksheet_review_date: review.reviewed_on,
        box6_written_notice_review: review.box6_written_notice_review,
      },
    };
  }

  const farm = input.schedule_f_qbi_businesses?.[0];
  if (
    input.schedule_f_qbi_businesses?.length === 1 &&
    !input.schedule_c_qbi_businesses && farm &&
    input.qbi_no_prior_loss_or_suspended_loss_confirmed === true &&
    input.qbi_not_patron_of_specified_cooperative_confirmed === true &&
    input.filing_status === FilingStatus.Single && input.taxpayer_ssn &&
    sumField(input.qbi) === 0 && sstbQbi === 0 &&
    sumField(input.se_health_insurance_deduction) === 0 &&
    sumField(input.retirement_plan_deduction) === 0 &&
    !input.patron_source_review
  ) {
    const source = singleFarmSourceAmounts({
      item: farmItemSchema.parse(farm.source_schedule_f),
      owner_ssn: input.taxpayer_ssn.replaceAll("-", ""),
      se_tax_deduction: sumField(input.se_tax_deduction),
      ...(input.single_farm_owner_w2_sources?.length
        ? { owner_w2_wage_sources: input.single_farm_owner_w2_sources }
        : {}),
    });
    if (
      farm.qbi !== source.profit ||
      sumField(input.qbi_from_schedule_f) !== source.profit
    ) {
      throw new Error(
        "Advanced farm QBI profit differs from its actual farm source",
      );
    }
    taxableIncome = Math.round(taxableIncome);
    sourcedBusiness = {
      qbi: source.qbi,
      single_schedule_f_source: {
        item: source.item,
        owner_ssn: source.owner_ssn,
        se_tax_deduction: source.se_tax_deduction,
        ...(source.owner_w2_wage_sources?.length
          ? { owner_w2_wage_sources: source.owner_w2_wage_sources }
          : {}),
      },
      patron_of_specified_cooperative: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      business_filing_details: {
        business_name: source.name,
        ein: source.ein,
        business_qbi: source.qbi,
        business_w2_wages: 0,
        business_ubia: 0,
        one_non_sstb_business_confirmed: true,
        no_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed:
          (input.investment_dividend_totals?.qualified ?? 0) === 0,
        qbi_wages_ubia_sources_confirmed: true,
        taxable_income_before_qbi_confirmed: true,
      },
    };
  }

  if (
    businesses?.length === 1 &&
    business?.source_schedule_c.donated_natural_resource_property_source
        ?.kind === "producing_mining_617"
  ) {
    if (
      input.filing_status !== FilingStatus.Single || !input.taxpayer_ssn ||
      sumField(input.qbi_from_schedule_c) !== business.qbi ||
      sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
      sstbQbi !== 0 || sumField(input.se_health_insurance_deduction) !== 0 ||
      sumField(input.retirement_plan_deduction) !== 0 ||
      input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
      input.qualified_tip_qbi_source
    ) {
      throw new Error(
        "Producing mine advanced QBI needs one actual owner business and only filed halfSE",
      );
    }
    sourcedBusiness = {
      business_filing_details: {
        business_name: business.business_name!,
        ein: business.ein!,
        business_qbi: business.qbi - sumField(input.se_tax_deduction),
        business_w2_wages: 0,
        business_ubia: 0,
        one_non_sstb_business_confirmed: true,
        no_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        qbi_wages_ubia_sources_confirmed: true,
        taxable_income_before_qbi_confirmed: true,
      },
      qbi_no_prior_loss_or_suspended_loss_confirmed:
        input.qbi_no_prior_loss_or_suspended_loss_confirmed,
      producing_mining_zero_qbi_source: {
        business,
        owner_ssn: input.taxpayer_ssn.replaceAll("-", ""),
        se_tax_deduction: sumField(input.se_tax_deduction),
      },
    };
    taxableIncome = Math.round(taxableIncome);
  }

  return output(form8995a, {
    filing_status: input.filing_status,
    taxable_income: input.patron_source_review
      ? Math.round(taxableIncome)
      : taxableIncome,
    net_capital_gain: qbiCapitalTotal(input, true),
    qbi_capital_sources: input.qbi_capital_sources,
    investment_interest_sources: input.investment_interest_sources,
    investment_dividend_sources: input.investment_dividend_sources,
    investment_dividend_totals: input.investment_dividend_totals,
    qbi: nonSstbQbi - deductions * nonSstbShare,
    w2_wages: sumField(input.w2_wages),
    unadjusted_basis: sumField(input.unadjusted_basis),
    sstb_qbi: sstbQbi - deductions * sstbShare,
    sstb_w2_wages: sumField(input.sstb_w2_wages),
    sstb_unadjusted_basis: sumField(input.sstb_unadjusted_basis),
    line6_sec199a_dividends: sumField(input.line6_sec199a_dividends),
    qbi_loss_carryforward: input.qbi_loss_carryforward ?? 0,
    reit_loss_carryforward: input.reit_loss_carryforward ?? 0,
    ...(input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) &&
      {
        schedule_c_qbi_businesses: input.schedule_c_qbi_businesses,
        qbi_no_prior_loss_or_suspended_loss_confirmed:
          input.qbi_no_prior_loss_or_suspended_loss_confirmed,
      }),
    ...sourcedBusiness,
  });
}

// One identified Schedule C business can file a simplified positive claim
// with its sourced half-SE-tax deduction and no other section 199A sources.
function oneScheduleCLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, string | number> & { line15: number }) | undefined {
  const businesses = input.schedule_c_qbi_businesses;
  if (businesses?.length !== 1) return undefined;
  const business = businesses[0];
  const seDeduction = input.se_tax_deduction ?? 0;
  const ownerSsn = business.source_schedule_c.proprietor_recipient === "S"
    ? input.spouse_ssn
    : input.taxpayer_ssn;
  if (
    !business.business_reference || !business.business_name ||
    (!business.ein && !ownerSsn) ||
    business.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !Number.isFinite(business.qbi) || business.qbi <= 0 ||
    sumField(input.qbi_from_schedule_c) !== business.qbi ||
    sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    typeof seDeduction !== "number" || seDeduction < 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    !Number.isSafeInteger(sumField(input.line6_sec199a_dividends)) ||
    !Number.isSafeInteger(qbiCapitalTotal(input)) ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !Number.isFinite(input.agi) ||
    input.filing_status === undefined
  ) return undefined;
  const tipExclusion =
    reviewedQualifiedTipExclusions(input.qualified_tip_qbi_source).rows.find(
      (r) => r.business_reference === business.business_reference,
    )?.qbi_tip_exclusion ?? 0;
  const qbi = Math.round(
    business.qbi - seDeduction - sumField(input.se_health_insurance_deduction) -
      tipExclusion,
  );
  if (qbi <= 0) return undefined;
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line5 = Math.round(qbi * QBI_RATE);
  const reit = sumField(input.line6_sec199a_dividends);
  const line9 = Math.round(reit * QBI_RATE);
  const line12 = qbiCapitalTotal(input, true);
  const line13 = Math.max(0, line11 - line12);
  const line14 = Math.round(line13 * QBI_RATE);
  return {
    line1_business_reference: business.business_reference,
    line1_business_name: business.business_name,
    ...(business.ein
      ? { line1_ein: business.ein }
      : { line1_ssn: ownerSsn!.replace(/\D/g, "") }),
    line1_qbi: qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5,
    line6: reit,
    line7: 0,
    line8: reit,
    line9,
    line10: line5 + line9,
    line11,
    line12,
    line13,
    line14,
    line15: Math.min(line5 + line9, line14),
    line16: 0,
    line17: 0,
  };
}

// Reviewed source route for any number of taxpayer Schedule C businesses.
function multipleScheduleCLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, unknown> & { line15: number }) | undefined {
  const businesses = input.schedule_c_qbi_businesses;
  if (
    !businesses || businesses.length < 1 ||
    !(businesses.some((row) =>
      row.source_schedule_c.qbi_se_tax_allocation_review
    ) ||
      (businesses.length === 1 &&
        input.investment_dividend_totals !== undefined))
  ) return undefined;
  if (
    input.se_tax_deduction === undefined &&
    businesses.reduce((sum, row) => sum + row.qbi, 0) * .9235 >= 400
  ) return undefined;
  const source = reviewedMultipleScheduleCQbi(
    businesses.map((row) => row.source_schedule_c),
    sumField(input.se_tax_deduction),
  );
  const totalProfit = source.profits.reduce((sum, value) => sum + value, 0);
  if (
    input.filing_status !== FilingStatus.Single ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    Math.abs(
        sumField(input.qbi_from_schedule_c) + sumField(input.sstb_qbi) -
          totalProfit,
      ) >= 1e-8 ||
    sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !input.taxpayer_ssn ||
    businesses.some((row, index) =>
      !row.business_reference || !row.business_name ||
      row.qbi !== source.profits[index] || row.wotc_wage_reduction
    )
  ) {
    throw new Error(
      "Multiple Schedule C Form 8995 needs its identified sources and no other QBI components",
    );
  }
  const rows = businesses.map((row, index) => ({
    business_reference: row.business_reference!,
    business_name: row.business_name!,
    tin: {
      kind: row.ein ? "ein" as const : "ssn" as const,
      value: row.ein ?? input.taxpayer_ssn!.replace(/\D/g, ""),
    },
    qbi: source.filedQbi[index],
    raw_qbi: source.qbi[index],
    se_tax_deduction: source.allocations[index],
  }));
  const line2 = rows.reduce((sum, row) => sum + row.qbi, 0);
  const line4 = Math.max(0, line2);
  const line5 = Math.round(line4 * QBI_RATE);
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line12 = qbiCapitalTotal(input, true);
  const line13 = Math.max(0, line11 - line12);
  const line14 = Math.round(line13 * QBI_RATE);
  return {
    multi_business_filing_rows: rows,
    line2,
    line3: 0,
    line4,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12,
    line13,
    line14,
    line15: Math.min(line5, line14),
    line16: Math.max(0, -line2),
    line17: 0,
  };
}

/** One same-owner Schedule C and owned cash Schedule F with reviewed shared SE allocation. */
function mixedScheduleCFLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, unknown> & { line15: number }) | undefined {
  const cs = input.schedule_c_qbi_businesses ?? [];
  const f = input.schedule_f_qbi_businesses?.[0];
  if (
    (cs.length !== 1 && cs.length !== 2) ||
    input.schedule_f_qbi_businesses?.length !== 1 || !f ||
    cs.some((c) => !c.source_schedule_c.qbi_se_tax_allocation_review)
  ) return undefined;
  const farmSource = farmItemSchema.parse(f.source_schedule_f);
  if (!farmSource.qbi_se_tax_allocation_review) return undefined;
  const businesses = [...cs, f];
  const profits = businesses.map((row) => row.qbi);
  const seDeduction = sumField(input.se_tax_deduction);
  const allocations = allocateSharedSeDeduction(profits, seDeduction);
  const reviews = [
    ...cs.map((c) => c.source_schedule_c.qbi_se_tax_allocation_review),
    farmSource.qbi_se_tax_allocation_review,
  ];
  if (
    input.filing_status !== FilingStatus.Single ||
    input.agi === undefined || !input.taxpayer_ssn ||
    cs.some((c) =>
      c.source_schedule_c.proprietor_recipient !== "T" ||
      c.source_schedule_c.line_g_material_participation !== true ||
      c.no_other_adjustments_confirmed !== true
    ) ||
    farmSource.proprietor_recipient !== "T" ||
    farmSource.accounting_method !== "cash" ||
    farmSource.line_e_material_participation !== true ||
    f.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    businesses.some((row) =>
      !row.business_reference || !row.business_name || !row.ein
    ) ||
    new Set(businesses.map((row) => row.business_reference)).size !==
      businesses.length ||
    new Set(businesses.map((row) => row.ein)).size !== businesses.length ||
    profits.some((profit) => profit <= 0) ||
    reviews.some((review, index) =>
      review?.deduction_amount !== allocations[index] ||
      review?.all_businesses_included_confirmed !== true ||
      review?.no_aggregation_confirmed !== true
    ) ||
    sumField(input.qbi_from_schedule_c) !==
      cs.reduce((sum, c) => sum + c.qbi, 0) ||
    sumField(input.qbi_from_schedule_f) !== f.qbi ||
    sumField(input.qbi) !== 0 || sumField(input.sstb_qbi) !== 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    qbiCapitalTotal(input) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Mixed C/F QBI needs exact reviewed owner and SE allocation sources",
    );
  }
  const raw = profits.map((profit, index) => profit - allocations[index]);
  const filed = raw.map(roundSignedQbiDollars);
  const line2 = filed.reduce((sum, value) => sum + value, 0);
  const line5 = Math.round(Math.max(0, line2) * QBI_RATE);
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line14 = Math.round(line11 * QBI_RATE);
  return {
    multi_business_filing_rows: businesses.map((row, index) => ({
      business_reference: row.business_reference!,
      business_name: row.business_name!,
      tin: { kind: "ein" as const, value: row.ein! },
      qbi: filed[index],
      raw_qbi: raw[index],
      se_tax_deduction: allocations[index],
    })),
    line2,
    line3: 0,
    line4: Math.max(0, line2),
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: 0,
    line17: 0,
  };
}

// Two small, independently identified Schedule C businesses can use the two
// printed rows without an attributable SE-tax deduction when their combined
// profit is below the Schedule SE filing threshold.
function twoSmallScheduleCLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, string | number> & { line15: number }) | undefined {
  const businesses = input.schedule_c_qbi_businesses;
  if (businesses?.length !== 2) return undefined;
  const [first, second] = businesses;
  const qbi = first.qbi + second.qbi;
  if (
    input.filing_status !== FilingStatus.Single ||
    !first.business_reference || !second.business_reference ||
    first.business_reference === second.business_reference ||
    !first.business_name || !second.business_name ||
    first.business_name === second.business_name ||
    !first.ein || !second.ein || first.ein === second.ein ||
    !Number.isSafeInteger(first.qbi) || first.qbi <= 0 ||
    !Number.isSafeInteger(second.qbi) || second.qbi <= 0 || qbi >= 400 ||
    first.no_other_adjustments_confirmed !== true ||
    second.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    sumField(input.qbi_from_schedule_c) !== qbi ||
    sumField(input.qbi_from_schedule_f) !== 0 ||
    sumField(input.qbi) !== 0 || sumField(input.sstb_qbi) !== 0 ||
    sumField(input.se_tax_deduction) !== 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    qbiCapitalTotal(input) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !Number.isFinite(input.agi)
  ) return undefined;
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line5 = Math.round(qbi * QBI_RATE);
  const line14 = Math.round(line11 * QBI_RATE);
  return {
    line1_business_reference: first.business_reference,
    line1_business_name: first.business_name,
    line1_ein: first.ein,
    line1_qbi: first.qbi,
    line1ii_business_reference: second.business_reference,
    line1ii_business_name: second.business_name,
    line1ii_ein: second.ein,
    line1ii_qbi: second.qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: 0,
    line17: 0,
  };
}

function oneScheduleFLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, string | number> & { line15: number }) | undefined {
  const businesses = input.schedule_f_qbi_businesses;
  if (businesses?.length !== 1) return undefined;
  const business = businesses[0];
  const seDeduction = sumField(input.se_tax_deduction);
  const usesSsn = !business.ein &&
    input.filing_status === FilingStatus.Single &&
    input.taxpayer_ssn !== undefined;
  if (
    !business.business_reference || !business.business_name ||
    (!business.ein && !usesSsn) ||
    business.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !Number.isInteger(business.qbi) || business.qbi <= 0 ||
    sumField(input.qbi_from_schedule_f) !== business.qbi ||
    sumField(input.qbi_from_schedule_c) !== 0 || sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    seDeduction < 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    !Number.isSafeInteger(qbiCapitalTotal(input)) ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !Number.isFinite(input.agi) ||
    input.filing_status === undefined
  ) return undefined;
  const qbi = Math.round(business.qbi - seDeduction);
  if (qbi <= 0) return undefined;
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line5 = Math.round(qbi * QBI_RATE);
  const line12 = qbiCapitalTotal(input, true);
  const line13 = Math.max(0, line11 - line12);
  const line14 = Math.round(line13 * QBI_RATE);
  return {
    line1_business_reference: business.business_reference,
    line1_business_name: business.business_name,
    ...(usesSsn
      ? { line1_ssn: input.taxpayer_ssn!.replace(/\D/g, "") }
      : { line1_ein: business.ein! }),
    line1_qbi: qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12,
    line13,
    line14,
    line15: Math.min(line5, line14),
    line16: 0,
    line17: 0,
  };
}

function reitOnlyLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, number> & { line15: number }) | undefined {
  const reit = sumField(input.line6_sec199a_dividends);
  if (
    input.schedule_c_qbi_businesses !== undefined ||
    input.schedule_f_qbi_businesses !== undefined ||
    !input.reit_dividend_sources ||
    input.reit_dividend_sources.length < 1 ||
    input.reit_dividend_sources.length > 3 ||
    !Number.isSafeInteger(reit) || reit <= 0 ||
    reit > 1_500 ||
    sumField(input.qbi_from_schedule_c) !== 0 ||
    sumField(input.qbi_from_schedule_f) !== 0 ||
    sumField(input.qbi) !== 0 || sumField(input.sstb_qbi) !== 0 ||
    businessDeductions(input) !== 0 ||
    qbiCapitalTotal(input) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    input.agi === undefined || !Number.isFinite(input.agi) ||
    input.filing_status === undefined
  ) return undefined;
  const line11 = Math.round(
    Math.max(
      0,
      input.agi - sourceDeductionAmount(input, cfg) -
        (input.additional_deductions ?? 0),
    ),
  );
  const line9 = Math.round(reit * QBI_RATE);
  const line14 = Math.round(line11 * QBI_RATE);
  return {
    line1_qbi: 0,
    line2: 0,
    line3: 0,
    line4: 0,
    line5: 0,
    line6: reit,
    line7: 0,
    line8: reit,
    line9,
    line10: line9,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line9, line14),
    line16: 0,
    line17: 0,
  };
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form8995Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    standard_deduction,
    form8995a,
  ]);

  compute(ctx: NodeContext, rawInput: Form8995Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    if (!hasQbiActivity(input)) {
      return { outputs: [] };
    }

    if (netReit(input) < 0) {
      throw new Error(
        "Form 8995 negative REIT/PTP line 8 needs a sourced line 17 carryforward filing route",
      );
    }

    if (
      input.agi === undefined && (input.schedule_c_qbi_businesses?.some(
        (row) => row.source_schedule_c.qbi_se_tax_allocation_review,
      ) ||
        (input.schedule_c_qbi_businesses?.length === 1 &&
          input.investment_dividend_totals !== undefined))
    ) return { outputs: [] };
    if (
      (input.patron_source_review || input.joint_se_source) &&
      input.agi === undefined
    ) {
      return { outputs: [] };
    }
    const taxableIncome = taxableIncomeBeforeQbi(input, cfg);
    if (
      taxableIncome !== undefined && input.filing_status !== undefined &&
      (taxableIncome > qbiThreshold(input.filing_status, cfg) ||
        input.patron_source_review !== undefined)
    ) {
      if (zeroLimitedMixedScheduleCF(input, taxableIncome, cfg)) {
        return { outputs: [] };
      }
      return {
        outputs: [advancedFormOutput(input, taxableIncome), {
          nodeType: this.nodeType,
          fields: { net_capital_gain: qbiCapitalTotal(input) },
        }],
      };
    }

    const ownedLines = input.joint_se_source &&
        input.joint_se_source.businesses.every((row) =>
          row.qbi_no_other_adjustments_confirmed === true
        )
      ? (() => {
        if (
          input.filing_status !== FilingStatus.MFJ || input.agi === undefined ||
          input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
          input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
          sumField(input.qbi) !== 0 ||
          sumField(input.retirement_plan_deduction) !== 0 ||
          sumField(input.line6_sec199a_dividends) !== 0 ||
          (input.qbi_loss_carryforward ?? 0) !== 0 ||
          (input.reit_loss_carryforward ?? 0) !== 0 ||
          qbiCapitalTotal(input) !== 0
        ) {
          throw new Error(
            "Joint owner QBI needs its actual ordinary source and reviewed no-other-component records",
          );
        }
        return jointOwnerQbi(
          input.joint_se_source,
          input.agi - sourceDeductionAmount(input, cfg) -
            (input.additional_deductions ?? 0),
          cfg.ssWageBase,
          input.joint_owner_health_plan_source,
          sumField(input.se_health_insurance_deduction),
          input.joint_owner_health_plans_source,
          input.qualified_tip_qbi_source,
        );
      })()
      : undefined;
    const mixedLines = mixedScheduleCFLines(input, cfg);
    const multipleLines = ownedLines ?? mixedLines ??
      multipleScheduleCLines(input, cfg);
    if (netQbi(input) < 0 && multipleLines === undefined) {
      throw new Error(
        "Form 8995 net QBI loss needs a sourced carryforward filing route",
      );
    }

    const simplifiedLines = ownedLines ?? mixedLines ??
      (input.schedule_f_qbi_businesses !== undefined
        ? oneScheduleFLines(input, cfg)
        : input.schedule_c_qbi_businesses !== undefined
        ? multipleLines ?? twoSmallScheduleCLines(input, cfg) ??
          oneScheduleCLines(input, cfg)
        : reitOnlyLines(input, cfg));
    // The bounded filed routes carry whole-dollar line 15 exactly
    // into Form 1040. Other QBI routes retain their existing calculation.
    const deduction = simplifiedLines === undefined
      ? qbiDeduction(input, cfg)
      : simplifiedLines.line15;
    if (
      deduction <= 0 && multipleLines === undefined &&
      !(simplifiedLines && "line1_qbi" in simplifiedLines &&
        typeof simplifiedLines.line1_qbi === "number" &&
        simplifiedLines.line1_qbi > 0)
    ) {
      return {
        outputs: qbiCapitalTotal(input) > 0
          ? [{
            nodeType: this.nodeType,
            fields: { net_capital_gain: qbiCapitalTotal(input) },
          }]
          : [],
      };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
      // Route QBI deduction to standard_deduction so it is subtracted from taxable income
      // before routing to income_tax_calculation (Form 1040 lines 13 → 14 → 15).
      this.outputNodes.output(standard_deduction, { qbi_deduction: deduction }),
      {
        nodeType: this.nodeType,
        fields: {
          qbi_deduction: deduction,
          net_capital_gain: qbiCapitalTotal(input),
          ...simplifiedLines,
        },
      },
    ];

    return {
      outputs,
      ...(ownedLines?.line16
        ? { carryforwards: { qbi_loss_carryforward: ownedLines.line16 } }
        : {}),
    };
  }
}

export const form8995 = new Form8995Node();
