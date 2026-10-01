import { assertThrows } from "@std/assert";
import { assertForm6251DepreciationSource } from "./form6251_depreciation_source.ts";

const property = {
  property_id: "machine-1",
  placed_in_service_year: 2021,
  regular_200_percent_declining_balance: true,
  non_section1250_property: true,
  no_special_allowance_or_section179_component: true,
  not_passive_at_risk_limited_or_tax_shelter_farm: true,
  no_inventory_capitalization_difference: true,
  regular_tax_depreciation: 5_000,
  amt_depreciation: 4_000,
  reviewed_workpaper_reference: "2025 asset schedule",
};

Deno.test("Form 6251 line 2l rechecks property-level signed depreciation", () => {
  const fields = {
    depreciation_adjustment: 1_000,
    line2l_depreciation_workpaper: { properties: [property] },
  };
  assertForm6251DepreciationSource(fields);
  for (
    const altered of [
      {
        depreciation_adjustment: 999,
        line2l_depreciation_workpaper: fields.line2l_depreciation_workpaper,
      },
      {
        ...fields,
        line2l_depreciation_workpaper: {
          properties: [property, property],
        },
      },
      { ...fields, line2l_depreciation_workpaper: undefined },
    ]
  ) {
    assertThrows(
      () => assertForm6251DepreciationSource(altered),
      Error,
      "distinct reviewed property depreciation workpaper",
    );
  }
});
