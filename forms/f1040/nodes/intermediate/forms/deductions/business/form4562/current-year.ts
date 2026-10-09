import { z } from "zod";
import { bonusActivitySchema, bonusAssetCoreSchema } from "./bonus.ts";
import { roundWholeDollars } from "../../../../../../whole-dollars.ts";

export enum DepreciationConvention {
  HalfYear = "HY",
  MidQuarter = "MQ",
}
export enum DepreciationMethod {
  DoubleDeclining = "200 DB",
  Declining150 = "150 DB",
}
const assetSchema = bonusAssetCoreSchema.extend({
  asset_reference: z.string().trim().min(1),
  acquired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acquisition_review_reference: z.string().trim().min(1),
  tax_acquisition_date_includes_binding_contract_review_confirmed: z.literal(
    true,
  ),
  not_self_constructed: z.literal(true),
  not_long_production_period_property: z.literal(true),
  not_certain_aircraft: z.literal(true),
  no_depreciation_method_election: z.literal(true),
  no_disposition_or_other_basis_adjustment: z.literal(true),
});
export const currentYearInventorySchema = z.object({
  assets: z.array(assetSchema).min(1),
  no_other_depreciation_assets_on_return: z.literal(true),
  return_asset_inventory_source_ref: z.string().trim().min(1),
  full_calendar_tax_year: z.literal(true),
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
        message: `Duplicate current-year inventory ${key}`,
      });
    }
  }
});
export const gdsRowSchema = z.object({
  recovery_period: bonusAssetCoreSchema.shape.macrs_recovery_period_years,
  basis: z.number().int().nonnegative(),
  convention: z.nativeEnum(DepreciationConvention),
  method: z.nativeEnum(DepreciationMethod),
  deduction: z.number().int().nonnegative(),
});
export const currentYearActivitySchema = bonusActivitySchema.extend({
  gds_rows: z.array(gdsRowSchema),
});
export const filedCurrentYearSchema = z.object({
  current_year_inventory: currentYearInventorySchema,
  current_year_activities: z.array(currentYearActivitySchema).min(1),
  convention: z.nativeEnum(DepreciationConvention),
});

function adjustedBasis(asset: z.infer<typeof assetSchema>) {
  for (const value of [asset.acquired_date, asset.placed_in_service_date]) {
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
      throw new Error(
        "Current-year depreciation needs real acquisition and service dates",
      );
    }
  }
  if (
    asset.acquired_date <= "2017-09-27" ||
    asset.acquired_date > asset.placed_in_service_date ||
    asset.credit_basis_reduction >= asset.cost ||
    (asset.credit_basis_reduction > 0 && !asset.form8911_property_reference)
  ) {
    throw new Error(
      "Current-year depreciation needs qualifying acquisition, service and linked credit basis",
    );
  }
  return asset.cost - asset.credit_basis_reduction;
}

// Pub. 946 permits computing declining-balance depreciation without the rounded
// percentage tables. Keep the rate exact and round each filed aggregate line.
export function calculateCurrentYearInventory(raw: unknown) {
  const inventory = currentYearInventorySchema.parse(raw);
  const items = inventory.assets.map((asset) => ({
    asset,
    basis: adjustedBasis(asset),
  }));
  const total = items.reduce((sum, i) => sum + i.basis, 0);
  const fourth = items.filter((i) =>
    i.asset.placed_in_service_date >= "2025-10-01"
  ).reduce((sum, i) => sum + i.basis, 0);
  const convention = fourth * 5 > total * 2
    ? DepreciationConvention.MidQuarter
    : DepreciationConvention.HalfYear;
  const calculated = items.map(({ asset, basis }) => {
    const bonus = asset.acquired_date > "2025-01-19" ? basis : basis * 0.4;
    const residual = basis - bonus;
    const period = asset.macrs_recovery_period_years;
    const quarter = Math.ceil(
      Number(asset.placed_in_service_date.slice(5, 7)) / 3,
    );
    const fraction = convention === "HY" ? 0.5 : (9 - 2 * quarter) / 8;
    const multiplier = period < 15 ? 2 : 1.5;
    return {
      asset,
      bonus,
      residual,
      depreciation: residual * multiplier / period * fraction,
    };
  });
  const activities = [
    ...new Set(inventory.assets.map((a) => a.business_reference)),
  ].map((ref) => {
    const rows = calculated.filter((i) => i.asset.business_reference === ref);
    const first = rows[0].asset;
    if (
      rows.some((r) =>
        r.asset.proprietor_ssn !== first.proprietor_ssn ||
        r.asset.activity_description !== first.activity_description
      )
    ) throw new Error("Current-year activity owners and names must agree");
    const gds = [3, 5, 7, 10, 15, 20].flatMap((period) => {
      const group = rows.filter((r) =>
        r.asset.macrs_recovery_period_years === period && r.residual > 0
      );
      return group.length
        ? [gdsRowSchema.parse({
          recovery_period: period,
          convention,
          method: period < 15 ? "200 DB" : "150 DB",
          basis: roundWholeDollars(
            group.reduce((sum, r) => sum + r.residual, 0),
          ),
          deduction: roundWholeDollars(
            group.reduce((sum, r) => sum + r.depreciation, 0),
          ),
        })]
        : [];
    });
    const bonus = roundWholeDollars(rows.reduce((sum, r) => sum + r.bonus, 0));
    return {
      business_reference: ref,
      activity_description: first.activity_description,
      proprietor_ssn: first.proprietor_ssn,
      line14_special_depreciation_allowance: bonus,
      gds_rows: gds,
      line22_total_depreciation: bonus +
        gds.reduce((sum, r) => sum + r.deduction, 0),
    };
  });
  return filedCurrentYearSchema.parse({
    current_year_inventory: inventory,
    current_year_activities: activities,
    convention,
  });
}
