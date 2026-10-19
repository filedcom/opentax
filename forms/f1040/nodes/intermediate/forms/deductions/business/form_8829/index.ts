import {
  assertRentedHomeEvidenceYear,
  reconcileRentedHomeEvidence,
  rentedHomeEvidenceSchema,
} from "./source.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { TS } from "../../../../../types.ts";
import { scheduleC } from "../../../../../inputs/income/business/schedule_c/index.ts";
import { scheduleA } from "../../../../../inputs/deductions/itemized/schedule_a/index.ts";

// How the return deducts the home's mortgage interest and real estate taxes.
// 2025 Instructions for Form 8829, lines 10, 11, 16 and 17: an itemizer puts
// the deductible amounts on lines 10 and 11; a filer taking the standard
// deduction puts them on lines 16 and 17.
export enum OwnedHomeDeductionRoute {
  Itemized = "itemized",
  Standard = "standard",
}

const amount = z.number().int().finite().nonnegative().max(999_999_999_999_999);
const area = z.number().int().positive().max(999_999);

// One rented home, one Schedule C business, and operating expenses only.
// An owned home uses ownedHomeSourceSchema below.
export const rentedHomeSourceSchema = z.object({
  source_evidence: rentedHomeEvidenceSchema.optional(),
  business_reference: z.string().trim().min(1),
  home_identifier: z.string().trim().min(1),
  recipient: z.nativeEnum(TS),
  business_area_sqft: area,
  total_area_sqft: area,
  schedule_c_line29_tentative_profit: z.number().int().finite().min(
    -999_999_999_999_999,
  ).max(999_999_999_999_999),
  insurance_indirect: amount,
  rent_indirect: amount,
  repairs_direct: amount,
  repairs_indirect: amount,
  utilities_indirect: amount,
  other_indirect: amount,
  prior_operating_carryover: amount,
  regular_exclusive_use_verified: z.literal(true),
  actual_expense_method_verified: z.literal(true),
  rented_home_verified: z.literal(true),
  sole_home_and_business_verified: z.literal(true),
  all_schedule_c_gross_income_attributable_to_home_verified: z.literal(true),
  no_daycare_or_inventory_exception: z.literal(true),
  no_home_business_gain_or_other_trade_loss: z.literal(true),
  no_casualty_mortgage_tax_or_depreciation: z.literal(true),
  home_expenses_excluded_from_schedule_c_verified: z.literal(true),
  direct_repairs_business_area_only_verified: z.literal(true),
}).strict();

export type RentedHomeSource = z.infer<typeof rentedHomeSourceSchema>;

// Part III: the home's basis, its land, and when business use began. Additions
// and improvements placed in service after business use began are not covered.
const ownedHomeDepreciationSchema = z.object({
  home_cost_or_other_basis: amount,
  home_fmv_when_business_use_began: amount,
  land_basis: amount,
  business_use_began_year: z.number().int().min(1993),
  business_use_began_month: z.number().int().min(1).max(12),
  no_additions_after_business_use_verified: z.literal(true),
}).strict();

// One owned home and one Schedule C business. Indirect expenses are the whole
// home's; Form 8829 applies the business percentage.
export const ownedHomeSourceSchema = z.object({
  business_reference: z.string().trim().min(1),
  home_identifier: z.string().trim().min(1),
  recipient: z.nativeEnum(TS),
  business_area_sqft: area,
  total_area_sqft: area,
  schedule_c_line29_tentative_profit: z.number().int().finite().min(
    -999_999_999_999_999,
  ).max(999_999_999_999_999),
  deduction_route: z.nativeEnum(OwnedHomeDeductionRoute),
  // Interest deductible as if the whole home were personal (line 10, Step 1).
  mortgage_interest_indirect: amount,
  // Acquisition-loan interest above that amount (line 16, itemizers).
  excess_mortgage_interest_indirect: amount.default(0),
  real_estate_taxes_indirect: amount,
  // Line 11 Step 1: state and local taxes are within the Schedule A limit.
  state_local_taxes_within_limit_verified: z.literal(true).optional(),
  insurance_indirect: amount,
  repairs_direct: amount,
  repairs_indirect: amount,
  utilities_indirect: amount,
  other_indirect: amount,
  prior_operating_carryover: amount,
  prior_casualty_and_depreciation_carryover: amount,
  depreciation: ownedHomeDepreciationSchema.optional(),
  regular_exclusive_use_verified: z.literal(true),
  actual_expense_method_verified: z.literal(true),
  sole_home_and_business_verified: z.literal(true),
  all_schedule_c_gross_income_attributable_to_home_verified: z.literal(true),
  no_daycare_or_inventory_exception: z.literal(true),
  no_home_business_gain_or_other_trade_loss: z.literal(true),
  no_casualty_loss: z.literal(true),
  home_expenses_excluded_from_schedule_c_verified: z.literal(true),
  direct_repairs_business_area_only_verified: z.literal(true),
  home_interest_and_taxes_entered_only_here_verified: z.literal(true),
}).strict();

