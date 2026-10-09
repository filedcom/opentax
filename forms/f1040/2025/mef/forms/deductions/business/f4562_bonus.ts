import type { currentYearInventorySchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { z } from "zod";
import {
  bonusActivitySchema,
  bonusInventorySchema,
  calculateBonus4562,
  calculateBonusInventory,
  filedBonus4562Schema,
  filedBonusInventorySchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";
import { inputSchema as scheduleCSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  calculateForm8911PropertyAmounts,
  inputSchema as form8911Schema,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";

export function reconcileInventorySources(
  inventory:
    | z.infer<typeof bonusInventorySchema>
    | z.infer<typeof currentYearInventorySchema>,
  pending: Readonly<Record<string, unknown>>,
  activities: readonly z.infer<typeof bonusActivitySchema>[] =
    calculateBonusInventory(inventory).bonus_activities,
) {
  const expected = { bonus_activities: activities };
  const owner = z.object({ taxpayer_ssn: z.string() }).parse(pending.f1040);
  const businesses = scheduleCSchema.parse(pending.schedule_c).schedule_cs;
  for (const activity of expected.bonus_activities) {
    const matches = businesses.filter((b) =>
      b.business_reference === activity.business_reference
    );
    if (
      owner.taxpayer_ssn.replaceAll("-", "") !== activity.proprietor_ssn ||
      matches.length !== 1 || matches[0].proprietor_recipient !== "T" ||
      !matches[0].line_g_material_participation ||
      matches[0].statutory_employee === true ||
      matches[0].disposed_of_business === true
    ) {
      throw new Error(
        "Form 4562 bonus asset needs one participating taxpayer-owned Schedule C per activity",
      );
    }
    if (
      (matches[0].line_13_depreciation ?? 0) !==
        activity.line22_total_depreciation
    ) {
      throw new Error(
        "Form 4562 bonus depreciation differs from Schedule C line 13",
      );
    }
  }
  if (
    businesses.some((b) =>
      (b.line_13_depreciation ?? 0) > 0 &&
      !expected.bonus_activities.some((a) =>
        a.business_reference === b.business_reference
      )
    ) ||
    ["schedule_f", "schedule_e", "form4835"].some((key) =>
      pending[key] !== undefined
    )
  ) {
    throw new Error(
      "Form 4562 bonus inventory cannot establish other activity depreciation",
    );
  }
  const properties = pending.f8911 === undefined
    ? []
    : personalCreditProperties(form8911Schema.parse(pending.f8911));
  const businessProperties = properties.filter((p) =>
    (p.business_use_pct ?? 0) > 0
  );
  const linkedAssets = inventory.assets.filter((a) =>
    a.form8911_property_reference
  );
  if (businessProperties.length !== linkedAssets.length) {
    throw new Error(
      "Form 4562 bonus inventory must cover every Form 8911 business property exactly once",
    );
  }
  for (const asset of inventory.assets) {
    if (!asset.form8911_property_reference) {
      if (asset.credit_basis_reduction !== 0) {
        throw new Error(
          "Form 4562 bonus asset needs its Form 8911 basis-reduction link",
        );
      }
      continue;
    }
    const property = businessProperties.find((p) =>
      "property_reference" in p &&
      p.property_reference === asset.form8911_property_reference
    );
    if (
      !property || property.cost !== asset.cost ||
      property.business_use_pct !== 1 ||
      property.placed_in_service !== asset.placed_in_service_date ||
      property.property_description !== asset.asset_description ||
      property.business_source?.proprietor_ssn !== asset.proprietor_ssn ||
      property.business_source.schedule_c_business_reference !==
        asset.business_reference ||
      property.business_source.source_document_reference !==
        asset.source_document_ref ||
      property.business_source.section179_deduction !== 0
    ) {
      throw new Error(
        "Form 4562 bonus asset differs from its Form 8911 property",
      );
    }
    const credit = calculateForm8911PropertyAmounts(property);
    if (
      credit.businessCredit !== asset.credit_basis_reduction ||
      credit.personalCredit !== 0
    ) {
      throw new Error(
        "Form 4562 basis reduction differs from Form 8911 property credit",
      );
    }
  }
  return expected;
}

export function reconcileBonus4562(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const filed = filedBonus4562Schema.parse(raw);
  const retained = filedBonus4562Schema.parse(pending.form4562);
  const expected = calculateBonus4562(retained.bonus_asset);
  if (JSON.stringify(filed) !== JSON.stringify(expected)) {
    throw new Error("Form 4562 bonus lines differ from the retained asset");
  }
  const {
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    ...asset
  } = expected.bonus_asset;
  reconcileInventorySources({
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    assets: [{ ...asset, asset_reference: "single-bonus-asset" }],
  }, pending);
  return expected;
}

export function reconcileBonusInventory(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const filed = filedBonusInventorySchema.parse(raw);
  const retained = filedBonusInventorySchema.parse(pending.form4562);
  const expected = calculateBonusInventory(retained.bonus_inventory);
  reconcileInventorySources(
    retained.bonus_inventory,
    pending,
    expected.bonus_activities,
  );
  if (JSON.stringify(filed) !== JSON.stringify(expected)) {
    throw new Error(
      "Form 4562 bonus activity totals differ from the retained inventory",
    );
  }
  return expected;
}
