import { z } from "zod";
import type { F8835Item } from "./index.ts";
import catalog from "./energy-community-catalog.json" with { type: "json" };

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
const capacity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const brownfield = z.object({
  category: z.literal("brownfield"),
  parcel_reference: reference,
  parcel_boundary_record_reference: reference,
  unit_within_reviewed_parcel_verified: z.literal(true),
  cercla_101_39_b_exclusions_review_reference: reference,
  excluded_site_categories_absent_verified: z.literal(true),
  condition_as_of: date,
  report_reference: reference,
  report_completed_on: date,
  method: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("government_assessment"),
      government_authority: reference,
      government_level: z.enum([
        "federal",
        "state",
        "territory",
        "federally_recognized_indian_tribe",
      ]),
      assessed_as_cercla_brownfield_verified: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("phase_ii"),
      astm_standard: z.literal("E1903"),
      standard_edition: reference,
      current_applicable_standard_review_reference: reference,
      hazardous_substance_pollutant_or_contaminant_present_verified: z.literal(
        true,
      ),
    }).strict(),
    z.object({
      kind: z.literal("phase_i"),
      astm_standard: z.literal("E1527"),
      standard_edition: reference,
      current_applicable_standard_review_reference: reference,
      presence_or_potential_contamination_identified_verified: z.literal(true),
    }).strict(),
  ]),
}).strict();

const location = z.discriminatedUnion("category", [
  z.object({ category: z.literal("not_counted") }).strict(),
  z.object({
    category: z.literal("coal_closure"),
    census_2020_tract_fips: z.string().regex(/^\d{11}$/),
    notice_appendix: z.enum([
      "2023-29-C",
      "2023-47-3",
      "2024-48-2",
      "2025-31-4",
    ]),
    tract_boundary_and_unit_location_review_reference: reference,
  }).strict(),
  z.object({
    category: z.literal("statistical_area"),
    county_fips: z.string().regex(/^\d{5}$/),
    notice_appendix: z.enum(["2024-48-1", "2025-31-3"]),
    vintage: z.enum(["vintage1", "vintage2"]),
    county_boundary_and_unit_location_review_reference: reference,
  }).strict(),
  brownfield,
]);

/** Annual nameplate test, Notice 2023-29 §§4–5, as clarified by 2023-45.
 * Source review is not geocoding, issuer authentication, or a BOC safe harbor.
 */
export const energyCommunitySourceSchema = z.object({
  tax_year: z.literal(2025),
  method: z.literal("annual_nameplate_capacity"),
  taxpayer_name: reference,
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  facility_description: reference,
  facility_address_line1: reference,
  facility_address_line2: reference.optional(),
  facility_city: reference,
  facility_state: z.string().regex(/^[A-Z]{2}$/),
  facility_zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  facility_latitude: z.number().min(-90).max(90),
  facility_longitude: z.number().min(-180).max(180),
  review_reference: reference,
  qualification_date: date,
  original_onshore_facility_verified: z.literal(true),
  complete_generating_unit_inventory_verified: z.literal(true),
  units_and_capacity_as_of_qualification_date_verified: z.literal(true),
  generating_units_unchanged_through_production_period_verified: z.literal(
    true,
  ),
  ac_manufacturer_nameplate_measurement_verified: z.literal(true),
  construction_record_reference: reference,
  construction_began_on: date,
  placed_in_service_record_reference: reference,
  placed_in_service_on: date,
  production_meter_reference: reference,
  meter_period_start: date,
  meter_period_end: date,
  metered_kwh: capacity,
  unrelated_sale_invoice_reference: reference,
  invoiced_kwh: capacity,
  unrelated_buyer_verified: z.literal(true),
  no_investment_credit_election_verified: z.literal(true),
  no_section1603_grant_verified: z.literal(true),
  generating_units: z.array(
    z.object({
      unit_reference: reference,
      capacity_record_reference: reference,
      nameplate_kw_ac: capacity,
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      geolocation_record_reference: reference,
      us_or_territory_location_verified: z.literal(true),
      qualification: location,
    }).strict(),
  ).min(1),
}).strict();

export type EnergyCommunitySource = z.infer<typeof energyCommunitySourceSchema>;

