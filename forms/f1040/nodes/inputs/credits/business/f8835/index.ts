import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { f3800 } from "../f3800/index.ts";

// Form 8835 line 1 base rates and line 9 fivefold increase are separate.
export enum EnergyType {
  Wind = "WIND",
  OffshoreWind = "OFFSHORE_WIND",
  Solar = "SOLAR",
  Geothermal = "GEOTHERMAL",
  BiomassClosed = "BIOMASS_CLOSED",
  BiomassOpen = "BIOMASS_OPEN",
  Hydro = "HYDRO",
  Landfill = "LANDFILL",
  Trash = "TRASH",
  Marine = "MARINE",
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const itemSchema = z.object({
  energy_type: z.nativeEnum(EnergyType),
  subject_to_passive_activity_limit: z.boolean(),
  kwh_produced: z.number().int().nonnegative(),
  kwh_sold: z.number().int().nonnegative(),
  closed_loop_biomass_source: z.object({
    facility_description: z.string().trim().min(1),
    planting_record_reference: z.string().trim().min(1),
    planted_exclusively_for_facility_verified: z.literal(true),
    original_facility_not_cofired_verified: z.literal(true),
    production_meter_record_reference: z.string().trim().min(1),
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
    no_investment_credit_election_verified: z.literal(true),
    no_section1603_grant_verified: z.literal(true),
  }).strict().optional(),
  open_loop_cellulosic_source: z.object({
    facility_description: z.string().trim().min(1),
    feedstock_record_reference: z.string().trim().min(1),
    solid_nonhazardous_cellulosic_waste_verified: z.literal(true),
    original_facility_not_expanded_verified: z.literal(true),
    filer_produced_electricity_verified: z.literal(true),
    construction_record_reference: z.string().trim().min(1),
    construction_began_on: isoDate,
    production_meter_record_reference: z.string().trim().min(1),
    meter_period_start_date: isoDate,
    meter_period_end_date: isoDate,
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    unrelated_sale_invoice_date: isoDate,
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
  }).strict().optional(),
  open_loop_nonowner_lessee_source: z.object({
    facility_description: z.string().trim().min(1),
    facility_address_line1: z.string().trim().min(1),
    facility_latitude: z.number().min(-90).max(90),
    facility_longitude: z.number().min(-180).max(180),
    owner_business_name: z.string().trim().min(1),
    owner_business_ein: z.string().regex(/^\d{9}$/),
    lease_agreement_reference: z.string().trim().min(1),
    owner_producer_acknowledgment_reference: z.string().trim().min(1),
    filer_is_lessee_and_electricity_producer_verified: z.literal(true),
    owner_not_producer_or_claimant_for_2025_verified: z.literal(true),
  }).strict().optional(),
  open_loop_livestock_source: z.object({
    facility_description: z.string().trim().min(1),
    feedstock_record_reference: z.string().trim().min(1),
    agricultural_livestock_waste_nutrients_verified: z.literal(true),
    original_facility_not_expanded_verified: z.literal(true),
    filer_produced_electricity_verified: z.literal(true),
    construction_record_reference: z.string().trim().min(1),
    construction_began_on: isoDate,
    nameplate_capacity_record_reference: z.string().trim().min(1),
    nameplate_capacity_kw: z.number().int().min(150),
    production_meter_record_reference: z.string().trim().min(1),
    meter_period_start_date: isoDate,
    meter_period_end_date: isoDate,
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    unrelated_sale_invoice_date: isoDate,
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
  }).strict().optional(),
  solar_production_source: z.object({
    facility_description: z.string().trim().min(1),
    construction_record_reference: z.string().trim().min(1),
    construction_began_on: isoDate,
    production_meter_record_reference: z.string().trim().min(1),
    meter_period_start_date: isoDate,
    meter_period_end_date: isoDate,
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    unrelated_sale_invoice_date: isoDate,
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
    section48_energy_credit_not_claimed_verified: z.literal(true),
  }).strict().optional(),
  landfill_gas_source: z.object({
    facility_description: z.string().trim().min(1),
    feedstock_record_reference: z.string().trim().min(1),
    municipal_solid_waste_landfill_gas_verified: z.literal(true),
    original_facility_verified: z.literal(true),
    filer_produced_electricity_verified: z.literal(true),
    section45k_nonclaim_record_reference: z.string().trim().min(1),
    section45k_credit_not_allowed_verified: z.literal(true),
    section48_biogas_nonclaim_record_reference: z.string().trim().min(1),
    section48_biogas_credit_not_allowed_this_or_prior_year_verified: z.literal(
      true,
    ),
    investment_election_nonclaim_record_reference: z.string().trim().min(1),
    no_section48_election_or_section1603_grant_verified: z.literal(true),
    construction_record_reference: z.string().trim().min(1),
    construction_began_on: isoDate,
    production_meter_record_reference: z.string().trim().min(1),
    meter_period_start_date: isoDate,
    meter_period_end_date: isoDate,
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    unrelated_sale_invoice_date: isoDate,
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
  }).strict().optional(),
  trash_combustion_source: z.object({
    facility_description: z.string().trim().min(1),
    facility_address_line1: z.string().trim().min(1),
    facility_latitude: z.number().min(-90).max(90),
    facility_longitude: z.number().min(-180).max(180),
    municipal_waste_record_reference: z.string().trim().min(1),
    municipal_solid_waste_excluding_segregated_recyclable_paper_verified: z
      .literal(true),
    original_trash_combustion_facility_verified: z.literal(true),
    filer_produced_electricity_verified: z.literal(true),
    election_grant_nonclaim_record_reference: z.string().trim().min(1),
    no_section48_election_or_section1603_grant_verified: z.literal(true),
    construction_record_reference: z.string().trim().min(1),
    construction_began_on: isoDate,
    production_meter_record_reference: z.string().trim().min(1),
    meter_period_start_date: isoDate,
    meter_period_end_date: isoDate,
    metered_kwh_produced: z.number().int().nonnegative(),
    unrelated_sale_invoice_reference: z.string().trim().min(1),
    unrelated_sale_invoice_date: isoDate,
    invoiced_kwh_sold: z.number().int().nonnegative(),
    unrelated_buyer_verified: z.literal(true),
  }).strict().optional(),
  facility_description: z.string().min(1).max(50).optional(),
  facility_us_address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  }).optional(),
  facility_latitude: z.number().min(-90).max(90).optional(),
  facility_longitude: z.number().min(-180).max(180).optional(),
  facility_owned_by_filer: z.boolean().optional(),
  facility_owner_person: z.object({
    name: z.string().min(1),
    ssn: z.string().regex(/^\d{9}$/),
  }).optional(),
  facility_owner_business: z.object({
    name: z.string().min(1),
    ein: z.string().regex(/^\d{9}$/),
  }).optional(),
  existing_facility_expansion: z.boolean().optional(),
  solar_dc_nameplate_kw: z.number().int().nonnegative().optional(),
  ac_nameplate_kw: z.number().int().nonnegative().optional(),
  increased_credit_statement_file_name: z.string().min(1).optional(),
  domestic_content_statement_file_name: z.string().min(1).optional(),
  pwa_form7220_file_name: z.string().min(1).optional(),
  facility_placed_in_service_date: isoDate,
  facility_construction_start_date: isoDate,
  production_period_start_date: isoDate,
  production_period_end_date: isoDate,
  increased_credit_reason: z.enum([
    "under_one_mw",
    "construction_before_2023_01_29",
    "prevailing_wage_and_apprenticeship",
    "none",
  ]),
  maximum_net_output_mw: z.number().nonnegative().optional(),
  meets_prevailing_wage: z.boolean().optional(),
  meets_apprenticeship: z.boolean().optional(),
  domestic_content_bonus: z.boolean(),
  energy_community_bonus: z.boolean(),
  tax_exempt_bond_proceeds: z.number().nonnegative().optional(),
  aggregate_capital_additions: z.number().positive().optional(),
  is_fiscal_year: z.boolean(),
  phaseout_adjustment: z.number().nonnegative().optional(),
  transfer_election_amount: z.number().nonnegative().optional(),
  transfer_election_statement_file_name: z.string().min(1).optional(),
  registration_number: z.string().regex(
    /^[CPT][A-M][A-Za-z0-9]{3}[0-9]{2}[A-Za-z0-9]{5}$/,
  ).optional(),
});
export const inputSchema = z.object({ f8835s: z.array(itemSchema).min(1) })
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.f8835s.forEach((item, index) => {
      if (
        !item.facility_us_address ||
        item.facility_latitude === undefined ||
        item.facility_longitude === undefined
      ) return;
      const identity = JSON.stringify([
        item.facility_us_address,
        item.facility_latitude,
        item.facility_longitude,
        item.facility_placed_in_service_date,
      ]);
      if (seen.has(identity)) {
        ctx.addIssue({
          code: "custom",
          path: ["f8835s", index],
          message: "Form 8835 repeats the same facility in one return",
        });
      }
      seen.add(identity);
    });
  });
