import {
  FMVMethod,
  type SectionAItem,
} from "../../nodes/inputs/f8283/index.ts";
const shortTermGift = {
  property_description: "Purchased print",
  donee_organization_name: "Community Arts Center",
  donee_organization_us_address: {
    line1: "12 Arts Road",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2025-01-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 1_000,
  deduction_claimed: 700,
  cost_or_adjusted_basis: 700,
  is_capital_gain_property: false,
  charitable_limit_category: "noncash_50" as const,
  fmv_method: FMVMethod.ComparableSales,
  short_term_ordinary_income_reduction_confirmed: true as const,
};

const inventoryGift = {
  ...shortTermGift,
  property_description: "Purchased books held for retail sale",
  date_acquired: "2023-02-01",
  fmv: 1_000,
  deduction_claimed: 600,
  cost_or_adjusted_basis: 600,
  short_term_ordinary_income_reduction_confirmed: undefined,
  inventory_ordinary_income_reduction: {
    purchase_invoice_reference: "Invoice INV-102",
    inventory_cost_record_reference: "Inventory ledger LOT-102",
    property_held_for_sale_to_customers_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const creatorGift = {
  ...inventoryGift,
  property_description: "Donor-created watercolor painting",
  date_acquired: "2024-09-01",
  donor_acquisition_description: "Created",
  deduction_claimed: 250,
  cost_or_adjusted_basis: 250,
  inventory_ordinary_income_reduction: undefined,
  creator_ordinary_income_reduction: {
    creation_record_reference: "Studio log ART-17",
    capitalized_cost_record_reference: "Undeducted materials ledger ART-17",
    taxpayer_created_artwork_verified: true as const,
    date_acquired_is_substantial_completion_verified: true as const,
    basis_costs_not_previously_deducted_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const manuscriptGift = {
  ...creatorGift,
  property_description: "Donor-prepared historical manuscript",
  date_acquired: "2025-02-01",
  deduction_claimed: 300,
  cost_or_adjusted_basis: 300,
  creator_ordinary_income_reduction: undefined,
  manuscript_ordinary_income_reduction: {
    manuscript_preparation_record_reference: "Draft ledger MS-17",
    capitalized_cost_record_reference: "Undeducted research ledger MS-17",
    taxpayer_prepared_manuscript_verified: true as const,
    date_acquired_is_substantial_completion_verified: true as const,
    basis_costs_not_previously_deducted_verified: true as const,
    fmv_sale_gain_entirely_ordinary_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const unrelatedUseGift = {
  ...shortTermGift,
  property_description: "Purchased collectible coin sold by museum",
  date_acquired: "2022-02-01",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  is_capital_gain_property: true,
  short_term_ordinary_income_reduction_confirmed: undefined,
  unrelated_use_capital_gain_reduction: {
    purchase_record_reference: "Coin purchase receipt COIN-17",
    donee_unrelated_use_statement_reference: "Museum sale-plan letter USE-17",
    tangible_personal_property_verified: true as const,
    donee_use_unrelated_to_exempt_purpose_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const privateFoundationGift = {
  ...unrelatedUseGift,
  donee_organization_name: "Albany Private Foundation",
  donee_organization_us_address: {
    line1: "10 Foundation Lane",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  charitable_limit_category: "capital_gain_20" as const,
  unrelated_use_capital_gain_reduction: undefined,
  private_foundation_capital_gain_reduction: {
    purchase_record_reference: "Coin purchase record COIN-20",
    foundation_status_record_reference: "Foundation status record PF-20",
    foundation_name: "Albany Private Foundation",
    foundation_ein: "123456789",
    foundation_us_address: {
      line1: "10 Foundation Lane",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    private_nonoperating_foundation_not_50_percent_limit_verified:
      true as const,
    not_qualified_appreciated_stock_verified: true as const,
    outright_contribution_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

const taxidermyGift = {
  property_description: "Donor-prepared mounted deer containing hide",
  donee_organization_name: "Community Nature Museum",
  donee_organization_us_address: {
    line1: "1 Nature Way",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Created",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  fmv_method: FMVMethod.ComparableSales,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  taxidermy_capital_gain_reduction: {
    preparation_cost_record_reference: "Mount cost invoice TAX-17",
    taxidermy_property_description_record_reference:
      "Museum mount photos TAX-17",
    eligible_preparation_stuffing_mounting_costs: 3_000,
    animal_body_part_present_verified: true as const,
    prepared_stuffed_or_mounted_verified: true as const,
    basis_only_preparation_stuffing_mounting_costs_verified: true as const,
    hunting_travel_equipment_and_labor_value_excluded_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};
const patentGift = {
  property_description: "Purchased patent US 1234567 for water filter",
  donee_organization_name: "Community Science Institute",
  donee_organization_us_address: {
    line1: "1 Science Way",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  fmv_method: FMVMethod.ComparableSales,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  intellectual_property_capital_gain_reduction: {
    property_kind: "purchased_patent" as const,
    patent_number: "US1234567",
    patent_registration_record_reference: "USPTO registration PAT-17",
    purchase_record_reference: "Patent purchase PAT-17",
    unamortized_basis_schedule_reference: "Patent basis schedule PAT-17",
    unamortized_adjusted_basis: 3_000,
    donee_2025_net_income_statement_reference:
      "Institute income statement PAT-17",
    donor_owned_full_patent_rights_verified: true as const,
    all_patent_rights_transferred_to_donee_verified: true as const,
    adjusted_basis_excludes_prior_amortization_verified: true as const,
    donee_2025_net_income_zero_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

/** Retained seven non-election reasons, combined as one complete current source
 * inventory. These structured records are reviewed fixture facts, not issuer authentication. */
const reductionInventory: readonly SectionAItem[] = [
  { ...shortTermGift, similar_item_group: "prints" },
  {
    ...inventoryGift,
    similar_item_group: "retail books",
    fmv: 18000,
    deduction_claimed: 12000,
    cost_or_adjusted_basis: 12000,
  },
  {
    ...creatorGift,
    similar_item_group: "watercolors",
    fmv: 9000,
    deduction_claimed: 1200,
    cost_or_adjusted_basis: 1200,
  },
  {
    ...manuscriptGift,
    similar_item_group: "manuscripts",
    deduction_claimed: 600,
    cost_or_adjusted_basis: 600,
  },
  {
    ...unrelatedUseGift,
    property_description: "Purchased camera accessory put to unrelated use",
    similar_item_group: "camera accessories",
    unrelated_use_capital_gain_reduction: {
      ...unrelatedUseGift.unrelated_use_capital_gain_reduction,
      purchase_record_reference: "Camera receipt CAM-17",
      donee_unrelated_use_statement_reference: "Museum use letter CAM-17",
    },
  },
  {
    ...privateFoundationGift,
    property_description:
      "Purchased collectible coin given outright to private foundation",
    similar_item_group: "coins",
  },
  { ...taxidermyGift, similar_item_group: "taxidermy mounts" },
  { ...patentGift, similar_item_group: "patents" },
];

export const sectionAReductionInventory: readonly SectionAItem[] =
  reductionInventory.map((item, index) => ({
    ...item,
    donor_ownership_review: {
      donor_name: "Alex Example",
      donor_ssn: "111223333",
      ownership_record_reference: `Reviewed owned property ${
        index + 1
      }: ${item.property_description}; retained purchase/creation/preparation record references in the statutory reason review`,
      outright_full_owned_interest_contributed_verified: true,
    },
  }));
