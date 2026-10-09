import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";

// Form 8911 (2025) caps each personal property before the return-wide tax limit.
export enum FuelType {
  ElectricCharging = "electric_charging",
  Hydrogen = "hydrogen",
  NaturalGas = "natural_gas",
  Propane = "propane",
}

export const propertySchema = z.object({
  cost: z.number().nonnegative(),
  business_use_pct: z.number().min(0).max(1).optional(),
  fuel_type: z.nativeEnum(FuelType).optional(),
  non_electric_fuel_review: z.object({
    specification_reference: z.string().trim().min(1),
    // Combined volume share of the fuels listed in the 85% IRS category.
    qualifying_fuel_volume_fraction: z.number().min(0).max(1),
    storage_or_dispensing_at_vehicle_tank: z.boolean(),
  }).optional(),
  property_description: z.string().optional(),
  property_us_address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }).optional(),
  construction_began: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placed_in_service: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eligible_census_tract: z.boolean().optional(),
  census_tract_geoid: z.string().regex(/^\d{11}$/).optional(),
  main_home_property: z.boolean().optional(),
  certification_permit_number: z.string().trim().min(1).max(25).optional(),
});

export const inputSchema = propertySchema.partial().extend({
  properties: z.array(propertySchema.extend({
    property_reference: z.string().trim().min(1),
  })).min(1).optional(),
  regular_tax_before_credits: z.number().nonnegative().optional(),
  foreign_tax_credit: z.number().nonnegative().optional(),
  certain_allowable_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
}).superRefine((input, ctx) => {
  if (input.properties) {
    for (const key of Object.keys(propertySchema.shape)) {
      if (Object.hasOwn(input, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Form 8911 cannot mix properties with single-property fields",
        });
        break;
      }
    }
    const refs = input.properties.map((property) =>
      property.property_reference
    );
    if (new Set(refs).size !== refs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form 8911 property references must be unique",
      });
    }
  } else if (input.cost === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Form 8911 needs a cost or identified properties",
    });
  }
});

export type F8911Property = z.infer<typeof propertySchema>;

export function personalCreditProperties(
  rawInput: F8911Input,
): readonly F8911Property[] {
  const input = inputSchema.parse(rawInput);
  return (input.properties ?? [propertySchema.parse(input)]).filter((
    property,
  ) => property.cost > 0);
}

export type F8911Input = z.infer<typeof inputSchema>;

function assertNonElectricFuelSource(property: F8911Property): void {
  if (
    property.fuel_type === undefined ||
    property.fuel_type === FuelType.ElectricCharging
  ) {
    if (property.non_electric_fuel_review !== undefined) {
      throw new Error(
        "Form 8911 non-electric fuel review needs a non-electric fuel type",
      );
    }
    return;
  }
  const review = property.non_electric_fuel_review;
  if (
    !review || review.qualifying_fuel_volume_fraction < 0.85 ||
    review.storage_or_dispensing_at_vehicle_tank !== true
  ) {
    throw new Error(
      "Form 8911 non-electric property needs a referenced fuel specification with at least 85% qualifying fuel and storage or dispensing at the vehicle tank",
    );
  }
}

export interface PersonalCreditAmounts {
  readonly tentativeCredit: number;
  readonly regularTaxBeforeCredits: number;
  readonly foreignTaxCredit: number;
  readonly certainAllowableCredits: number;
  readonly totalOtherCredits: number;
  readonly netRegularTax: number;
  readonly tentativeMinimumTax: number;
  readonly adjustedRegularTax: number;
  readonly allowedCredit: number;
}

export function computePersonalCreditAmounts(
  rawInput: F8911Input,
): PersonalCreditAmounts | undefined {
  const input = inputSchema.parse(rawInput);
  const properties = personalCreditProperties(input);
  if (properties.length === 0) return undefined;
  for (const input of properties) {
    assertNonElectricFuelSource(input);
    if ((input.business_use_pct ?? 0) > 0) {
      throw new Error(
        "Form 8911 business credit requires the Form 3800 path and property-level wage data",
      );
    }
    if (
      !input.property_description || !input.property_us_address ||
      !input.construction_began || !input.placed_in_service
    ) {
      throw new Error(
        "Form 8911 needs the property description, structured address, and dates",
      );
    }
    if (input.eligible_census_tract !== true || !input.census_tract_geoid) {
      throw new Error(
        "Form 8911 needs a verified eligible census tract and 11-digit GEOID",
      );
    }
    if (input.main_home_property !== true) {
      throw new Error(
        "Form 8911 personal credit requires property at the taxpayer's main home",
      );
    }
  }
  if (
    input.regular_tax_before_credits === undefined ||
    input.tentative_minimum_tax === undefined
  ) {
    throw new Error(
      "Form 8911 needs regular tax and tentative minimum tax to limit the personal credit",
    );
  }
  // Retain cents across property amounts, then round the total entered on
  // Form 8911 line 4 (Form 1040 instructions: Rounding Off to Whole Dollars).
  const tentativeCredit = roundWholeDollars(properties.reduce(
    (sum, property) => sum + Math.min(property.cost * 0.30, 1_000),
    0,
  ));
  const foreignTaxCredit = input.foreign_tax_credit ?? 0;
  const certainAllowableCredits = input.certain_allowable_credits ?? 0;
  const totalOtherCredits = foreignTaxCredit + certainAllowableCredits;
  const netRegularTax = Math.max(
    0,
    input.regular_tax_before_credits - totalOtherCredits,
  );
  const adjustedRegularTax = Math.max(
    0,
    netRegularTax - input.tentative_minimum_tax,
  );
  return {
    tentativeCredit,
    regularTaxBeforeCredits: input.regular_tax_before_credits,
    foreignTaxCredit,
    certainAllowableCredits,
    totalOtherCredits,
    netRegularTax,
    tentativeMinimumTax: input.tentative_minimum_tax,
    adjustedRegularTax,
    allowedCredit: Math.min(tentativeCredit, adjustedRegularTax),
  };
}

class F8911Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8911";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251]);

  compute(_ctx: NodeContext, rawInput: F8911Input): NodeResult {
    const amounts = computePersonalCreditAmounts(rawInput);
    const outputs: NodeOutput[] = [];
    if (amounts) {
      if (amounts.allowedCredit > 0) {
        outputs.push(this.outputNodes.output(schedule3, {
          line6j_alt_fuel_vehicle_refueling: amounts.allowedCredit,
        }));
      }
      outputs.push(this.outputNodes.output(form6251, {
        must_file_for_credit: true,
      }));
    }
    return { outputs };
  }
}

export const f8911 = new F8911Node();
