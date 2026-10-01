import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/inputs/f8881/index.ts";
import { reconcileForm8881DirectEmployer } from "../../mef/forms/f8881.ts";

// Field names and positions were inspected on the IRS December 2025
// fillable one-page Form 8881.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, fieldNumber: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${fieldNumber}[0]`,
});

export const form8881Pdf: PdfFormDescriptor = {
  pendingKey: "f8881",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8881.pdf",
  fields: [
    text("lineA", 3),
    text("line1", 4),
    text("line2", 5),
    text("line3Count", 6),
    text("line3", 7),
    text("line4", 8),
    text("line5", 9),
    text("line6a", 10),
    text("line6b", 11),
    text("line6c", 12),
    text("line6d", 13),
    text("line6e1", 14),
    text("line6e2", 15),
    text("line6e3", 16),
    text("line6e4", 17),
    text("line6f", 18),
    text("line6g", 19),
    text("line8", 21),
    text("line9", 22),
    text("line11", 24),
    text("line12Count", 25),
    text("line12", 26),
    text("line13", 27),
    text("line15", 29),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const source = inputSchema.parse(raw);
    if (
      JSON.stringify(source) !==
        JSON.stringify(inputSchema.parse(allPending.f8881))
    ) {
      throw new Error("Form 8881 PDF source differs from filed return");
    }
    const lines = reconcileForm8881DirectEmployer(allPending);
    return {
      ...lines,
      lineA: source.startup
        ?.preceding_first_credit_year_qualified_employee_count,
      line3Count: source.startup?.eligible_non_hce_count,
      line12Count: source.military_spouses?.employees.length,
      line6e1: lines.line6a > 50 ? lines.line6e1 : undefined,
      line6e2: lines.line6a > 50 ? lines.line6e2 : undefined,
      line6e3: lines.line6a > 50 ? lines.line6e3 : undefined,
      line6e4: lines.line6a > 50 ? lines.line6e4 : undefined,
    };
  },
};