export type OwnedHomeSource = z.infer<typeof ownedHomeSourceSchema>;

export const inputSchema = z.object({
  rented_home: rentedHomeSourceSchema.optional(),
  owned_home: ownedHomeSourceSchema.optional(),
}).strict().refine(
  (input) => !(input.rented_home && input.owned_home),
  "Form 8829 covers one home: enter rented_home or owned_home",
);

export const form8829LinesSchema = z.object({
  line1: amount,
  line2: amount,
  line3: z.number().min(0).max(1),
  line7: z.number().min(0).max(1),
  line8: z.number().int().finite(),
  line18b: amount,
  line19b: amount,
  line20a: amount,
  line20b: amount,
  line21b: amount,
  line22b: amount,
  line23a: amount,
  line23b: amount,
  line24: amount,
  line25: amount,
  line26: amount,
  line27: amount,
  line28: amount,
  line32: amount,
  line33: amount,
  line34: amount,
  line35: amount,
  line36: amount,
  line43: amount,
  line44: amount,
});

export type Form8829Lines = z.infer<typeof form8829LinesSchema>;

export const ownedHomeLinesSchema = z.object({
  line1: amount,
  line2: amount,
  line3: z.number().min(0).max(1),
  line7: z.number().min(0).max(1),
  line8: z.number().int().finite(),
  line10b: amount,
  line11b: amount,
  line12b: amount,
  line13: amount,
  line14: amount,
  line15: amount,
  line16b: amount,
  line17b: amount,
  line18b: amount,
  line20a: amount,
  line20b: amount,
  line21b: amount,
  line22b: amount,
  line23a: amount,
  line23b: amount,
  line24: amount,
  line25: amount,
  line26: amount,
  line27: amount,
  line28: amount,
  line30: amount,
  line31: amount,
  line32: amount,
  line33: amount,
  line34: amount,
  line35: amount,
  line36: amount,
  line37: amount,
  line38: amount,
  line39: amount,
  line40: amount,
  line41: z.number().min(0).max(1),
  line42: amount,
  line43: amount,
  line44: amount,
  // Schedule A shares not attributable to business use (lines 10 and 11).
  schedule_a_mortgage_interest: amount,
  schedule_a_real_estate_taxes: amount,
});

export type OwnedHomeLines = z.infer<typeof ownedHomeLinesSchema>;

// Line 41: nonresidential real property, 39-year straight line, mid-month.
// The first-year rate depends on the month business use began.
const FIRST_YEAR_DEPRECIATION_RATE = [
  0.02461,
  0.02247,
  0.02033,
  0.01819,
  0.01605,
  0.01391,
  0.01177,
  0.00963,
  0.00749,
  0.00535,
  0.00321,
  0.00107,
] as const;
const LATER_YEAR_DEPRECIATION_RATE = 0.02564;
const RECOVERY_YEARS = 39;

export function calculateRentedHomeForm8829(
  raw: RentedHomeSource,
): Form8829Lines {
  const source = rentedHomeSourceSchema.parse(raw);
  if (source.source_evidence) reconcileRentedHomeEvidence(source);
  if (source.business_area_sqft > source.total_area_sqft) {
    throw new Error("Form 8829 business area exceeds total home area");
  }
  const pct = Number(
    (source.business_area_sqft / source.total_area_sqft).toFixed(5),
  );
  const line23b = source.insurance_indirect + source.rent_indirect +
    source.repairs_indirect + source.utilities_indirect + source.other_indirect;
  const line24 = Math.round(line23b * pct);
  const line23a = source.repairs_direct;
  const line26 = line23a + line24 + source.prior_operating_carryover;
  const line27 = Math.min(
    Math.max(0, source.schedule_c_line29_tentative_profit),
    line26,
  );
  const line28 = Math.max(
    0,
    source.schedule_c_line29_tentative_profit - line27,
  );
  return form8829LinesSchema.parse({
    line1: source.business_area_sqft,
    line2: source.total_area_sqft,
    line3: pct,
    line7: pct,
    line8: source.schedule_c_line29_tentative_profit,
    line18b: source.insurance_indirect,
    line19b: source.rent_indirect,
    line20a: source.repairs_direct,
    line20b: source.repairs_indirect,
    line21b: source.utilities_indirect,
    line22b: source.other_indirect,
    line23a,
    line23b,
    line24,
    line25: source.prior_operating_carryover,
    line26,
    line27,
    line28,
    line32: 0,
    line33: 0,
    line34: line27,
    line35: 0,
    line36: line27,
    line43: line26 - line27,
    line44: 0,
  });
}

