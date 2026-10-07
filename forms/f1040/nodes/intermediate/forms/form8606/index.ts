import { roundWholeDollars } from "../../../../whole-dollars.ts";
import {
  reviewedRothOwnerInventory,
  rothOwnerInventorySchema,
  rothOwnerPrintFields,
} from "./roth-inventory.ts";
import {
  reviewedRothActivity,
  rothActivityReviewSchema,
} from "./roth-activity.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Input Schema ─────────────────────────────────────────────────────────────

export enum IraOwner {
  Taxpayer = "taxpayer",
  Spouse = "spouse",
}

export const filingDetailsSchema = z.object({
  owner: z.nativeEnum(IraOwner),
  prior_basis_documented_from_2024_form8606: z.literal(true),
  no_ira_distributions_or_conversions_confirmed: z.boolean(),
  other_spouse_form8606_not_required_confirmed: z.literal(true).optional(),
});

export const distributionEvidenceSchema = z.object({
  prior_form8606: z.object({
    tax_year: z.literal(2024),
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    filed_line14_basis: z.number().int().positive(),
  }).strict(),
  year_end_statement: z.object({
    as_of: z.literal("2025-12-31"),
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    all_traditional_ira_balances_included_confirmed: z.literal(true),
    total_fair_market_value: z.number().int().nonnegative(),
  }).strict(),
  form1099r_source_document_reference: z.string().trim().min(1),
  no_current_nondeductible_contribution_confirmed: z.boolean(),
  no_other_traditional_ira_distribution_or_conversion_confirmed: z.literal(
    true,
  ),
  no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: z.literal(true),
}).strict();

export const zeroBasisSourceSchema = z.object({
  form5498: z.object({
    tax_year: z.literal(2025),
    source_document_reference: z.string().trim().min(1),
    custodian_ein: z.string().regex(/^\d{9}$/),
    owner_ssn: z.string().regex(/^\d{9}$/),
    traditional_ira_confirmed: z.literal(true),
    no_returned_contributions_confirmed: z.literal(true),
    no_sep_or_simple_employer_contributions_confirmed: z.literal(true),
    box1_ira_contributions: z.number().int().positive(),
    box2_rollover_contributions: z.literal(0),
  }).strict(),
  prior_form8606: z.object({
    tax_year: z.literal(2024),
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    filed_line14_basis: z.literal(0),
  }).strict(),
}).strict();

export const currentContributionSourceSchema = z.object({
  form5498: zeroBasisSourceSchema.shape.form5498,
  contribution_receipt: z.object({
    source_document_reference: z.string().trim().min(1),
    custodian_ein: z.string().regex(/^\d{9}$/),
    owner_ssn: z.string().regex(/^\d{9}$/),
    designated_tax_year: z.literal(2025),
    received_on: z.string().regex(/^2025-\d{2}-\d{2}$|^2026-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.valueOf()) &&
          date.toISOString().slice(0, 10) === value &&
          value >= "2025-01-01" && value <= "2026-04-15";
      }, {
        message:
          "2025 IRA contribution receipt must be dated by April 15, 2026",
      }),
    contribution_amount: z.number().int().positive(),
  }).strict(),
}).strict();

const date2025 = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value;
});

export const rothDistributionEvidenceSchema = z.object({
  opening_statement: z.object({
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    first_roth_ira_opened_on: date2025,
    all_roth_iras_and_prior_activity_reviewed: z.literal(true),
    no_prior_roth_contributions_or_distributions: z.literal(true),
    no_conversions_or_plan_rollovers: z.literal(true),
  }).strict(),
  form5498: z.object({
    tax_year: z.literal(2025),
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    custodian_ein: z.string().regex(/^\d{9}$/),
    roth_ira_confirmed: z.literal(true),
    roth_sep_or_simple_ira: z.literal(false),
    box10_roth_ira_contributions: z.number().int().positive(),
    box2_rollover_contributions: z.literal(0),
    box3_roth_conversion_amount: z.literal(0),
  }).strict(),
  contribution_receipt: z.object({
    source_document_reference: z.string().trim().min(1),
    owner_ssn: z.string().regex(/^\d{9}$/),
    custodian_ein: z.string().regex(/^\d{9}$/),
    received_on: date2025,
    amount: z.number().int().positive(),
  }).strict(),
  form1099r_source_document_reference: z.string().trim().min(1),
  no_homebuyer_disaster_repayment_qcd_or_hsa_transfer: z.literal(true),
  no_other_2025_roth_distribution: z.literal(true),
}).strict();

