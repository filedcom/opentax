import { z } from "zod";
import type { F8835Item } from "./index.ts";

const reference = z.string().trim().min(1);
export const smallFacilitySourceSchema = z.object({
  tax_year: z.literal(2025),
  taxpayer_name: reference,
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  facility_description: reference,
  facility_address_line1: reference,
  facility_latitude: z.number().min(-90).max(90),
  facility_longitude: z.number().min(-180).max(180),
  review_reference: reference,
  complete_generating_unit_inventory_verified: z.literal(true),
  measured_in_alternating_current_verified: z.literal(true),
  construction_record_reference: reference,
  construction_began_on: reference,
  production_meter_reference: reference,
  meter_period_start: reference,
  meter_period_end: reference,
  metered_kwh: z.number().int().positive(),
  unrelated_sale_invoice_reference: reference,
  invoiced_kwh: z.number().int().positive(),
  unrelated_buyer_verified: z.literal(true),
  no_investment_credit_election_verified: z.literal(true),
  no_section1603_grant_verified: z.literal(true),
  generating_units: z.array(
    z.object({
      unit_reference: reference,
      capacity_record_reference: reference,
      nameplate_kw_ac: z.number().int().positive(),
    }).strict(),
  ).min(1),
  statement_file_name: reference,
  statement_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  signer_name: reference,
  signer_authority_review_reference: reference,
  signed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
    const date = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === s;
  }),
  signed_perjury_declaration_reviewed: z.literal(true),
}).strict();

/** A source review reconciles entered records; it does not authenticate them. */
export function assertForm8835SmallFacilitySource(
  item: F8835Item,
  filing = false,
) {
  const source = item.small_facility_source;
  if (!source) {
    if (filing && item.increased_credit_reason === "under_one_mw") {
      throw new Error(
        "Form 8835 small-facility filing needs reviewed capacity and signed statement sources",
      );
    }
    return;
  }
  const capacity = source.generating_units.reduce(
    (n, u) => n + u.nameplate_kw_ac,
    0,
  );
  const units = source.generating_units.map((u) => u.unit_reference);
  const records = [
    source.review_reference,
    source.construction_record_reference,
    source.production_meter_reference,
    source.unrelated_sale_invoice_reference,
    ...source.generating_units.map((u) => u.capacity_record_reference),
  ];
  if (
    item.increased_credit_reason !== "under_one_mw" ||
    item.facility_owned_by_filer !== true || item.is_fiscal_year ||
    !["WIND", "GEOTHERMAL"].includes(item.energy_type) ||
    item.facility_placed_in_service_date < "2022-01-01" ||
    item.facility_construction_start_date < "2023-01-29" ||
    item.facility_construction_start_date >= "2025-01-01" ||
    source.facility_description !== item.facility_description ||
    source.facility_address_line1 !== item.facility_us_address?.line1 ||
    source.facility_latitude !== item.facility_latitude ||
    source.facility_longitude !== item.facility_longitude ||
    source.construction_began_on !== item.facility_construction_start_date ||
    source.meter_period_start !== item.production_period_start_date ||
    source.meter_period_end !== item.production_period_end_date ||
    source.metered_kwh !== item.kwh_produced ||
    source.invoiced_kwh !== item.kwh_sold ||
    capacity >= 1000 || capacity !== item.ac_nameplate_kw ||
    capacity / 1000 !== item.maximum_net_output_mw ||
    new Set(units).size !== units.length ||
    new Set(records).size !== records.length ||
    source.signed_on < item.production_period_end_date ||
    source.statement_file_name !== item.increased_credit_statement_file_name
  ) {
    throw new Error(
      "Form 8835 small-facility capacity, identity, period or statement source does not reconcile",
    );
  }
}

export const form8835IncreaseDescription = (facility: string) =>
  `Form 8835 Increased Credit Amount Statement - ${facility}`;
