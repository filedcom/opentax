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
  no_reit_ptp_or_loss_carryforward_confirmed: z.literal(true),
  qualified_dividends_zero_confirmed: z.literal(true),
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
});

export const patronFilingDetailsSchema = z.object({
  source_1099patr: f1099patrItemSchema,
  qbi_allocable_to_qualified_payments: z.number().positive().int(),
  w2_wages_allocable_to_qualified_payments: z.number().nonnegative().int(),
  one_cooperative_confirmed: z.literal(true),
  allocation_worksheet_reference: z.string().trim().min(1),
  allocation_worksheet_reviewed_by: z.string().trim().min(1),
  allocation_worksheet_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const scheduleCQbiBusinessSchema = z.object({
  business_reference: z.string().trim().min(1).optional(),
  business_name: z.string().trim().min(1).max(75).optional(),
  ein: z.string().regex(/^\d{9}$/).optional(),
  qbi: z.number().int(),
  w2_wages: z.number().int().nonnegative(),
  ubia: z.number().int().nonnegative(),
  no_other_adjustments_confirmed: z.boolean(),
  source_schedule_c: scheduleCItemSchema,
}).strict();

export const inputSchema = z.object({
  // Filing status — determines income threshold for wage limitation phase-in
  filing_status: filingStatusSchema,
  // Taxable income before QBI deduction (Form 8995-A line 33)
  taxable_income: z.number().nonnegative(),
  // Net capital gain — reduces income limitation base
  net_capital_gain: z.number().nonnegative().optional(),

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
  sstb_filing_details: sstbFilingDetailsSchema.optional(),
  schedule_c_qbi_businesses: z.array(scheduleCQbiBusinessSchema).optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
});

export type Form8995AInput = z.infer<typeof inputSchema>;

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
  const businesses = input.schedule_c_qbi_businesses;
  if (
    !businesses || businesses.length !== 2 ||
    businesses.filter((business) => business.qbi > 0).length !== 1 ||
    businesses.filter((business) => business.qbi < 0).length !== 1
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs one positive and one negative identified Schedule C business",
    );
  }
  if (
    input.filing_status !== FilingStatus.Single ||
    input.taxable_income <= 247_300 ||
    !Number.isInteger(input.taxable_income) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.net_capital_gain ?? 0) !== 0 ||
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
  if (refs.some((ref) => !ref) || new Set(refs).size !== 2) {
    throw new Error(
      "Form 8995-A Schedule C needs two distinct business references",
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
  const positive = businesses.find((business) => business.qbi > 0)!;
  const negative = businesses.find((business) => business.qbi < 0)!;
  const line3 = -negative.qbi;
  const line4 = positive.qbi;
  const line5 = Math.min(line3, line4);
  const line6 = Math.max(0, line3 - line5);
  const adjustedQbi = line4 - line5;
  if (
    adjustedQbi <= 0 || adjustedQbi >= 400 ||
    (input.qbi ?? 0) !== positive.qbi + negative.qbi ||
    (input.w2_wages ?? 0) !== positive.w2_wages + negative.w2_wages ||
    (input.unadjusted_basis ?? 0) !== positive.ubia + negative.ubia ||
    positive.w2_wages < 0 || negative.w2_wages !== 0 ||
    negative.ubia !== 0 || line6 !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs positive net QBI below the Schedule SE threshold and no unused loss or negative-business limitation amount",
    );
  }
  const line2 = adjustedQbi;
  const line3Parent = line2 * QBI_RATE;
  const line4Parent = positive.w2_wages;
  const line5Parent = line4Parent * W2_LIMIT_A_RATE;
  const line6Parent = line4Parent * W2_LIMIT_B_WAGE_RATE;
  const line7Parent = positive.ubia;
  const line8Parent = line7Parent * UBIA_RATE;
  const line9Parent = line6Parent + line8Parent;
  const line10Parent = Math.max(line5Parent, line9Parent);
  const line11Parent = Math.min(line3Parent, line10Parent);
  const line36 = input.taxable_income * QBI_RATE;
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
    ].every(Number.isInteger) || line39 <= 0
  ) {
    throw new Error(
      "Form 8995-A Schedule C bounded route needs a positive whole-dollar deduction",
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
        line1a: business.qbi,
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
      line33: input.taxable_income,
      line34: 0,
      line35: input.taxable_income,
      line36,
      line37: line39,
      line39,
    },
  };
}