export function energyCommunityCapacity(source: EnergyCommunitySource) {
  const total = source.generating_units.reduce(
    (n, u) => n + BigInt(u.nameplate_kw_ac),
    0n,
  );
  let qualifying = 0n;
  for (const unit of source.generating_units) {
    const q = unit.qualification;
    if (q.category === "not_counted") continue;
    let valid = false;
    if (q.category === "coal_closure") {
      valid =
        catalog.coal[q.notice_appendix].includes(q.census_2020_tract_fips) &&
        (q.notice_appendix !== "2025-31-4" ||
          source.qualification_date >= "2025-06-23");
    } else if (q.category === "statistical_area") {
      // Each published row already satisfies BOTH thresholds in the SAME vintage.
      valid = q.notice_appendix === "2024-48-1"
        ? source.qualification_date < "2025-06-23" &&
          q.vintage === "vintage1" &&
          catalog.statistical["2024-48-1"].vintage1.includes(q.county_fips)
        : source.qualification_date >= "2025-06-23" &&
          catalog.statistical["2025-31-3"][q.vintage].includes(q.county_fips);
    } else {
      valid = q.condition_as_of === source.qualification_date &&
        q.report_completed_on <= source.qualification_date &&
        (q.method.kind !== "phase_i" || total <= 5000n);
    }
    if (!valid) {
      throw new Error(
        "Form 8835 energy-community location, published vintage, date or brownfield evidence does not qualify",
      );
    }
    qualifying += BigInt(unit.nameplate_kw_ac);
  }
  return { total, qualifying };
}

export function assertForm8835EnergyCommunitySource(
  item: F8835Item,
  filing = false,
) {
  const source = item.energy_community_source;
  if (!source) {
    if (filing && item.energy_community_bonus) {
      throw new Error(
        "Form 8835 energy-community filing needs reviewed location and capacity sources",
      );
    }
    return;
  }
  const { total, qualifying } = energyCommunityCapacity(source);
  const unitIds = source.generating_units.map((u) => u.unit_reference);
  const records = [
    source.review_reference,
    source.construction_record_reference,
    source.placed_in_service_record_reference,
    source.production_meter_reference,
    source.unrelated_sale_invoice_reference,
    ...source.generating_units.flatMap((
      u,
    ) => [u.capacity_record_reference, u.geolocation_record_reference]),
  ];
  const small = item.small_facility_source;
  const sameSmallUnits = !small ||
    small.generating_units.length === source.generating_units.length &&
      small.generating_units.every((u) =>
        source.generating_units.some((v) =>
          u.unit_reference === v.unit_reference &&
          u.capacity_record_reference === v.capacity_record_reference &&
          u.nameplate_kw_ac === v.nameplate_kw_ac
        )
      );
  if (
    !item.energy_community_bonus || item.facility_owned_by_filer !== true ||
    item.is_fiscal_year ||
    !["WIND", "GEOTHERMAL"].includes(item.energy_type) ||
    !["none", "under_one_mw", "construction_before_2023_01_29"].includes(
      item.increased_credit_reason,
    ) ||
    item.existing_facility_expansion ||
    item.subject_to_passive_activity_limit ||
    (item.transfer_election_amount ?? 0) !== 0 ||
    item.registration_number !== undefined ||
    item.facility_owner_person || item.facility_owner_business ||
    source.qualification_date < "2025-01-01" ||
    source.qualification_date > "2025-12-31" ||
    source.qualification_date < item.facility_placed_in_service_date ||
    source.facility_description !== item.facility_description ||
    source.facility_address_line1 !== item.facility_us_address?.line1 ||
    source.facility_address_line2 !== item.facility_us_address?.line2 ||
    source.facility_city !== item.facility_us_address?.city ||
    source.facility_state !== item.facility_us_address?.state ||
    source.facility_zip !== item.facility_us_address?.zip ||
    source.facility_latitude !== item.facility_latitude ||
    source.facility_longitude !== item.facility_longitude ||
    source.construction_began_on !== item.facility_construction_start_date ||
    source.placed_in_service_on !== item.facility_placed_in_service_date ||
    source.meter_period_start !== item.production_period_start_date ||
    source.meter_period_end !== item.production_period_end_date ||
    source.metered_kwh !== item.kwh_produced ||
    source.invoiced_kwh !== item.kwh_sold ||
    total > BigInt(Number.MAX_SAFE_INTEGER) ||
    Number(total) !== item.ac_nameplate_kw ||
    Number(total) / 1000 !== item.maximum_net_output_mw ||
    qualifying * 2n < total ||
    new Set(unitIds).size !== unitIds.length ||
    new Set(records).size !== records.length || !sameSmallUnits
  ) {
    throw new Error(
      "Form 8835 energy-community 50-percent capacity, facility, production or source inventory does not reconcile",
    );
  }
}
