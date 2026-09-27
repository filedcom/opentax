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

export enum ReportedFormCode {
  Form4797 = "F4797",
  Form8949 = "F8949",
  ScheduleD = "F1040 SCHD",
}

export enum NongrantorTrustTreatment {
  TreatyWaiver = "TREATY_WAIVER",
  ElectFullValue = "ELECT_FULL_VALUE",
}

export const markToMarketAssetSchema = z.object({
  ...identity,
  fmv_day_before_expatriation: money,
  us_adjusted_basis: money,
  basis_irrevocable_election_h2: z.boolean(),
  reported_form_code: z.nativeEnum(ReportedFormCode),
  reported_transaction_id: z.string().trim().min(1),
}).strict();

export const sectionCSchema = z.object({
  property_inventory_confirmed_complete: z.literal(true),
  mark_to_market_assets: z.array(markToMarketAssetSchema),
  eligible_deferred_compensation: z.array(
    z.object({
      ...identity,
      payor_eligible_under_877a_d1: z.literal(true),
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
      treatment: z.nativeEnum(NongrantorTrustTreatment),
      valuation_letter_ruling_document_id: z.string().regex(
        /^[A-Za-z0-9:.\-]{1,30}$/,
      ).optional(),
    }).strict().superRefine((item, ctx) => {
      if (
        item.treatment === NongrantorTrustTreatment.ElectFullValue &&
        !item.valuation_letter_ruling_document_id
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Nongrantor trust full-value election requires an IRS valuation ruling",
          path: ["valuation_letter_ruling_document_id"],
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
