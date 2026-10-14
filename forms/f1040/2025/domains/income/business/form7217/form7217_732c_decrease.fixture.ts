import { Form7217PropertyTreatment } from "../../../../../nodes/inputs/income/business/f7217/index.ts";

/** Section 732(a)(2): $600 partnership basis limited to $400 after cash.
 * Inventory keeps its $100 basis; other property absorbs the $200 reduction,
 * first from $100 unrealized depreciation, then proportionally by basis. */
export const form7217NonliquidatingDecrease = {
  partnership_name: "Delta Partnership",
  partnership_ein: "12-3456789",
  distribution_date: "2025-09-01",
  complete_liquidation: false,
  section_751b_sale_or_exchange: false,
  partner_adjusted_basis_before_distribution: 450,
  cash_received: 50,
  section_732c_allocation_workpaper_reference:
    "Delta 2025 section 732(c) ledger",
  distributed_properties: [
    {
      description: "Inventory",
      property_treatment: Form7217PropertyTreatment.Section732Property,
      section_732c_class: "inventory_or_receivable" as const,
      partnership_basis_before_distribution: 100,
      fair_market_value: 100,
      partner_basis_after_section_732: 100,
    },
    {
      description: "Asset A",
      property_treatment: Form7217PropertyTreatment.Section732Property,
      section_732c_class: "other_property" as const,
      partnership_basis_before_distribution: 300,
      fair_market_value: 200,
      partner_basis_after_section_732: 150,
    },
    {
      description: "Asset B",
      property_treatment: Form7217PropertyTreatment.Section732Property,
      section_732c_class: "other_property" as const,
      partnership_basis_before_distribution: 200,
      fair_market_value: 200,
      partner_basis_after_section_732: 150,
    },
  ],
};
