import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  assertForm8959Absent,
  assertForm8959Sources,
  hasForm8959Print,
} from "../../form8959-source.ts";
import { printFieldsSchema } from "../../../nodes/intermediate/forms/form8959/index.ts";

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
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
  projectFields: (raw, all) => {
    if (!hasForm8959Print(raw)) {
      assertForm8959Absent(raw, all);
      return raw;
    }
    const printValues = Object.fromEntries(
      Object.keys(printFieldsSchema.shape)
        .filter((key) => key in raw)
        .map((key) => [key, raw[key]]),
    );
    const printed = printFieldsSchema.parse(printValues);
    assertForm8959Sources(raw, printed, all);
    return printed;
  },
  // A single W-2 above the employer withholding trigger requires filing even
  // when the return-wide threshold leaves tax at zero.
  includeWhen: (fields, all) =>
    (((all?.["schedule2"]?.["line11_additional_medicare"]) as
        | number
        | undefined) ?? 0) > 0 ||
    ((fields["line24_total_withheld"] as number | undefined) ?? 0) > 0 ||
    fields["single_w2_over_withholding_threshold"] === true,
};
