import {
  EnergyType,
  type F8835Item,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
export type Feedstock =
  | "cellulosic"
  | "livestock"
  | "landfill"
  | "trash"
  | "mixed";
export function feedstockFields(
  kind: Feedstock | undefined,
  index: number,
  kwh: number,
  lessee = false,
): Partial<F8835Item> {
  if (!kind) return {};
  const selected = kind === "mixed"
    ? (["cellulosic", "livestock", "landfill", "trash"] as const)[index % 4]
    : kind;
  const common = {
    facility_description: `Synthetic production facility ${index + 1}`,
    construction_record_reference: `Synthetic construction ${index + 1}`,
    construction_began_on: "2023-06-01",
    production_meter_record_reference: `Synthetic meter ${index + 1}`,
    meter_period_start_date: "2025-01-01",
    meter_period_end_date: "2025-12-31",
    metered_kwh_produced: kwh,
    unrelated_sale_invoice_reference: `Synthetic sale ${index + 1}`,
    unrelated_sale_invoice_date: "2025-12-31",
    invoiced_kwh_sold: kwh,
    unrelated_buyer_verified: true as const,
  };
  const feedstock = {
    feedstock_record_reference: `Synthetic feedstock ${index + 1}`,
    original_facility_not_expanded_verified: true as const,
    filer_produced_electricity_verified: true as const,
  };
  const identity = {
    facility_description: common.facility_description,
    facility_address_line1: `${10 + index} Plant Road`,
    facility_latitude: (39123456 + index * 100000) / 1000000,
    facility_longitude: -75.123456,
  };
  const owner = {
    name: `Synthetic Plant Owner ${index + 1}`,
    ein: String(700000000 + index),
  };
  const lease: Partial<F8835Item> =
    lessee && (selected === "cellulosic" || selected === "livestock")
      ? {
        facility_owned_by_filer: false,
        facility_owner_business: owner,
        open_loop_nonowner_lessee_source: {
          ...identity,
          owner_business_name: owner.name,
          owner_business_ein: owner.ein,
          lease_agreement_reference: `Synthetic lease ${index + 1}`,
          owner_producer_acknowledgment_reference:
            `Synthetic owner acknowledgment ${index + 1}`,
          filer_is_lessee_and_electricity_producer_verified: true,
          owner_not_producer_or_claimant_for_2025_verified: true,
        },
      }
      : {};
  if (selected === "cellulosic") {
    return {
      energy_type: EnergyType.BiomassOpen,
      ...lease,
      open_loop_cellulosic_source: {
        ...common,
        ...feedstock,
        solid_nonhazardous_cellulosic_waste_verified: true,
      },
    };
  }
  if (selected === "livestock") {
    return {
      energy_type: EnergyType.BiomassOpen,
      ...lease,
      open_loop_livestock_source: {
        ...common,
        ...feedstock,
        agricultural_livestock_waste_nutrients_verified: true,
        nameplate_capacity_record_reference: `Synthetic capacity ${index + 1}`,
        nameplate_capacity_kw: 1500,
      },
    };
  }
  if (selected === "landfill") {
    return {
      energy_type: EnergyType.Landfill,
      landfill_gas_source: {
        ...common,
        feedstock_record_reference: feedstock.feedstock_record_reference,
        municipal_solid_waste_landfill_gas_verified: true,
        original_facility_verified: true,
        filer_produced_electricity_verified: true,
        section45k_nonclaim_record_reference: `Synthetic section45K nonclaim ${
          index + 1
        }`,
        section45k_credit_not_allowed_verified: true,
        section48_biogas_nonclaim_record_reference:
          `Synthetic section48 nonclaim ${index + 1}`,
        section48_biogas_credit_not_allowed_this_or_prior_year_verified: true,
        investment_election_nonclaim_record_reference:
          `Synthetic election review ${index + 1}`,
        no_section48_election_or_section1603_grant_verified: true,
      },
    };
  }
  return {
    energy_type: EnergyType.Trash,
    trash_combustion_source: {
      ...common,
      ...identity,
      municipal_waste_record_reference: `Synthetic municipal waste ${
        index + 1
      }`,
      municipal_solid_waste_excluding_segregated_recyclable_paper_verified:
        true,
      original_trash_combustion_facility_verified: true,
      filer_produced_electricity_verified: true,
      election_grant_nonclaim_record_reference: `Synthetic election review ${
        index + 1
      }`,
      no_section48_election_or_section1603_grant_verified: true,
    },
  };
}
