import { mfsSstbFilingReviewSchema } from "../../../../../inputs/income/business/schedule_c/mfs-sstb-review.ts";
import { reviewedLossWotcReductions } from "./loss-wotc.ts";
import { lossSeSourceSchema, reviewedLossSeAllocations } from "./loss-se.ts";
import {
  independentPatronSourceSchema,
  replayIndependentPatronSources,
} from "../../../../../inputs/deductions/business/qbi_patron/independent.ts";
import {
  assertSingleFarmAmounts,
  singleFarmSourceSchema,
} from "./single-farm-source.ts";
import { assertProducingMiningZeroQbi } from "./producing-mining.ts";
import { filedOwnedScheduleC } from "../../../../../owned-business-filing.ts";
import {
  qualifiedTipQbiSourceSchema,
  reviewedQualifiedTipExclusions,
} from "../form8995/qualified-tips.ts";
import { farmWotcSourceSchema } from "./farm-wotc-source.ts";
import {
  calculateMixedFishingQbi,
  mixedFishingQbiSourceSchema,
} from "./mixed-fishing.ts";
import { calculateFarmWotcLines } from "./farm-wotc.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../../../taxes/self-employment/schedule_se/owner-calculation.ts";
import {
  assertPatronFilingStatus,
  sourceSchema as patronBusinessSourceSchema,
} from "../../../../../inputs/deductions/business/qbi_patron/schema.ts";
import { patronSourceAmounts } from "../../../../../inputs/deductions/business/qbi_patron/calculation.ts";
import {
  qbiCapitalSourcesSchema,
  qbiCapitalTotal,
} from "../qbi-capital-sources.ts";
import { z } from "zod";
import {
  reviewedRpeAggregation,
  rpeAggregationSourceSchema,
} from "../../../../../inputs/deductions/business/k1_rpe_aggregation_source.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { standard_deduction } from "../../../../worksheets/deductions/standard/standard_deduction/index.ts";
import { FilingStatus, filingStatusSchema, TS } from "../../../../../types.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import type { F1040Config } from "../../../../../config/index.ts";
import { qbiPhaseInRange, qbiThreshold, qbiYearConfig } from "./thresholds.ts";
import { minimumDeductionLine40 } from "./minimum-deduction.ts";
import {
  assertDatesInTaxYear,
  ISO_DATE,
  majorityOwnershipLatestStart,
  taxYearEnd,
  taxYearStart,
} from "../../../../../utils.ts";
import {
  inputSchema as f1099patrInputSchema,
  itemSchema as f1099patrItemSchema,
} from "../../../../../inputs/income/business/f1099patr/schema.ts";
import {
  computeNetProfit,
  itemSchema as scheduleCItemSchema,
} from "../../../../../inputs/income/business/schedule_c/model.ts";
import { reviewedWotcQbiWages } from "../../../../../inputs/income/business/schedule_c/qbi-wotc.ts";
import { scheduleSELines } from "../../../taxes/self-employment/schedule_se/calculation.ts";

// ── TY2025 Constants ─────────────────────────────────────────────────────────

const QBI_RATE = 0.20; // IRC §199A(a) — 20% of net QBI
const W2_LIMIT_A_RATE = 0.50; // IRC §199A(b)(2)(A)(i)
const W2_LIMIT_B_WAGE_RATE = 0.25; // IRC §199A(b)(2)(A)(ii)
const UBIA_RATE = 0.025; // IRC §199A(b)(2)(A)(ii)

// ── Schemas ──────────────────────────────────────────────────────────────────

// Schema for one §199A aggregation group (mirrors qbi_aggregation itemSchema).
// Present when the taxpayer has made an aggregation election under Reg. §1.199A-4.
// Form 8995-A Schedule B must be attached when aggregation_groups is non-empty.
const aggregationGroupSchema = z.object({
  // Taxpayer-assigned name for the aggregation group (required for Schedule B)
  group_name: z.string().min(1),
  // Names of the individual businesses included in this group
  business_names: z.array(z.string().min(1)).min(2),
  // True when this group is aggregated to meet the W-2 wage / UBIA limitation
  combined_for_limitation: z.boolean(),
});

// Evidence for the direct-owner Schedule B route. This augments the
// BAN election with member-level source and reviewed allocation records.
const aggregationMemberSchema = z.object({
  business_reference: z.string().trim().min(1),
  business_name: z.string().trim().min(1).max(75),
  ein: z.string().regex(/^\d{9}$/),
  qbi: z.number().int().positive(),
  w2_wages: z.number().int().nonnegative(),
  ubia: z.number().int().nonnegative(),
  owner_share_pct: z.literal(100),
  ownership_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owned_on_tax_year_end: z.literal(true),
  ownership_source_reference: z.string().trim().min(1),
  qbi_adjustments: z.object({
    deductible_se_tax: z.number().int().nonnegative(),
    self_employed_health_insurance: z.number().int().nonnegative(),
    qualified_retirement_plan: z.number().int().nonnegative(),
    no_other_attributable_adjustments_confirmed: z.literal(true),
    allocation_method_description: z.string().trim().min(1),
    allocation_worksheet_reference: z.string().trim().min(1),
    allocation_worksheet_reviewed_by: z.string().trim().min(1),
    allocation_worksheet_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict(),
  source_schedule_c: scheduleCItemSchema,
}).strict();

const aggregationAnnualDisclosureSchema = z.object({
  disclosure_source_reference: z.string().trim().min(1),
  reviewed_by: z.string().trim().min(1),
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timely_original_return_election_confirmed: z.literal(true),
  no_commissioner_disaggregation_confirmed: z.literal(true),
  complete_current_year_event_inventory_confirmed: z.literal(true),
  businesses: z.array(
    z.object({
      business_reference: z.string().trim().min(1),
      business_description: z.string().trim().min(1),
      entity_name: z.string().trim().min(1).max(75),
      entity_ein: z.string().regex(/^\d{9}$/),
      events: z.array(
        z.object({
          event: z.enum([
            "formed",
            "acquired",
            "disposed",
            "ceased_operations",
          ]),
          date: z.string().regex(ISO_DATE),
          source_reference: z.string().trim().min(1),
        }).strict(),
      ),
    }).strict(),
  ).min(2),
}).strict();

export const aggregationMfsReviewSchema = mfsSstbFilingReviewSchema.extend({
  owner_ssn: z.string().regex(/^\d{9}$/),
}).strict();

export const aggregationFilingDetailsSchema = z.object({
  group_name: z.string().trim().min(1).max(75),
  group_description: z.string().trim().min(1).max(180),
  common_owner_ssn: z.string().regex(/^\d{9}$/),
  tax_year_end: z.string().regex(ISO_DATE),
  tax_year_end_source_reference: z.string().trim().min(1),
  election_history: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("new_election"),
      no_prior_election_confirmed: z.literal(true),
    }).strict(),
    z.object({
      status: z.literal("continued_unchanged"),
      filed_prior_year_schedule_b_reference: z.string().trim().min(1),
      no_material_change_confirmed: z.literal(true),
    }).strict(),
  ]),
  rpe_aggregation_present: z.literal(false),
  no_other_business_adjustments_confirmed: z.literal(true),
  qualified_dividends_zero_confirmed: z.literal(true),
  operational_factors: z.array(
    z.object({
      factor: z.enum([
        "common_products",
        "shared_facilities_or_functions",
        "coordinated_operations",
      ]),
      explanation: z.string().trim().min(1),
      source_reference: z.string().trim().min(1),
    }).strict(),
  ).min(2).max(3),
  annual_disclosure: aggregationAnnualDisclosureSchema,
  members: z.array(aggregationMemberSchema).min(2),
}).strict();

export const businessFilingDetailsSchema = z.object({
  business_name: z.string().min(1).max(75),
  ein: z.string().regex(/^\d{9}$/),
  business_qbi: z.number().nonnegative(),
  business_w2_wages: z.number().nonnegative(),
  business_ubia: z.number().nonnegative(),
  one_non_sstb_business_confirmed: z.literal(true),
  no_aggregation_confirmed: z.literal(true),
  no_ptp_or_loss_carryforward_confirmed: z.literal(true),
  qualified_dividends_zero_confirmed: z.boolean(),
  qbi_wages_ubia_sources_confirmed: z.literal(true),
  taxable_income_before_qbi_confirmed: z.literal(true),
});

export const sstbFilingDetailsSchema = z.object({
  business_name: z.string().min(1).max(75),
  ein: z.string().regex(/^\d{9}$/),
  business_qbi: z.number().positive().int(),
  business_w2_wages: z.number().nonnegative().int(),
  business_ubia: z.number().nonnegative().int(),
  one_non_ptp_sstb_confirmed: z.literal(true),
  no_other_business_or_aggregation_confirmed: z.literal(true),
  no_reit_ptp_or_loss_carryforward_confirmed: z.literal(true),
  qualified_dividends_zero_confirmed: z.boolean(),
  qbi_wages_ubia_source_reference: z.string().trim().min(1),
  taxable_income_before_qbi_confirmed: z.literal(true),
  mfs_owner_ssn: z.string().regex(/^\d{9}$/).optional(),
  mfs_allocation_source_reference: z.string().trim().min(1).optional(),
  mfs_no_spouse_share_confirmed: z.literal(true).optional(),
});

export const patronFilingDetailsSchema = z.object({
  source_1099patr: f1099patrItemSchema,
  qbi_allocable_to_qualified_payments: z.number().nonnegative().int(),
  w2_wages_allocable_to_qualified_payments: z.number().nonnegative().int(),
  one_cooperative_confirmed: z.literal(true),
  allocation_worksheet_reference: z.string().trim().min(1),
  allocation_worksheet_reviewed_by: z.string().trim().min(1),
  allocation_worksheet_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  box6_written_notice_review: z.object({
    notice_reference: z.string().trim().min(1),
    recipient_tin: z.string().regex(/^\d{9}$/),
    designated_199ag_amount: z.number().finite().positive(),
    reviewed_by: z.string().trim().min(1),
    reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    recipient_and_amount_match_confirmed: z.literal(true),
  }).strict().optional(),
});

