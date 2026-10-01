import { inputSchema } from "./index.ts";

export const directAgriBiodieselSource = inputSchema.parse({
  source_type: "direct_schedule_c_small_agri_biodiesel_producer",
  schedule_c_business_reference: "id-agri-fuel-2025",
  proprietor_ssn: "123456789",
  producer_ein: "825555123",
  form637_registration_number: "AB123456789",
  form637_registration_record_reference: "irs-637-registration-2025",
  facility_capacity_record_reference: "facility-capacity-certification-2025",
  annual_productive_capacity_gallons: 2_000_000,
  no_controlled_group_or_common_control_confirmed: true,
  no_pass_through_credit_confirmed: true,
  no_transfer_election_confirmed: true,
  no_prior_credited_fuel_recapture_event_confirmed: true,
  lots: [{
    production_batch_reference: "batch-2025-06-01",
    production_date: "2025-06-01",
    sale_invoice_reference: "invoice-2025-06-20",
    sale_date: "2025-06-20",
    gallons_sold: 1_000,
    produced_by_taxpayer_confirmed: true,
    agri_biodiesel_derived_solely_from_virgin_oils_or_animal_fats_confirmed:
      true,
    feedstock_origin: "US",
    buyer_name: "Fuel Distribution One",
    buyer_qualified_fuel_use_reference: "buyer-fuel-use-one",
    buyer_qualified_fuel_use: "fuel_in_trade_or_business",
    no_renewable_diesel_or_saf_included_confirmed: true,
  }, {
    production_batch_reference: "batch-2025-07-10",
    production_date: "2025-07-10",
    sale_invoice_reference: "invoice-2025-07-20",
    sale_date: "2025-07-20",
    gallons_sold: 2_000,
    produced_by_taxpayer_confirmed: true,
    agri_biodiesel_derived_solely_from_virgin_oils_or_animal_fats_confirmed:
      true,
    feedstock_origin: "CA",
    buyer_name: "Fuel Distribution Two",
    buyer_qualified_fuel_use_reference: "buyer-fuel-use-two",
    buyer_qualified_fuel_use: "qualified_biodiesel_mixture_in_business",
    no_renewable_diesel_or_saf_included_confirmed: true,
  }],
});

export const directAgriBiodieselPending = {
  f8864: directAgriBiodieselSource,
  f1040: { taxpayer_ssn: "123-45-6789" },
  schedule_c: {
    schedule_cs: [{
      line_a_principal_business: "Agri biodiesel production",
      line_b_business_code: "325199",
      line_c_business_name: "ID Agri Fuel",
      business_reference: "id-agri-fuel-2025",
      proprietor_recipient: "T",
      line_d_ein: "825555123",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 10_000,
      line_6_other_income: 500,
    }],
  },
};
