import { z } from "zod";
import { isQualifiedTipsOccupationCode } from "../../nodes/intermediate/forms/deductions/additional/schedule1a/calculation.ts";
const reference = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
// The published occupation codes were rechecked against IRS.gov/TippedOccupations
// on October 15, 2026; they match the shared list. TP alone is not qualification.
export const tipReviewSchema = z.object({
  source_document_reference: reference,
  employee_ssn: ssn,
  employer_ein: ein,
  allocations: z.array(
    z.object({
      occupation_code: z.string().refine(
        isQualifiedTipsOccupationCode,
        "Occupation is not on the reviewed IRS tipped-occupation list",
      ),
      qualified_cash_tips: money.positive(),
      occupation_and_tip_records_reference: reference,
    }).strict(),
  ),
  excluded_cash_tips: money,
  qualification_review_reference: reference,
  voluntary_customer_tips_not_service_charges: z.literal(true),
  no_recharacterized_wages_or_related_payor_tips: z.literal(true),
  services_not_illegal_under_applicable_law: z.literal(true),
  // Notice 2025-69 SSTB relief remains applicable for calendar 2026; the
  // April 2026 final regulations reserve the SSTB rule for later guidance.
  sstb_treatment: z.enum(["not_sstb", "notice_2025_69_transition_relief"]),
}).strict();

/** Internal Form 4137 result; the public catalog accepts tip records instead. */
export const form4137TipRowSchema = z.object({
  employee_ssn: ssn,
  employer_ein: ein,
  employer_name: reference,
  source_document_reference: reference,
  tip_records_reference: reference,
  total_received: money,
  qualified_tips: money.int(),
}).strict();