export const scheduleCQbiBusinessSchema = z.object({
  business_reference: z.string().trim().min(1).optional(),
  business_name: z.string().trim().min(1).max(75).optional(),
  ein: z.string().regex(/^\d{9}$/).optional(),
  // Retain Schedule C cents until the whole-dollar Schedule C filing lines.
  qbi: z.number().finite(),
  wotc_wage_reduction: z.number().positive().optional(),
  w2_wages: z.number().nonnegative(),
  ubia: z.number().int().nonnegative(),
  no_other_adjustments_confirmed: z.boolean(),
  source_schedule_c: scheduleCItemSchema,
}).strict();

// A reviewed 1099-DIV box 5 source for line 28 (i8995-A, Part IV).
export const reitDividendSourceSchema = z.object({
  payer_name: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  box1a: z.number().positive().int(),
  box5: z.number().positive().int(),
  ex_dividend_date: z.string().regex(ISO_DATE),
  qualified_held_days_in_91_day_window: z.number().int().min(46).max(91),
  diminished_risk_days_excluded: z.number().int().nonnegative(),
  no_related_payment_obligation_confirmed: z.literal(true),
  review_reference: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const inputSchema = z.object({
  mixed_fishing_qbi_source: mixedFishingQbiSourceSchema.optional(),
  single_schedule_f_source: singleFarmSourceSchema.optional(),
  qualified_tip_qbi_source: qualifiedTipQbiSourceSchema.optional(),
  farm_wotc_filing_source: farmWotcSourceSchema.optional(),
  patron_business_source: patronBusinessSourceSchema.optional(),
  independent_patron_sources: independentPatronSourceSchema.optional(),
  // Filing status — determines income threshold for wage limitation phase-in
  filing_status: filingStatusSchema,
  // Taxable income before QBI deduction (Form 8995-A line 33)
  taxable_income: z.number().nonnegative(),
  // Net capital gain — reduces income limitation base
  net_capital_gain: z.number().nonnegative().optional(),
  qbi_capital_sources: qbiCapitalSourcesSchema.optional(),
  investment_interest_sources: z.array(z.unknown()).optional(),
  investment_dividend_sources: z.array(z.unknown()).optional(),
  investment_dividend_totals: z.object({
    ordinary: z.number().nonnegative(),
    qualified: z.number().nonnegative(),
    capital_gain_distributions: z.number().nonnegative(),
  }).strict().optional(),

  // Non-SSTB qualified business income
  qbi: z.number().optional(),
  // W-2 wages paid by non-SSTB qualified businesses
  w2_wages: z.number().nonnegative().optional(),
  // Unadjusted basis immediately after acquisition (UBIA) of non-SSTB qualified property
  unadjusted_basis: z.number().nonnegative().optional(),

  // SSTB (specified service trade/business) qualified business income
  sstb_qbi: z.number().optional(),
  // W-2 wages paid by SSTB businesses
  sstb_w2_wages: z.number().nonnegative().optional(),
  // UBIA of SSTB qualified property
  sstb_unadjusted_basis: z.number().nonnegative().optional(),

  // Section 199A dividends from REITs (Form 1099-DIV box 5)
  line6_sec199a_dividends: z.number().nonnegative().optional(),
  reit_dividend_sources: z.array(reitDividendSourceSchema).min(1).optional(),

  // Prior-year QBI net loss carryforward (zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  // Prior-year REIT/PTP net loss carryforward (zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),

  // §199A aggregation election groups forwarded from qbi_aggregation (BAN screen).
  // Non-empty signals that Schedule B must be attached and grouped limitation
  // treatment applied. Omit when no aggregation election has been made.
  aggregation_groups: z.array(aggregationGroupSchema).optional(),
  aggregation_filing_details: aggregationFilingDetailsSchema.optional(),
  aggregation_mfs_review: aggregationMfsReviewSchema.optional(),
  rpe_aggregation_source: rpeAggregationSourceSchema.optional(),

  // An affirmative status requires Schedule D's payment and wage allocation.
  // Absence is not a negative attestation for the bounded filing route.
  patron_of_specified_cooperative: z.boolean().optional(),
  patron_filing_details: patronFilingDetailsSchema.optional(),

  // Business identity and source attestations for the bounded native filing route.
  business_filing_details: businessFilingDetailsSchema.optional(),
  // Internally retained Schedule C net profit and attributable half-SE deduction.
  single_sstb_schedule_c_source: z.object({
    business: scheduleCQbiBusinessSchema,
    owner_ssn: z.string().regex(/^\d{9}$/),
    se_tax_deduction: z.number().int().nonnegative(),
  }).strict().optional(),
  producing_mining_zero_qbi_source: z.object({
    business: scheduleCQbiBusinessSchema,
    owner_ssn: z.string().regex(/^\d{9}$/),
    se_tax_deduction: z.number().int().nonnegative(),
  }).strict().optional(),
  single_schedule_c_source: z.object({
    business: scheduleCQbiBusinessSchema,
    se_tax_deduction: z.number().nonnegative(),
    qualified_tip_qbi_source: qualifiedTipQbiSourceSchema.optional(),
    joint_se_source: ownerSourcesSchema.optional(),
    joint_wages_total: z.number().nonnegative().optional(),
  }).strict().optional(),
  wotc_business_sources: z.array(
    z.object({
      business: scheduleCQbiBusinessSchema,
      se_tax_deduction: z.number().nonnegative(),
      joint_se_source: ownerSourcesSchema,
      joint_wages_total: z.number().nonnegative(),
    }).strict(),
  ).length(2).optional(),
  sstb_filing_details: sstbFilingDetailsSchema.optional(),
  schedule_c_qbi_businesses: z.array(scheduleCQbiBusinessSchema).optional(),
  loss_se_tax_source: lossSeSourceSchema.optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
});

export type Form8995AInput = z.infer<typeof inputSchema>;

export function assertSingleScheduleCWotcAmounts(
  input: Form8995AInput,
  taxYear: number,
): void {
  const retained = input.single_schedule_c_source;
  if (!retained) return;
  const cfg = qbiYearConfig(taxYear);
  const business = retained.business;
  const item = business.source_schedule_c;
  const details = input.business_filing_details;
  const reduction = business.wotc_wage_reduction ?? 0;
  const wages = reviewedWotcQbiWages(item, reduction);
  const tips = reviewedQualifiedTipExclusions(
    retained.qualified_tip_qbi_source,
  );
  const tipRow = tips.rows.find((r) =>
    r.business_reference === business.business_reference
  );
  if (
    tips.source &&
    (tips.rows.length !== 1 || !tipRow ||
      tipRow.recipient !== item.proprietor_recipient ||
      tipRow.net_profit !== Math.round(business.qbi) ||
      tipRow.se_tax_deduction !== retained.se_tax_deduction)
  ) {
    throw new Error(
      "Advanced QBI tips need actual establishing business and owner halfSE",
    );
  }
  const qbi = Math.round(business.qbi - retained.se_tax_deduction - tips.total);
  const se = retained.joint_se_source
    ? ownedScheduleSE(retained.joint_se_source, cfg.ssWageBase)
      .instances.find((row) =>
        row.recipient === (item.proprietor_recipient ?? "T")
      )
    : scheduleSELines(
      { net_profit_schedule_c: business.qbi },
      cfg.ssWageBase,
    );
  if (
    (input.filing_status !== FilingStatus.Single &&
      input.filing_status !== FilingStatus.MFJ) ||
    input.taxable_income <= qbiThreshold(input.filing_status, cfg) ||
    (input.filing_status === FilingStatus.MFJ &&
      (!retained.joint_se_source || retained.joint_wages_total === undefined ||
        item.qbi_wotc_filing_review?.owner_ssn !==
          (item.proprietor_recipient === "S"
            ? retained.joint_se_source.identity.spouse_ssn
            : retained.joint_se_source.identity.primary_ssn) ||
        retained.joint_se_source.businesses.filter((row) =>
            row.recipient === (item.proprietor_recipient ?? "T")
          ).length !== 1 ||
        retained.joint_se_source.businesses.find((row) =>
            row.source_reference === business.business_reference
          )?.net_profit !== business.qbi ||
        retained.joint_se_source.businesses.find((row) =>
            row.source_reference === business.business_reference
          )?.source_reference !==
          business.business_reference ||
        retained.joint_se_source.businesses.find((row) =>
            row.source_reference === business.business_reference
          )?.recipient !==
          (item.proprietor_recipient ?? "T"))) ||
    (input.filing_status === FilingStatus.Single &&
      retained.joint_se_source !== undefined) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    !Number.isInteger(input.taxable_income) || !se ||
    se.line13 !== retained.se_tax_deduction ||
    business.qbi !==
      (filedOwnedScheduleC(item, false, reduction)?.profit ??
        computeNetProfit(item, reduction)) ||
    qbi <= 0 ||
    !business.business_reference ||
    business.business_reference !== item.business_reference ||
    business.business_name !== item.line_c_business_name ||
    business.ein !== item.line_d_ein?.replace(/\D/g, "") ||
    business.no_other_adjustments_confirmed !== true ||
    business.w2_wages !== wages || business.ubia !== 0 ||
    !details || details.business_name !== business.business_name ||
    details.ein !== business.ein || details.business_qbi !== qbi ||
    details.business_w2_wages !== wages || details.business_ubia !== 0 ||
    input.qbi !== qbi || input.w2_wages !== wages ||
    input.unadjusted_basis !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 || (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0 || input.sstb_filing_details ||
    input.aggregation_filing_details ||
    (input.aggregation_groups?.length ?? 0) !== 0 ||
    input.schedule_c_qbi_businesses ||
    input.patron_of_specified_cooperative === true ||
    input.patron_filing_details || (input.net_capital_gain ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 || input.reit_dividend_sources ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A WOTC business QBI and wage amounts differ from the retained Schedule C source",
    );
  }
}

export function validateTwoBusinessAggregationSource(
  input: Form8995AInput,
  taxYear: number,
) {
  const source = input.aggregation_filing_details;
  const groups = input.aggregation_groups;
  const group = groups?.[0];
  const cfg = qbiYearConfig(taxYear);
  const joint = input.filing_status === FilingStatus.MFJ;
  const owner = source?.members[0]?.source_schedule_c.proprietor_recipient;
  const threshold = qbiThreshold(input.filing_status, cfg);
  const yearStart = taxYearStart(taxYear);
  const yearEnd = taxYearEnd(taxYear);
  if (
    !source || !group || groups?.length !== 1 ||
    source.tax_year_end !== yearEnd ||
    group.group_name !== source.group_name ||
    group.combined_for_limitation !== true ||
    (owner !== TS.T && !(joint && owner === TS.S)) ||
    !Number.isInteger(input.taxable_income) ||
    input.taxable_income <= threshold ||
    !Number.isSafeInteger(input.net_capital_gain) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.business_filing_details || input.sstb_filing_details ||
    input.schedule_c_qbi_businesses || input.patron_filing_details ||
    input.patron_of_specified_cooperative === true ||
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule B source needs one qualifying directly owned aggregation without other QBI paths",
    );
  }
  const factorNames = source.operational_factors.map((item) => item.factor);
  if (
    new Set(factorNames).size !== factorNames.length ||
    new Set(source.operational_factors.map((item) => item.source_reference))
        .size !== factorNames.length
  ) {
    throw new Error(
      "Form 8995-A Schedule B needs two distinct sourced operational factors",
    );
  }
  const memberRefs = source.members.map((member) => member.business_reference);
  if (
    new Set(memberRefs).size !== source.members.length ||
    group.business_names.length !== source.members.length ||
    source.members.some((member, index) =>
      member.business_name !== group.business_names[index]
    )
  ) {
    throw new Error(
      "Form 8995-A Schedule B member identities must match the aggregation election",
    );
  }
  for (const member of source.members) {
    const date = new Date(`${member.ownership_start_date}T00:00:00.000Z`);
    const reviewDate = new Date(
      `${member.qbi_adjustments.allocation_worksheet_review_date}T00:00:00.000Z`,
    );
    if (
      !Number.isFinite(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== member.ownership_start_date ||
      member.ownership_start_date > majorityOwnershipLatestStart(taxYear)
    ) {
      throw new Error(
        "Form 8995-A Schedule B needs majority-year ownership including December 31",
      );
    }
    if (
      !Number.isFinite(reviewDate.valueOf()) ||
      reviewDate.toISOString().slice(0, 10) !==
        member.qbi_adjustments.allocation_worksheet_review_date ||
      member.qbi_adjustments.allocation_worksheet_review_date < yearEnd
    ) {
      throw new Error(
        "Form 8995-A Schedule B needs a valid allocation worksheet reviewed at or after the tax year end",
      );
    }
    const scheduleC = member.source_schedule_c;
    if (
      scheduleC.business_reference !== member.business_reference ||
      scheduleC.line_c_business_name !== member.business_name ||
      scheduleC.line_d_ein !== member.ein ||
      scheduleC.proprietor_recipient !== owner ||
      scheduleC.line_g_material_participation !== true ||
      scheduleC.line_32_at_risk !== "a" ||
      scheduleC.at_risk_simplified !== undefined ||
      scheduleC.qbi_specified_service === true ||
      computeNetProfit(scheduleC) -
            member.qbi_adjustments.deductible_se_tax -
            member.qbi_adjustments.self_employed_health_insurance -
            member.qbi_adjustments.qualified_retirement_plan !== member.qbi ||
      (scheduleC.qbi_w2_wages ?? 0) !== member.w2_wages ||
      (scheduleC.qbi_unadjusted_basis ?? 0) !== member.ubia ||
      (scheduleC.line_26_wages ?? 0) < member.w2_wages
    ) {
      throw new Error(
        "Form 8995-A Schedule B member QBI, wages, UBIA, and identity must match its Schedule C source",
      );
    }
  }
  const disclosure = source.annual_disclosure;
  const reviewDate = new Date(`${disclosure.review_date}T00:00:00.000Z`);
  if (
    !Number.isFinite(reviewDate.valueOf()) ||
    reviewDate.toISOString().slice(0, 10) !== disclosure.review_date ||
    disclosure.review_date < yearEnd ||
    disclosure.businesses.length !== source.members.length ||
    new Set(disclosure.businesses.map((b) => b.business_reference)).size !==
      source.members.length
  ) {
    throw new Error(
      "Form 8995-A aggregation needs a complete reviewed annual business disclosure",
    );
  }
  for (const member of source.members) {
    const business = disclosure.businesses.find((b) =>
      b.business_reference === member.business_reference
    );
    if (
      !business || business.entity_name !== member.business_name ||
      business.entity_ein !== member.ein ||
      business.business_description !==
        member.source_schedule_c.line_a_principal_business
    ) {
      throw new Error(
        "Form 8995-A annual disclosure identity and description must match each actual Schedule C business",
      );
    }
    const eventNames = business.events.map((e) => e.event);
    if (
      new Set(eventNames).size !== eventNames.length ||
      new Set(business.events.map((e) => e.source_reference)).size !==
        eventNames.length
    ) {
      throw new Error(
        "Form 8995-A annual business events need distinct actual records",
      );
    }
    for (const event of business.events) {
      const date = new Date(`${event.date}T00:00:00.000Z`);
      if (
        !Number.isFinite(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== event.date ||
        event.date > yearEnd || event.date < yearStart ||
        event.event === "disposed" || event.event === "ceased_operations" ||
        event.date !== member.ownership_start_date
      ) {
        throw new Error(
          "Form 8995-A owned aggregation event must match actual formation/acquisition ownership; disposed or ceased businesses need their complete changed-election route",
        );
      }
    }
    if (
      member.ownership_start_date >= yearStart &&
      !business.events.some((e) =>
        e.event === "formed" || e.event === "acquired"
      )
    ) {
      throw new Error(
        "Form 8995-A current-year ownership requires its actual formed/acquired annual disclosure",
      );
    }
    const currentYearStart = business.events.some((e) =>
      e.event === "formed" || e.event === "acquired"
    );
    if (
      currentYearStart && member.source_schedule_c.line_h_new_business !== true
    ) {
      throw new Error(
        "Form 8995-A annual formation/acquisition events must match actual Schedule C line H started or acquired flag",
      );
    }
    if (
      source.election_history.status === "continued_unchanged" &&
      business.events.length > 0
    ) {
      throw new Error(
        "Form 8995-A unchanged election cannot contain a changed business event",
      );
    }
  }
  const total = (field: "qbi" | "w2_wages" | "ubia") =>
    source.members.reduce((sum, member) => sum + member[field], 0);
  if (
    input.qbi !== total("qbi") || input.w2_wages !== total("w2_wages") ||
    input.unadjusted_basis !== total("ubia")
  ) {
    throw new Error(
      "Form 8995-A Schedule B member totals must equal parent QBI, wages, and UBIA",
    );
  }
  return {
    source,
    qbi: total("qbi"),
    w2Wages: total("w2_wages"),
    ubia: total("ubia"),
  };
}

export function calculateTwoBusinessAggregationLines(
  input: Form8995AInput,
  taxYear: number,
) {
  const cfg = qbiYearConfig(taxYear);
  const mfs = input.filing_status === FilingStatus.MFS;
  const owner = input.aggregation_filing_details?.common_owner_ssn ??
    input.rpe_aggregation_source?.recipient_tin;
  const review = input.aggregation_mfs_review;
  if (
    mfs
      ? !review || review.owner_ssn !== owner || review.spouse_ssn === owner
      : review !== undefined
  ) {
    throw Error(
      "Aggregation needs a consistent separate-owner property and spouse deduction review for MFS only",
    );
  }
  if (input.rpe_aggregation_source) {
    const totals = reviewedRpeAggregation(input.rpe_aggregation_source, taxYear),
      issued = totals.source;
    const group = input.aggregation_groups?.[0];
    if (
      input.taxable_income <= qbiThreshold(input.filing_status, cfg) ||
      !Number.isInteger(input.taxable_income) ||
      !Number.isSafeInteger(input.net_capital_gain) ||
      input.aggregation_groups?.length !== 1 || !group ||
      group.group_name !== issued.group_name ||
      group.combined_for_limitation !== true ||
      JSON.stringify(group.business_names) !==
        JSON.stringify(issued.members.map((m) => m.business_name)) ||
      input.qbi !== totals.qbi || input.w2_wages !== totals.wages ||
      input.unadjusted_basis !== totals.ubia ||
      input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
      input.aggregation_filing_details || input.business_filing_details ||
      input.sstb_filing_details ||
      input.schedule_c_qbi_businesses || input.patron_filing_details ||
      input.patron_of_specified_cooperative ||
      input.independent_patron_sources || input.wotc_business_sources ||
      input.farm_wotc_filing_source ||
      input.single_schedule_c_source || input.single_schedule_f_source ||
      input.mixed_fishing_qbi_source ||
      (input.sstb_qbi ?? 0) !== 0 || (input.sstb_w2_wages ?? 0) !== 0 ||
      (input.sstb_unadjusted_basis ?? 0) !== 0 ||
      (input.line6_sec199a_dividends ?? 0) !== 0 ||
      (input.qbi_loss_carryforward ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0
    ) {
      throw Error(
        "RPE Schedule B must preserve the complete issued aggregation and grouped source amounts without other QBI paths",
      );
    }
    const source = {
      group_name: issued.group_name,
      group_description: issued.group_description,
      common_owner_ssn: issued.recipient_tin,
      tax_year_end: issued.tax_year_end,
      tax_year_end_source_reference: issued.tax_year_end_source_reference,
      election_history: issued.election_history,
      rpe_aggregation_present: true as const,
      operational_factors: issued.operational_factors,
      annual_disclosure: {
        disclosure_source_reference: issued.review_source_reference,
        reviewed_by: issued.reviewed_by,
        review_date: issued.review_date,
        businesses: issued.members.map((m) => ({
          business_reference: m.business_reference,
          business_description: m.business_description,
          entity_name: m.entity_name,
          entity_ein: m.entity_ein,
          events: m.events,
        })),
      },
      members: issued.members.map((m) => ({
        business_reference: m.business_reference,
        business_name: m.business_name,
        ein: m.entity_ein,
        qbi: m.qbi,
        w2_wages: m.w2_wages,
        ubia: m.ubia,
        owner_share_pct: 100 as const,
        ownership_start_date: m.rpe_ownership_start_date,
        ownership_source_reference: m.ownership_source_reference,
        source_schedule_c: undefined,
        qbi_adjustments: {
          deductible_se_tax: 0,
          self_employed_health_insurance: 0,
          qualified_retirement_plan: 0,
          allocation_method_description:
            "Recipient amounts from the intact issued RPE aggregation; no owner-level adjustments",
          allocation_worksheet_reference: m.member_statement_reference,
        },
      })),
    };
    const parent = calculateOneBusiness8995ALines(input, taxYear);
    if (
      !Object.entries(parent).filter(([key, value]) =>
        /^line\d+$/.test(key) && value !== undefined
      ).every(([, value]) => Number.isInteger(value)) || parent.line39 <= 0
    ) {
      throw Error(
        "RPE aggregation needs its finalized positive whole-dollar grouped deduction",
      );
    }
    return {
      source,
      schedule: {
        rows: source.members.map((m) => ({
          name: m.business_name,
          ein: m.ein,
          qbi: m.qbi,
          w2Wages: m.w2_wages,
          ubia: m.ubia,
        })),
        totalQbi: totals.qbi,
        totalW2Wages: totals.wages,
        totalUbia: totals.ubia,
      },
      parent,
    };
  }
  // Schedule C net profit alone is not generally QBI. Each member's explicit
  // attributable deductions are checked against its retained Schedule C and
  // the Schedule 1 totals in the native/PDF join.
  const totals = validateTwoBusinessAggregationSource(input, taxYear);
  const parent = calculateOneBusiness8995ALines(input, taxYear);
  if (
    !Object.entries(parent).filter(([key, value]) =>
      /^line\d+$/.test(key) && value !== undefined
    ).every(([, value]) => Number.isInteger(value)) || parent.line39 <= 0
  ) {
    throw new Error(
      "Form 8995-A Schedule B needs a positive whole-dollar grouped deduction",
    );
  }
  return {
    source: totals.source,
    schedule: {
      rows: totals.source.members.map((member) => ({
        name: member.business_name,
        ein: member.ein,
        qbi: member.qbi,
        w2Wages: member.w2_wages,
        ubia: member.ubia,
      })),
      totalQbi: totals.qbi,
      totalW2Wages: totals.w2Wages,
      totalUbia: totals.ubia,
    },
    parent,
  };
}

type ScheduleCLossBusiness = NonNullable<
  Form8995AInput["schedule_c_qbi_businesses"]
>[number];
type ScheduleCLossBusinessAmounts = Record<
  `line${2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 13 | 15}`,
  number
>;
type ScheduleCLossLines = {
  businesses: ScheduleCLossBusiness[];
  businessLines: {
    business: ScheduleCLossBusiness;
    loss: number;
    parent: ScheduleCLossBusinessAmounts;
  }[];
  positive?: ScheduleCLossBusiness;
  negative?: ScheduleCLossBusiness;
  schedule: {
    rows: { name: string; line1a: number; line1b: number; line1c: number }[];
    line2: number;
    line3: number;
    line4: number;
    line5: number;
    line6: number;
  };
  parent:
    & ScheduleCLossBusinessAmounts
    & Record<
      `line${16 | 32 | 33 | 34 | 35 | 36 | 37 | 39}`,
      number
    >;
};

/** Part III applies independently to each loss-adjusted business. */
export function calculateLossBusinessPhase(
  taxableIncome: number,
  potential: number,
  limit: number,
  filingStatus: FilingStatus,
  taxYear: number,
): {
  threshold: number;
  range: number;
  excess: number;
  ratio: number;
  line12: number;
  line17: number;
  line18: number;
  line19: number;
  line25: number;
  line26: number;
} | undefined {
  const cfg = qbiYearConfig(taxYear);
  const threshold = qbiThreshold(filingStatus, cfg);
  const range = qbiPhaseInRange(filingStatus, cfg);
  const filedIncome = Math.round(taxableIncome);
  if (filedIncome > threshold + range || limit >= potential) return undefined;
  const excess = Math.max(0, filedIncome - threshold);
  const ratio = excess / range;
  const line19 = potential - limit;
  const line25 = Math.round(line19 * ratio);
  const line26 = potential - line25;
  return {
    threshold,
    range,
    excess,
    ratio,
    line12: line26,
    line17: potential,
    line18: limit,
    line19,
    line25,
    line26,
  };
}

export function calculateScheduleCLossLines(
  input: Form8995AInput,
  taxYear: number,
): ScheduleCLossLines {
  const cfg = qbiYearConfig(taxYear);
  if (input.farm_wotc_filing_source) {
    const farm = calculateFarmWotcLines(input, taxYear);
    if (!farm.lossSchedule) {
      throw new Error("Farm Schedule C needs actual sourced QBI loss");
    }
    return {
      schedule: farm.lossSchedule,
      parent: farm.parent,
      businesses: [],
      businessLines: [],
    };
  }
  const businesses = input.schedule_c_qbi_businesses;
  if (
    !businesses ||
    businesses.length < 1 ||
    !businesses.some((business) => business.qbi < 0) ||
    businesses.some((business) => business.qbi === 0)
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs identified businesses with a loss",
    );
  }
  if (
    ![
      FilingStatus.Single,
      FilingStatus.MFJ,
      FilingStatus.MFS,
      FilingStatus.HOH,
      FilingStatus.QSS,
    ]
      .includes(input.filing_status) ||
    input.taxable_income <= qbiThreshold(input.filing_status, cfg) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    ((input.net_capital_gain ?? 0) !== 0 &&
      input.qbi_capital_sources === undefined) ||
    (input.aggregation_groups ?? []).length !== 0 ||
    input.patron_of_specified_cooperative === true ||
    input.business_filing_details || input.sstb_filing_details ||
    input.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route excludes prior loss, other businesses, SSTB, aggregation, patron, gain, and REIT/PTP paths",
    );
  }
  const refs = businesses.map((business) => business.business_reference);
  if (refs.some((ref) => !ref) || new Set(refs).size !== businesses.length) {
    throw new Error(
      "Form 8995-A Schedule C needs distinct business references",
    );
  }
  for (const business of businesses) {
    const source = business.source_schedule_c;
    if (
      !business.business_name || !business.ein ||
      business.business_reference !== source.business_reference ||
      business.business_name !== source.line_c_business_name ||
      business.ein !== source.line_d_ein ||
      source.line_g_material_participation !== true ||
      source.qbi_specified_service === true ||
      source.qbi_no_other_adjustments_confirmed !== true ||
      !business.no_other_adjustments_confirmed ||
      source.line_32_at_risk === "b" || source.at_risk_simplified ||
      (business.qbi < 0 && source.line_32_at_risk !== "a") ||
      source.qbi_w2_wages !== business.w2_wages ||
      (source.qbi_unadjusted_basis ?? 0) !== business.ubia
    ) {
      throw new Error(
        "Form 8995-A Schedule C business identity, QBI adjustment, and limitation source must match the Schedule C item",
      );
    }
  }
  if (input.filing_status !== FilingStatus.Single) {
    const joint = input.filing_status === FilingStatus.MFJ;
    const ownerTotals = { T: 0, S: 0 };
    for (const business of businesses) {
      const owner = business.source_schedule_c.proprietor_recipient;
      if (owner !== "T" && !(joint && owner === "S")) {
        throw new Error(
          "Form 8995-A loss business needs its explicit permitted proprietor",
        );
      }
      ownerTotals[owner] += business.qbi;
    }
    if (
      !input.loss_se_tax_source &&
      Object.values(ownerTotals).some((amount) => amount >= 400)
    ) {
      throw new Error(
        "Form 8995-A loss owners must each remain below the reviewed SE threshold",
      );
    }
  }
  if (input.filing_status === FilingStatus.MFS) {
    const first = businesses[0].source_schedule_c.qbi_mfs_loss_review;
    const shared = [
      "owner_ssn",
      "spouse_ssn",
      "domicile_state",
      "spouse_domicile_state",
      "mailing_address_state",
    ] as const;
    if (
      !first || businesses.some(({ source_schedule_c: source }) => {
        const review = source.qbi_mfs_loss_review;
        return !review || review.owner_ssn === review.spouse_ssn ||
          shared.some((key) => review[key] !== first[key]);
      })
    ) {
      throw new Error(
        "MFS loss businesses need consistent separate-income, domicile and spouse deduction reviews",
      );
    }
  }
  const wotcReductions = reviewedLossWotcReductions(businesses);
  // This is a return-wide source answer, independent of the employer credit.
  // Investment replay at export binds its amount to issued dividend copies.
  const qualifiedDividends = input.investment_dividend_totals?.qualified ?? 0;
  if (
    businesses.some((business) =>
      wotcReductions.has(business.business_reference!) &&
      business.source_schedule_c.qbi_wotc_filing_review!
          .qualified_dividends_zero_confirmed !== (qualifiedDividends === 0)
    )
  ) {
    throw Error(
      "QBI loss WOTC zero qualified-dividend review disagrees with retained investment sources",
    );
  }
  const seAllocations = input.loss_se_tax_source
    ? reviewedLossSeAllocations(
      businesses.map((b) => b.source_schedule_c),
      input.filing_status,
      input.loss_se_tax_source,
      taxYear,
      wotcReductions,
    )
    : businesses.map(() => 0);
  const businessQbi = new Map(
    businesses.map((
      business,
      i,
    ) => [business, business.qbi - seAllocations[i]]),
  );
  const qbi = (business: ScheduleCLossBusiness): number =>
    businessQbi.get(business)!;
  const positives = businesses.filter((business) => qbi(business) > 0);
  const positive = positives[0];
  const negatives = businesses.filter((business) => qbi(business) < 0);
  const negative = negatives[0];
  // The source graph and Schedule 1 keep cents. Schedule C of Form 8995-A
  // files whole-dollar amounts for each identified trade or business.
  const roundedDollar = (amount: number): number =>
    Math.sign(amount) * Math.round(Math.abs(amount));
  const sourceQbi = businesses.reduce((sum, business) => sum + business.qbi, 0);
  if (
    Math.abs(
        (input.qbi ?? 0) - sourceQbi +
          (input.loss_se_tax_source?.deduction ?? 0),
      ) > 0.000001 ||
    negatives.some((business) => roundedDollar(qbi(business)) >= 0) ||
    positives.some((business) => roundedDollar(qbi(business)) <= 0)
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs sourced net QBI and nonzero whole-dollar business rows",
    );
  }
  const line3 = -negatives.reduce(
    (sum, business) => sum + roundedDollar(qbi(business)),
    0,
  );
  const line4 = positives.reduce(
    (sum, business) => sum + roundedDollar(qbi(business)),
    0,
  );
  const line5 = Math.min(line3, line4);
  const line6 = Math.max(0, line3 - line5);
  const adjustedQbi = line4 - line5;
  if (
    (!input.loss_se_tax_source && adjustedQbi >= 400) ||
    (input.w2_wages ?? 0) !==
      businesses.reduce((sum, b) => sum + b.w2_wages, 0) ||
    (input.unadjusted_basis ?? 0) !==
      businesses.reduce((sum, b) => sum + b.ubia, 0) ||
    negatives.some((business) =>
      business.ubia !== 0 ||
      (business.w2_wages !== 0 &&
        !wotcReductions.has(business.business_reference!))
    )
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs sourced net QBI below the Schedule SE threshold and no negative-business limitation amount",
    );
  }
  if (![line3, line4, line5].every(Number.isSafeInteger)) {
    throw new Error(
      "Form 8995-A Schedule C needs safe whole-dollar loss totals",
    );
  }
  // Allocate filed loss proportionally, retaining every dollar. Largest
  // remainders get the residual; a stable source reference breaks exact ties.
  const allocations = positives.map((business) => {
    const numerator = BigInt(line5) * BigInt(roundedDollar(qbi(business)));
    const denominator = BigInt(line4);
    return {
      business,
      amount: Number(numerator / denominator),
      remainder: numerator % denominator,
    };
  });
  const ranked = [...allocations].sort((a, b) =>
    a.remainder === b.remainder
      ? a.business.business_reference! < b.business.business_reference! ? -1 : 1
      : a.remainder > b.remainder
      ? -1
      : 1
  );
  const residual = line5 -
    allocations.reduce((sum, row) => sum + row.amount, 0);
  for (let i = 0; i < residual; i++) ranked[i].amount++;
  const businessLines = businesses.map((business) => {
    const loss = allocations.find((row) => row.business === business)?.amount ??
      0;
    const line2 = Math.max(0, roundedDollar(qbi(business)) - loss);
    const line3 = Math.round(line2 * QBI_RATE);
    const line4 = line2 > 0 ? Math.round(business.w2_wages) : 0;
    const line5 = Math.round(line4 * W2_LIMIT_A_RATE);
    const line6 = Math.round(line4 * W2_LIMIT_B_WAGE_RATE);
    const line7 = line2 > 0 ? business.ubia : 0;
    const line8 = Math.round(line7 * UBIA_RATE);
    const line9 = line6 + line8;
    const line10 = Math.max(line5, line9);
    const line11 = Math.min(line3, line10);
    const phase = calculateLossBusinessPhase(
      input.taxable_income,
      line3,
      line10,
      input.filing_status,
      taxYear,
    );
    const line13 = phase ? Math.max(line11, phase.line26) : line11;
    const parent = {
      line2,
      line3,
      line4,
      line5,
      line6,
      line7,
      line8,
      line9,
      line10,
      line11,
      line13,
      line15: line13,
    };
    if (!Object.values(parent).every(Number.isSafeInteger)) {
      throw new Error(
        "Form 8995-A Schedule C needs safe whole-dollar business lines",
      );
    }
    return { business, loss, parent };
  });
  const first = businessLines.find((row) => row.business === positive) ??
    businessLines[0];
  const component = businessLines.reduce(
    (sum, row) => sum + row.parent.line15,
    0,
  );
  const line34 = qbiCapitalTotal(input, true);
  const line35 = Math.max(0, Math.round(input.taxable_income) - line34);
  const line36 = Math.round(line35 * QBI_RATE);
  const line39 = Math.min(component, line36);
  if (![component, line36, line39].every(Number.isSafeInteger)) {
    throw new Error(
      "Form 8995-A Schedule C needs safe whole-dollar filed monetary lines",
    );
  }
  return {
    businesses,
    businessLines,
    positive,
    negative,
    schedule: {
      line2: 0,
      line3,
      line4,
      line5,
      line6,
      rows: businessLines.map(({ business, loss, parent }) => ({
        name: business.business_name!,
        line1a: roundedDollar(qbi(business)),
        line1b: loss,
        line1c: parent.line2,
      })),
    },
    parent: {
      ...first.parent,
      line16: component,
      line32: component,
      line33: Math.round(input.taxable_income),
      line34,
      line35,
      line36,
      line37: line39,
      line39,
    },
  };
}

export function calculateOneSstb8995ALines(
  input: Form8995AInput,
  taxYear: number,
) {
  const source = input.sstb_filing_details;
  const joint = input.filing_status === FilingStatus.MFJ;
  const separate = input.filing_status === FilingStatus.MFS;
  const cfg = qbiYearConfig(taxYear);
  const threshold = qbiThreshold(input.filing_status, cfg);
  const phaseInRange = qbiPhaseInRange(input.filing_status, cfg);
  if (
    !source ||
    (input.filing_status !== FilingStatus.Single &&
      input.filing_status !== FilingStatus.HOH &&
      input.filing_status !== FilingStatus.QSS && !joint && !separate) ||
    !Number.isInteger(input.taxable_income) ||
    input.taxable_income <= threshold ||
    (input.taxable_income > threshold + phaseInRange ||
      (input.taxable_income === threshold + phaseInRange &&
        !input.single_sstb_schedule_c_source))
  ) {
    throw new Error(
      "Form 8995-A Schedule A needs one identified single, head-of-household, surviving-spouse, separate, or joint-filer SSTB within the phase-in range",
    );
  }
  if (
    separate &&
    (!source.mfs_owner_ssn || !source.mfs_allocation_source_reference ||
      source.mfs_no_spouse_share_confirmed !== true)
  ) {
    throw new Error(
      "Form 8995-A Schedule A MFS needs taxpayer-owned SSTB and separate-return allocation source",
    );
  }
  if (
    input.business_filing_details || (input.qbi ?? 0) !== 0 ||
    input.sstb_qbi !== source.business_qbi ||
    input.sstb_w2_wages !== source.business_w2_wages ||
    input.sstb_unadjusted_basis !== source.business_ubia ||
    (!input.single_sstb_schedule_c_source &&
      (qbiCapitalTotal(input) !== 0 ||
        source.qualified_dividends_zero_confirmed !== true)) ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    (input.aggregation_groups ?? []).length !== 0 ||
    input.patron_of_specified_cooperative === true ||
    input.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A Schedule A source must be the only business, with no aggregation, patron, unsourced gain, REIT/PTP, or loss path",
    );
  }
  const phaseIn = (input.taxable_income - threshold) / phaseInRange;
  const applicable = 1 - phaseIn;
  const filed = (value: number) =>
    input.single_sstb_schedule_c_source ? Math.round(value) : value;
  const line2 = filed(source.business_qbi * applicable);
  const applicableWages = filed(source.business_w2_wages * applicable);
  const applicableUbia = filed(source.business_ubia * applicable);
  // Parent lines 4/7 are zero when rounded QBI is zero; Schedule A keeps
  // its own applicable amounts before this parent-level restriction.
  const line4 = line2 === 0 ? 0 : applicableWages;
  const line7 = line2 === 0 ? 0 : applicableUbia;
  const line3 = filed(line2 * QBI_RATE);
  const line5 = filed(line4 * W2_LIMIT_A_RATE);
  const line6 = filed(line4 * W2_LIMIT_B_WAGE_RATE);
  const line8 = filed(line7 * UBIA_RATE);
  const line9 = line6 + line8;
  const line10 = Math.max(line5, line9);
  const line11 = Math.min(line3, line10);
  const line19 = Math.max(0, line3 - line10);
  const line25 = filed(line19 * phaseIn);
  const line26 = line3 - line25;
  const line13 = Math.max(line11, line26);
  const line33 = input.taxable_income;
  const line34 = qbiCapitalTotal(input, true);
  const line35 = Math.max(0, line33 - line34);
  const line36 = filed(line35 * QBI_RATE);
  const line39 = Math.min(line13, line36);
  const amounts = [
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line19,
    line25,
    line26,
    line13,
    line34,
    line35,
    line36,
    line39,
  ];
  if (
    !amounts.every(Number.isInteger) || line39 < 0 ||
    (line39 === 0 && !input.single_sstb_schedule_c_source)
  ) {
    throw new Error(
      "Form 8995-A Schedule A needs whole-dollar reconciled parent amounts and a retained Schedule C source for a zero deduction",
    );
  }
  return {
    source,
    threshold,
    phaseInRange,
    phaseIn,
    applicable,
    applicableWages,
    applicableUbia,
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12: line26,
    line13,
    line15: line13,
    line16: line13,
    line19,
    line25,
    line26,
    line32: line13,
    line33,
    line34,
    line35,
    line36,
    line37: line39,
    line39,
  };
}

