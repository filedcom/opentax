import { z } from "zod";
import { itemSchema as patrSchema } from "../f1099patr/schema.ts";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Review date must be a real calendar date");

/** Reviewed facts, never a taxpayer-entered QBI or patron reduction total. */
export const inputSchema = z.object({
  business: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("schedule_c"),
      business_reference: z.string().min(1),
    }).strict(),
    z.object({ kind: z.literal("schedule_f"), farm_id: z.string().min(1) })
      .strict(),
  ]),
  source_1099patr: patrSchema,
  spouse_w2_sources: z.array(z.record(z.string(), z.unknown())).min(1)
    .optional(),
  primary_w2_sources: z.array(z.record(z.string(), z.unknown())).min(1)
    .optional(),
  allocation_method: z.literal("qualified_receipts_proportion"),
  reasonable_for_business_facts_confirmed: z.literal(true),
  consistently_applied_and_books_agree_confirmed: z.literal(true),
  all_qualified_payments_in_business_gross_income_confirmed: z.literal(true),
  employee_w2_records: z.array(
    z.object({
      employee_reference: z.string().trim().min(1),
      source_document_reference: z.string().trim().min(1),
      box1_wages: z.number().finite().nonnegative(),
      eligible_199a_wages: z.number().finite().nonnegative(),
      ssa_filing_record_reference: z.string().trim().min(1),
      filed_within_60_days_of_due_date_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
  payroll_source_reference: z.string().trim().min(1),
  w2_payroll_timely_filed_and_eligible_confirmed: z.literal(true),
  all_business_wages_included_confirmed: z.literal(true),
  no_other_business_or_aggregation_confirmed: z.literal(true),
  no_other_qbi_adjustments_confirmed: z.literal(true),
  allocation_worksheet_reference: z.string().trim().min(1),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: date,
  box6_written_notice_review: z.object({
    notice_reference: z.string().trim().min(1),
    recipient_tin: z.string().regex(/^\d{9}$/),
    designated_199ag_amount: z.number().finite().positive(),
    reviewed_by: z.string().trim().min(1),
    reviewed_on: date,
    recipient_and_amount_match_confirmed: z.literal(true),
  }).strict().optional(),
}).strict();
export type PatronReview = z.infer<typeof inputSchema>;

export const sourceSchema = z.object({
  review: inputSchema,
  business_source: z.unknown(),
  se_tax_deduction: z.number().finite().nonnegative(),
  health_insurance_deduction: z.number().finite().nonnegative(),
  retirement_plan_deduction: z.number().finite().nonnegative(),
}).strict();
export type PatronSource = z.infer<typeof sourceSchema>;
