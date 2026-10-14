import { z } from "zod";
import {
  calculateForm2210BoxEPage1,
  form2210BoxEInputSchema,
  type Form2210BoxEPage1Lines,
} from "./form2210_box_e.ts";

const amount = z.number().int().nonnegative();
const finalizedReturnSchema = z.object({
  filing_status: z.literal("mfj"),
  line22_tax_after_credits: amount,
  line23_other_taxes: amount.optional(),
  line25c_total: amount.optional(),
  line25d_total_withholding: amount,
  line32_refundable_credits_total: amount.optional(),
  line38_underpayment_penalty: amount.optional(),
}).passthrough();

/** Bind the staged box-E calculation to finalized current-year Form 1040. */
export function reconcileForm2210BoxEFinalized2025(
  rawSource: unknown,
  rawFinalizedForm1040: unknown,
): Form2210BoxEPage1Lines {
  const source = form2210BoxEInputSchema.parse(rawSource);
  const filed = finalizedReturnSchema.parse(rawFinalizedForm1040);
  if (
    source.current_line22_tax_after_credits !==
      filed.line22_tax_after_credits ||
    source.current_withholding_taxes !== filed.line25d_total_withholding ||
    (filed.line23_other_taxes ?? 0) !== 0 ||
    (filed.line25c_total ?? 0) !== 0 ||
    (filed.line32_refundable_credits_total ?? 0) !== 0 ||
    filed.line38_underpayment_penalty !== undefined
  ) {
    throw new Error(
      "Form 2210 box E current tax, withholding, or exclusion differs from finalized Form 1040",
    );
  }
  return calculateForm2210BoxEPage1(source);
}
