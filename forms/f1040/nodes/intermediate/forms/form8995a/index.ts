import {
  independentPatronSourceSchema,
  replayIndependentPatronSources,
} from "../../../inputs/qbi_patron/independent.ts";
import {
  assertSingleFarmAmounts,
  singleFarmSourceSchema,
} from "./single-farm-source.ts";
import { assertProducingMiningZeroQbi } from "./producing-mining.ts";
import { filedOwnedScheduleC } from "../../../owned-business-filing.ts";
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
} from "../schedule_se/owner-calculation.ts";
import { sourceSchema as patronBusinessSourceSchema } from "../../../inputs/qbi_patron/schema.ts";
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
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus, filingStatusSchema, TS } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import {
  inputSchema as f1099patrInputSchema,
  itemSchema as f1099patrItemSchema,
} from "../../../inputs/f1099patr/schema.ts";
import {
  computeNetProfit,
  itemSchema as scheduleCItemSchema,
} from "../../../inputs/schedule_c/model.ts";
import { reviewedWotcQbiWages } from "../../../inputs/schedule_c/qbi-wotc.ts";
import { scheduleSELines } from "../schedule_se/calculation.ts";

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

// Evidence for the bounded two-business Schedule B route. This augments the
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
  owned_on_2025_12_31: z.literal(true),
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

