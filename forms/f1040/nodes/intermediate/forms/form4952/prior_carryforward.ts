import { z } from "zod";

const amount = z.number().int().nonnegative().refine(Number.isSafeInteger);

export const form4952PriorCarryforwardSourceSchema = z.object({
  tax_year: z.literal(2024),
  filed_return_reference: z.string().trim().min(1),
  completed_form_reference: z.string().trim().min(1),
  filed_primary_ssn: z.string().regex(/^\d{9}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  filed_2024_form4952: z.object({
    line1: amount,
    line2: amount,
    line3: amount,
    line6: amount,
    line7: z.number().int().positive().refine(Number.isSafeInteger),
    line8: amount,
  }).strict(),
  filed_2024_schedule_a_line9: amount,
  prior_interest_entirely_schedule_a_confirmed: z.literal(true),
  prior_no_form6198_allocation_confirmed: z.literal(true),
  reviewed_2024_amt_form4952_line7: amount,
}).strict().superRefine((source, context) => {
  const lines = source.filed_2024_form4952;
  const reviewedDate = new Date(`${source.reviewed_on}T00:00:00Z`);
  if (
    source.filed_return_reference === source.completed_form_reference ||
    source.reviewed_on < "2025-01-01" ||
    !Number.isFinite(reviewedDate.getTime()) ||
    reviewedDate.toISOString().slice(0, 10) !== source.reviewed_on ||
    lines.line3 !== lines.line1 + lines.line2 ||
    lines.line7 !== Math.max(0, lines.line3 - lines.line6) ||
    lines.line8 !== Math.min(lines.line3, lines.line6) ||
    source.filed_2024_schedule_a_line9 !== lines.line8
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Filed 2024 Form 4952 lines 3/7/8 and Schedule A line 9 do not reconcile",
    });
  }
});

export type Form4952PriorCarryforwardSource = z.infer<
  typeof form4952PriorCarryforwardSourceSchema
>;
