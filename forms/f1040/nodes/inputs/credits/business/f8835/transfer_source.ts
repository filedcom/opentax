import { z } from "zod";
import type { F8835Item } from "./index.ts";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
const dollars = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const address = z.object({
  line1: reference,
  line2: reference.optional(),
  city: reference,
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
}).strict();
const party = z.object({
  name: reference,
  tin: z.string().regex(/^\d{9}$/),
  address,
  signer_name: reference,
  signer_authority_reference: reference,
  signed_on: date,
  signed_statement_reviewed: z.literal(true),
}).strict();

/** Reviewed original-year transfer agreements; authenticity remains external. */
export const transferSourceSchema = z.object({
  tax_year: z.literal(2025),
  transferor: party,
  facility_description: reference,
  facility_address: address,
  facility_latitude: z.number().finite(),
  facility_longitude: z.number().finite(),
  facility_placed_in_service_date: date,
  registration_number: z.string().regex(
    /^[CPT][A-M][A-Za-z0-9]{3}[0-9]{2}[A-Za-z0-9]{5}$/,
  ),
  registration_record_reference: reference,
  registration_tax_year: z.literal(2025),
  registration_facility_and_owner_verified: z.literal(true),
  registration_received_on: date,
  return_filing_date: date,
  return_due_date_including_extensions: date,
  original_timely_return_verified: z.literal(true),
  eligible_nonapplicable_taxpayer_verified: z.literal(true),
  self_generated_not_previously_transferred_credit_verified: z.literal(true),
  no_duplicate_election_or_elective_payment_verified: z.literal(true),
  complete_facility_transfer_inventory_verified: z.literal(true),
  total_facility_credit: dollars,
  review_reference: reference,
  transfers: z.array(
    z.object({
      transferee: party,
      transferee_tax_year: z.literal(2025),
      transferee_return_filing_date: date,
      agreement_reference: reference,
      credit_amount: dollars,
      cash_consideration_cents: dollars,
      cash_payments: z.array(
        z.object({
          record_reference: reference,
          paid_on: date,
          amount_cents: dollars,
          currency: z.literal("USD"),
          method: z.enum([
            "cash",
            "check",
            "cashier_check",
            "money_order",
            "wire",
            "ach",
            "bank_transfer",
          ]),
          cleared_and_immediately_available_verified: z.literal(true),
        }).strict(),
      ).min(1),
      unrelated_under_267b_and_707b_including_controlled_groups_verified: z
        .literal(true),
      all_6418_and_section45_requirements_verified: z.literal(true),
      recapture_notification_acknowledged_by_both_parties: z.literal(true),
      facility_existence_documentation_reference: reference,
      qualifying_production_and_sales_documentation_reference: reference,
      bonus_documentation_reference: reference.optional(),
      minimum_documentation_delivered_to_transferee_verified: z.literal(true),
      proportional_base_and_bonus_portion_verified: z.literal(true),
      statement_file_name: z.string().regex(
        /^Transfer Election Statement(?: [A-Za-z0-9_-]+)?\.pdf$/,
      ),
      statement_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict(),
  ).min(1),
}).strict();

export function assertForm8835TransferSource(
  item: F8835Item,
  credit: number,
  filing = false,
) {
  const s = item.transfer_source;
  const amount = item.transfer_election_amount ?? 0;
  if (!s) {
    if (filing && amount > 0) {
      throw new Error(
        "Form 8835 transfer filing needs reviewed registration, agreements, cash and signed statements",
      );
    }
    return;
  }
  const names = s.transfers.map((t) => t.statement_file_name);
  const buyers = s.transfers.map((t) => t.transferee.tin);
  const payments = s.transfers.flatMap((t) =>
    t.cash_payments.map((p) => p.record_reference)
  );
  if (
    amount <= 0 || item.facility_owned_by_filer !== true ||
    item.is_fiscal_year ||
    item.subject_to_passive_activity_limit ||
    s.total_facility_credit !== credit ||
    s.transfers.reduce((n, t) => n + t.credit_amount, 0) !== amount ||
    amount > credit ||
    s.facility_description !== item.facility_description ||
    JSON.stringify(s.facility_address) !==
      JSON.stringify(item.facility_us_address) ||
    s.facility_latitude !== item.facility_latitude ||
    s.facility_longitude !== item.facility_longitude ||
    s.facility_placed_in_service_date !==
      item.facility_placed_in_service_date ||
    s.registration_number !== item.registration_number ||
    s.registration_received_on > s.return_filing_date ||
    s.return_filing_date < "2026-01-01" ||
    s.return_filing_date > s.return_due_date_including_extensions ||
    new Set(names).size !== names.length ||
    new Set(buyers).size !== buyers.length ||
    new Set(payments).size !== payments.length ||
    item.transfer_election_statement_file_name !== names[0] ||
    s.transfers.some((t) => {
      const deadline =
        [s.return_filing_date, t.transferee_return_filing_date].sort()[0];
      return t.transferee.tin === s.transferor.tin ||
        t.transferee_return_filing_date < "2026-01-01" ||
        s.transferor.signed_on > deadline ||
        t.transferee.signed_on > deadline ||
        s.transferor.signed_on < "2025-01-01" ||
        t.transferee.signed_on < "2025-01-01" ||
        t.cash_payments.some((p) =>
          p.paid_on < "2025-01-01" || p.paid_on > deadline
        ) ||
        t.cash_payments.reduce((n, p) => n + p.amount_cents, 0) !==
          t.cash_consideration_cents ||
        ((item.domestic_content_bonus || item.energy_community_bonus ||
          item.increased_credit_reason !== "none") &&
          !t.bonus_documentation_reference);
    })
  ) {
    throw new Error(
      "Form 8835 transfer inventory, facility, credit, cash or election dates do not reconcile",
    );
  }
}
export const form8835TransferDescription = (
  facility: string,
  buyerTin: string,
) => `Transfer Election Statement - ${facility} - ${buyerTin}`;
