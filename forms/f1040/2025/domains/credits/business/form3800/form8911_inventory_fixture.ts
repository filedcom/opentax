import { bonusCreditInput } from "./form8911_bonus_fixture.ts";
export function bonusInventoryInput(
  separateBusinesses = false,
  costs = [10000, 20000],
) {
  const source = bonusCreditInput();
  const {
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    ...asset
  } = source.form4562.bonus_asset;
  const assets = costs.map((cost, i) => ({
    ...asset,
    asset_reference: `asset-${i + 1}`,
    form8911_property_reference: `charger-${i + 1}`,
    business_reference: separateBusinesses
      ? `business-${i + 1}`
      : asset.business_reference,
    activity_description: separateBusinesses
      ? `Equipment services ${i + 1}`
      : asset.activity_description,
    source_document_ref: `invoice-${i + 1}`,
    asset_description: `Business charger ${i + 1}`,
    cost,
    credit_basis_reduction: cost * 0.06,
  }));
  const refs = [...new Set(assets.map((a) => a.business_reference))];
  return {
    ...source,
    form4562: {
      bonus_inventory: {
        assets,
        no_other_depreciation_assets_on_return,
        return_asset_inventory_source_ref,
      },
    },
    f8911: {
      properties: assets.map((a) => ({
        ...source.f8911.properties[0],
        property_reference: a.form8911_property_reference,
        property_description: a.asset_description,
        cost: a.cost,
        business_source: {
          ...source.f8911.properties[0].business_source,
          schedule_c_business_reference: a.business_reference,
          source_document_reference: a.source_document_ref,
        },
      })),
    },
    schedule_c: refs.map((ref) => {
      const items = assets.filter((a) => a.business_reference === ref);
      const deduction = items.reduce(
        (sum, a) => sum + a.cost - a.credit_basis_reduction,
        0,
      );
      return {
        ...source.schedule_c[0],
        business_reference: ref,
        line_a_principal_business: items[0].activity_description,
        line_1_gross_receipts: deduction,
        line_13_depreciation: deduction,
      };
    }),
  };
}
