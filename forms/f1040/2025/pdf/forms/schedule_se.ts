import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule SE (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sse.pdf
//
// Section A – Short Schedule SE:
//   f1_01 = Line 2 net profit from Schedule C
//   f1_02 = Line 3 net profit from Schedule F
//   f1_03 = Line 4 unreported tips (Form 4137)
//   f1_04 = Line 5a wages (Form 8919)
//   f1_06 = Line 8b W-2 SS wages for SE cap
// Note: XSD order is F→C→W2→Tips→8919; PDF order follows printed form top-to-bottom.

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["net_profit_schedule_c",  "topmostSubform[0].Page1[0].f1_01[0]"],
  ["net_profit_schedule_f",  "topmostSubform[0].Page1[0].f1_02[0]"],
  ["unreported_tips_4137",   "topmostSubform[0].Page1[0].f1_03[0]"],
  ["wages_8919",             "topmostSubform[0].Page1[0].f1_04[0]"],
  ["w2_ss_wages",            "topmostSubform[0].Page1[0].f1_06[0]"],
];

export const scheduleSePdf: PdfFormDescriptor = {
  pendingKey: "schedule_se",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sse.pdf",
  PDF_FIELD_MAP,
};
