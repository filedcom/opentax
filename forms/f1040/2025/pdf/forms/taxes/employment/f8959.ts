import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  assertForm8959Absent,
  assertForm8959Sources,
  hasForm8959Print,
} from "../../../../domains/taxes/employment/form8959/form8959-source.ts";
import { printFieldsSchema } from "../../../../../nodes/intermediate/forms/taxes/employment/form8959/index.ts";

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
    printZero: [
      "line11_reduced_se_threshold",
      "line22_additional_withheld",
      "line24_total_withheld",
    ].includes(domainKey),
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
      domainKey: "nameShownOnForm1040",
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
    // Keep the validated native calculation intact; omit inapplicable PDF parts.
    const projected: Record<string, unknown> = { ...printed };
    const omit = (keys: readonly string[]) => {
      for (const key of keys) delete projected[key];
    };
    const wages = printed.line4_total_medicare_wages > 0;
    const rrta = printed.line14_rrta_wages > 0;
    if (!wages) {
      omit([
        "line1_medicare_wages",
        "line2_unreported_tips",
        "line3_wages_8919",
        "line4_total_medicare_wages",
        "line5_threshold",
        "line6_wage_excess",
        "line7_wage_tax",
        "line19_medicare_withheld",
        "line20_medicare_wages",
        "line21_regular_medicare_tax",
        "line22_additional_withheld",
      ]);
    }
    if (printed.line8_se_income <= 0) {
      omit([
        "line8_se_income",
        "line9_threshold",
        "line10_medicare_wages",
        "line11_reduced_se_threshold",
        "line12_se_excess",
        "line13_se_tax",
      ]);
    }
    if (!rrta) {
      omit([
        "line14_rrta_wages",
        "line15_threshold",
        "line16_rrta_excess",
        "line17_rrta_tax",
        "line23_rrta_withheld",
      ]);
    }
    if (!wages && !rrta) omit(["line24_total_withheld"]);
    return projected;
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
