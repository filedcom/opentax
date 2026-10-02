import { z } from "zod";

export const box10CodeJSourceSchema = z.object({
  corporation_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  recovery: z.number().int().positive(),
  taxable_amount: z.number().int().positive(),
  tax_benefit_workpaper_reference: z.string().trim().min(1),
  prior_year_tax_benefit_reviewed: z.literal(true),
}).strict().refine((row) => row.taxable_amount <= row.recovery, {
  message: "Taxable recovery exceeds the K-1 recovery",
});

export type Box10CodeJSource = z.infer<typeof box10CodeJSourceSchema>;
