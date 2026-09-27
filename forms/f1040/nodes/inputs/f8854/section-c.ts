import { z } from "zod";

const money = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  "Form 8854 Section C amounts must have safe cent precision",
);

const identity = {
  item_id: z.string().trim().min(1),
  description: z.string().trim().min(1),
};

export const markToMarketAssetSchema = z.object({
  ...identity,
  fmv_day_before_expatriation: money,
  us_adjusted_basis: money,
  basis_irrevocable_election_h2: z.boolean(),
  reported_form_code: z.enum(["F4797", "F8949", "F1040 SCHD"]),
  reported_transaction_id: z.string().trim().min(1),
}).strict();

export const sectionCSchema = z.object({
  mark_to_market_assets: z.array(markToMarketAssetSchema),
  eligible_deferred_compensation: z.array(
    z.object({
      ...identity,
      w8ce_payor_notification_confirmed: z.literal(true),
      irrevocable_treaty_waiver_confirmed: z.literal(true),
    }).strict(),
  ).max(1000),
  ineligible_deferred_compensation: z.array(
    z.object({
      ...identity,
      present_value_day_before_expatriation: money,
      reported_transaction_id: z.string().trim().min(1),
    }).strict(),
  ).max(1000),
  specified_tax_deferred_accounts: z.array(
    z.object({
      ...identity,
      entire_account_balance_day_before_expatriation: money,
      reported_transaction_id: z.string().trim().min(1),
    }).strict(),
  ).max(1000),
  nongrantor_trust_interests: z.array(
    z.object({
      ...identity,
      treatment: z.enum(["TREATY_WAIVER", "ELECT_FULL_VALUE"]),
      valuation_letter_ruling_reference: z.string().trim().min(1).optional(),
    }).strict().superRefine((item, ctx) => {
      if (
        item.treatment === "ELECT_FULL_VALUE" &&
        !item.valuation_letter_ruling_reference
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Nongrantor trust full-value election requires an IRS valuation ruling",
          path: ["valuation_letter_ruling_reference"],
        });
      }
    }),
  ).max(1000),
}).strict().superRefine((section, ctx) => {
  const rows = [
    ...section.mark_to_market_assets,
    ...section.eligible_deferred_compensation,
    ...section.ineligible_deferred_compensation,
    ...section.specified_tax_deferred_accounts,
    ...section.nongrantor_trust_interests,
  ];
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.item_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate Form 8854 Section C item ID: ${row.item_id}`,
        path: ["mark_to_market_assets"],
      });
    }
    ids.add(row.item_id);
  }
});

export type SectionC = z.infer<typeof sectionCSchema>;
export type MarkToMarketAsset = z.infer<typeof markToMarketAssetSchema>;