export const inputSchema = z.object({
  // Part I — Nondeductible Traditional IRA Contributions
  // Line 1: nondeductible contributions made this year
  nondeductible_contributions: z.number().nonnegative(),

  // Line 2: prior-year carry-forward basis (from prior Form 8606, line 14)
  prior_basis: z.number().nonnegative().optional(),

  // Line 6: FMV of all traditional IRAs as of December 31, 2025
  // Optional when routed from ira_deduction_worksheet (no distributions this year).
  year_end_ira_value: z.number().nonnegative().optional(),

  // Line 7: total traditional IRA distributions received this year
  // (excluding conversions and rollovers — routed from f1099r)
  traditional_distributions: z.number().nonnegative().optional(),

  // Line 8: amount converted from traditional IRA to Roth IRA
  // (routed from f1099r via rollover_code=C)
  roth_conversion: z.number().nonnegative().optional(),

  // Part III — Distributions From Roth IRAs
  // Line 19: total Roth IRA distributions received this year
  // (routed from f1099r via exclude_8606_roth=true)
  roth_distribution: z.number().nonnegative().optional(),

  // Line 22: cumulative basis in regular Roth IRA contributions (carry-forward)
  roth_basis_contributions: z.number().nonnegative().optional(),

  // Line 24: cumulative basis in Roth IRA conversions and QRP rollovers (carry-forward)
  roth_basis_conversions: z.number().nonnegative().optional(),

  // Required source attestations and owner for the bounded no-activity MeF path.
  filing_details: filingDetailsSchema.optional(),
  zero_basis_source: zeroBasisSourceSchema.optional(),
  current_contribution_source: currentContributionSourceSchema.optional(),
  distribution_evidence: distributionEvidenceSchema.optional(),
  roth_distribution_evidence: rothDistributionEvidenceSchema.optional(),
  roth_activity_review: rothActivityReviewSchema.optional(),
  roth_owner_inventory_reviews: z.array(rothOwnerInventorySchema).min(1).max(2)
    .optional(),
});

export type Form8606Input = z.infer<typeof inputSchema>;

const ownerPrintSchema = z.object({
  print_line1_nondeductible: z.number().nonnegative(),
  print_line2_prior_basis: z.number().nonnegative(),
  print_line3_total_basis: z.number().nonnegative(),
  print_line4_post_year_contributions: z.number().nonnegative().optional(),
  print_line5_current_basis: z.number().nonnegative().optional(),
  print_line14_remaining_basis: z.number().nonnegative(),
  print_line6_year_end_value: z.number().nonnegative().optional(),
  print_line7_distributions: z.number().nonnegative().optional(),
  print_line8_conversions: z.number().nonnegative().optional(),
  print_line9_combined_value: z.number().nonnegative().optional(),
  print_line10_basis_ratio: z.number().nonnegative().max(1).optional(),
  print_line11_nontaxable_conversion: z.number().nonnegative().optional(),
  print_line12_nontaxable_distribution: z.number().nonnegative().optional(),
  print_line13_nontaxable: z.number().nonnegative().optional(),
  print_line15a_not_converted: z.number().nonnegative().optional(),
  print_line15b_disaster: z.number().nonnegative().optional(),
  print_line15c_taxable: z.number().nonnegative().optional(),
  print_line16_converted: z.number().nonnegative().optional(),
  print_line17_nontaxable_conversion: z.number().nonnegative().optional(),
  print_line18_taxable_conversion: z.number().optional(),
  source_traditional_distributions: z.number().nonnegative(),
  source_roth_conversion: z.number().nonnegative(),
  source_roth_distribution: z.number().nonnegative(),
  source_roth_basis_contributions: z.number().nonnegative(),
  source_roth_basis_conversions: z.number().nonnegative(),
  filing_details: filingDetailsSchema.optional(),
  zero_basis_source: zeroBasisSourceSchema.optional(),
  current_contribution_source: currentContributionSourceSchema.optional(),
  distribution_evidence: distributionEvidenceSchema.optional(),
  roth_distribution_evidence: rothDistributionEvidenceSchema.optional(),
  roth_activity_review: rothActivityReviewSchema.optional(),
  roth_owner_inventory_review: rothOwnerInventorySchema.optional(),
  print_roth_line19_distributions: z.number().int().nonnegative().optional(),
  print_roth_line20_homebuyer: z.number().int().nonnegative().optional(),
  print_roth_line21_after_homebuyer: z.number().int().nonnegative().optional(),
  print_roth_line22_contribution_basis: z.number().int().nonnegative()
    .optional(),
  print_roth_line23_after_contribution_basis: z.number().int().nonnegative()
    .optional(),
  print_roth_line24_conversion_basis: z.number().int().nonnegative().optional(),
  print_roth_line25a_earnings: z.number().int().nonnegative().optional(),
  print_roth_line25b_disaster: z.number().int().nonnegative().optional(),
  print_roth_line25c_taxable: z.number().int().nonnegative().optional(),
});
export const printSchema = ownerPrintSchema.extend({
  roth_owner_inventory_reviews: z.array(rothOwnerInventorySchema).optional(),
  owner_forms: z.array(ownerPrintSchema.extend({ owner: z.enum(["T", "S"]) }))
    .optional(),
});

