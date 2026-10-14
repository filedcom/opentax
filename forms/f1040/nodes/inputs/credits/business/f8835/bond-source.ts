import { z } from "zod";
import type { F8835Item } from "./index.ts";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "A valid calendar date is required");
const money = z.number().finite().positive().refine(
  (value) =>
    Number.isSafeInteger(Math.round(value * 100)) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  "Amounts must be stated in cents",
);
const reference = z.string().trim().min(1);

export const bondSourceSchema = z.object({
  facility_description: reference,
  facility_address_line1: reference,
  facility_latitude: z.number().min(-90).max(90),
  facility_longitude: z.number().min(-180).max(180),
  construction_began_on: date,
  construction_record_reference: reference,
  as_of: z.literal("2025-12-31"),
  review_reference: reference,
  complete_current_and_prior_year_financing_confirmed: z.literal(true),
  complete_current_and_prior_year_capital_additions_confirmed: z.literal(true),
  financing: z.array(
    z.object({
      record_reference: reference,
      issue_reference: reference,
      issued_on: date,
      used_for_facility_on: date,
      proceeds_used: money,
      section103_interest_exempt_verified: z.literal(true),
    }).strict(),
  ).min(1),
  capital_additions: z.array(
    z.object({
      record_reference: reference,
      added_on: date,
      amount: money,
    }).strict(),
  ).min(1),
}).strict();

/** Reconcile entered cumulative records; references do not authenticate bytes. */
export function assertForm8835BondSource(item: F8835Item, filing = false) {
  const source = item.tax_exempt_bond_source;
  const proceeds = item.tax_exempt_bond_proceeds ?? 0;
  if (!source) {
    if (filing && proceeds > 0) {
      throw new Error(
        "Form 8835 bond filing needs a complete financing and capital source review",
      );
    }
    return;
  }
  const refs = [
    source.review_reference,
    source.construction_record_reference,
    ...source.financing.map((row) => row.record_reference),
    ...source.capital_additions.map((row) => row.record_reference),
  ];
  const sum = (values: number[]) =>
    values.reduce((n, value) => n + Math.round(value * 100), 0);
  if (
    proceeds <= 0 || proceeds > (item.aggregate_capital_additions ?? 0) ||
    item.facility_owned_by_filer !== true ||
    item.is_fiscal_year ||
    item.facility_construction_start_date <= "2022-08-16" ||
    item.facility_construction_start_date >= "2025-01-01" ||
    source.construction_began_on !== item.facility_construction_start_date ||
    source.facility_description !== item.facility_description ||
    source.facility_address_line1 !== item.facility_us_address?.line1 ||
    source.facility_latitude !== item.facility_latitude ||
    source.facility_longitude !== item.facility_longitude ||
    new Set(refs).size !== refs.length ||
    source.financing.some((row) =>
      row.issued_on > row.used_for_facility_on ||
      row.used_for_facility_on > source.as_of
    ) ||
    source.capital_additions.some((row) => row.added_on > source.as_of) ||
    sum(source.financing.map((row) => row.proceeds_used)) / 100 !== proceeds ||
    sum(source.capital_additions.map((row) => row.amount)) / 100 !==
      (item.aggregate_capital_additions ?? 0)
  ) {
    throw new Error(
      "Form 8835 bond source must reconcile the owned facility and complete year-end financing/capital inventory",
    );
  }
}
