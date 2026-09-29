import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculatePatronScheduleDLines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { projectOneBusiness8995A } from "./f8995a.ts";

// The current IRS Schedule D is Rev. December 2022 and is attached to the
// TY2025 parent. The bounded one-business route uses only column A.
const page = "topmostSubform[0].Page1[0].";
const row = (name: string, number: number): string =>
  `${page}Table_SchD[0].${name}[0].f1_${String(number).padStart(2, "0")}[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1a", pdfField: row("Row1a", 3) },
  { kind: "text", domainKey: "line1b", pdfField: row("Row1b", 6) },
  { kind: "text", domainKey: "line2", pdfField: row("Row2", 9) },
  { kind: "text", domainKey: "line3", pdfField: row("Row3", 12) },
  { kind: "text", domainKey: "line4", pdfField: row("Row4", 15) },
  { kind: "text", domainKey: "line5", pdfField: row("Row5", 18) },
  { kind: "text", domainKey: "line6", pdfField: row("Row6", 21) },
];

export const form8995aScheduleDPdf: PdfFormDescriptor = {
  pendingKey: "form8995a_schedule_d",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ad--2022.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const schedule = inputSchema.strict().parse(raw);
    const parent = inputSchema.strict().safeParse(allPending.form8995a);
    if (
      !parent.success ||
      JSON.stringify(parent.data) !== JSON.stringify(schedule)
    ) {
      throw new Error(
        "Form 8995-A Schedule D PDF needs matching parent source",
      );
    }
    const parentProjection = projectOneBusiness8995A(
      allPending.form8995a,
      allPending,
    );
    const lines = calculatePatronScheduleDLines(schedule);
    if (lines.line6 !== parentProjection.line14) {
      throw new Error(
        "Form 8995-A Schedule D PDF line 6 differs from parent line 14",
      );
    }
    return {
      line1a: schedule.business_filing_details?.business_name,
      line1b: schedule.business_filing_details?.ein,
      ...lines,
    };
  },
};