export const aggregationFilingDetailsSchema = z.object({
  group_name: z.string().trim().min(1).max(75),
  group_description: z.string().trim().min(1).max(180),
  common_owner_ssn: z.string().regex(/^\d{9}$/),
  tax_year_end: z.literal("2025-12-31"),
  tax_year_end_source_reference: z.string().trim().min(1),
  election_history: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("new_2025"),
      no_prior_election_confirmed: z.literal(true),
    }).strict(),
    z.object({
      status: z.literal("continued_unchanged"),
      filed_2024_schedule_b_reference: z.string().trim().min(1),
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
  members: z.tuple([aggregationMemberSchema, aggregationMemberSchema]),
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
  qualified_dividends_zero_confirmed: z.literal(true),
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
  reit_dividend_sources: z.array(
    z.object({
      payer_name: z.string().trim().min(1),
      source_document_reference: z.string().trim().min(1),
      box1a: z.number().positive().int(),
      box5: z.number().positive().int(),
      ex_dividend_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
      qualified_held_days_in_91_day_window: z.number().int().min(46).max(91),
      diminished_risk_days_excluded: z.number().int().nonnegative(),
      no_related_payment_obligation_confirmed: z.literal(true),
      review_reference: z.string().trim().min(1),
      reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).strict(),
  ).length(1).optional(),

  // Prior-year QBI net loss carryforward (zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  // Prior-year REIT/PTP net loss carryforward (zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),

  // §199A aggregation election groups forwarded from qbi_aggregation (BAN screen).
  // Non-empty signals that Schedule B must be attached and grouped limitation
  // treatment applied. Omit when no aggregation election has been made.
  aggregation_groups: z.array(aggregationGroupSchema).optional(),
  aggregation_filing_details: aggregationFilingDetailsSchema.optional(),

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
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
});

export type Form8995AInput = z.infer<typeof inputSchema>;

export function assertSingleScheduleCWotcAmounts(input: Form8995AInput): void {
  const retained = input.single_schedule_c_source;
  if (!retained) return;
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
    ? ownedScheduleSE(retained.joint_se_source, CONFIG_BY_YEAR[2025].ssWageBase)
      .instances.find((row) =>
        row.recipient === (item.proprietor_recipient ?? "T")
      )
    : scheduleSELines(
      { net_profit_schedule_c: business.qbi },
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
  if (
    (input.filing_status !== FilingStatus.Single &&
      input.filing_status !== FilingStatus.MFJ) ||
    input.taxable_income <=
      (input.filing_status === FilingStatus.MFJ ? 394600 : 197300) ||
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

export function validateTwoBusinessAggregationSource(input: Form8995AInput) {
  const source = input.aggregation_filing_details;
  const groups = input.aggregation_groups;
  const group = groups?.[0];
  const cfg = CONFIG_BY_YEAR[2025];
  if (
    !source || !group || groups?.length !== 1 ||
    group.group_name !== source.group_name ||
    group.combined_for_limitation !== true ||
    input.filing_status !== FilingStatus.Single ||
    !Number.isInteger(input.taxable_income) ||
    input.taxable_income <= cfg.qbiThresholdSingle + cfg.qbiPhaseInRange / 2 ||
    input.net_capital_gain !== 0 ||
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
      "Form 8995-A Schedule B source needs one qualifying two-business group without other QBI paths",
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
  const memberEins = source.members.map((member) => member.ein);
  if (
    new Set(memberRefs).size !== 2 || new Set(memberEins).size !== 2 ||
    group.business_names.length !== 2 ||
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
      member.ownership_start_date > "2025-07-02"
    ) {
      throw new Error(
        "Form 8995-A Schedule B needs majority-year ownership including December 31",
      );
    }
    if (
      !Number.isFinite(reviewDate.valueOf()) ||
      reviewDate.toISOString().slice(0, 10) !==
        member.qbi_adjustments.allocation_worksheet_review_date ||
      member.qbi_adjustments.allocation_worksheet_review_date < "2025-12-31"
    ) {
      throw new Error(
        "Form 8995-A Schedule B needs a valid reviewed 2025 allocation worksheet date",
      );
    }
    const scheduleC = member.source_schedule_c;
    if (
      scheduleC.business_reference !== member.business_reference ||
      scheduleC.line_c_business_name !== member.business_name ||
      scheduleC.line_d_ein !== member.ein ||
      scheduleC.proprietor_recipient !== TS.T ||
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

export function calculateTwoBusinessAggregationLines(input: Form8995AInput) {
  // Schedule C net profit alone is not generally QBI. Each member's explicit
  // attributable deductions are checked against its retained Schedule C and
  // the Schedule 1 totals in the native/PDF join.
  const totals = validateTwoBusinessAggregationSource(input);
  const parent = calculateOneBusiness8995ALines(input);
  if (!Object.values(parent).every(Number.isInteger) || parent.line39 <= 0) {
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

export function calculateScheduleCLossLines(input: Form8995AInput) {
  if (input.farm_wotc_filing_source) {
    const farm = calculateFarmWotcLines(input);
    if (!farm.lossSchedule) {
      throw new Error("Farm Schedule C needs actual sourced QBI loss");
    }
    return { schedule: farm.lossSchedule, parent: farm.parent, businesses: [] };
  }
  const businesses = input.schedule_c_qbi_businesses;
  if (
    !businesses ||
    (businesses.length !== 1 && businesses.length !== 2) ||
    businesses.filter((business) => business.qbi > 0).length !==
      (businesses.length === 2 ? 1 : 0) ||
    businesses.filter((business) => business.qbi < 0).length !== 1
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs one identified loss business, with at most one positive business",
    );
  }
  if (
    input.filing_status !== FilingStatus.Single ||
    input.taxable_income <= 247_300 ||
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
  const positive = businesses.find((business) => business.qbi > 0);
  const negative = businesses.find((business) => business.qbi < 0)!;
  // The source graph and Schedule 1 keep cents. Schedule C of Form 8995-A
  // files whole-dollar amounts for each identified trade or business.
  const roundedDollar = (amount: number): number =>
    Math.sign(amount) * Math.round(Math.abs(amount));
  const sourceQbi = businesses.reduce((sum, business) => sum + business.qbi, 0);
  if (
    Math.abs((input.qbi ?? 0) - sourceQbi) > 0.000001 ||
    roundedDollar(negative.qbi) >= 0 ||
    (positive !== undefined && roundedDollar(positive.qbi) <= 0)
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs sourced net QBI and nonzero whole-dollar business rows",
    );
  }
  const line3 = -roundedDollar(negative.qbi);
  const line4 = positive ? roundedDollar(positive.qbi) : 0;
  const line5 = Math.min(line3, line4);
  const line6 = Math.max(0, line3 - line5);
  const adjustedQbi = line4 - line5;
  if (
    adjustedQbi >= 400 ||
    (input.w2_wages ?? 0) !== (positive?.w2_wages ?? 0) + negative.w2_wages ||
    (input.unadjusted_basis ?? 0) !== (positive?.ubia ?? 0) + negative.ubia ||
    negative.w2_wages !== 0 ||
    negative.ubia !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs sourced net QBI below the Schedule SE threshold and no negative-business limitation amount",
    );
  }
  const line2 = adjustedQbi;
  const line3Parent = Math.round(line2 * QBI_RATE);
  // Schedule C line 1(c) of zero also zeros this business's wage and UBIA
  // amounts on the parent; those limits cannot create a deduction by themselves.
  const line4Parent = adjustedQbi > 0 ? Math.round(positive!.w2_wages) : 0;
  // Each monetary line is filed in whole dollars. Fractional percentage
  // products are rounded when entered, before later lines compare or add them.
  const line5Parent = Math.round(line4Parent * W2_LIMIT_A_RATE);
  const line6Parent = Math.round(line4Parent * W2_LIMIT_B_WAGE_RATE);
  const line7Parent = adjustedQbi > 0 ? positive!.ubia : 0;
  const line8Parent = Math.round(line7Parent * UBIA_RATE);
  const line9Parent = line6Parent + line8Parent;
  const line10Parent = Math.max(line5Parent, line9Parent);
  const line11Parent = Math.min(line3Parent, line10Parent);
  const line34 = qbiCapitalTotal(input, true);
  const line35 = Math.max(0, Math.round(input.taxable_income) - line34);
  const line36 = Math.round(line35 * QBI_RATE);
  const line39 = Math.min(line11Parent, line36);
  if (
    ![
      line3Parent,
      line5Parent,
      line6Parent,
      line8Parent,
      line9Parent,
      line10Parent,
      line11Parent,
      line36,
      line39,
    ].every(Number.isSafeInteger)
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs safe whole-dollar filed monetary lines",
    );
  }
  return {
    businesses,
    positive,
    negative,
    schedule: {
      line2: 0,
      line3,
      line4,
      line5,
      line6,
      rows: businesses.map((business) => ({
        name: business.business_name!,
        line1a: roundedDollar(business.qbi),
        line1b: business.qbi > 0 ? line5 : 0,
        line1c: business.qbi > 0 ? adjustedQbi : 0,
      })),
    },
    parent: {
      line2,
      line3: line3Parent,
      line4: line4Parent,
      line5: line5Parent,
      line6: line6Parent,
      line7: line7Parent,
      line8: line8Parent,
      line9: line9Parent,
      line10: line10Parent,
      line11: line11Parent,
      line13: line11Parent,
      line15: line11Parent,
      line16: line11Parent,
      line32: line11Parent,
      line33: Math.round(input.taxable_income),
      line34,
      line35,
      line36,
      line37: line39,
      line39,
    },
  };
}

export function calculateOneSstb8995ALines(input: Form8995AInput) {
  const source = input.sstb_filing_details;
  const joint = input.filing_status === FilingStatus.MFJ;
  const separate = input.filing_status === FilingStatus.MFS;
  const threshold = joint
    ? CONFIG_BY_YEAR[2025].qbiThresholdMfj
    : CONFIG_BY_YEAR[2025].qbiThresholdSingle;
  const phaseInRange = joint
    ? CONFIG_BY_YEAR[2025].qbiPhaseInRange
    : CONFIG_BY_YEAR[2025].qbiPhaseInRange / 2;
  if (
    !source ||
    (input.filing_status !== FilingStatus.Single &&
      input.filing_status !== FilingStatus.HOH &&
      input.filing_status !== FilingStatus.QSS && !joint && !separate) ||
    !Number.isInteger(input.taxable_income) ||
    input.taxable_income <= threshold ||
    input.taxable_income >= threshold + phaseInRange
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
    (input.net_capital_gain ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    (input.aggregation_groups ?? []).length !== 0 ||
    input.patron_of_specified_cooperative === true ||
    input.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A Schedule A source must be the only business, with no aggregation, patron, gain, REIT/PTP, or loss path",
    );
  }
  const phaseIn = (input.taxable_income - threshold) / phaseInRange;
  const applicable = 1 - phaseIn;
  const filed = (value: number) =>
    input.single_sstb_schedule_c_source ? Math.round(value) : value;
  const line2 = filed(source.business_qbi * applicable);
  const line4 = filed(source.business_w2_wages * applicable);
  const line7 = filed(source.business_ubia * applicable);
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
  const line36 = filed(line33 * QBI_RATE);
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
    line36,
    line39,
  ];
  if (!amounts.every(Number.isInteger) || line39 <= 0) {
    throw new Error(
      "Form 8995-A Schedule A needs positive whole-dollar reconciled parent amounts",
    );
  }
  return {
    source,
    threshold,
    phaseInRange,
    phaseIn,
    applicable,
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
    line35: line33,
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
    const details = input.business_filing_details;
    if (
      (input.filing_status !== FilingStatus.Single &&
        input.filing_status !== FilingStatus.MFJ) ||
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

export function calculateOwnedWotcBusinesses(input: Form8995AInput) {
  const sources = input.wotc_business_sources;
  if (
    !sources || input.single_schedule_c_source ||
    input.business_filing_details ||
    input.filing_status !== FilingStatus.MFJ ||
    input.taxable_income <= 394600 ||
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
      lines: calculateOneBusiness8995ALines(child),
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

export function calculateIndependentPatronBusinesses(input: Form8995AInput) {
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
      lines: calculateOneBusiness8995ALines(child),
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

export function calculateOneBusiness8995ALines(input: Form8995AInput) {
  assertSingleScheduleCWotcAmounts(input);
  assertSingleFarmAmounts(input);
  const patronReduction = input.patron_of_specified_cooperative === true
    ? calculatePatronScheduleDLines(input).line6
    : 0;
  const filedAmount = (value: number) =>
    input.single_schedule_c_source || input.single_schedule_f_source ||
      input.farm_wotc_filing_source ||
      input.mixed_fishing_qbi_source ||
      input.producing_mining_zero_qbi_source ||
      input.aggregation_filing_details ||
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
  const patronThreshold = input.filing_status === FilingStatus.MFJ
    ? 394600
    : 197300;
  const patronPhaseInRange = input.filing_status === FilingStatus.MFJ
    ? 100000
    : 50000;
  // Part III applies only in the middle band when the wage/property limit binds.
  const phaseInRequired = Boolean(
    input.patron_business_source || input.single_schedule_c_source ||
      input.single_schedule_f_source ||
      input.farm_wotc_filing_source ||
      input.mixed_fishing_qbi_source,
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
        input.mixed_fishing_qbi_source)
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

function threshold(
  filingStatus: FilingStatus,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  return filingStatus === FilingStatus.MFJ
    ? cfg.qbiThresholdMfj
    : cfg.qbiThresholdSingle;
}

/**
 * Reduction ratio for phase-in of wage limitation and SSTB phase-out.
 * 0 = below threshold (no limitation), 1 = fully above range (full limitation).
 */
function reductionRatio(
  taxableIncome: number,
  filingStatus: FilingStatus,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const base = threshold(filingStatus, cfg);
  // The configured range is the joint-return amount. IRC §199A(e)(2)(B)
  // uses half that range for every other filing status.
  const phaseInRange = filingStatus === FilingStatus.MFJ
    ? cfg.qbiPhaseInRange
    : cfg.qbiPhaseInRange / 2;
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
function assertSupportedSchedulePath(input: Form8995AInput): void {
  const reit = input.line6_sec199a_dividends ?? 0;
  if (
    reit > 0 &&
      (!input.business_filing_details ||
        input.patron_of_specified_cooperative === true ||
        reit > 1_500 ||
        input.reit_dividend_sources?.length !== 1 ||
        input.reit_dividend_sources[0].box5 !== reit ||
        input.reit_dividend_sources[0].box1a !== reit) ||
    reit === 0 && input.reit_dividend_sources !== undefined
  ) {
    throw new Error(
      "Form 8995-A REIT line 28 needs one identified business and one matching reviewed 1099-DIV source",
    );
  }
  if (
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0 ||
    input.sstb_filing_details
  ) {
    calculateOneSstb8995ALines(input);
  }
  if (
    (input.aggregation_groups ?? []).length > 0 ||
    input.aggregation_filing_details
  ) {
    calculateTwoBusinessAggregationLines(input);
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
    calculateScheduleCLossLines(input);
  }
  if (input.independent_patron_sources) {
    calculateIndependentPatronBusinesses(input);
  } else if (input.patron_of_specified_cooperative === true) {
    const details = input.business_filing_details;
    if (!details || !input.patron_filing_details) {
      throw new Error(
        "Form 8995-A Schedule D needs identified cooperative and business source details",
      );
    }
    if (
      (input.filing_status !== FilingStatus.Single &&
        !(input.patron_business_source &&
          input.filing_status === FilingStatus.MFJ)) ||
      (!input.patron_business_source && input.taxable_income <= 247_300) ||
      (input.qbi ?? 0) !== details.business_qbi ||
      (input.w2_wages ?? 0) !== details.business_w2_wages ||
      (input.unadjusted_basis ?? 0) !== details.business_ubia ||
      (input.net_capital_gain ?? 0) !== 0 ||
      (input.line6_sec199a_dividends ?? 0) !== 0 ||
      (input.reit_loss_carryforward ?? 0) !== 0
    ) {
      throw new Error(
        "Form 8995-A Schedule D supports one sourced single-filer business fully above phase-in with zero capital gain and REIT/PTP activity",
      );
    }
    const lines = calculateOneBusiness8995ALines(input);
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

  compute(_ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateOneSstb8995ALines(inputSchema.parse(rawInput));
    return { outputs: [] };
  }
}

export const form8995aScheduleA = new Form8995AScheduleANode();

class Form8995AScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateScheduleCLossLines(inputSchema.parse(rawInput));
    return { outputs: [] };
  }
}

export const form8995aScheduleC = new Form8995AScheduleCNode();

class Form8995AScheduleBNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a_schedule_b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    calculateTwoBusinessAggregationLines(inputSchema.parse(rawInput));
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
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    if (input.sstb_filing_details && ctx.taxYear !== 2025) {
      throw new Error(
        "Form 8995-A Schedule A bounded SSTB route is TY2025 only",
      );
    }

    if (input.aggregation_filing_details && ctx.taxYear !== 2025) {
      throw new Error(
        "Form 8995-A Schedule B bounded aggregation route is TY2025 only",
      );
    }

    assertSupportedSchedulePath(input);
    assertSingleScheduleCWotcAmounts(input);

    if (
      !hasQbiActivity(input) && !input.farm_wotc_filing_source &&
      !input.mixed_fishing_qbi_source
    ) {
      return { outputs: [] };
    }

    if (input.aggregation_filing_details) {
      const deduction =
        calculateTwoBusinessAggregationLines(input).parent.line39;
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
      const deduction = calculateOneSstb8995ALines(input).line39;
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
      const lines = calculateScheduleCLossLines(input);
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
        ? calculateIndependentPatronBusinesses(input).parent.line39
        : calculateOneBusiness8995ALines(input).line39;
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
      const farm = calculateFarmWotcLines(input);
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
      const deduction = calculateMixedFishingQbi(input).parent.line39;
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
      const deduction = calculateOwnedWotcBusinesses(input).parent.line39;
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
    if (assertProducingMiningZeroQbi(input)) {
      return {
        outputs: [
          this.outputNodes.output(f1040, { line13_qbi_deduction: 0 }),
          this.outputNodes.output(standard_deduction, { qbi_deduction: 0 }),
          { nodeType: this.nodeType, fields: input },
        ],
      };
    }
    if (input.single_schedule_c_source || input.single_schedule_f_source) {
      const deduction = calculateOneBusiness8995ALines(input).line39;
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
