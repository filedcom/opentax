import { z } from "zod";
import { element, elements } from "../../../../mef/xml.ts";
import {
  form2210BoxEInputSchema,
  form2210BoxEPage1LinesSchema,
} from "../../../domains/payments/form2210/form2210_box_e.ts";
import { reconcileForm2210BoxEFinalized2025 } from "../../../domains/payments/form2210/form2210_box_e_finalized.ts";

export const finalizedForm2210BoxESchema = z.object({
  source: form2210BoxEInputSchema,
  filed_lines: form2210BoxEPage1LinesSchema,
}).strict();

/** Page 1 only. The public export guard stays in place until both 2024
 * filed returns are independently verified against retained source bytes. */
export function buildForm2210BoxEPage1(
  raw: unknown,
  rawFinalizedForm1040: unknown,
): string {
  const { source, filed_lines: filed } = finalizedForm2210BoxESchema.parse(raw);
  const expected = reconcileForm2210BoxEFinalized2025(
    source,
    rawFinalizedForm1040,
  );
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (filed[key] !== expected[key]) {
      throw new Error(`Form 2210 box E finalized ${key} differs from page 1`);
    }
  }
  return elements("IRS2210", [
    element("CurrentYearTaxAfterCreditsAmt", expected.line1),
    element("OtherTaxesAmt", expected.line2),
    element("RefundableCreditsAmt", expected.line3),
    element("CurrentYearTaxAmt", expected.line4),
    element("CurrentYearTaxCalculatedAmt", expected.line5),
    element("WithholdingTaxesAmt", expected.line6),
    element("NetTaxDueAmt", expected.line7),
    element("AnnualPaymentBasedOnPriorYrAmt", expected.line8),
    element("RequiredAnnualPaymentAmt", expected.line9),
    element("JointReturnInd", "X"),
  ]);
}
