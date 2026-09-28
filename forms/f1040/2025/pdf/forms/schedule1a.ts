import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateSeniorOnlySchedule1A,
  inputSchema,
} from "../../../nodes/intermediate/forms/schedule1a/index.ts";
import { schedule1a } from "../../mef/forms/schedule1a.ts";

// Checked against the two-page 2025 IRS AcroForm. This descriptor deliberately
// fills only the sourced senior-only route; Parts II-IV remain unsupported.
const page1 = "form1[0].Page1[0]";
const page2 = "form1[0].Page2[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1_agi", pdfField: `${page1}.f1_03[0]` },
  {
    kind: "text",
    domainKey: "line2e_zero_exclusions",
    pdfField: `${page1}.f1_08[0]`,
    printZero: true,
  },
  { kind: "text", domainKey: "line3_magi", pdfField: `${page1}.f1_09[0]` },
  { kind: "text", domainKey: "line31_magi", pdfField: `${page2}.f2_15[0]` },
  {
    kind: "text",
    domainKey: "line32_threshold",
    pdfField: `${page2}.f2_16[0]`,
  },
  {
    kind: "text",
    domainKey: "line33_excess_magi",
    pdfField: `${page2}.f2_17[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line34_reduction",
    pdfField: `${page2}.f2_18[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line35_per_person",
    pdfField: `${page2}.f2_19[0]`,
  },
  {
    kind: "text",
    domainKey: "line36a_taxpayer",
    pdfField: `${page2}.f2_20[0]`,
  },
  {
    kind: "text",
    domainKey: "line36b_spouse",
    pdfField: `${page2}.f2_21[0]`,
  },
  {
    kind: "text",
    domainKey: "line37_senior",
    pdfField: `${page2}.f2_22[0]`,
  },
  {
    kind: "text",
    domainKey: "line38_total",
    pdfField: `${page2}.f2_23[0]`,
  },
];

export const schedule1aPdf: PdfFormDescriptor = {
  pendingKey: "schedule1a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf",
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return raw;
    const input = inputSchema.parse(raw);
    // Keep the PDF authorization identical to native XML authorization.
    if (!schedule1a.build(input, { pending: allPending })) return {};
    const lines = calculateSeniorOnlySchedule1A(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    return {
      ...lines,
      line2e_zero_exclusions: 0,
      line31_magi: lines.line3_magi,
    };
  },
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: `${page1}.f1_01[0]`,
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: `${page1}.f1_02[0]`,
    },
  ],
};