export function calculateOneSstb8995ALines(input: Form8995AInput) {
  const source = input.sstb_filing_details;
  const threshold = CONFIG_BY_YEAR[2025].qbiThresholdSingle;
  if (
    !source || input.filing_status !== FilingStatus.Single ||
    !Number.isInteger(input.taxable_income) ||
    input.taxable_income <= threshold ||
    input.taxable_income >= threshold + 50_000
  ) {
    throw new Error(
      "Form 8995-A Schedule A needs one identified single-filer SSTB within the phase-in range",
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
  const phaseIn = (input.taxable_income - threshold) / 50_000;
  const applicable = 1 - phaseIn;
  const line2 = source.business_qbi * applicable;
  const line4 = source.business_w2_wages * applicable;
  const line7 = source.business_ubia * applicable;
  const line3 = line2 * QBI_RATE;
  const line5 = line4 * W2_LIMIT_A_RATE;
  const line6 = line4 * W2_LIMIT_B_WAGE_RATE;
  const line8 = line7 * UBIA_RATE;
  const line9 = line6 + line8;
  const line10 = Math.max(line5, line9);
  const line11 = Math.min(line3, line10);
  const line19 = Math.max(0, line3 - line10);
  if (line19 === 0) {
    throw new Error(
      "Form 8995-A Schedule A bounded route requires a phased-in wage-limit reduction",
    );
  }
  const line25 = line19 * phaseIn;
  const line26 = line3 - line25;
  const line13 = Math.max(line11, line26);
  const line33 = input.taxable_income;
  const line36 = line33 * QBI_RATE;
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

export function assertPatron1099PATRSource(
  input: Form8995AInput,
  pendingSource: unknown,
): void {
  if (input.patron_of_specified_cooperative !== true) return;
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
  const patr = source.source_1099patr;
  if (
    patr.trade_or_business !== true ||
    patr.box13_specified_cooperative !== true ||
    !patr.payer_name ||
    !/^\d{9}$/.test(patr.payer_tin ?? "") ||
    !Number.isInteger(patr.box7_qualified_payments) ||
    (patr.box7_qualified_payments ?? 0) <= 0 ||
    patr.box6_section199ag_deduction !== 0 ||
    (patr.box9_section199aa_sstb_items ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule D needs a sourced business 1099-PATR with box 7 payments, zero box 6 section 199A(g) deduction, specified-cooperative box 13, and no box 9 SSTB items",
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
  const line3 = line2 * 0.09;
  const line4 = source.w2_wages_allocable_to_qualified_payments;
  const line5 = line4 * 0.50;
  const line6 = Math.min(line3, line5);
  if (line6 <= 0 || ![line3, line5, line6].every(Number.isInteger)) {
    throw new Error(
      "Form 8995-A Schedule D needs a positive whole-dollar patron reduction",
    );
  }
  return { line2, line3, line4, line5, line6 };
}

export function calculateOneBusiness8995ALines(input: Form8995AInput) {
  const patronReduction = input.patron_of_specified_cooperative === true
    ? calculatePatronScheduleDLines(input).line6
    : 0;
  const line2 = input.qbi ?? 0;
  const line3 = line2 * QBI_RATE;
  const line4 = input.w2_wages ?? 0;
  const line5 = line4 * W2_LIMIT_A_RATE;
  const line6 = line4 * W2_LIMIT_B_WAGE_RATE;
  const line7 = input.unadjusted_basis ?? 0;
  const line8 = line7 * UBIA_RATE;
  const line9 = line6 + line8;
  const line10 = Math.max(line5, line9);
  const line11 = Math.min(line3, line10);
  const line13 = line11;
  const line14 = patronReduction;
  const line15 = Math.max(0, line13 - line14);
  const line16 = line15;
  const line32 = line16;
  const line33 = input.taxable_income;
  const line34 = input.net_capital_gain ?? 0;
  const line35 = Math.max(0, line33 - line34);
  const line36 = line35 * QBI_RATE;
  const line37 = Math.min(line32, line36);
  const line39 = line37;
  return {
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
    line32,
    line33,
    line34,
    line35,
    line36,
    line37,
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
  if (input.patron_of_specified_cooperative === true) {
    const details = input.business_filing_details;
    if (!details || !input.patron_filing_details) {
      throw new Error(
        "Form 8995-A Schedule D needs identified cooperative and business source details",
      );
    }
    if (
      input.filing_status !== FilingStatus.Single ||
      input.taxable_income <= 247_300 ||
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
    if (!Object.values(lines).every(Number.isInteger) || lines.line39 <= 0) {
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

    if (!hasQbiActivity(input)) {
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
      };
    }

    if (input.patron_of_specified_cooperative === true) {
      const deduction = calculateOneBusiness8995ALines(input).line39;
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