export type F8835Item = z.infer<typeof itemSchema>;
export type F8835Input = z.infer<typeof inputSchema>;

export type F8835Lines = {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly line5a: number;
  readonly line5b: number;
  readonly line5c: number;
  readonly line5d: number;
  readonly line6: number;
  readonly line7g: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line15: number;
  readonly form3800Line: "1f" | "4e";
};

function parsedDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Form 8835 needs a valid date: ${value}`);
  }
  return date;
}

function baseRate(item: F8835Item): number {
  const service = parsedDate(item.facility_placed_in_service_date);
  const oldFacility = service < parsedDate("2022-01-01");
  if (
    oldFacility && (item.energy_type === EnergyType.Solar ||
      item.energy_type === EnergyType.OffshoreWind)
  ) {
    throw new Error(
      "Form 8835 pre-2022 solar/offshore-wind rate needs qualification review",
    );
  }
  const high = new Set<EnergyType>([
    EnergyType.Wind,
    EnergyType.OffshoreWind,
    EnergyType.Solar,
    EnergyType.Geothermal,
    EnergyType.BiomassClosed,
  ]).has(item.energy_type) ||
    ((item.energy_type === EnergyType.Hydro ||
      item.energy_type === EnergyType.Marine) &&
      service >= parsedDate("2023-01-01"));
  return oldFacility ? (high ? 0.03 : 0.015) : (high ? 0.006 : 0.003);
}

function increaseFactor(item: F8835Item): number {
  const reason = item.increased_credit_reason;
  if (item.facility_placed_in_service_date < "2022-01-01") {
    if (reason !== "none") {
      throw new Error(
        "Form 8835 pre-2022 facilities cannot use line 9's fivefold increase",
      );
    }
    return 1;
  }
  if (reason === "none") {
    if (item.facility_construction_start_date < "2023-01-29") {
      throw new Error(
        "Form 8835 construction before January 29, 2023 needs increased-credit and continuity review",
      );
    }
    if (
      item.maximum_net_output_mw === undefined ||
      item.maximum_net_output_mw < 1 ||
      (item.ac_nameplate_kw !== undefined && item.ac_nameplate_kw < 1_000)
    ) {
      throw new Error(
        "Form 8835 no-increase claim needs reviewed maximum net output of at least 1 MW and consistent AC capacity",
      );
    }
    if (item.meets_prevailing_wage && item.meets_apprenticeship) {
      throw new Error(
        "Form 8835 prevailing wage and apprenticeship facts qualify for the fivefold increase",
      );
    }
    return 1;
  }
  if (
    reason === "under_one_mw" &&
    (item.maximum_net_output_mw === undefined ||
      item.maximum_net_output_mw >= 1)
  ) {
    throw new Error(
      "Form 8835 under-one-MW increase needs measured output below 1 MW",
    );
  }
  if (
    reason === "construction_before_2023_01_29" &&
    item.facility_construction_start_date >= "2023-01-29"
  ) {
    throw new Error(
      "Form 8835 early-construction increase needs a start before January 29, 2023",
    );
  }
  if (
    reason === "prevailing_wage_and_apprenticeship" &&
    (item.meets_prevailing_wage !== true || item.meets_apprenticeship !== true)
  ) {
    throw new Error(
      "Form 8835 wage/apprenticeship increase needs both requirements met",
    );
  }
  return 5;
}

function windPhaseout(item: F8835Item, line6: number): number {
  if (
    item.energy_type !== EnergyType.Wind ||
    item.facility_placed_in_service_date >= "2022-01-01"
  ) return 0;
  const year = parsedDate(item.facility_construction_start_date)
    .getUTCFullYear();
  const rate = year === 2017
    ? 0.20
    : year === 2019
    ? 0.60
    : [2018, 2020, 2021].includes(year)
    ? 0.40
    : 0;
  return Math.round(line6 * rate);
}

function form3800Line(item: F8835Item): "1f" | "4e" {
  const service = parsedDate(item.facility_placed_in_service_date);
  const start = parsedDate(item.production_period_start_date);
  const end = parsedDate(item.production_period_end_date);
  if (
    start > end || start < service ||
    start.getUTCFullYear() !== 2025 || end.getUTCFullYear() !== 2025
  ) {
    throw new Error(
      "Form 8835 production period must be a valid 2025 period after service",
    );
  }
  const creditEnd = new Date(service);
  creditEnd.setUTCFullYear(creditEnd.getUTCFullYear() + 10);
  if (end >= creditEnd) {
    throw new Error(
      "Form 8835 electricity sold after the 10-year credit period cannot be claimed",
    );
  }
  const fourthAnniversary = new Date(service);
  fourthAnniversary.setUTCFullYear(fourthAnniversary.getUTCFullYear() + 4);
  if (start < fourthAnniversary && end >= fourthAnniversary) {
    throw new Error(
      "Form 8835 production crossing the four-year boundary needs separate periods",
    );
  }
  return end < fourthAnniversary ? "4e" : "1f";
}

export function calculateForm8835(item: F8835Item): F8835Lines {
  item = itemSchema.parse(item);
  if (item.energy_type === EnergyType.Solar) {
    const source = item.solar_production_source;
    if (
      item.facility_placed_in_service_date < "2022-01-01" ||
      item.facility_construction_start_date >= "2025-01-01" ||
      item.facility_owned_by_filer !== true ||
      item.facility_owner_person !== undefined ||
      item.facility_owner_business !== undefined ||
      item.existing_facility_expansion === true ||
      item.subject_to_passive_activity_limit ||
      item.is_fiscal_year || item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.registration_number !== undefined ||
      !source ||
      parsedDate(source.unrelated_sale_invoice_date) <
        parsedDate(item.production_period_start_date) ||
      parsedDate(source.unrelated_sale_invoice_date) >
        parsedDate(item.production_period_end_date) ||
      source.facility_description !== item.facility_description ||
      source.construction_began_on !== item.facility_construction_start_date ||
      source.meter_period_start_date !== item.production_period_start_date ||
      source.meter_period_end_date !== item.production_period_end_date ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      new Set([
          source.construction_record_reference,
          source.production_meter_record_reference,
          source.unrelated_sale_invoice_reference,
        ]).size !== 3 ||
      (item.solar_dc_nameplate_kw ?? 0) <= 0 ||
      (item.ac_nameplate_kw ?? 0) <= 0
    ) {
      throw new Error(
        "Form 8835 solar facility needs pre-2025 construction, positive DC capacity, and distinct construction, meter, and unrelated-sale sources matching kWh",
      );
    }
  } else if (item.solar_production_source !== undefined) {
    throw new Error(
      "Form 8835 solar source cannot classify another energy type",
    );
  }
  if (item.energy_type === EnergyType.Landfill) {
    const source = item.landfill_gas_source;
    if (
      item.facility_placed_in_service_date < "2022-01-01" ||
      item.facility_construction_start_date >= "2025-01-01" ||
      item.facility_owned_by_filer !== true ||
      item.facility_owner_person !== undefined ||
      item.facility_owner_business !== undefined ||
      item.existing_facility_expansion === true ||
      item.subject_to_passive_activity_limit || item.is_fiscal_year ||
      item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.registration_number !== undefined || !source ||
      source.facility_description !== item.facility_description ||
      source.construction_began_on !== item.facility_construction_start_date ||
      source.meter_period_start_date !== item.production_period_start_date ||
      source.meter_period_end_date !== item.production_period_end_date ||
      parsedDate(source.unrelated_sale_invoice_date) <
        parsedDate(item.production_period_start_date) ||
      parsedDate(source.unrelated_sale_invoice_date) >
        parsedDate(item.production_period_end_date) ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      new Set([
          source.feedstock_record_reference,
          source.section45k_nonclaim_record_reference,
          source.section48_biogas_nonclaim_record_reference,
          source.investment_election_nonclaim_record_reference,
          source.construction_record_reference,
          source.production_meter_record_reference,
          source.unrelated_sale_invoice_reference,
        ]).size !== 7
    ) {
      throw new Error(
        "Form 8835 landfill gas needs original filer-owned municipal-solid-waste production, no section 45K, section 48, or section 1603 overlap, and seven distinct feedstock, nonclaim, construction, meter, and unrelated-sale records matching dates and kWh",
      );
    }
  } else if (item.landfill_gas_source !== undefined) {
    throw new Error(
      "Form 8835 landfill gas source cannot classify another energy type",
    );
  }
  if (item.energy_type === EnergyType.Trash) {
    const source = item.trash_combustion_source;
    if (
      item.facility_placed_in_service_date < "2022-01-01" ||
      item.facility_construction_start_date >= "2025-01-01" ||
      item.facility_owned_by_filer !== true ||
      item.facility_owner_person !== undefined ||
      item.facility_owner_business !== undefined ||
      item.existing_facility_expansion === true ||
      item.subject_to_passive_activity_limit || item.is_fiscal_year ||
      item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.registration_number !== undefined || !source ||
      source.facility_description !== item.facility_description ||
      source.facility_address_line1 !== item.facility_us_address?.line1 ||
      source.facility_latitude !== item.facility_latitude ||
      source.facility_longitude !== item.facility_longitude ||
      source.construction_began_on !== item.facility_construction_start_date ||
      source.meter_period_start_date !== item.production_period_start_date ||
      source.meter_period_end_date !== item.production_period_end_date ||
      parsedDate(source.unrelated_sale_invoice_date) <
        parsedDate(item.production_period_start_date) ||
      parsedDate(source.unrelated_sale_invoice_date) >
        parsedDate(item.production_period_end_date) ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      new Set([
          source.municipal_waste_record_reference,
          source.election_grant_nonclaim_record_reference,
          source.construction_record_reference,
          source.production_meter_record_reference,
          source.unrelated_sale_invoice_reference,
        ]).size !== 5
    ) {
      throw new Error(
        "Form 8835 trash combustion needs a matching filer-owned facility identity, construction, 2025 meter and unrelated sale, five distinct source records, and no investment-credit election or grant",
      );
    }
  } else if (item.trash_combustion_source !== undefined) {
    throw new Error(
      "Form 8835 trash-combustion source cannot classify another energy type",
    );
  }
  if (item.energy_type === EnergyType.BiomassClosed) {
    const source = item.closed_loop_biomass_source;
    if (item.facility_construction_start_date >= "2025-01-01") {
      throw new Error(
        "Form 8835 closed-loop biomass construction must begin before 2025",
      );
    }
    if (
      !source ||
      source.facility_description !== item.facility_description ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      source.planting_record_reference ===
        source.production_meter_record_reference ||
      source.planting_record_reference ===
        source.unrelated_sale_invoice_reference ||
      source.production_meter_record_reference ===
        source.unrelated_sale_invoice_reference
    ) {
      throw new Error(
        "Form 8835 closed-loop biomass needs facility-matched planting, meter, and unrelated-sale sources matching kWh",
      );
    }
  } else if (item.closed_loop_biomass_source !== undefined) {
    throw new Error(
      "Form 8835 closed-loop biomass source cannot classify another energy type",
    );
  }
  if (
    item.open_loop_cellulosic_source !== undefined &&
    item.open_loop_livestock_source !== undefined
  ) {
    throw new Error(
      "Form 8835 open-loop biomass needs exactly one qualifying feedstock source",
    );
  }
  if (
    item.energy_type === EnergyType.BiomassOpen &&
    item.open_loop_cellulosic_source !== undefined
  ) {
    const source = item.open_loop_cellulosic_source;
    const lease = item.open_loop_nonowner_lessee_source;
    if (
      item.facility_construction_start_date >= "2025-01-01" ||
      item.facility_placed_in_service_date < "2022-01-01" ||
      (item.facility_owned_by_filer === true
        ? lease !== undefined || item.facility_owner_business !== undefined ||
          item.facility_owner_person !== undefined
        : item.facility_owned_by_filer !== false || !lease ||
          !item.facility_owner_business ||
          item.facility_owner_person !== undefined ||
          lease.owner_business_name !== item.facility_owner_business.name ||
          lease.owner_business_ein !== item.facility_owner_business.ein ||
          lease.facility_description !== item.facility_description ||
          lease.facility_address_line1 !== item.facility_us_address?.line1 ||
          lease.facility_latitude !== item.facility_latitude ||
          lease.facility_longitude !== item.facility_longitude ||
          new Set([
              lease.lease_agreement_reference,
              lease.owner_producer_acknowledgment_reference,
              source.feedstock_record_reference,
              source.construction_record_reference,
              source.production_meter_record_reference,
              source.unrelated_sale_invoice_reference,
            ]).size !== 6) ||
      item.existing_facility_expansion === true ||
      item.subject_to_passive_activity_limit ||
      item.is_fiscal_year || item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.registration_number !== undefined ||
      !source ||
      source.facility_description !== item.facility_description ||
      source.construction_began_on !== item.facility_construction_start_date ||
      source.meter_period_start_date !== item.production_period_start_date ||
      source.meter_period_end_date !== item.production_period_end_date ||
      parsedDate(source.unrelated_sale_invoice_date) <
        parsedDate(item.production_period_start_date) ||
      parsedDate(source.unrelated_sale_invoice_date) >
        parsedDate(item.production_period_end_date) ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      new Set([
          source.feedstock_record_reference,
          source.construction_record_reference,
          source.production_meter_record_reference,
          source.unrelated_sale_invoice_reference,
        ]).size !== 4
    ) {
      throw new Error(
        "Form 8835 open-loop cellulosic facility needs original producer entitlement, qualifying feedstock, and distinct owner, construction, meter, and unrelated-sale sources matching dates and kWh",
      );
    }
  } else if (
    item.energy_type === EnergyType.BiomassOpen &&
    item.open_loop_livestock_source !== undefined
  ) {
    const source = item.open_loop_livestock_source;
    const lease = item.open_loop_nonowner_lessee_source;
    if (
      item.facility_construction_start_date >= "2025-01-01" ||
      item.facility_placed_in_service_date < "2022-01-01" ||
      (item.facility_owned_by_filer === true
        ? lease !== undefined || item.facility_owner_business !== undefined ||
          item.facility_owner_person !== undefined
        : item.facility_owned_by_filer !== false || !lease ||
          !item.facility_owner_business ||
          item.facility_owner_person !== undefined ||
          lease.owner_business_name !== item.facility_owner_business.name ||
          lease.owner_business_ein !== item.facility_owner_business.ein ||
          lease.facility_description !== item.facility_description ||
          lease.facility_address_line1 !== item.facility_us_address?.line1 ||
          lease.facility_latitude !== item.facility_latitude ||
          lease.facility_longitude !== item.facility_longitude ||
          new Set([
              lease.lease_agreement_reference,
              lease.owner_producer_acknowledgment_reference,
              source.feedstock_record_reference,
              source.construction_record_reference,
              source.nameplate_capacity_record_reference,
              source.production_meter_record_reference,
              source.unrelated_sale_invoice_reference,
            ]).size !== 7) ||
      item.existing_facility_expansion === true ||
      item.subject_to_passive_activity_limit ||
      item.is_fiscal_year || item.increased_credit_reason !== "none" ||
      item.domestic_content_bonus || item.energy_community_bonus ||
      (item.tax_exempt_bond_proceeds ?? 0) !== 0 ||
      (item.transfer_election_amount ?? 0) !== 0 ||
      item.registration_number !== undefined ||
      source.facility_description !== item.facility_description ||
      source.construction_began_on !== item.facility_construction_start_date ||
      source.nameplate_capacity_kw !== item.ac_nameplate_kw ||
      source.meter_period_start_date !== item.production_period_start_date ||
      source.meter_period_end_date !== item.production_period_end_date ||
      parsedDate(source.unrelated_sale_invoice_date) <
        parsedDate(item.production_period_start_date) ||
      parsedDate(source.unrelated_sale_invoice_date) >
        parsedDate(item.production_period_end_date) ||
      source.metered_kwh_produced !== item.kwh_produced ||
      source.invoiced_kwh_sold !== item.kwh_sold ||
      new Set([
          source.feedstock_record_reference,
          source.construction_record_reference,
          source.nameplate_capacity_record_reference,
          source.production_meter_record_reference,
          source.unrelated_sale_invoice_reference,
        ]).size !== 5
    ) {
      throw new Error(
        "Form 8835 livestock-waste facility needs at least 150 kW and distinct nutrient feedstock, construction, capacity, meter, and unrelated-sale sources matching dates and kWh",
      );
    }
  } else if (item.energy_type === EnergyType.BiomassOpen) {
    throw new Error(
      "Form 8835 open-loop biomass needs a qualifying cellulosic or livestock-waste source",
    );
  } else if (
    item.open_loop_cellulosic_source !== undefined ||
    item.open_loop_livestock_source !== undefined ||
    item.open_loop_nonowner_lessee_source !== undefined
  ) {
    throw new Error(
      "Form 8835 open-loop source cannot classify another energy type",
    );
  }
  if (
    parsedDate(item.facility_construction_start_date) >
      parsedDate(item.facility_placed_in_service_date)
  ) {
    throw new Error(
      "Form 8835 construction cannot begin after the facility was placed in service",
    );
  }
  if (item.kwh_sold > item.kwh_produced) {
    throw new Error("Form 8835 kWh sold cannot exceed kWh produced");
  }
  const line = form3800Line(item);
  const line1 = Math.round(item.kwh_sold * baseRate(item));
  const line3 = item.is_fiscal_year ? item.phaseout_adjustment : 0;
  if (line3 === undefined) {
    throw new Error("Form 8835 fiscal-year phaseout adjustment is required");
  }
  if (!item.is_fiscal_year && (item.phaseout_adjustment ?? 0) > 0) {
    throw new Error(
      "Form 8835 calendar-year 2025 cannot carry a phaseout adjustment",
    );
  }
  if (line3 > line1) {
    throw new Error("Form 8835 phaseout cannot exceed the production credit");
  }
  const line4 = line1 - line3;
  const bonds = item.tax_exempt_bond_proceeds ?? 0;
  if (bonds > 0 && item.aggregate_capital_additions === undefined) {
    throw new Error(
      "Form 8835 bond reduction needs aggregate capital additions",
    );
  }
  const line5a = bonds > 0
    ? Math.round(
      Math.min(1, bonds / (item.aggregate_capital_additions ?? 1)) * 100,
    ) / 100
    : 0;
  const line5b = Math.round(line4 * line5a);
  const line5c = Math.round(line4 * 0.15);
  const line5d = Math.min(line5b, line5c);
  const line6 = line4 - line5d;
  const line7g = windPhaseout(item, line6);
  const line8 = line6 - line7g;
  const line9 = line8 * increaseFactor(item);
  const line10 = item.domestic_content_bonus ? Math.round(line9 * 0.10) : 0;
  const line11 = item.energy_community_bonus ? Math.round(line9 * 0.10) : 0;
  const line12 = line9 + line10 + line11;
  const transfer = item.transfer_election_amount ?? 0;
  if (transfer > line12) {
    throw new Error("Form 8835 transfer amount exceeds the credit");
  }
  if (transfer > 0 && !item.registration_number) {
    throw new Error(
      "Form 8835 transfer needs the IRS-issued registration number",
    );
  }
  return {
    line1,
    line2: line1,
    line3,
    line4,
    line5a,
    line5b,
    line5c,
    line5d,
    line6,
    line7g,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13: line12,
    line15: line12,
    form3800Line: line,
  };
}

class F8835Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8835";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: F8835Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const entries = input.f8835s.map((item) => {
      const lines = calculateForm8835(item);
      return {
        form3800_line: lines.form3800Line,
        credit_amount: lines.line15,
        transfer_out_amount: item.transfer_election_amount ?? 0,
        registration_number: item.registration_number,
        subject_to_passive_activity_limit:
          item.subject_to_passive_activity_limit,
        transfer_election_statement_file_name:
          item.transfer_election_statement_file_name,
      };
    });
    return { outputs: [output(f3800, { f8835_credit_entries: entries })] };
  }
}

export const f8835 = new F8835Node();
