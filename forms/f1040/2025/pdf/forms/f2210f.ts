import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  finalizedForm2210FSchema,
  form2210f,
} from "../../mef/forms/f2210f_box_b.ts";

// Verified against the canonical TY2025 IRS Form 2210-F AcroForm. Field
// f1_7 is the form's reserved line 5 and must remain blank.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});

const fields: readonly PdfFieldEntry[] = [
  {
    kind: "checkboxWhen",
    domainKey: "box_b",
    pdfField: `${page}.c1_2[0]`,
    whenValue: "true",
  },
  text("line1", "f1_3[0]"),
  text("line2", "f1_4[0]"),
  text("line3", "f1_5[0]"),
  text("line4", "f1_6[0]"),
  text("line6", "f1_8[0]"),
  text("line7", "f1_9[0]"),
  text("line8", "f1_10[0]"),
  text("line9", "f1_11[0]"),
  text("line10", "f1_12[0]"),
  text("line11", "f1_13[0]"),
  text("line12", "f1_14[0]"),
  text("line13", "f1_15[0]"),
  text("line14_month", "f1_16[0]"),
  text("line14_day", "f1_17[0]"),
  text("line15", "f1_18[0]"),
  text("line16", "f1_19[0]"),
];

export const form2210fPdf: PdfFormDescriptor = {
  pendingKey: "f2210f",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2210f--2025.pdf",
  fields,
  filerFields: [
    text("fullName", "f1_1[0]"),
    text("primarySSN", "f1_2[0]"),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const finalized = finalizedForm2210FSchema.parse(raw);
    // The native builder checks the source calculation and finalized Form 1040.
    form2210f.build(finalized, { pending: allPending });
    const lines = finalized.filed_lines;
    return {
      ...lines,
      ...(lines.line14 === null ? {} : {
        line14_month: lines.line14.slice(5, 7),
        line14_day: lines.line14.slice(8, 10),
      }),
    };
  },
};
