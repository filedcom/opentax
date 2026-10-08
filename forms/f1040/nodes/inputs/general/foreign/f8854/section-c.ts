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

export enum Form8949LossTreatment {
  DeductibleCapital = "DEDUCTIBLE_CAPITAL",
  NondeductiblePersonalUse = "NONDEDUCTIBLE_PERSONAL_USE",
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
  form8949_loss_treatment: z.nativeEnum(Form8949LossTreatment).optional(),
  form8949_standard_holding_period_confirmed: z.literal(true).optional(),
  form8949_digital_asset: z.boolean().optional(),
}).strict().superRefine((asset, ctx) => {
  if (
    asset.form8949_loss_treatment !== undefined &&
    (asset.reported_form_code !== ReportedFormCode.Form8949 ||
      asset.fmv_day_before_expatriation >= asset.us_adjusted_basis)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8949 loss treatment applies only to a loss property reported on Form 8949",
      path: ["form8949_loss_treatment"],
    });
  }
  if (
    asset.form8949_standard_holding_period_confirmed !== undefined &&
    asset.reported_form_code !== ReportedFormCode.Form8949
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8949 holding-period confirmation applies only to Form 8949 property",
      path: ["form8949_standard_holding_period_confirmed"],
    });
  }
  if (
    asset.form8949_digital_asset !== undefined &&
    asset.reported_form_code !== ReportedFormCode.Form8949
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8949 digital-asset classification applies only to Form 8949 property",
      path: ["form8949_digital_asset"],
    });
  }
});

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
      valuation_letter_ruling_attachment_file_name: z.string().trim().min(1)
        .optional(),
    }).strict().superRefine((item, ctx) => {
      if (
        item.treatment === NongrantorTrustTreatment.ElectFullValue &&
        !item.valuation_letter_ruling_attachment_file_name
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Nongrantor trust full-value election requires an IRS valuation ruling",
          path: ["valuation_letter_ruling_attachment_file_name"],
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
  const reportedTransactionIds = new Set<string>();
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
  const reportedRows = [
    ...section.mark_to_market_assets,
    ...section.ineligible_deferred_compensation,
    ...section.specified_tax_deferred_accounts,
  ];
  for (const row of reportedRows) {
    if (reportedTransactionIds.has(row.reported_transaction_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `Duplicate Form 8854 reported transaction ID: ${row.reported_transaction_id}`,
        path: ["mark_to_market_assets"],
      });
    }
    reportedTransactionIds.add(row.reported_transaction_id);
  }
});

export type SectionC = z.infer<typeof sectionCSchema>;
export type MarkToMarketAsset = z.infer<typeof markToMarketAssetSchema>;
