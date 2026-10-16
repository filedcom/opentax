import { z } from "zod";
import { isSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1), date = z.string().date();
const common = {
  record_reference: ref,
  custodian_transaction_identifier: ref,
  distributed_on: date,
  amount: z.number().positive().finite().max(10_000_000).refine(isSourceMoney),
  reporting: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("never_reported"),
      custodian_reporting_review_reference: ref,
      not_in_any_issued_1099sa_verified: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("corrected"),
      original_form1099sa_source_reference: ref,
      current_form1099sa_source_reference: ref,
      correction_excludes_only_linked_nonreportable_payments_verified: z
        .literal(true),
    }).strict(),
  ]),
};
/** Actual ledger debits omitted from reportable payments only after the separate
 * funding/distribution reconciliation validates their counterpart receipts. */
export const hsaNonreportablePayment2026Schema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("trustee_transfer"),
    destination_receipt_reference: ref,
    transfer_instruction_reference: ref,
    beneficiary_never_received_funds_verified: z.literal(true),
    cash_transfer_verified: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("mistaken_distribution"),
    repayment_receipt_reference: ref,
    mistake_evidence_reference: ref,
    mistake_of_fact_due_to_reasonable_cause_verified: z.literal(true),
    first_knew_or_should_have_known_on: date,
    beneficiary_representation_reference: ref,
    representation_signed_on: date,
    custodian_acceptance_reference: ref,
    custodian_accepted_on: date,
    ordinary_repayment_deadline_no_postponement_claimed: z.literal(true),
  }).strict(),
]);
export const hsaNonreportableReview2026Schema = z.object({
  record_reference: ref,
  reviewed_on: date,
  complete_transfer_mistake_and_correction_inventory_verified: z.literal(true),
}).strict();
export type HsaNonreportableReview2026 = z.input<
  typeof hsaNonreportableReview2026Schema
>;
