import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8959 (2025) AcroForm field names.
// Additional Medicare Tax.
// Name/SSN/filing status fields skipped.
// Part I  — Additional Medicare Tax on Medicare Wages.
// Part II — Additional Medicare Tax on Self-Employment Income.
// Part III — Additional Medicare Tax on Railroad Retirement Tax Act (RRTA) Wages.
// Part V  — Total Additional Medicare Tax Withheld.
const fields: ReadonlyArray<PdfFieldEntry> = [
  ...[
    "line1_medicare_wages",
    "line2_unreported_tips",
    "line3_wages_8919",
    "line4_total_medicare_wages",
    "line5_threshold",
    "line6_wage_excess",
    "line7_wage_tax",
    "line8_se_income",
    "line9_threshold",
    "line10_medicare_wages",
    "line11_reduced_se_threshold",
    "line12_se_excess",
    "line13_se_tax",
    "line14_rrta_wages",
    "line15_threshold",
    "line16_rrta_excess",
    "line17_rrta_tax",
    "line18_total_tax",
    "line19_medicare_withheld",
    "line20_medicare_wages",
    "line21_regular_medicare_tax",
    "line22_additional_withheld",
    "line23_rrta_withheld",
    "line24_total_withheld",
  ].map((domainKey, index) => ({
    kind: "text" as const,
    domainKey,
    pdfField: `topmostSubform[0].Page1[0].f1_${index + 3}[0]`,
  })),
];

export const form8959Pdf: PdfFormDescriptor = {
  pendingKey: "form8959",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8959--2025.pdf",
  fields,
  // Form 8959 is required when Medicare wages exceed the $200k withholding
  // threshold or additional Medicare tax was computed (Schedule 2 line 11).
  includeWhen: (fields, all) =>
    (((all?.["schedule2"]?.["line11_additional_medicare"]) as number | undefined) ?? 0) > 0 ||
    ((fields["medicare_wages_box5"] as number | undefined) ?? 0) > 200000,
};
