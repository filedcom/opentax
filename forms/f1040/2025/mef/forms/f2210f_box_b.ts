import { element, elements } from "../../../mef/xml.ts";
import { z } from "zod";
import {
  calculateForm2210FBoxB,
  form2210FBoxBInputSchema,
  form2210FBoxBLinesSchema,
} from "../../form2210f_box_b.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const finalizedForm2210FSchema = z.object({
  source: form2210FBoxBInputSchema,
  filed_lines: form2210FBoxBLinesSchema,
}).strict();

const finalizedForm1040TaxSchema = z.object({
  line22_tax_after_credits: z.number().finite(),
  line23_other_taxes: z.number().finite().optional(),
  line25d_total_withholding: z.number().finite().optional(),
  line38_underpayment_penalty: z.number().finite().optional(),
}).passthrough();

/** Build the box-B document from reviewed source facts. */
export function buildForm2210FBoxB(rawSource: unknown): string {
  const lines = calculateForm2210FBoxB(rawSource);
  return elements("IRS2210F", [
    element("JointReturnInd", "X"),
    element("CurrentYearTaxAfterCreditsAmt", lines.line1),
    element("OtherTaxesAmt", lines.line2),
    element("TotalTaxAfterCrAndOtherTaxAmt", lines.line3),
    element("RefundableCreditsAmt", lines.line4),
    element("CurrentYearTaxAmt", lines.line6),
    element("CurrentYearTaxCalculatedAmt", lines.line7),
    element("WithholdingTaxesAmt", lines.line8),
    element("NetTaxDueAmt", lines.line9),
    element("PriorYearTaxAmt", lines.line10),
    element("RequiredAnnualPaymentAmt", lines.line11),
    element("EstTaxPaymentsAndOtherTaxesAmt", lines.line12),
    element("UnderpaymentAmt", lines.line13),
    ...(lines.line13 > 0
      ? [
        element("EarlierOfPaymentOrTaxDueDt", lines.line14 ?? undefined),
        element("PenaltyDayCnt", lines.line15),
        element("PenaltyAmt", lines.line16),
      ]
      : []),
  ]);
}

export const form2210f: MefFormDescriptor<
  "f2210f",
  z.infer<typeof finalizedForm2210FSchema>
> = {
  pendingKey: "f2210f",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2210f.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    const { source, filed_lines: filed } = finalizedForm2210FSchema.parse(
      fields,
    );
    const expected = calculateForm2210FBoxB(source);
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (filed[key] !== expected[key]) {
        throw new Error(
          `Form 2210-F finalized ${key} differs from the source calculation`,
        );
      }
    }
    const f1040 = finalizedForm1040TaxSchema.parse(context?.pending?.f1040);
    if (
      Math.round(f1040.line22_tax_after_credits) !== expected.line1 ||
      Math.round(f1040.line23_other_taxes ?? 0) !== expected.line2 ||
      Math.round(f1040.line25d_total_withholding ?? 0) !== expected.line8 ||
      Math.round(f1040.line38_underpayment_penalty ?? 0) !== expected.line16
    ) {
      throw new Error(
        "Form 2210-F does not match finalized Form 1040 tax, withholding, or penalty",
      );
    }
    if (context?.pending?.f2210 !== undefined) {
      throw new Error("Form 2210 and Form 2210-F cannot both be filed");
    }
    return buildForm2210FBoxB(source);
  },
};