// ─── Part I Helpers ───────────────────────────────────────────────────────────

// Line 3: total traditional IRA basis
function totalBasis(input: Form8606Input): number {
  return input.nondeductible_contributions + (input.prior_basis ?? 0);
}

// Line 9: denominator for basis ratio
// = year_end_value + traditional_distributions + roth_conversion
function basisRatioDenominator(input: Form8606Input): number {
  return (
    (input.year_end_ira_value ?? 0) +
    (input.traditional_distributions ?? 0) +
    (input.roth_conversion ?? 0)
  );
}

// Line 10: nontaxable portion of distributions + conversions combined
function nontaxableTotal(
  basis: number,
  denominator: number,
  distributed: number,
): number {
  if (denominator <= 0) return 0;
  // Ratio × total distributed; capped at total basis
  const ratio = Math.min(1, basis / denominator);
  return ratio * distributed;
}

// Line 11: nontaxable portion allocable to Roth conversions only
function nontaxableConversions(
  nontaxableAmt: number,
  distributions: number,
  conversions: number,
): number {
  const total = distributions + conversions;
  if (total <= 0) return 0;
  return nontaxableAmt * (conversions / total);
}

// Line 12: nontaxable portion allocable to traditional distributions only
function nontaxableDistributions(
  nontaxableAmt: number,
  nontaxableConv: number,
): number {
  return nontaxableAmt - nontaxableConv;
}

// Line 13: taxable traditional IRA distributions
function taxableTraditional(
  distributions: number,
  nontaxableDist: number,
): number {
  return Math.max(0, distributions - nontaxableDist);
}

// Line 18: taxable Roth conversion (Part II)
function taxableConversion(
  conversions: number,
  nontaxableConv: number,
): number {
  return Math.max(0, conversions - nontaxableConv);
}

// Line 14: remaining basis = total basis - nontaxable portion used this year
// This carries forward to next year's Form 8606 line 2 (prior_basis).
function remainingBasis(basis: number, nontaxableAmt: number): number {
  return Math.max(0, basis - nontaxableAmt);
}

// ─── Part I Computation ───────────────────────────────────────────────────────

type PartIResult = {
  readonly taxableTraditionalDist: number;
  readonly taxableConversionAmt: number;
  readonly line14RemainingBasis: number;
};

