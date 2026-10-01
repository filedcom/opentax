import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { scheduleSELines } from "../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";

// IRS Schedule SE (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf
//
// The TY2025 AcroForm starts with name (f1_1) and SSN (f1_2). Part I
// then runs in printed line order; Part II line 15 is Page 2 f2_2.

const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "net_profit_schedule_f",
    pdfField: `${page1}f1_3[0]`,
  },
  {
    kind: "text",
    domainKey: "net_profit_schedule_c",
    pdfField: `${page1}f1_5[0]`,
  },
  { kind: "text", domainKey: "line3", pdfField: `${page1}f1_6[0]` },
  { kind: "text", domainKey: "line4a", pdfField: `${page1}f1_7[0]` },
  { kind: "text", domainKey: "line4b", pdfField: `${page1}f1_8[0]` },
  { kind: "text", domainKey: "line4c", pdfField: `${page1}f1_9[0]` },
  { kind: "text", domainKey: "line6", pdfField: `${page1}f1_12[0]` },
  {
    kind: "text",
    domainKey: "w2_ss_wages",
    pdfField: `${page1}Line8a_ReadOrder[0].f1_14[0]`,
  },
  {
    kind: "text",
    domainKey: "unreported_tips_4137",
    pdfField: `${page1}f1_15[0]`,
  },
  { kind: "text", domainKey: "wages_8919", pdfField: `${page1}f1_16[0]` },
  { kind: "text", domainKey: "line8d", pdfField: `${page1}f1_17[0]` },
  { kind: "text", domainKey: "line9", pdfField: `${page1}f1_18[0]` },
  { kind: "text", domainKey: "line10", pdfField: `${page1}f1_19[0]` },
  { kind: "text", domainKey: "line11", pdfField: `${page1}f1_20[0]` },
  { kind: "text", domainKey: "line12", pdfField: `${page1}f1_21[0]` },
  { kind: "text", domainKey: "line13", pdfField: `${page1}f1_22[0]` },
  { kind: "text", domainKey: "line15", pdfField: `${page2}f2_2[0]` },
];

export const scheduleSePdf: PdfFormDescriptor = {
  pendingKey: "schedule_se",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: `${page1}f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}f1_2[0]` },
  ],
  projectFields(fields) {
    const lines = scheduleSELines(fields, CONFIG_BY_YEAR[2025].ssWageBase);
    return {
      ...fields,
      ...(fields.farm_optional_method_elected === true
        ? { net_profit_schedule_f: undefined }
        : {}),
      ...lines,
    };
  },
  // Schedule SE is filed only when self-employment tax was actually computed
  // (Schedule 2 line 4); W-2 social security wages alone do not require it.
  includeWhen: (_fields, all) =>
    (((all?.["schedule2"]?.["line4_se_tax"]) as number | undefined) ?? 0) > 0,
};
