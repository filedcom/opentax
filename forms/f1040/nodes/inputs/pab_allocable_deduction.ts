import { z } from "zod";

/** Reviewed per-copy expense that would be deductible if PAB interest were taxable. */
export const pabAllocableDeductionWorkpaperSchema = z.object({
  tax_year: z.literal(2025),
  reviewed_workpaper_reference: z.string().trim().min(1),
  expense_record_reference: z.string().trim().min(1),
  allocable_deduction: z.number().int().nonnegative(),
  direct_allocation_to_reported_bond: z.literal(true),
  deductible_if_interest_taxable: z.literal(true),
  not_claimed_elsewhere_on_return: z.literal(true),
}).strict();

export type PabAllocableDeductionWorkpaper = z.infer<
  typeof pabAllocableDeductionWorkpaperSchema
>;