function reviewedDistributionPartI(input: Form8606Input) {
  const evidence = input.distribution_evidence!;
  const priorBasis = input.prior_basis ?? 0;
  const contribution = input.nondeductible_contributions;
  const source = input.current_contribution_source;
  const received = source?.contribution_receipt.received_on;
  const postYear = received?.startsWith("2026-") ? contribution : 0;
  const basis = priorBasis + contribution - postYear;
  const totalBasis = priorBasis + contribution;
  const distribution = input.traditional_distributions ?? 0;
  const yearEndValue = input.year_end_ira_value ?? 0;
  const denominator = yearEndValue + distribution;
  if (
    input.filing_details?.owner === undefined ||
    input.filing_details.no_ira_distributions_or_conversions_confirmed !==
      false ||
    priorBasis <= 0 || basis <= 0 ||
    (evidence.no_current_nondeductible_contribution_confirmed !==
      (source === undefined)) ||
    (source !== undefined && (
      contribution <= 0 ||
      source.form5498.box1_ira_contributions !== contribution ||
      source.contribution_receipt.contribution_amount !== contribution ||
      source.contribution_receipt.custodian_ein !==
        source.form5498.custodian_ein ||
      source.contribution_receipt.owner_ssn !== source.form5498.owner_ssn ||
      !received || received < "2025-01-01" || received > "2026-04-15"
    )) ||
    (source === undefined && contribution !== 0) ||
    distribution <= 0 || (input.roth_conversion ?? 0) !== 0 ||
    (input.roth_distribution ?? 0) !== 0 ||
    evidence.prior_form8606.filed_line14_basis !== priorBasis ||
    evidence.year_end_statement.total_fair_market_value !== yearEndValue ||
    denominator <= 0
  ) {
    throw new Error(
      "Form 8606 reviewed distribution needs positive prior basis, one traditional IRA payment, and exact year-end IRA value",
    );
  }
  const ratio = Math.min(1, Math.round(basis / denominator * 1_000) / 1_000);
  const nontaxable = Math.min(
    basis,
    distribution,
    Math.round(distribution * ratio),
  );
  const taxable = distribution - nontaxable;
  return {
    taxableTraditionalDist: taxable,
    taxableConversionAmt: 0,
    line14RemainingBasis: totalBasis - nontaxable,
    print: {
      print_line4_post_year_contributions: postYear,
      print_line5_current_basis: basis,
      print_line6_year_end_value: yearEndValue,
      print_line7_distributions: distribution,
      print_line8_conversions: 0,
      print_line9_combined_value: denominator,
      print_line10_basis_ratio: ratio,
      print_line11_nontaxable_conversion: 0,
      print_line12_nontaxable_distribution: nontaxable,
      print_line13_nontaxable: nontaxable,
      print_line15a_not_converted: taxable,
      print_line15b_disaster: 0,
      print_line15c_taxable: taxable,
    },
  };
}

function computePartI(input: Form8606Input): PartIResult {
  const distributions = input.traditional_distributions ?? 0;
  const conversions = input.roth_conversion ?? 0;
  const totalDistributed = distributions + conversions;

  const basis = totalBasis(input);

  // No distributions or conversions — Part I produces nothing taxable, but basis carries forward
  if (totalDistributed <= 0) {
    return {
      taxableTraditionalDist: 0,
      taxableConversionAmt: conversions,
      line14RemainingBasis: basis,
    };
  }

  // No basis — all distributions are fully taxable, no carryforward
  if (basis <= 0) {
    return {
      taxableTraditionalDist: distributions,
      taxableConversionAmt: conversions,
      line14RemainingBasis: 0,
    };
  }

  const denominator = basisRatioDenominator(input);
  const nontaxableAmt = nontaxableTotal(basis, denominator, totalDistributed);
  const nontaxableConv = nontaxableConversions(
    nontaxableAmt,
    distributions,
    conversions,
  );
  const nontaxableDist = nontaxableDistributions(nontaxableAmt, nontaxableConv);

  return {
    taxableTraditionalDist: taxableTraditional(distributions, nontaxableDist),
    taxableConversionAmt: taxableConversion(conversions, nontaxableConv),
    line14RemainingBasis: remainingBasis(basis, nontaxableAmt),
  };
}

// Line 15c: taxable part of the traditional IRA distributions, after basis.
// Exported so Form 5329 line 1 uses the same figure Part I puts on Form 1040 line 4b.
export function taxableTraditionalDistribution(input: Form8606Input): number {
  const parsed = inputSchema.parse(input);
  return parsed.distribution_evidence
    ? reviewedDistributionPartI(parsed).taxableTraditionalDist
    : computePartI(parsed).taxableTraditionalDist;
}

// ─── Part III Computation ─────────────────────────────────────────────────────

// Taxable Roth IRA distributions = gross - total Roth basis (contributions + conversions)
// Simplified: does not implement homebuyer exception or 5-year rule tracking
function computePartIII(input: Form8606Input): number {
  const distribution = input.roth_distribution ?? 0;
  if (distribution <= 0) return 0;

  const basisContributions = input.roth_basis_contributions ?? 0;
  const basisConversions = input.roth_basis_conversions ?? 0;
  const totalRothBasis = basisContributions + basisConversions;

  return Math.max(0, distribution - totalRothBasis);
}

