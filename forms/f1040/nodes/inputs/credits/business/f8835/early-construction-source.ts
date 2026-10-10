import { z } from "zod";
import type { F8835Item } from "./index.ts";
import { smallFacilitySourceSchema } from "./increase-source.ts";

import {
  assertForm8835ConstructionHistory,
  constructionBeginningSchema,
  constructionContinuitySchema,
} from "./construction-history.ts";
export { form8835ContinuityDeadline } from "./construction-history.ts";
const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});

export const earlyConstructionSourceSchema = smallFacilitySourceSchema.omit({
  generating_units: true,
  complete_generating_unit_inventory_verified: true,
}).extend({
  construction_began_on: date,
  capacity_record_reference: reference,
  ac_nameplate_kw: z.number().int().positive(),
  maximum_net_output_mw: z.number().positive(),
  placed_in_service_record_reference: reference,
  placed_in_service_on: date,
  independent_single_facility_reviewed: z.literal(true),
  original_new_facility_verified: z.literal(true),
  earliest_qualifying_start_verified: z.literal(true),
  beginning: constructionBeginningSchema,
  continuity: constructionContinuitySchema,
}).strict();

/** Reconcile reviewed evidence; this does not authenticate external records. */
export function assertForm8835EarlyConstructionSource(
  item: F8835Item,
  filing = false,
) {
  const source = item.early_construction_source;
  if (!source) {
    if (
      filing &&
      item.increased_credit_reason === "construction_before_2023_01_29"
    ) {
      throw new Error(
        "Form 8835 early construction filing needs reviewed start, continuity and signed statement sources",
      );
    }
    return;
  }
  if (
    item.increased_credit_reason !== "construction_before_2023_01_29" ||
    item.facility_owned_by_filer !== true || item.is_fiscal_year ||
    !["WIND", "GEOTHERMAL"].includes(item.energy_type) ||
    item.facility_placed_in_service_date < "2022-01-01" ||
    item.facility_construction_start_date >= "2023-01-29" ||
    source.facility_description !== item.facility_description ||
    source.facility_address_line1 !== item.facility_us_address?.line1 ||
    source.facility_latitude !== item.facility_latitude ||
    source.facility_longitude !== item.facility_longitude ||
    source.construction_began_on !== item.facility_construction_start_date ||
    source.placed_in_service_on !== item.facility_placed_in_service_date ||
    source.meter_period_start !== item.production_period_start_date ||
    source.meter_period_end !== item.production_period_end_date ||
    source.metered_kwh !== item.kwh_produced ||
    source.invoiced_kwh !== item.kwh_sold ||
    source.ac_nameplate_kw !== item.ac_nameplate_kw ||
    source.maximum_net_output_mw !== item.maximum_net_output_mw ||
    source.signed_on < item.production_period_end_date ||
    source.statement_file_name !== item.increased_credit_statement_file_name
  ) {
    throw new Error(
      "Form 8835 early construction source does not reconcile to facility and statement",
    );
  }
  const refs = [
    source.review_reference,
    source.construction_record_reference,
    source.capacity_record_reference,
    source.placed_in_service_record_reference,
    source.production_meter_reference,
    source.unrelated_sale_invoice_reference,
  ];
  assertForm8835ConstructionHistory(source, refs);
}

export function form8835EarlyConstructionDeclaration(item: F8835Item): string {
  const source = item.early_construction_source!;
  const method = source.beginning.method === "physical_work"
    ? "Physical Work Test"
    : "Five Percent Safe Harbor";
  return `The facility met the Continuity Requirement under the ${method} to establish the beginning of construction before January 29, 2023. Construction began on ${source.construction_began_on}; placed in service on ${source.placed_in_service_on}.`;
}