function businessPercentage(businessArea: number, totalArea: number): number {
  if (businessArea > totalArea) {
    throw new Error("Form 8829 business area exceeds total home area");
  }
  return Number((businessArea / totalArea).toFixed(5));
}

/** Line 41 for the return year; business use before 2025 takes 2.564%. */
function depreciationRate(
  depreciation: z.infer<typeof ownedHomeDepreciationSchema>,
  taxYear: number,
): number {
  const year = depreciation.business_use_began_year;
  if (year > taxYear) {
    throw new Error("Form 8829 business use begins after the return year");
  }
  if (taxYear - year >= RECOVERY_YEARS - 1) {
    throw new Error(
      "Form 8829 depreciation in the final recovery year needs its own rate",
    );
  }
  if (year === 1993 && depreciation.business_use_began_month <= 5) {
    throw new Error(
      "Form 8829 business use before May 13, 1993 uses a 31.5-year rate",
    );
  }
  return year === taxYear
    ? FIRST_YEAR_DEPRECIATION_RATE[depreciation.business_use_began_month - 1]
    : LATER_YEAR_DEPRECIATION_RATE;
}

function homeDepreciation(
  source: OwnedHomeSource,
  pct: number,
  taxYear: number,
) {
  const depreciation = source.depreciation;
  if (!depreciation) {
    return { line37: 0, line38: 0, line39: 0, line40: 0, line41: 0, line42: 0 };
  }
  const line37 = Math.min(
    depreciation.home_cost_or_other_basis,
    depreciation.home_fmv_when_business_use_began,
  );
  if (depreciation.land_basis > line37) {
    throw new Error("Form 8829 land basis exceeds the home's basis");
  }
  const line39 = line37 - depreciation.land_basis;
  const line40 = Math.round(line39 * pct);
  const line41 = depreciationRate(depreciation, taxYear);
  return {
    line37,
    line38: depreciation.land_basis,
    line39,
    line40,
    line41,
    line42: Math.round(line40 * line41),
  };
}