export function assertMfsSstbOwner(
  input: Form8995AInput,
  primarySSN: string,
): void {
  if (
    input.filing_status === FilingStatus.MFS &&
    input.sstb_filing_details?.mfs_owner_ssn !== primarySSN
  ) {
    throw new Error(
      "Form 8995-A Schedule A MFS SSTB owner differs from the final filer",
    );
  }
}

export function assertPatron1099PATRSource(
  input: Form8995AInput,
  pendingSource: unknown,
): void {
  if (input.patron_of_specified_cooperative !== true) return;
  if (input.independent_patron_sources) {
    const source = replayIndependentPatronSources(
      input.independent_patron_sources,
    );
    const retained = f1099patrInputSchema.parse(pendingSource).f1099patrs;
    if (
      retained.length !== source.source.businesses.length ||
      source.source.businesses.some((s) =>
        retained.filter((r) =>
          JSON.stringify(r) === JSON.stringify(s.review.source_1099patr)
        ).length !== 1
      )
    ) {
      throw new Error(
        "Independent patron issued cooperative copies differ from retained sources",
      );
    }
    return;
  }
  const parsed = f1099patrInputSchema.safeParse(pendingSource);
  const captured = input.patron_filing_details?.source_1099patr;
  const specified = parsed.success
    ? parsed.data.f1099patrs.filter((item) =>
      item.trade_or_business === true &&
      item.box13_specified_cooperative === true &&
      (item.box7_qualified_payments ?? 0) > 0
    )
    : [];
  if (
    !captured || specified.length !== 1 ||
    JSON.stringify(specified[0]) !== JSON.stringify(captured)
  ) {
    throw new Error(
      "Form 8995-A Schedule D source must match one retained specified-cooperative Form 1099-PATR",
    );
  }
}

