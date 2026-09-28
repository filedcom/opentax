import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

const amount = z.number().int().finite().nonnegative().max(999_999_999_999_999);

// This direct Schedule C route files Form 8990 only when all business interest
// remains deductible. A disallowance changes Schedule C, SE tax, and QBI; an
// add-back on Schedule 1 alone would not be a valid replacement.
export const directScheduleCSourceSchema = z.object({
  business_reference: z.string().trim().min(1),
  current_year_business_interest_expense: amount.positive(),
  tentative_taxable_income: z.number().int().finite().min(-999_999_999_999_999)
    .max(999_999_999_999_999),
  section172_nol_deduction: amount,
  section199a_qbi_deduction: amount,
  business_depreciation_amortization_depletion: amount,
  current_year_business_interest_income: amount,
  average_prior_three_year_gross_receipts: amount,
  not_a_tax_shelter_verified: z.literal(true),
  sole_direct_non_passthrough_business_verified: z.literal(true),
  no_prior_disallowed_interest: z.literal(true),
  no_floor_plan_financing_interest: z.literal(true),
  no_other_ati_additions_or_reductions: z.literal(true),
  no_nonbusiness_items_in_tentative_income: z.literal(true),
  no_pass_through_excess_items: z.literal(true),
}).strict();

export type DirectScheduleCSource = z.infer<typeof directScheduleCSourceSchema>;

export const inputSchema = z.object({
  direct_schedule_c: directScheduleCSourceSchema.optional(),
}).strict();

export const form8990LinesSchema = z.object({
  line1: amount,
  line2: amount,
  line4: amount,
  line5: amount,
  line6: z.number().int().finite(),
  line8: amount,
  line9: amount,
  line10: amount,
  line11: amount,
  line16: amount,
  line18: amount,
  line21: amount,
  line22: amount,
  line23: amount,
  line25: amount,
  line26: amount,
  line29: amount,
  line30: amount,
  line31: amount,
});

export type Form8990Lines = z.infer<typeof form8990LinesSchema>;

export function calculateDirectScheduleCForm8990(
  raw: DirectScheduleCSource,
  _smallBusinessGrossReceiptsThreshold: number,
): Form8990Lines {
  directScheduleCSourceSchema.parse(raw);
  throw new Error(
    "Form 8990 ATI components are not reconciled to the filed return",
  );
}

class Form8990Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8990";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2025) throw new Error("Form 8990 route is TY2025 only");
    const input = inputSchema.parse(rawInput);
    if (!input.direct_schedule_c) return { outputs: [] };
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    const lines = calculateDirectScheduleCForm8990(
      input.direct_schedule_c,
      cfg.smallBizGrossReceipts,
    );
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: { direct_schedule_c: input.direct_schedule_c, ...lines },
      }],
    };
  }
}

export const form8990 = new Form8990Node();
