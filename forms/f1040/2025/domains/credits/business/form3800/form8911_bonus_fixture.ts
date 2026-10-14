import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { inputSchema as form8911Schema } from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
export const bonusFilerFixture = pdfReviewFixtures.find((f) =>
  f.id === "single-personal-home-charger-credit"
)!;
export function bonusCreditInput(cost = 10000) {
  const original = form8911Schema.parse(bonusFilerFixture.inputs.f8911);
  const credit = cost * 0.06;
  const property = {
    ...original,
    cost,
    business_use_pct: 1,
    main_home_property: false,
    property_reference: "charger-1",
    property_description: "Business EV charger",
    business_source: {
      proprietor_ssn: "111223333",
      schedule_c_business_reference: "equipment-services",
      source_document_reference: "charger-invoice-1",
      section179_deduction: 0,
      rate_basis: "base" as const,
      subject_to_passive_activity_limit: false,
    },
  };
  const {
    regular_tax_before_credits: _regular,
    tentative_minimum_tax: _tmt,
    foreign_tax_credit: _foreign,
    certain_allowable_credits: _other,
    ...propertyOnly
  } = property;
  return {
    ...bonusFilerFixture.inputs,
    f8911: { properties: [propertyOnly] },
    schedule_c: [{
      line_a_principal_business: "Equipment services",
      line_b_business_code: "811310",
      line_f_accounting_method: "cash",
      business_reference: "equipment-services",
      proprietor_recipient: "T",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: cost - credit,
      line_13_depreciation: cost - credit,
    }],
    form4562: {
      bonus_asset: {
        business_reference: "equipment-services",
        activity_description: "Equipment services",
        asset_description: "Business EV charger",
        source_document_ref: "charger-invoice-1",
        proprietor_ssn: "111223333",
        acquired_date: "2025-02-01",
        placed_in_service_date: property.placed_in_service,
        cost,
        macrs_recovery_period_years: 5,
        qualification_review_reference: "new-equipment-MACRS-review",
        original_use_began_with_taxpayer: true,
        business_use_pct: 100,
        is_listed_property: false,
        required_to_use_ads: false,
        excluded_from_bonus_under_section168k: false,
        bonus_elected_out: false,
        reduced_bonus_election: false,
        section179_deduction: 0,
        no_other_depreciation_assets_on_return: true,
        return_asset_inventory_source_ref: "2025-single-asset-register",
        form8911_property_reference: "charger-1",
        credit_basis_reduction: credit,
      },
    },
  };
}