export function calculatePatronScheduleDLines(input: Form8995AInput) {
  const source = input.patron_filing_details;
  if (input.patron_of_specified_cooperative !== true || !source) {
    throw new Error(
      "Form 8995-A Schedule D needs identified cooperative and 1099-PATR allocation source",
    );
  }
  if (!input.business_filing_details) {
    throw new Error(
      "Form 8995-A Schedule D needs identified business filing details",
    );
  }
  if (input.patron_business_source) {
    const amounts = patronSourceAmounts(input.patron_business_source);
    const review = input.patron_business_source.review;
    assertPatronFilingStatus(review, input.filing_status);
    const details = input.business_filing_details;
    if (
      amounts.qbi !== input.qbi || amounts.wages !== input.w2_wages ||
      input.unadjusted_basis !== 0 ||
      details.business_name !== amounts.name || details.ein !== amounts.ein ||
      details.business_qbi !== amounts.qbi ||
      details.business_w2_wages !== amounts.wages ||
      details.business_ubia !== 0 ||
      source.qbi_allocable_to_qualified_payments !== amounts.qualified_qbi ||
      source.w2_wages_allocable_to_qualified_payments !==
        amounts.qualified_wages ||
      JSON.stringify(source.source_1099patr) !==
        JSON.stringify(review.source_1099patr) ||
      JSON.stringify(source.box6_written_notice_review) !==
        JSON.stringify(review.box6_written_notice_review) ||
      source.allocation_worksheet_reference !==
        review.allocation_worksheet_reference ||
      source.allocation_worksheet_reviewed_by !== review.reviewed_by ||
      source.allocation_worksheet_review_date !== review.reviewed_on
    ) {
      throw new Error(
        "Patron QBI, wages, reviewed allocation and notice differ from the actual business source",
      );
    }
  }
  const patr = source.source_1099patr;
  if (
    (patr.box6_section199ag_deduction ?? 0) * 100 >
      (patr.box7_qualified_payments ?? 0) * 9
  ) {
    throw new Error(
      "Form 8995-A cooperative box 6 exceeds 9% of box 7 qualified payments",
    );
  }
  if (
    patr.trade_or_business !== true ||
    patr.box13_specified_cooperative !== true ||
    !patr.payer_name ||
    !/^\d{9}$/.test(patr.payer_tin ?? "") ||
    (!input.patron_business_source &&
      !Number.isInteger(patr.box7_qualified_payments)) ||
    (patr.box7_qualified_payments ?? 0) <= 0 ||
    typeof patr.box6_section199ag_deduction !== "number" ||
    (!input.patron_business_source &&
      !Number.isInteger(patr.box6_section199ag_deduction)) ||
    ((patr.box6_section199ag_deduction ?? 0) > 0 &&
      (!/^\d{9}$/.test(patr.recipient_tin ?? "") ||
        !source.box6_written_notice_review ||
        source.box6_written_notice_review.recipient_tin !==
          patr.recipient_tin ||
        source.box6_written_notice_review.designated_199ag_amount !==
          patr.box6_section199ag_deduction)) ||
    ((patr.box6_section199ag_deduction ?? 0) === 0 &&
      source.box6_written_notice_review !== undefined) ||
    (patr.box9_section199aa_sstb_items ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule D needs a sourced business 1099-PATR with box 7 payments, reviewed box 6 notice when present, specified-cooperative box 13, and no box 9 SSTB items",
    );
  }
  if (
    source.qbi_allocable_to_qualified_payments >
      input.business_filing_details.business_qbi ||
    source.w2_wages_allocable_to_qualified_payments >
      input.business_filing_details.business_w2_wages
  ) {
    throw new Error(
      "Form 8995-A Schedule D allocations exceed the identified business QBI or wages",
    );
  }
  const line2 = source.qbi_allocable_to_qualified_payments;
  const line3 = input.patron_business_source
    ? Math.round(line2 * 0.09)
    : line2 * 0.09;
  // Schedule D line 4 is the allocable portion of Part II line 4,
  // which is zero for this business when its QBI is zero. Source payroll
  // remains positive and reconciled above even when the filed amount is zero.
  const line4 = input.qbi === 0
    ? 0
    : source.w2_wages_allocable_to_qualified_payments;
  const line5 = input.patron_business_source
    ? Math.round(line4 * 0.50)
    : line4 * 0.50;
  const line6 = Math.min(line3, line5);
  const independentReviewed = input.patron_business_source &&
    "no_aggregation_confirmed" in input.patron_business_source.review;
  if (
    line6 < 0 || (line6 === 0 && !independentReviewed) ||
    ![line3, line5, line6].every(Number.isInteger)
  ) {
    throw new Error(
      "Form 8995-A Schedule D needs a positive whole-dollar patron reduction",
    );
  }
  return { line2, line3, line4, line5, line6 };
}

