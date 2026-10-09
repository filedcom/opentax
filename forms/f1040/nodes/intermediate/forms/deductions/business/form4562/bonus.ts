import { z } from "zod";

// One new, nonlisted, wholly business-use MACRS asset acquired after Jan. 19.
export const bonusAssetSchema = z.object({
  business_reference: z.string().trim().min(1),
  activity_description: z.string().trim().min(1).max(40),
  asset_description: z.string().trim().min(1).max(100),
  source_document_ref: z.string().trim().min(1),
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  acquired_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  placed_in_service_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  cost: z.number().int().positive(),
  macrs_recovery_period_years: z.union([
    z.literal(3),
    z.literal(5),
    z.literal(7),
    z.literal(10),
    z.literal(15),
    z.literal(20),
  ]),
  qualification_review_reference: z.string().trim().min(1),
  original_use_began_with_taxpayer: z.literal(true),
  business_use_pct: z.literal(100),
  is_listed_property: z.literal(false),
  required_to_use_ads: z.literal(false),
  excluded_from_bonus_under_section168k: z.literal(false),
  bonus_elected_out: z.literal(false),
  reduced_bonus_election: z.literal(false),
  section179_deduction: z.literal(0),
  no_other_depreciation_assets_on_return: z.literal(true),
  return_asset_inventory_source_ref: z.string().trim().min(1),
  form8911_property_reference: z.string().trim().min(1).optional(),
  credit_basis_reduction: z.number().int().nonnegative(),
}).strict();

export const filedBonus4562Schema = z.object({
  bonus_asset: bonusAssetSchema,
  activity_description: z.string(),
  line14_special_depreciation_allowance: z.number().int().nonnegative(),
  line22_total_depreciation: z.number().int().nonnegative(),
});

export function calculateBonus4562(raw: unknown) {
  const asset = bonusAssetSchema.parse(raw);
  for (const value of [asset.acquired_date, asset.placed_in_service_date]) {
    const date = new Date(`${value}T00:00:00Z`);
    if (
      Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error(
        "Form 4562 bonus asset needs real acquisition and service dates",
      );
    }
  }
  if (
    asset.acquired_date <= "2025-01-19" ||
    asset.placed_in_service_date < asset.acquired_date
  ) {
    throw new Error(
      "Form 4562 100% bonus asset must be acquired after January 19, 2025 and placed in service afterward",
    );
  }
  if (
    asset.credit_basis_reduction >= asset.cost ||
    (asset.credit_basis_reduction > 0 && !asset.form8911_property_reference)
  ) {
    throw new Error(
      "Form 4562 bonus basis reduction needs a linked credit and positive remaining basis",
    );
  }
  const depreciation = asset.cost - asset.credit_basis_reduction;
  return filedBonus4562Schema.parse({
    bonus_asset: asset,
    activity_description: asset.activity_description,
    line14_special_depreciation_allowance: depreciation,
    line22_total_depreciation: depreciation,
  });
}