function reviewedRothPartIII(input: Form8606Input) {
  if (input.roth_activity_review) {
    const facts = reviewedRothActivity(input.roth_activity_review);
    if (
      facts.qualified || input.roth_distribution_evidence ||
      input.roth_distribution !== facts.gross ||
      input.roth_basis_contributions !== facts.basis ||
      input.nondeductible_contributions !== 0 ||
      (input.prior_basis ?? 0) !== 0 ||
      (input.roth_basis_conversions ?? 0) !== 0 ||
      (input.roth_conversion ?? 0) !== 0 ||
      (input.traditional_distributions ?? 0) !== 0 ||
      input.distribution_evidence ||
      input.current_contribution_source || input.zero_basis_source ||
      input.filing_details
    ) {
      throw new Error(
        "Form8606 Roth activity source and regular basis/qualified filing route conflict",
      );
    }
    return { taxable: facts.taxable, print: facts.print };
  }

  const evidence = rothDistributionEvidenceSchema.parse(
    input.roth_distribution_evidence,
  );
  const opening = evidence.opening_statement;
  const form5498 = evidence.form5498;
  const receipt = evidence.contribution_receipt;
  const gross = input.roth_distribution ?? 0;
  const basis = form5498.box10_roth_ira_contributions;
  if (
    gross <= basis ||
    input.nondeductible_contributions !== 0 ||
    (input.prior_basis ?? 0) !== 0 ||
    (input.traditional_distributions ?? 0) !== 0 ||
    (input.roth_conversion ?? 0) !== 0 ||
    input.distribution_evidence !== undefined ||
    input.current_contribution_source !== undefined ||
    input.zero_basis_source !== undefined ||
    input.filing_details !== undefined ||
    input.roth_basis_contributions !== basis ||
    (input.roth_basis_conversions ?? 0) !== 0 ||
    opening.owner_ssn !== form5498.owner_ssn ||
    receipt.owner_ssn !== form5498.owner_ssn ||
    receipt.custodian_ein !== form5498.custodian_ein ||
    receipt.amount !== basis ||
    opening.first_roth_ira_opened_on > receipt.received_on ||
    new Set([
        opening.source_document_reference,
        form5498.source_document_reference,
        receipt.source_document_reference,
        evidence.form1099r_source_document_reference,
      ]).size !== 4
  ) {
    throw new Error(
      "Form 8606 reviewed Roth distribution needs one first-year contribution and separate matched source records",
    );
  }
  const taxable = gross - basis;
  return {
    taxable,
    print: {
      print_roth_line19_distributions: gross,
      print_roth_line20_homebuyer: 0,
      print_roth_line21_after_homebuyer: gross,
      print_roth_line22_contribution_basis: basis,
      print_roth_line23_after_contribution_basis: taxable,
      print_roth_line24_conversion_basis: 0,
      print_roth_line25a_earnings: taxable,
      print_roth_line25b_disaster: 0,
      print_roth_line25c_taxable: taxable,
    },
  };
}

export function taxableRothDistribution(input: Form8606Input): number {
  const parsed = inputSchema.parse(input);
  if (!parsed.roth_distribution_evidence && !parsed.roth_activity_review) {
    throw new Error("Form 8606 Roth taxable amount needs reviewed evidence");
  }
  return reviewedRothPartIII(parsed).taxable;
}

// ─── f1040 Output Builder ─────────────────────────────────────────────────────