export function calculateOwnedWotcBusinesses(
  input: Form8995AInput,
  taxYear: number,
) {
  const sources = input.wotc_business_sources;
  const cfg = qbiYearConfig(taxYear);
  if (
    !sources || input.single_schedule_c_source ||
    input.business_filing_details ||
    input.filing_status !== FilingStatus.MFJ ||
    input.taxable_income <= cfg.qbiThresholdMfj ||
    input.aggregation_filing_details || input.sstb_filing_details ||
    input.patron_filing_details ||
    (input.sstb_qbi ?? 0) !== 0 || (input.net_capital_gain ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    new Set(
        sources.map((s) => s.business.source_schedule_c.proprietor_recipient),
      ).size !== 2 ||
    new Set(sources.map((s) => s.business.business_reference)).size !== 2 ||
    new Set(sources.map((s) => s.business.ein)).size !== 2 ||
    JSON.stringify(sources[0].joint_se_source) !==
      JSON.stringify(sources[1].joint_se_source) ||
    sources[0].joint_se_source.businesses.length !== 2 ||
    sources[0].joint_wages_total !== sources[1].joint_wages_total
  ) {
    throw new Error(
      "Form8995A two owned WOTC businesses need distinct actual employer and owner sources",
    );
  }
  if (
    sources.some((s) =>
      s.business.source_schedule_c.qbi_wotc_filing_review
          ?.no_aggregation_confirmed !== true ||
      JSON.stringify(
          s.business.source_schedule_c.qbi_wotc_filing_review
            ?.reviewed_other_business_references,
        ) !==
        JSON.stringify(
          sources.filter((other) => other !== s).map((other) =>
            other.business.business_reference
          ),
        )
    )
  ) {
    throw new Error(
      "Owned WOTC reviews must identify the actual other business without aggregation",
    );
  }
  const rows = sources.map((source) => {
    const b = source.business,
      review = b.source_schedule_c.qbi_wotc_filing_review!;
    const qbi = Math.round(b.qbi - source.se_tax_deduction);
    const child: Form8995AInput = {
      ...input,
      wotc_business_sources: undefined,
      single_schedule_c_source: source,
      qbi,
      w2_wages: b.w2_wages,
      unadjusted_basis: 0,
      business_filing_details: {
        business_name: b.business_name!,
        ein: b.ein!,
        business_qbi: qbi,
        business_w2_wages: b.w2_wages,
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
    };
    return {
      source,
      input: child,
      lines: calculateOneBusiness8995ALines(child, taxYear),
    };
  });
  if (
    input.qbi !== rows.reduce((sum, r) => sum + r.lines.line2, 0) ||
    input.w2_wages !== rows.reduce((sum, r) => sum + r.lines.line4, 0) ||
    input.unadjusted_basis !== 0
  ) {
    throw new Error(
      "Form8995A owned WOTC QBI and wage totals disagree with source rows",
    );
  }
  const line16 = rows.reduce((sum, r) => sum + r.lines.line15, 0),
    line36 = rows[0].lines.line36;
  return {
    rows,
    parent: {
      ...rows[0].lines,
      phaseInRequired: rows.some((row) => row.lines.phaseInRequired),
      phaseIn: rows.find((row) => row.lines.phaseInRequired)?.lines.phaseIn ??
        0,
      line16,
      line32: line16,
      line37: Math.min(line16, line36),
      line39: Math.min(line16, line36),
    },
  };
}

export function calculateIndependentPatronBusinesses(
  input: Form8995AInput,
  taxYear: number,
) {
  const family = replayIndependentPatronSources(
    input.independent_patron_sources,
  );
  if (
    input.filing_status !== FilingStatus.MFJ ||
    input.patron_of_specified_cooperative !== true ||
    input.patron_business_source || input.patron_filing_details ||
    input.business_filing_details ||
    input.aggregation_filing_details ||
    (input.aggregation_groups?.length ?? 0) !== 0 ||
    input.sstb_filing_details ||
    (input.sstb_qbi ?? 0) !== 0 || (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0 ||
    input.schedule_c_qbi_businesses || input.single_schedule_c_source ||
    input.single_schedule_f_source ||
    input.wotc_business_sources || input.farm_wotc_filing_source ||
    input.mixed_fishing_qbi_source ||
    input.qbi !== family.qbi || input.w2_wages !== family.wages ||
    input.unadjusted_basis !== 0 ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    qbiCapitalTotal(input, true) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Independent patron parent totals and scope must match actual separately owned farms",
    );
  }
  const rows = family.source.businesses.map((source, index) => {
    const amount = family.amounts[index], review = source.review;
    const child: Form8995AInput = {
      filing_status: input.filing_status,
      taxable_income: input.taxable_income,
      qbi: amount.qbi,
      w2_wages: amount.wages,
      unadjusted_basis: 0,
      patron_of_specified_cooperative: true,
      patron_business_source: source,
      business_filing_details: {
        business_name: amount.name!,
        ein: amount.ein,
        business_qbi: amount.qbi,
        business_w2_wages: amount.wages,
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
        qbi_allocable_to_qualified_payments: amount.qualified_qbi,
        w2_wages_allocable_to_qualified_payments: amount.qualified_wages,
        one_cooperative_confirmed: true,
        allocation_worksheet_reference: review.allocation_worksheet_reference,
        allocation_worksheet_reviewed_by: review.reviewed_by,
        allocation_worksheet_review_date: review.reviewed_on,
        box6_written_notice_review: review.box6_written_notice_review,
      },
    };
    return {
      input: child,
      lines: calculateOneBusiness8995ALines(child, taxYear),
      schedule: calculatePatronScheduleDLines(child),
    };
  });
  const line16 = rows.reduce((s, r) => s + r.lines.line15, 0),
    line36 = rows[0].lines.line36;
  const line37 = Math.min(line16, line36);
  // Add cooperative allocations before rounding the shared line38 and apply
  // the one final taxable-income limitation after the combined QBI component.
  const passed = family.source.businesses.reduce(
    (s, r) => s + (r.review.source_1099patr.box6_section199ag_deduction ?? 0),
    0,
  );
  const line38 = Math.min(
    Math.round(passed),
    Math.max(0, input.taxable_income - line37),
  );
  return {
    family,
    rows,
    parent: {
      ...rows[0].lines,
      phaseInRequired: rows.some((r) => r.lines.phaseInRequired),
      phaseIn: rows.find((r) => r.lines.phaseInRequired)?.lines.phaseIn ?? 0,
      line16,
      line32: line16,
      line37,
      line38,
      line39: line37 + line38,
    },
  };
}

export function calculateOneBusiness8995ALines(
  input: Form8995AInput,
  taxYear: number,
) {
  const cfg = qbiYearConfig(taxYear);
  assertSingleScheduleCWotcAmounts(input, taxYear);
  assertSingleFarmAmounts(input, taxYear);
  const patronReduction = input.patron_of_specified_cooperative === true
    ? calculatePatronScheduleDLines(input).line6
    : 0;
  const filedAmount = (value: number) =>
    input.single_schedule_c_source || input.single_schedule_f_source ||
      input.farm_wotc_filing_source ||
      input.mixed_fishing_qbi_source ||
      input.producing_mining_zero_qbi_source ||
      input.aggregation_filing_details ||
      input.rpe_aggregation_source ||
      input.patron_business_source
      ? Math.round(value)
      : value;
  const line2 = input.qbi ?? 0;
  const line3 = filedAmount(line2 * QBI_RATE);
  // Part II lines 4 and 7 are zero when this business has no QBI.
  // Keep actual payroll/property in the source and business filing details.
  const line4 = line2 === 0 ? 0 : filedAmount(input.w2_wages ?? 0);
  const line5 = filedAmount(line4 * W2_LIMIT_A_RATE);
  const line6 = filedAmount(line4 * W2_LIMIT_B_WAGE_RATE);
  const line7 = line2 === 0 ? 0 : input.unadjusted_basis ?? 0;
  const line8 = filedAmount(line7 * UBIA_RATE);
  const line9 = line6 + line8;
  const line10 = Math.max(line5, line9);
  const line11 = Math.min(line3, line10);
  const patronThreshold = qbiThreshold(input.filing_status, cfg);
  const patronPhaseInRange = qbiPhaseInRange(input.filing_status, cfg);
  // Part III applies only in the middle band when the wage/property limit binds.
  const phaseInRequired = Boolean(
    input.patron_business_source || input.single_schedule_c_source ||
      input.single_schedule_f_source ||
      input.farm_wotc_filing_source ||
      input.mixed_fishing_qbi_source || input.aggregation_filing_details ||
      input.rpe_aggregation_source,
  ) &&
    input.taxable_income > patronThreshold &&
    input.taxable_income <= patronThreshold + patronPhaseInRange &&
    line10 < line3;
  const phaseIn = phaseInRequired
    ? (input.taxable_income - patronThreshold) / patronPhaseInRange
    : 0;
  const line19 = phaseInRequired ? line3 - line10 : 0;
  const line25 = phaseInRequired ? filedAmount(line19 * phaseIn) : 0;
  const line26 = phaseInRequired ? line3 - line25 : 0;
  const line13 =
    input.patron_business_source && input.taxable_income <= patronThreshold
      ? line3
      : phaseInRequired
      ? Math.max(line11, line26)
      : line11;
  const line14 = patronReduction;
  const line15 = Math.max(0, line13 - line14);
  const line16 = line15;
  const line28 = input.line6_sec199a_dividends ?? 0;
  const line29 = 0;
  const line30 = line28 + line29;
  const line31 = filedAmount(line30 * QBI_RATE);
  const line32 = line16 + line31;
  const line33 = input.taxable_income;
  const line34 = qbiCapitalTotal(input, true);
  const line35 = Math.max(0, line33 - line34);
  const line36 = filedAmount(line35 * QBI_RATE);
  const line37 = Math.min(line32, line36);
  const passed199ag = input.patron_of_specified_cooperative === true
    ? input.patron_filing_details?.source_1099patr
      .box6_section199ag_deduction ?? 0
    : 0;
  const line38 = input.patron_business_source
    ? Math.min(filedAmount(passed199ag), Math.max(0, line33 - line37))
    : passed199ag;
  if (line38 > line33 - line37) {
    throw new Error(
      "Form 8995-A cooperative box 6 exceeds the line 38 taxable-income limit",
    );
  }
  const line39 = line37 + line38;
  return {
    ...((input.patron_business_source || input.single_schedule_c_source ||
        input.single_schedule_f_source ||
        input.farm_wotc_filing_source ||
        input.mixed_fishing_qbi_source || input.aggregation_filing_details ||
        input.rpe_aggregation_source)
      ? {
        patronThreshold,
        patronPhaseInRange,
        phaseInRequired,
        phaseIn,
        line12: phaseInRequired ? line26 : undefined,
        line19,
        line25,
        line26,
      }
      : {}),
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line13,
    line14,
    line15,
    line16,
    line28,
    line29,
    line30,
    line31,
    line32,
    line33,
    line34,
    line35,
    line36,
    line37,
    line38,
    line39,
  };
}

// ── Threshold helpers ─────────────────────────────────────────────────────────

/**
 * Reduction ratio for phase-in of wage limitation and SSTB phase-out.
 * 0 = below threshold (no limitation), 1 = fully above range (full limitation).
 */
function reductionRatio(
  taxableIncome: number,
  filingStatus: FilingStatus,
  cfg: F1040Config,
): number {
  const base = qbiThreshold(filingStatus, cfg);
  const phaseInRange = qbiPhaseInRange(filingStatus, cfg);
  const excess = taxableIncome - base;
  if (excess <= 0) return 0;
  if (excess >= phaseInRange) return 1;
  return excess / phaseInRange;
}

// ── SSTB adjustment ───────────────────────────────────────────────────────────

type SstbAmounts = {
  readonly qbi: number;
  readonly w2Wages: number;
  readonly unadjustedBasis: number;
};

function adjustedSstbAmounts(
  input: Form8995AInput,
  ratio: number,
): SstbAmounts {
  const scale = 1 - ratio;
  return {
    qbi: (input.sstb_qbi ?? 0) * scale,
    w2Wages: (input.sstb_w2_wages ?? 0) * scale,
    unadjustedBasis: (input.sstb_unadjusted_basis ?? 0) * scale,
  };
}

// ── Combined totals ───────────────────────────────────────────────────────────

type CombinedTotals = {
  readonly netQbi: number;
  readonly w2Wages: number;
  readonly unadjustedBasis: number;
};

function combinedTotals(
  input: Form8995AInput,
  sstb: SstbAmounts,
): CombinedTotals {
  const grossQbi = (input.qbi ?? 0) + sstb.qbi;
  const netQbi = grossQbi + (input.qbi_loss_carryforward ?? 0);
  const w2Wages = (input.w2_wages ?? 0) + sstb.w2Wages;
  const unadjustedBasis = (input.unadjusted_basis ?? 0) + sstb.unadjustedBasis;
  return { netQbi, w2Wages, unadjustedBasis };
}

// ── W-2/UBIA wage limitation ──────────────────────────────────────────────────

function applicableWageLimit(w2Wages: number, unadjustedBasis: number): number {
  const limitA = W2_LIMIT_A_RATE * w2Wages;
  const limitB = W2_LIMIT_B_WAGE_RATE * w2Wages + UBIA_RATE * unadjustedBasis;
  return Math.max(limitA, limitB);
}

// ── QBI component with phase-in ───────────────────────────────────────────────

function qbiComponent(totals: CombinedTotals, ratio: number): number {
  if (totals.netQbi <= 0) return 0;

  const beforeLimit = totals.netQbi * QBI_RATE;

  if (ratio === 0) {
    // Below threshold — no wage limitation applies
    return beforeLimit;
  }

  const wageLimit = applicableWageLimit(totals.w2Wages, totals.unadjustedBasis);

  if (ratio === 1) {
    // Fully above phase-in range — full limitation applies
    return Math.min(beforeLimit, wageLimit);
  }

  // Partial phase-in: limitation is blended in
  const phaseInAmount = ratio * (beforeLimit - wageLimit);
  return beforeLimit - Math.max(0, phaseInAmount);
}

// ── REIT/PTP component ────────────────────────────────────────────────────────

function reitComponent(input: Form8995AInput): number {
  const netReit = (input.line6_sec199a_dividends ?? 0) +
    (input.reit_loss_carryforward ?? 0);
  if (netReit <= 0) return 0;
  return netReit * QBI_RATE;
}

// ── Income cap ────────────────────────────────────────────────────────────────

function incomeCap(input: Form8995AInput): number {
  const capGain = input.net_capital_gain ?? 0;
  const base = Math.max(0, input.taxable_income - capGain);
  return base * QBI_RATE;
}

// ── Activity check ────────────────────────────────────────────────────────────

function hasQbiActivity(input: Form8995AInput): boolean {
  return (
    input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) ===
      true ||
    input.patron_of_specified_cooperative === true ||
    input.business_filing_details !== undefined ||
    (input.qbi ?? 0) !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) > 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  );
}