/** Part I-IV for an owned home (2025 Instructions for Form 8829). */
export function calculateOwnedHomeForm8829(
  raw: OwnedHomeSource,
  taxYear: number,
): OwnedHomeLines {
  const source = ownedHomeSourceSchema.parse(raw);
  const itemized = source.deduction_route === OwnedHomeDeductionRoute.Itemized;
  if (
    itemized && source.real_estate_taxes_indirect > 0 &&
    source.state_local_taxes_within_limit_verified !== true
  ) {
    throw new Error(
      "Form 8829 line 11 needs state and local taxes within the Schedule A limit; the Line 11 Worksheet is not supported",
    );
  }
  if (!itemized && source.excess_mortgage_interest_indirect > 0) {
    throw new Error(
      "Form 8829 standard-deduction route puts all mortgage interest on line 16",
    );
  }
  const pct = businessPercentage(
    source.business_area_sqft,
    source.total_area_sqft,
  );
  const line10b = itemized ? source.mortgage_interest_indirect : 0;
  const line11b = itemized ? source.real_estate_taxes_indirect : 0;
  const line12b = line10b + line11b;
  const line13 = Math.round(line12b * pct);
  const line14 = line13;
  const line15 = Math.max(0, source.schedule_c_line29_tentative_profit - line14);
  const line16b = itemized
    ? source.excess_mortgage_interest_indirect
    : source.mortgage_interest_indirect;
  const line17b = itemized ? 0 : source.real_estate_taxes_indirect;
  const line23a = source.repairs_direct;
  const line23b = line16b + line17b + source.insurance_indirect +
    source.repairs_indirect + source.utilities_indirect + source.other_indirect;
  const line24 = Math.round(line23b * pct);
  const line26 = line23a + line24 + source.prior_operating_carryover;
  const line27 = Math.min(line15, line26);
  const line28 = line15 - line27;
  const depreciation = homeDepreciation(source, pct, taxYear);
  const line32 = depreciation.line42 + source.prior_casualty_and_depreciation_carryover;
  const line33 = Math.min(line28, line32);
  const line34 = line14 + line27 + line33;
  // The business share of line 10 comes off Schedule A line 8a; the rest of
  // line 13 is the business share of line 11, off Schedule A line 5b.
  const businessInterest = Math.round(line10b * pct);
  return ownedHomeLinesSchema.parse({
    line1: source.business_area_sqft,
    line2: source.total_area_sqft,
    line3: pct,
    line7: pct,
    line8: source.schedule_c_line29_tentative_profit,
    line10b,
    line11b,
    line12b,
    line13,
    line14,
    line15,
    line16b,
    line17b,
    line18b: source.insurance_indirect,
    line20a: source.repairs_direct,
    line20b: source.repairs_indirect,
    line21b: source.utilities_indirect,
    line22b: source.other_indirect,
    line23a,
    line23b,
    line24,
    line25: source.prior_operating_carryover,
    line26,
    line27,
    line28,
    line30: depreciation.line42,
    line31: source.prior_casualty_and_depreciation_carryover,
    line32,
    line33,
    line34,
    line35: 0,
    line36: line34,
    ...depreciation,
    line43: line26 - line27,
    line44: line32 - line33,
    schedule_a_mortgage_interest: line10b - businessInterest,
    schedule_a_real_estate_taxes: line11b - (line13 - businessInterest),
  });
}

function scheduleCClaim(
  source: RentedHomeSource | OwnedHomeSource,
  line36: number,
) {
  return {
    form8829_line30: {
      business_reference: source.business_reference,
      home_identifier: source.home_identifier,
      recipient: source.recipient,
      schedule_c_line29_tentative_profit:
        source.schedule_c_line29_tentative_profit,
      line36,
    },
  };
}

function ownedHomeScheduleA(lines: OwnedHomeLines): NodeOutput[] {
  const interest = lines.schedule_a_mortgage_interest;
  const taxes = lines.schedule_a_real_estate_taxes;
  if (interest > 0) {
    return [output(scheduleA, {
      line_8a_mortgage_interest_1098: interest,
      ...(taxes > 0 ? { line_5b_real_estate_tax: taxes } : {}),
    })];
  }
  return taxes > 0
    ? [output(scheduleA, { line_5b_real_estate_tax: taxes })]
    : [];
}

function ownedHomeCarryforwards(
  source: OwnedHomeSource,
  lines: OwnedHomeLines,
): Record<string, number> {
  return {
    ...(lines.line43 > 0
      ? { [`form8829_line43:${source.home_identifier}`]: lines.line43 }
      : {}),
    ...(lines.line44 > 0
      ? { [`form8829_line44:${source.home_identifier}`]: lines.line44 }
      : {}),
  };
}

class Form8829Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_8829";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleC, scheduleA]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.owned_home) return this.ownedHome(ctx, input.owned_home);
    if (!input.rented_home) return { outputs: [] };
    // Draft 2026 Form 8829 keeps the 2025 Part II lines 23-36.
    assertRentedHomeEvidenceYear(input.rented_home, ctx.taxYear);
    const lines = calculateRentedHomeForm8829(input.rented_home);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { rented_home: input.rented_home, ...lines },
        },
        ...(lines.line36 > 0
          ? [this.outputNodes.output(
            scheduleC,
            scheduleCClaim(input.rented_home, lines.line36),
          )]
          : []),
      ],
    };
  }

  private ownedHome(ctx: NodeContext, source: OwnedHomeSource): NodeResult {
    const lines = calculateOwnedHomeForm8829(source, ctx.taxYear);
    const carryforwards = ownedHomeCarryforwards(source, lines);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { owned_home: source, ...lines },
        },
        ...(lines.line36 > 0
          ? [this.outputNodes.output(
            scheduleC,
            scheduleCClaim(source, lines.line36),
          )]
          : []),
        ...ownedHomeScheduleA(lines),
      ],
      ...(Object.keys(carryforwards).length > 0 ? { carryforwards } : {}),
    };
  }
}

export const form_8829 = new Form8829Node();
