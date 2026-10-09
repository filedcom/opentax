import {
  profitableBonusCases,
  profitableBonusInput,
} from "../../../credits/business/form3800/form8911_profit_fixture.ts";
import { bonusInventoryInput } from "../../../credits/business/form3800/form8911_inventory_fixture.ts";
import { bonusCreditInput } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import { constructionCreditInput } from "../../../credits/business/form3800/form8911_construction_fixture.ts";
import { currentYearInventorySchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";

export function currentYearInput(late = false, construction = false) {
  const source = construction ? constructionCreditInput() : bonusCreditInput();
  const {
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    ...asset
  } = source.form4562.bonus_asset;
  const service = late ? "2025-11-01" : "2025-06-01";
  // Independent first-year amounts: basis * 40% + residual * 40% * convention.
  const deduction = construction ? (late ? 3010 : 3640) : (late ? 4042 : 4888);
  const inventory = currentYearInventorySchema.parse({
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    full_calendar_tax_year: true,
    assets: [{
      ...asset,
      asset_reference: "asset-1",
      acquired_date: "2024-12-15",
      placed_in_service_date: service,
      acquisition_review_reference: "reviewed-purchase-contract-2024",
      tax_acquisition_date_includes_binding_contract_review_confirmed: true,
      not_self_constructed: true,
      not_long_production_period_property: true,
      not_certain_aircraft: true,
      no_depreciation_method_election: true,
      no_disposition_or_other_basis_adjustment: true,
    }],
  });
  return {
    ...source,
    general: profitableBonusInput(profitableBonusCases[0]).general,
    form4562: { current_year_inventory: inventory },
    f8911: {
      properties: source.f8911.properties.map((p) => ({
        ...p,
        placed_in_service: service,
      })),
    },
    schedule_c: source.schedule_c.map((c) => ({
      ...c,
      line_c_business_name: "Equipment business 1",
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: deduction + 10000,
      line_13_depreciation: deduction,
    })),
  };
}

export function currentYearMultiInput(
  mode: "mixed-bonus" | "six-classes" | "mixed-quarters",
) {
  const costs = mode === "six-classes"
    ? [10000, 10000, 10000, 10000, 10000, 10000]
    : mode === "mixed-quarters"
    ? [10000, 20000, 30000]
    : [10000, 20000];
  const source = bonusInventoryInput(mode === "mixed-bonus", costs);
  const reviewed = currentYearInput().form4562.current_year_inventory;
  const assets = source.form4562.bonus_inventory.assets.map((asset, i) => ({
    ...reviewed.assets[0],
    ...asset,
    ...(mode === "six-classes" && i !== 1
      ? {
        form8911_property_reference: undefined,
        credit_basis_reduction: 0,
        asset_description: [
          "Reviewed three-year equipment",
          "",
          "Office furniture",
          "Reviewed ten-year equipment",
          "Land improvements",
          "Reviewed twenty-year infrastructure",
        ][i],
        qualification_review_reference: `reviewed-GDS-class-${
          [3, 5, 7, 10, 15, 20][i]
        }`,
      }
      : {}),
    acquired_date: mode === "mixed-bonus" && i === 1
      ? "2025-02-01"
      : "2024-12-15",
    placed_in_service_date: mode === "mixed-bonus" && i === 1
      ? "2025-11-01"
      : mode === "mixed-quarters"
      ? ["2025-02-01", "2025-05-01", "2025-11-01"][i]
      : "2025-06-01",
    macrs_recovery_period_years: mode === "six-classes"
      ? [3, 5, 7, 10, 15, 20][i]
      : 5,
  }));
  const profitable = profitableBonusInput(
    profitableBonusCases[mode === "mixed-bonus" ? 1 : 0],
  );
  const deductions = mode === "mixed-bonus"
    ? [5170, 18800]
    : mode === "six-classes"
    ? [28870]
    : [28200];
  return {
    ...source,
    general: profitable.general,
    form4562: {
      current_year_inventory: currentYearInventorySchema.parse({
        ...reviewed,
        assets,
      }),
    },
    f8911: {
      properties: source.f8911.properties.map((p, i) => ({
        ...p,
        placed_in_service: assets[i].placed_in_service_date,
        construction_began: mode === "mixed-quarters"
          ? "2025-01-01"
          : p.construction_began,
      })).filter((_, i) => mode !== "six-classes" || i === 1),
    },
    schedule_c: source.schedule_c.map((c, i) => ({
      ...c,
      line_c_business_name: profitable.schedule_c[i].line_c_business_name,
      qbi_no_other_adjustments_confirmed: true,
      qbi_se_tax_allocation_review:
        profitable.schedule_c[i].qbi_se_tax_allocation_review,
      line_1_gross_receipts: deductions[i] +
        (mode === "mixed-bonus" ? [10000, 20000][i] : 10000),
      line_13_depreciation: deductions[i],
    })),
  };
}
