import type { PdfFieldEntry } from "../../reviews/execution/form-descriptor.ts";
import { finalizedForm2210BoxESchema } from "../../../mef/forms/payments/f2210_box_e.ts";
import { reconcileForm2210BoxEFinalized2025 } from "../../../domains/payments/form2210/form2210_box_e_finalized.ts";

const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});

/** Exact TY2025 AcroForm page-1 fields. Only this page is projected for box E. */
export const form2210BoxEPage1Fields: readonly PdfFieldEntry[] = [
  text("line1", "f1_3[0]"),
  text("line2", "f1_4[0]"),
  text("line3", "f1_5[0]"),
  text("line4", "f1_6[0]"),
  text("line5", "f1_7[0]"),
  text("line6", "f1_8[0]"),
  text("line7", "f1_9[0]"),
  text("line8", "f1_10[0]"),
  text("line9", "f1_11[0]"),
  {
    kind: "checkboxWhen",
    domainKey: "box_e",
    pdfField: `${page}.c1_6[0]`,
    whenValue: "true",
  },
];

export const form2210BoxEPage1FilerFields: readonly PdfFieldEntry[] = [
  text("fullName", "f1_1[0]"),
  text("primarySSN", "f1_2[0]"),
];

export function projectForm2210BoxEPage1(
  raw: unknown,
  rawFinalizedForm1040: unknown,
) {
  const { source, filed_lines: filed } = finalizedForm2210BoxESchema.parse(raw);
  const expected = reconcileForm2210BoxEFinalized2025(
    source,
    rawFinalizedForm1040,
  );
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (filed[key] !== expected[key]) {
      throw new Error(`Form 2210 box E PDF ${key} differs from page 1`);
    }
  }
  return expected;
}
