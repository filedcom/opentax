import { z } from "zod";

// New, nonlisted, wholly business-use MACRS property acquired after Jan. 19.
export const bonusAssetCoreSchema = z.object({
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
  form8911_property_reference: z.string().trim().min(1).optional(),
  credit_basis_reduction: z.number().int().nonnegative(),
}).strict();

export const bonusAssetSchema = bonusAssetCoreSchema.extend({
  no_other_depreciation_assets_on_return: z.literal(true),
  return_asset_inventory_source_ref: z.string().trim().min(1),
});

export const bonusInventorySchema = z.object({
  assets: z.array(bonusAssetCoreSchema.extend({
    asset_reference: z.string().trim().min(1),
  })).min(1),
  no_other_depreciation_assets_on_return: z.literal(true),
  return_asset_inventory_source_ref: z.string().trim().min(1),
}).strict().superRefine((inventory, ctx) => {
  for (
    const key of ["asset_reference", "form8911_property_reference"] as const
  ) {
    const refs = inventory.assets.map((a) => a[key]).filter((r) =>
      r !== undefined
    );
    if (new Set(refs).size !== refs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate bonus inventory ${key}`,
      });
    }
  }
});

export const bonusActivitySchema = z.object({
  business_reference: z.string(),
  activity_description: z.string(),
  proprietor_ssn: z.string(),
  line14_special_depreciation_allowance: z.number().int().nonnegative(),
  line22_total_depreciation: z.number().int().nonnegative(),
});

export const filedBonusInventorySchema = z.object({
  bonus_inventory: bonusInventorySchema,
  bonus_activities: z.array(bonusActivitySchema).min(1),
});

export const filedBonus4562Schema = z.object({
  bonus_asset: bonusAssetSchema,
  activity_description: z.string(),
  line14_special_depreciation_allowance: z.number().int().nonnegative(),
  line22_total_depreciation: z.number().int().nonnegative(),
});

function depreciationAmount(asset: z.infer<typeof bonusAssetCoreSchema>) {
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
  return asset.cost - asset.credit_basis_reduction;
}

export function calculateBonus4562(raw: unknown) {
  const asset = bonusAssetSchema.parse(raw);
  const depreciation = depreciationAmount(asset);
  return filedBonus4562Schema.parse({
    bonus_asset: asset,
    activity_description: asset.activity_description,
    line14_special_depreciation_allowance: depreciation,
    line22_total_depreciation: depreciation,
  });
}

export function calculateBonusInventory(raw: unknown) {
  const inventory = bonusInventorySchema.parse(raw);
  const refs = [...new Set(inventory.assets.map((a) => a.business_reference))];
  const activities = refs.map((ref) => {
    const assets = inventory.assets.filter((a) => a.business_reference === ref);
    const first = assets[0];
    if (
      assets.some((a) =>
        a.activity_description !== first.activity_description ||
        a.proprietor_ssn !== first.proprietor_ssn
      )
    ) {
      throw new Error(
        "Form 4562 inventory activity names and proprietors must agree",
      );
    }
    const amount = assets.reduce((sum, a) => sum + depreciationAmount(a), 0);
    return {
      business_reference: ref,
      activity_description: first.activity_description,
      proprietor_ssn: first.proprietor_ssn,
      line14_special_depreciation_allowance: amount,
      line22_total_depreciation: amount,
    };
  });
  return filedBonusInventorySchema.parse({
    bonus_inventory: inventory,
    bonus_activities: activities,
  });
}
