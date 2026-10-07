import { z } from "zod";
import { retainedSourceCopySchema } from "./retained_source_copy.ts";
import { Form8949Part } from "../../intermediate/forms/form8949/index.ts";

// One sold block is kept distinct from the shares still owned at year end.
// The transaction and basis locators identify the reviewed broker records;
// they are not a substitute for retaining and checking the underlying bytes.
export const mtmDispositionSchema = z.object({
  transaction_id: z.string().trim().min(1),
  disposition_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  shares_disposed: z.number().int().positive(),
  fair_market_value_usd: z.number().nonnegative(),
  adjusted_basis_usd: z.number().nonnegative(),
  unreversed_inclusions_usd: z.number().nonnegative(),
  broker_record_id: z.string().trim().min(1),
  basis_record_id: z.string().trim().min(1),
  broker_record: retainedSourceCopySchema.extend({
    tax_form_kind: z.enum([
      "1099B_basis_reported",
      "1099B_basis_not_reported",
      "no_1099B",
    ]).optional(),
  }).optional(),
  basis_record: retainedSourceCopySchema.optional(),
  other_loss_review: z.object({
    acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    capital_asset_held_for_investment: z.literal(true),
    broker_tax_form: z.enum([
      "1099B_basis_reported",
      "1099B_basis_not_reported",
      "no_1099B",
    ]),
    wash_sale_disallowed_usd: z.literal(0),
    acquisition_record: retainedSourceCopySchema.extend({
      acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      capital_asset_held_for_investment: z.literal(true),
    }),
  }).strict().optional(),
}).strict().superRefine((source, ctx) => {
  const date = new Date(`${source.disposition_date}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== source.disposition_date
  ) {
    ctx.addIssue({ code: "custom", message: "MTM sale date must be real" });
  }
});

export type MtmDisposition = z.infer<typeof mtmDispositionSchema>;

export function calculateMtmDisposition(source: MtmDisposition) {
  const difference = source.fair_market_value_usd - source.adjusted_basis_usd;
  const ordinary = difference >= 0
    ? difference
    : -Math.min(-difference, source.unreversed_inclusions_usd);
  const otherLoss = difference < 0
    ? Math.max(0, -difference - source.unreversed_inclusions_usd)
    : 0;
  return { difference, ordinary, otherLoss };
}

/** The residual capital loss is separate from section 1296 ordinary loss. */
export function mtmOtherLossForm8949Transaction(
  source: MtmDisposition,
  pficReferenceId?: string,
) {
  const { otherLoss, ordinary } = calculateMtmDisposition(source);
  if (otherLoss <= 0) return undefined;
  const review = source.other_loss_review;
  if (!review) {
    throw new Error(
      "Form 8621 line 14c needs acquisition and capital-asset source",
    );
  }
  const acquired = new Date(`${review.acquisition_date}T00:00:00Z`);
  const sold = new Date(`${source.disposition_date}T00:00:00Z`);
  if (
    Number.isNaN(acquired.getTime()) || Number.isNaN(sold.getTime()) ||
    acquired.toISOString().slice(0, 10) !== review.acquisition_date ||
    acquired >= sold ||
    review.acquisition_record.acquisition_date !== review.acquisition_date
  ) {
    throw new Error("Form 8621 line 14c acquisition record differs from sale");
  }
  const anniversary = new Date(acquired);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  const longTerm = sold > anniversary;
  const part = review.broker_tax_form === "1099B_basis_reported"
    ? longTerm ? Form8949Part.D : Form8949Part.A
    : review.broker_tax_form === "1099B_basis_not_reported"
    ? longTerm ? Form8949Part.E : Form8949Part.B
    : longTerm
    ? Form8949Part.F
    : Form8949Part.C;
  const adjustment = -ordinary;
  return {
    part,
    description: `${source.shares_disposed} PFIC shares`,
    source_transaction_id: `form8621:${
      pficReferenceId ?? "source"
    }:${source.transaction_id}`,
    date_acquired: review.acquisition_date,
    date_sold: source.disposition_date,
    proceeds: source.fair_market_value_usd,
    cost_basis: source.adjusted_basis_usd,
    adjustment_codes: "O",
    adjustment_amount: adjustment,
    gain_loss: -otherLoss,
    is_long_term: longTerm,
  };
}