function buildF1040Output(
  taxableTraditionalDist: number,
  taxableConversionAmt: number,
  taxableRoth: number,
  reviewedRothGross = 0,
): NodeOutput | null {
  const totalTaxable = taxableTraditionalDist + taxableConversionAmt +
    taxableRoth;
  if (totalTaxable <= 0 && reviewedRothGross <= 0) return null;

  return output(f1040, {
    ...(reviewedRothGross > 0 ? { line4a_ira_gross: reviewedRothGross } : {}),
    line4b_ira_taxable: totalTaxable,
  });
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8606Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8606";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form8606Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.roth_owner_inventory_reviews) {
      if (
        Object.entries(input).some(([key, value]) =>
          value !== undefined &&
          !["nondeductible_contributions", "roth_owner_inventory_reviews"]
            .includes(key)
        ) || input.nondeductible_contributions !== 0 ||
        input.prior_basis !== undefined ||
        input.roth_distribution !== undefined ||
        input.traditional_distributions !== undefined ||
        input.roth_conversion !== undefined || input.roth_activity_review ||
        input.distribution_evidence ||
        input.roth_distribution_evidence || input.current_contribution_source ||
        input.zero_basis_source || input.filing_details
      ) {
        throw new Error(
          "Complete owner Roth inventory cannot merge scalar/other8606 activity",
        );
      }
      const facts = input.roth_owner_inventory_reviews.map(
        reviewedRothOwnerInventory,
      );
      if (new Set(facts.map((row) => row.review.owner)).size !== facts.length) {
        throw new Error("Roth owner history repeated");
      }
      const rawGross = facts.reduce((sum, row) =>
        sum + Math.round(row.rawTotalGross * 100), 0) / 100;
      const gross = roundWholeDollars(rawGross);
      const taxable = facts.reduce((sum, row) =>
        sum + row.totalTaxable, 0);
      return {
        outputs: [
          output(f1040, {
            line4a_ira_gross: gross,
            line4b_ira_taxable: taxable,
          }),
          output(agi_aggregator, { line4b_ira_taxable: taxable }),
          {
            nodeType: this.nodeType,
            fields: {
              print_line1_nondeductible: 0,
              print_line2_prior_basis: 0,
              print_line3_total_basis: 0,
              print_line14_remaining_basis: 0,
              source_traditional_distributions: 0,
              source_roth_conversion: 0,
              source_roth_distribution: 0,
              source_roth_basis_contributions: 0,
              source_roth_basis_conversions: 0,
              roth_owner_inventory_reviews: facts.map((row) =>
                row.review
              ),
              owner_forms: facts.filter((row) => row.requires8606).map((
                row,
              ) => ({ owner: row.review.owner, ...rothOwnerPrintFields(row) })),
            },
          },
        ],
      };
    }

    const reviewed = input.distribution_evidence
      ? reviewedDistributionPartI(input)
      : undefined;
    const {
      taxableTraditionalDist,
      taxableConversionAmt,
      line14RemainingBasis,
    } = reviewed ?? computePartI(input);
    const reviewedRoth =
      input.roth_distribution_evidence || input.roth_activity_review
        ? reviewedRothPartIII(input)
        : undefined;
    const taxableRoth = reviewedRoth?.taxable ?? computePartIII(input);

    const f1040Output = buildF1040Output(
      taxableTraditionalDist,
      taxableConversionAmt,
      taxableRoth,
      reviewedRoth ? (input.roth_distribution ?? 0) : 0,
    );

    const outputs: NodeOutput[] = [];
    if (f1040Output !== null) {
      outputs.push(f1040Output);
      // Also route taxable IRA amount to agi_aggregator so AGI reflects Form 8606 computation.
      const totalTaxable = taxableTraditionalDist + taxableConversionAmt +
        taxableRoth;
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line4b_ira_taxable: totalTaxable,
        }),
      );
    }

    // ── Self-emit Form 8606 Part I line values for the PDF builder ───────────
    // (same pattern as the f1040 output node). Lines 4–13 only apply when a
    // distribution or conversion occurred; with none, line 3 carries directly
    // to line 14 and the intermediate lines print blank (per form flow).
    const basis = totalBasis(input);
    const distributions = input.traditional_distributions ?? 0;
    const conversions = input.roth_conversion ?? 0;
    const printFields = printSchema.parse({
      print_line1_nondeductible: input.nondeductible_contributions,
      print_line2_prior_basis: input.prior_basis ?? 0,
      print_line3_total_basis: basis,
      print_line14_remaining_basis: line14RemainingBasis,
      source_traditional_distributions: distributions,
      source_roth_conversion: conversions,
      source_roth_distribution: input.roth_distribution ?? 0,
      source_roth_basis_contributions: input.roth_basis_contributions ?? 0,
      source_roth_basis_conversions: input.roth_basis_conversions ?? 0,
      filing_details: input.filing_details,
      zero_basis_source: input.zero_basis_source,
      current_contribution_source: input.current_contribution_source,
      distribution_evidence: input.distribution_evidence,
      roth_distribution_evidence: input.roth_distribution_evidence,
      roth_activity_review: input.roth_activity_review,
      ...(reviewedRoth ? reviewedRoth.print : {}),
      ...(reviewed ? reviewed.print : {}),
      ...(!reviewed && distributions + conversions > 0
        ? {
          print_line6_year_end_value: input.year_end_ira_value ?? 0,
          print_line7_distributions: distributions,
          print_line8_conversions: conversions,
          print_line13_nontaxable: Math.max(0, basis - line14RemainingBasis),
          print_line15c_taxable: taxableTraditionalDist,
        }
        : {}),
      ...(conversions > 0
        ? {
          print_line16_converted: conversions,
          print_line18_taxable_conversion: taxableConversionAmt,
        }
        : {}),
    });
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    return {
      outputs,
      ...(line14RemainingBasis > 0
        ? { carryforwards: { ira_remaining_basis_8606: line14RemainingBasis } }
        : {}),
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8606 = new Form8606Node();