/** Reject required Schedules A-D before a deduction reaches Form 1040. */
function assertSupportedSchedulePath(
  input: Form8995AInput,
  taxYear: number,
): void {
  const reit = input.line6_sec199a_dividends ?? 0;
  assertDatesInTaxYear(
    taxYear,
    (input.reit_dividend_sources ?? []).map((row) => row.ex_dividend_date),
    "Form 8995-A REIT 1099-DIV ex-dividend date must fall in the tax year",
  );
  // Line 28 is the sum of qualified REIT dividends (i8995-A, Part IV). It
  // needs no trade or business and no W-2 wage or UBIA limit, so any number of
  // reviewed 1099-DIV sources qualify; each box 5 is part of its box 1a.
  const reitSources = input.reit_dividend_sources ?? [];
  if (
    reit > 0 &&
      (input.patron_of_specified_cooperative === true ||
        reitSources.length === 0 ||
        reitSources.some((row) => row.box5 > row.box1a) ||
        reitSources.reduce((total, row) => total + row.box5, 0) !== reit) ||
    reit === 0 && input.reit_dividend_sources !== undefined
  ) {
    throw new Error(
      "Form 8995-A REIT line 28 needs a matching reviewed 1099-DIV source for each box 5 amount",
    );
  }
  if (
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0 ||
    input.sstb_filing_details
  ) {
    calculateOneSstb8995ALines(input, taxYear);
  }
  if (
    (input.aggregation_groups ?? []).length > 0 ||
    input.aggregation_filing_details || input.rpe_aggregation_source
  ) {
    calculateTwoBusinessAggregationLines(input, taxYear);
  }
  if ((input.qbi ?? 0) < 0 || (input.qbi_loss_carryforward ?? 0) < 0) {
    if (
      !input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)
    ) {
      throw new Error(
        "Form 8995-A Schedule C current/prior QBI loss ledger and filing attachment are not supported",
      );
    }
  }
  if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    calculateScheduleCLossLines(input, taxYear);
  }
  if (input.independent_patron_sources) {
    calculateIndependentPatronBusinesses(input, taxYear);
  } else if (input.patron_of_specified_cooperative === true) {
    const details = input.business_filing_details;
    if (!details || !input.patron_filing_details) {
      throw new Error(
        "Form 8995-A Schedule D needs identified cooperative and business source details",
      );
    }
    if (
      (!input.patron_business_source &&
        input.filing_status !== FilingStatus.Single) ||
      (!input.patron_business_source &&
        input.taxable_income <=
          qbiThreshold(input.filing_status, qbiYearConfig(taxYear)) +
            qbiPhaseInRange(input.filing_status, qbiYearConfig(taxYear))) ||
      (input.qbi ?? 0) !== details.business_qbi ||
      (input.w2_wages ?? 0) !== details.business_w2_wages ||
      (input.unadjusted_basis ?? 0) !== details.business_ubia ||
      ((input.net_capital_gain ?? 0) !== 0 &&
        (!input.patron_business_source || !input.qbi_capital_sources)) ||
      (input.line6_sec199a_dividends ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0
    ) {
      throw new Error(
        "Form 8995-A Schedule D needs one sourced owner business with sourced capital gain and zero REIT/PTP activity; unsourced projections require Single fully above phase-in",
      );
    }
    const lines = calculateOneBusiness8995ALines(input, taxYear);
    if (
      !Object.entries(lines).filter(([key, value]) =>
        /^line\d+$/.test(key) && value !== undefined
      ).every(([, value]) => Number.isInteger(value)) || lines.line39 <= 0
    ) {
      throw new Error(
        "Form 8995-A Schedule D needs a positive whole-dollar reconciled deduction",
      );
    }
  } else if (input.patron_filing_details) {
    throw new Error(
      "Form 8995-A cooperative source requires affirmative patron status",
    );
  }
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form8995AScheduleDNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_d";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculatePatronScheduleDLines(inputSchema.parse(rawInput));
    return { outputs: [] };
  }
}

