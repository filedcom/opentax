import { z } from "zod";
import type { F8835Item } from "./index.ts";
import { smallFacilitySourceSchema } from "./increase-source.ts";

const reference = z.string().trim().min(1);
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const record = z.object({
  item_reference: reference,
  description: reference,
  manufacturer_reference: reference,
  origin_record_reference: reference,
});

/** Actual manufacturer costs under Notice 2023-38; no elective table values. */
export const domesticContentSourceSchema = smallFacilitySourceSchema.omit({
  generating_units: true,
  complete_generating_unit_inventory_verified: true,
  measured_in_alternating_current_verified: true,
}).extend({
  method: z.literal("actual_manufacturer_direct_costs"),
  independent_new_facility_verified: z.literal(true),
  complete_project_component_inventory_verified: z.literal(true),
  steel_iron_and_manufactured_classification_review_reference: reference,
  manufacturer_paid_or_incurred_direct_costs_reviewed: z.literal(true),
  installation_costs_excluded_verified: z.literal(true),
  placed_in_service_on: reference,
  facility_city: reference,
  facility_state: z.string().regex(/^[A-Z]{2}$/),
  facility_zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  facility_address_line2: reference.optional(),
  steel_iron: z.array(
    record.extend({
      all_manufacturing_processes_us_except_metallurgical_additives: z.literal(
        true,
      ),
    }).strict(),
  ),
  manufactured_products: z.array(
    record.extend({
      all_manufacturing_processes_us: z.boolean(),
      cost_record_reference: reference,
      total_direct_cost_cents: cents.refine((n) => n > 0),
      complete_component_inventory_verified: z.literal(true),
      components: z.array(
        record.extend({
          all_manufacturing_processes_us: z.boolean(),
          cost_record_reference: reference,
          manufacturer_direct_cost_cents: cents,
        }).strict(),
      ).min(1),
    }).strict(),
  ).min(1),
  certification_year: z.number().int().min(2023).max(2025),
  first_year_bonus_credit: z.number().int().nonnegative(),
  prior_certification: z.object({
    filed_return_reference: reference,
    originally_submitted_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    original_certification_and_filing_reviewed: z.literal(true),
  }).strict().optional(),
}).strict();

export type DomesticContentSource = z.infer<typeof domesticContentSourceSchema>;

export function domesticManufacturedCosts(source: DomesticContentSource) {
  let domestic = 0n, total = 0n;
  for (const product of source.manufactured_products) {
    const cost = BigInt(product.total_direct_cost_cents);
    const components = product.components.reduce(
      (sum, c) => sum + BigInt(c.manufacturer_direct_cost_cents),
      0n,
    );
    if (components > cost) {
      throw new Error(
        "Form 8835 component costs exceed manufacturer product cost",
      );
    }
    total += cost;
    // A U.S. product contributes its whole cost once. Otherwise only its U.S.
    // components count; assembly labor of a non-U.S. product is excluded.
    domestic += product.all_manufacturing_processes_us &&
        product.components.every((c) => c.all_manufacturing_processes_us)
      ? cost
      : product.components.filter((c) => c.all_manufacturing_processes_us)
        .reduce((sum, c) => sum + BigInt(c.manufacturer_direct_cost_cents), 0n);
  }
  return { domestic, total };
}

export function assertForm8835DomesticSource(item: F8835Item, filing = false) {
  const source = item.domestic_content_source;
  if (!source) {
    if (filing && item.domestic_content_bonus) {
      throw new Error(
        "Form 8835 domestic-content filing needs reviewed manufacturer costs and certification",
      );
    }
    return;
  }
  const records = [
    ...source.steel_iron,
    ...source.manufactured_products.flatMap((p) => [p, ...p.components]),
  ];
  const identifiers = records.map((r) => r.item_reference);
  const costRecords = source.manufactured_products.flatMap((
    p,
  ) => [
    p.cost_record_reference,
    ...p.components.map((c) => c.cost_record_reference),
  ]);
  const { domestic, total } = domesticManufacturedCosts(source);
  const serviceYear = Number(item.facility_placed_in_service_date.slice(0, 4));
  if (
    !item.domestic_content_bonus || item.facility_owned_by_filer !== true ||
    !["WIND", "GEOTHERMAL", "SOLAR"].includes(item.energy_type) ||
    item.is_fiscal_year ||
    ![
      "none",
      "under_one_mw",
      "construction_before_2023_01_29",
      "prevailing_wage_and_apprenticeship",
    ].includes(
      item.increased_credit_reason,
    ) ||
    item.existing_facility_expansion ||
    item.subject_to_passive_activity_limit ||
    ((item.transfer_election_amount ?? 0) !== 0 && !item.transfer_source) ||
    (item.registration_number !== undefined && !item.transfer_source) ||
    item.facility_owner_person ||
    item.facility_owner_business ||
    serviceYear < 2023 || serviceYear > 2025 ||
    item.facility_construction_start_date >= "2025-01-01" ||
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
    source.certification_year !== serviceYear ||
    source.signed_on < item.facility_placed_in_service_date ||
    source.statement_file_name !== item.domestic_content_statement_file_name ||
    source.statement_file_name === item.increased_credit_statement_file_name ||
    new Set(identifiers).size !== identifiers.length ||
    new Set(costRecords).size !== costRecords.length || total <= 0n ||
    domestic * 100n < total * 40n ||
    (serviceYear === 2025
      ? source.prior_certification !== undefined
      : !source.prior_certification ||
        source.prior_certification.originally_submitted_sha256 !==
          source.statement_sha256)
  ) {
    throw new Error(
      "Form 8835 domestic-content inventory, 40-percent cost test, facility or certification does not reconcile",
    );
  }
}

export const form8835DomesticDescription = (facility: string) =>
  `Form 8835 Domestic Content Certification Statement - ${facility}`;
