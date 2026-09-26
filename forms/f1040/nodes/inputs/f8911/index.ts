import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// Form 8911 (2025) takes a separate Schedule A for each property. The current
// MeF v3.0 package has no Schedule A (Form 8911) XML element, so this node
// computes the personal credit while the full ATS attachment remains pending.
export enum FuelType {
  ElectricCharging = "electric_charging",
  Hydrogen = "hydrogen",
  NaturalGas = "natural_gas",
  Propane = "propane",
}

export const inputSchema = z.object({
  cost: z.number().nonnegative(),
  business_use_pct: z.number().min(0).max(1).optional(),
  fuel_type: z.nativeEnum(FuelType).optional(),
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
  regular_tax_before_credits: z.number().nonnegative().optional(),
  foreign_tax_credit: z.number().nonnegative().optional(),
  certain_allowable_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
});

export type F8911Input = z.infer<typeof inputSchema>;

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
  if (input.cost === 0) return undefined;
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
  if (
    input.regular_tax_before_credits === undefined ||
    input.tentative_minimum_tax === undefined
  ) {
    throw new Error(
      "Form 8911 needs regular tax and tentative minimum tax to limit the personal credit",
    );
  }
  const tentativeCredit = Math.min(input.cost * 0.30, 1_000);
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
