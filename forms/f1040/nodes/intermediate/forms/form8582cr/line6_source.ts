import { z } from "zod";

/** Filed-return source facts for the bounded ordinary-tax line 6 calculation. */
export const line6OrdinaryWorksheetSchema = z.object({
  tax_year: z.literal(2025),
  tax_method: z.literal("ordinary"),
  activity_id: z.string().trim().min(1).max(64),
  passive_income_source_document_reference: z.string().trim().min(1),
  net_passive_income: z.number().int().positive(),
  taxable_income_including_passive: z.number().int().nonnegative(),
  taxable_income_without_passive: z.number().int().nonnegative(),
  tax_including_passive: z.number().int().nonnegative(),
  tax_without_passive: z.number().int().nonnegative(),
}).strict();