export const form8995aScheduleD = new Form8995AScheduleDNode();

class Form8995AScheduleANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateOneSstb8995ALines(inputSchema.parse(rawInput), ctx.taxYear);
    return { outputs: [] };
  }
}

export const form8995aScheduleA = new Form8995AScheduleANode();

class Form8995AScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateScheduleCLossLines(inputSchema.parse(rawInput), ctx.taxYear);
    return { outputs: [] };
  }
}

export const form8995aScheduleC = new Form8995AScheduleCNode();

class Form8995AScheduleBNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateTwoBusinessAggregationLines(inputSchema.parse(rawInput), ctx.taxYear);
    return { outputs: [] };
  }
}

export const form8995aScheduleB = new Form8995AScheduleBNode();

class Form8995ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    standard_deduction,
    form8995aScheduleA,
    form8995aScheduleB,
    form8995aScheduleC,
    form8995aScheduleD,
  ]);

  compute(ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    const cfg = qbiYearConfig(ctx.taxYear);
    const input = inputSchema.parse(rawInput);
    return this.withMinimumDeduction(
      this.line39Result(ctx, input, cfg),
      input,
      cfg,
    );
  }

  /** Lines 40-41: the deduction is the greater of line 39 or the line 40 minimum. */
  private withMinimumDeduction(
    result: NodeResult,
    input: Form8995AInput,
    cfg: F1040Config,
  ): NodeResult {
    const routed = result.outputs.find((output) =>
      output.nodeType === f1040.nodeType
    )?.fields.line13_qbi_deduction;
    const line39 = typeof routed === "number" ? routed : 0;
    const line40 = minimumDeductionLine40(input, line39, cfg);
    if (line40 === undefined) return result;
    const own = result.outputs.find((output) =>
      output.nodeType === this.nodeType
    )?.fields ?? input;
    return {
      ...result,
      outputs: [
        this.outputNodes.output(f1040, { line13_qbi_deduction: line40 }),
        this.outputNodes.output(standard_deduction, { qbi_deduction: line40 }),
        { nodeType: this.nodeType, fields: { ...own, minimum_deduction: line40 } },
        ...result.outputs.filter((output) =>
          output.nodeType !== f1040.nodeType &&
          output.nodeType !== standard_deduction.nodeType &&
          output.nodeType !== this.nodeType
        ),
      ],
    };
  }

  private line39Result(
    ctx: NodeContext,
    input: Form8995AInput,
    cfg: F1040Config,
  ): NodeResult {
    assertSupportedSchedulePath(input, ctx.taxYear);
    assertSingleScheduleCWotcAmounts(input, ctx.taxYear);

    if (
      !hasQbiActivity(input) && !input.farm_wotc_filing_source &&
      !input.mixed_fishing_qbi_source
    ) {
      return { outputs: [] };
    }

    if (input.aggregation_filing_details || input.rpe_aggregation_source) {
      const deduction =
        calculateTwoBusinessAggregationLines(input, ctx.taxYear).parent.line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
          this.outputNodes.output(form8995aScheduleB, input),
        ],
      };
    }

    if (input.sstb_filing_details) {
      const deduction = calculateOneSstb8995ALines(input, ctx.taxYear).line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
          this.outputNodes.output(form8995aScheduleA, input),
        ],
      };
    }

    if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
      const lines = calculateScheduleCLossLines(input, ctx.taxYear);
      return {
        outputs: [
          this.outputNodes.output(f1040, {
            line13_qbi_deduction: lines.parent.line39,
          }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: lines.parent.line39,
          }),
          { nodeType: this.nodeType, fields: input },
          this.outputNodes.output(form8995aScheduleC, input),
        ],
        ...(lines.schedule.line6 > 0
          ? {
            carryforwards: {
              qbi_loss_carryforward_8995a: lines.schedule.line6,
            },
          }
          : {}),
      };
    }

    if (input.patron_of_specified_cooperative === true) {
      const deduction = input.independent_patron_sources
        ? calculateIndependentPatronBusinesses(input, ctx.taxYear).parent.line39
        : calculateOneBusiness8995ALines(input, ctx.taxYear).line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
          this.outputNodes.output(form8995aScheduleD, input),
        ],
      };
    }

    if (input.farm_wotc_filing_source) {
      const farm = calculateFarmWotcLines(input, ctx.taxYear);
      const deduction = farm.parent.line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
          ...(farm.lossSchedule
            ? [this.outputNodes.output(form8995aScheduleC, input)]
            : []),
        ],
        ...(farm.lossSchedule?.line6
          ? {
            carryforwards: {
              qbi_loss_carryforward_8995a: farm.lossSchedule.line6,
            },
          }
          : {}),
      };
    }
    if (input.mixed_fishing_qbi_source) {
      const deduction = calculateMixedFishingQbi(input, ctx.taxYear).parent
        .line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
        ],
      };
    }
    if (input.wotc_business_sources) {
      const deduction = calculateOwnedWotcBusinesses(input, ctx.taxYear).parent
        .line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
        ],
      };
    }
    if (assertProducingMiningZeroQbi(input, ctx.taxYear)) {
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: 0 }),
          this.outputNodes.output(standard_deduction, { qbi_deduction: 0 }),
          { nodeType: this.nodeType, fields: input },
        ],
      };
    }
    if (input.single_schedule_c_source || input.single_schedule_f_source) {
      const deduction = calculateOneBusiness8995ALines(input, ctx.taxYear).line39;
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
          this.outputNodes.output(standard_deduction, {
            qbi_deduction: deduction,
          }),
          { nodeType: this.nodeType, fields: input },
        ],
      };
    }

    const ratio = reductionRatio(
      input.taxable_income,
      input.filing_status,
      cfg,
    );
    const sstb = adjustedSstbAmounts(input, ratio);
    const totals = combinedTotals(input, sstb);

    const qbi = qbiComponent(totals, ratio);
    const reit = reitComponent(input);
    const totalBeforeCap = qbi + reit;

    if (totalBeforeCap <= 0) {
      return { outputs: [{ nodeType: this.nodeType, fields: input }] };
    }

    const cap = incomeCap(input);
    const deduction = Math.min(totalBeforeCap, cap);

    if (deduction <= 0) {
      return { outputs: [{ nodeType: this.nodeType, fields: input }] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
      this.outputNodes.output(standard_deduction, { qbi_deduction: deduction }),
      { nodeType: this.nodeType, fields: input },
    ];

    return { outputs };
  }
}

export const form8995a = new Form8995ANode();
