import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8994DirectEmployer } from "../../form8994_source.ts";

// The January 2021 one-page IRS AcroForm is the filing revision for TY2025.
const page = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${field}`,
});
const yes = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField: `${page}c1_${number}[0]`,
  whenValue: "true",
});

/** Staged direct-employer PDF projection; absent from the public registry. */
export const form8994Pdf: PdfFormDescriptor = {
  pendingKey: "f8994",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8994.pdf",
  pageIndices: () => [0],
  fields: [
    yes("line_a_yes", 1),
    yes("line_b_yes", 2),
    yes("line_c_yes", 3),
    yes("line_d_yes", 4),
    text("line1", "f1_03[0]"),
    text("line2", "f1_04[0]"),
    text("line3", "f1_05[0]"),
  ],
  filerFields: [
    text("nameLine1", "f1_01[0]"),
    text("primarySSN", "f1_02[0]"),
  ],
  projectFields(raw, allPending) {
    const { lines } = reconcileForm8994DirectEmployer(raw, allPending);
    return {
      line_a_yes: true,
      line_b_yes: true,
      line_c_yes: true,
      line_d_yes: true,
      line1: lines.line1,
      line2: undefined,
      line3: lines.line3,
    };
  },
};
