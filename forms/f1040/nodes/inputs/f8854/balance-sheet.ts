import { z } from "zod";

const money = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  "Form 8854 balance-sheet amounts must have safe cent precision",
);

const valuePair = z.object({
  fair_market_value: money,
  us_adjusted_basis: money,
});

const ein = z.string().regex(/^\d{9}$/);
const description = z.string().trim().min(1);

export const balanceSheetSchema = z.object({
  asset_categories_confirmed_complete: z.literal(true),
  liabilities_confirmed_complete: z.literal(true),
  cash_and_bank_deposits: valuePair.optional(),
  marketable_us_securities: valuePair.optional(),
  marketable_foreign_securities: valuePair.optional(),
  nonmarketable_us_securities: valuePair.optional(),
  nonmarketable_foreign_securities: valuePair.optional(),
  // Section B line 5a is a disclosure subset of line 5, not another asset.
  foreign_cfc_securities_within_line5: z.array(valuePair.extend({
    foreign_entity_description: description,
  })).max(100),
  pensions_and_retirement_arrangements: valuePair.optional(),
  deferred_compensation_and_stock_options: valuePair.optional(),
  partnership_interests: z.array(valuePair.extend({
    partnership_name: description,
    ein: ein.optional(),
  })).max(1000),
  owned_trust_assets: z.array(valuePair.extend({
    trust_name: description,
    trust_ein: ein.optional(),
    asset_description: description,
  })).max(1000),
  nongrantor_trust_interests: z.array(valuePair.extend({
    trust_name: description,
    trust_ein: ein.optional(),
  })).max(1000),
  intangibles_used_in_us: valuePair.optional(),
  intangibles_used_outside_us: valuePair.optional(),
  loans_to_us_persons: valuePair.optional(),
  loans_to_foreign_persons: valuePair.optional(),
  us_real_property: valuePair.optional(),
  foreign_real_property: valuePair.optional(),
  us_business_property: valuePair.optional(),
  foreign_business_property: valuePair.optional(),
  other_assets: z.array(valuePair.extend({
    description,
  })).max(1000),
  installment_obligations_liability: money,
  mortgage_liability: money,
  other_liabilities: z.array(z.object({
    description,
    amount: money,
  })).max(1000),
}).superRefine((sheet, ctx) => {
  const line5 = sheet.nonmarketable_foreign_securities;
  const subsetFmv = sheet.foreign_cfc_securities_within_line5.reduce(
    (sum, row) => sum + BigInt(Math.round(row.fair_market_value * 100)),
    0n,
  );
  const subsetBasis = sheet.foreign_cfc_securities_within_line5.reduce(
    (sum, row) => sum + BigInt(Math.round(row.us_adjusted_basis * 100)),
    0n,
  );
  if (
    subsetFmv > BigInt(Math.round((line5?.fair_market_value ?? 0) * 100)) ||
    subsetBasis > BigInt(Math.round((line5?.us_adjusted_basis ?? 0) * 100))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 8854 line 5a cannot exceed its line 5 foreign-securities total",
      path: ["foreign_cfc_securities_within_line5"],
    });
  }
});

export type BalanceSheet = z.infer<typeof balanceSheetSchema>;

const simpleAssetKeys = [
  "cash_and_bank_deposits",
  "marketable_us_securities",
  "marketable_foreign_securities",
  "nonmarketable_us_securities",
  "nonmarketable_foreign_securities",
  "pensions_and_retirement_arrangements",
  "deferred_compensation_and_stock_options",
  "intangibles_used_in_us",
  "intangibles_used_outside_us",
  "loans_to_us_persons",
  "loans_to_foreign_persons",
  "us_real_property",
  "foreign_real_property",
  "us_business_property",
  "foreign_business_property",
] as const;

function cents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function amount(centsValue: bigint): number {
  if (
    centsValue > BigInt(Number.MAX_SAFE_INTEGER) ||
    centsValue < -BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(
      "Form 8854 balance-sheet total exceeds safe cent precision",
    );
  }
  return Number(centsValue) / 100;
}

export function calculateBalanceSheet(rawSheet: BalanceSheet) {
  const sheet = balanceSheetSchema.parse(rawSheet);
  const assetRows = [
    ...simpleAssetKeys.flatMap((key) => {
      const row = sheet[key];
      return row ? [row] : [];
    }),
    ...sheet.partnership_interests,
    ...sheet.owned_trust_assets,
    ...sheet.nongrantor_trust_interests,
    ...sheet.other_assets,
  ];
  const totalAssetsFmvCents = assetRows.reduce(
    (sum, row) => sum + cents(row.fair_market_value),
    0n,
  );
  const totalAssetsBasisCents = assetRows.reduce(
    (sum, row) => sum + cents(row.us_adjusted_basis),
    0n,
  );
  const totalLiabilitiesCents = cents(sheet.installment_obligations_liability) +
    cents(sheet.mortgage_liability) +
    sheet.other_liabilities.reduce((sum, row) => sum + cents(row.amount), 0n);
  return {
    totalAssetsFairMarketValue: amount(totalAssetsFmvCents),
    totalAssetsUsAdjustedBasis: amount(totalAssetsBasisCents),
    totalLiabilities: amount(totalLiabilitiesCents),
    netWorth: amount(totalAssetsFmvCents - totalLiabilitiesCents),
  };
}
