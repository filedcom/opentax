import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { TS } from "../../../types.ts";
import { scheduleC } from "../../../inputs/schedule_c/index.ts";

const amount = z.number().int().finite().nonnegative().max(999_999_999_999_999);
const area = z.number().int().positive().max(999_999);

// One rented home, one Schedule C business, and operating expenses only.
// Owned homes, mortgage interest, taxes, casualty losses, and depreciation
// require additional primary-source and cross-form reconciliation.
export const rentedHomeSourceSchema = z.object({
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
}).strict();

export type RentedHomeSource = z.infer<typeof rentedHomeSourceSchema>;

export const inputSchema = z.object({
  rented_home: rentedHomeSourceSchema.optional(),
}).strict();

export const form8829LinesSchema = z.object({
  line1: amount,
  line2: amount,
  line3: z.number().min(0).max(1),
  line7: z.number().min(0).max(1),
  line8: z.number().int().finite(),
  line18b: amount,
  line19b: amount,
  line20b: amount,
  line21b: amount,
  line22b: amount,
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

export function calculateRentedHomeForm8829(
  raw: RentedHomeSource,
): Form8829Lines {
  const source = rentedHomeSourceSchema.parse(raw);
  if (source.business_area_sqft > source.total_area_sqft) {
    throw new Error("Form 8829 business area exceeds total home area");
  }
  const pct = Number(
    (source.business_area_sqft / source.total_area_sqft).toFixed(5),
  );
  const line23b = source.insurance_indirect + source.rent_indirect +
    source.repairs_indirect + source.utilities_indirect + source.other_indirect;
  const line24 = Math.round(line23b * pct);
  const line26 = line24 + source.prior_operating_carryover;
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
    line20b: source.repairs_indirect,
    line21b: source.utilities_indirect,
    line22b: source.other_indirect,
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

class Form8829Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_8829";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleC]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2025) throw new Error("Form 8829 route is TY2025 only");
    const input = inputSchema.parse(rawInput);
    if (!input.rented_home) return { outputs: [] };
    const lines = calculateRentedHomeForm8829(input.rented_home);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { rented_home: input.rented_home, ...lines },
        },
        ...(lines.line36 > 0
          ? [this.outputNodes.output(scheduleC, {
            form8829_line30: {
              business_reference: input.rented_home.business_reference,
              home_identifier: input.rented_home.home_identifier,
              recipient: input.rented_home.recipient,
              schedule_c_line29_tentative_profit:
                input.rented_home.schedule_c_line29_tentative_profit,
              line36: lines.line36,
            },
          })]
          : []),
      ],
    };
  }
}

export const form_8829 = new Form8829Node();
