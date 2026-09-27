import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";

// Form 5884 (Rev. March 2021), the IRS continuous-use form for TY2025.
// The field paths were inspected on the official fillable one-page PDF.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, fieldNumber: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${fieldNumber}[0]`,
});

export const form5884Pdf: PdfFormDescriptor = {
  pendingKey: "f5884",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5884.pdf",
  fields: [
    text("line1aWages", 3),
    text("line1aCredit", 4),
    text("line1bWages", 5),
    text("line1bCredit", 6),
    text("line1cWages", 7),
    text("line1cCredit", 8),
    text("line2", 9),
    text("line3", 10),
    text("line4", 11),
  ],
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: `${page}.f1_1[0]`,
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: `${page}.f1_2[0]`,
    },
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f5884s) || fields.f5884s.length === 0) return {};
    const source = inputSchema.parse(fields);
    const lines = calculateForm5884(source);
    if (lines.line2 <= 0) return {};
    if (
      source.subject_to_passive_activity_limit ||
      (source.pass_through_credits ?? []).some((entry) =>
        entry.credit_amount > 0 && entry.subject_to_passive_activity_limit
      )
    ) {
      throw new Error(
        "Form 5884 passive credit needs Form 8582-CR before PDF output",
      );
    }
    const form3800 = allPending.f3800;
    const credit = form3800?.f5884_credit;
    if (
      !credit || typeof credit !== "object" ||
      !("credit_amount" in credit) ||
      typeof credit.credit_amount !== "number" ||
      credit.credit_amount !== lines.line4
    ) {
      throw new Error("Form 5884 PDF does not reconcile to Form 3800 source");
    }
    return { ...fields, ...lines };
  },
  includeWhen(fields) {
    if (!Array.isArray(fields.f5884s) || fields.f5884s.length === 0) {
      return false;
    }
    return calculateForm5884(inputSchema.parse(fields)).line2 > 0;
  },
};
