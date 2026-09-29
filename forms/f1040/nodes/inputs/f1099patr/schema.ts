import { z } from "zod";

// Per-entry schema — one 1099-PATR from one cooperative
export const itemSchema = z.object({
  box1_patronage_dividends: z.number().nonnegative().optional(),
  box2_nonpatronage_distributions: z.number().nonnegative().optional(),
  box3_per_unit_retain: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_redeemed_nonqualified: z.number().nonnegative().optional(),
  // Box 6 — specified cooperative's section 199A(g) deduction passed to patron.
  box6_section199ag_deduction: z.number().nonnegative().optional(),
  // Box 7 — Qualified payments (affects §199A QBI calculation)
  // Informational for Form 8995/8995-A; tracked here but no direct output
  box7_qualified_payments: z.number().nonnegative().optional(),
  // Boxes 8 and 9 — informational section 199A(a) non-SSTB/SSTB items.
  box8_section199aa_qualified_items: z.number().optional(),
  box9_section199aa_sstb_items: z.number().optional(),
  // Box 13 — payer is a specified agricultural or horticultural cooperative.
  box13_specified_cooperative: z.boolean().optional(),
  payer_name: z.string().optional(),
  payer_tin: z.string().optional(),
  account_number: z.string().optional(),
  // Retained for the specified-cooperative QBI source cross-check.
  trade_or_business: z.boolean().optional(),
  distribution_treatment: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("farm"),
      farm_id: z.string().min(1),
      verified_taxable_amount: z.number().nonnegative(),
    }).strict(),
    z.object({
      kind: z.literal("personal_basis_adjustment"),
      purchase_reference: z.string().min(1),
      verified_basis_reduction: z.number().nonnegative(),
    }).strict(),
  ]).optional(),
}).superRefine((item, ctx) => {
  const gross = distributionTotal(item);
  const treatment = item.distribution_treatment;
  if (gross > 0 && !treatment) {
    ctx.addIssue({
      code: "custom",
      message:
        "1099-PATR distributions require a verified farm or personal-purchase treatment",
    });
  }
  if (treatment?.kind === "farm") {
    if (
      item.trade_or_business === false ||
      treatment.verified_taxable_amount > gross
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "1099-PATR farm taxable amount must not exceed gross distributions or contradict business classification",
      });
    }
  }
  if (treatment?.kind === "personal_basis_adjustment") {
    if (
      item.trade_or_business === true ||
      (item.box2_nonpatronage_distributions ?? 0) > 0 ||
      (item.box3_per_unit_retain ?? 0) > 0 ||
      (item.box5_redeemed_nonqualified ?? 0) > 0 ||
      treatment.verified_basis_reduction !== gross
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "1099-PATR personal treatment requires box 1 only and a matching verified basis reduction",
      });
    }
  }
});

export const inputSchema = z.object({
  f1099patrs: z.array(itemSchema).min(1),
});

export type PATRItem = z.infer<typeof itemSchema>;
export type PATRItems = PATRItem[];

export function distributionTotal(item: {
  box1_patronage_dividends?: number;
  box2_nonpatronage_distributions?: number;
  box3_per_unit_retain?: number;
  box5_redeemed_nonqualified?: number;
}): number {
  return (item.box1_patronage_dividends ?? 0) +
    (item.box2_nonpatronage_distributions ?? 0) +
    (item.box3_per_unit_retain ?? 0) +
    (item.box5_redeemed_nonqualified ?? 0);
}
