import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  inputSchema,
  LanguagePreferenceCode,
} from "../../../nodes/inputs/schedule_lep/index.ts";
import {
  buildScheduleLep,
  requestIdentity,
} from "../../mef/forms/schedule_lep.ts";

// The December 2024 Schedule LEP AcroForm is the form referenced by the
// TY2025 IRS package. Page 2 contains instructions, not fillable return data.
const page = "topmostSubform[0].Page1[0]";
const codeGroup: readonly (readonly [LanguagePreferenceCode, string])[] = [
  [LanguagePreferenceCode.Cancel, "Line1_ReadOrder[0]"],
  [LanguagePreferenceCode.Spanish, "Line1_ReadOrder[0].Spanish[0]"],
  [LanguagePreferenceCode.Korean, "Line1_ReadOrder[0].Korean[0]"],
  [LanguagePreferenceCode.Vietnamese, "Line1_ReadOrder[0].Vietnamese[0]"],
  [LanguagePreferenceCode.Russian, "Line1_ReadOrder[0].Russian[0]"],
  [LanguagePreferenceCode.Arabic, "Line1_ReadOrder[0].Arabic[0]"],
  [LanguagePreferenceCode.HaitianCreole, "Line1_ReadOrder[0].HaitianCreole[0]"],
  [LanguagePreferenceCode.Tagalog, "Line1_ReadOrder[0].Tagalog[0]"],
  [LanguagePreferenceCode.Portuguese, "Line1_ReadOrder[0].Portuguese[0]"],
  [LanguagePreferenceCode.Polish, "Line1_ReadOrder[0].Polish[0]"],
  [LanguagePreferenceCode.Farsi, "Line1_ReadOrder[0].Farsi[0]"],
  [LanguagePreferenceCode.French, "French[0]"],
  [LanguagePreferenceCode.Japanese, "Japanese[0]"],
  [LanguagePreferenceCode.Gujarati, "Gujarati[0]"],
  [LanguagePreferenceCode.Punjabi, "Punjabi[0]"],
  [LanguagePreferenceCode.Khmer, "Khmer[0]"],
  [LanguagePreferenceCode.Urdu, "Urdu[0]"],
  [LanguagePreferenceCode.Bengali, "Bengali[0]"],
  [LanguagePreferenceCode.Italian, "Italian[0]"],
  [LanguagePreferenceCode.ChineseTraditional, "ChineseTraditional[0]"],
  [LanguagePreferenceCode.ChineseSimplified, "ChineseSimplified[0]"],
];

export const scheduleLepPdf: PdfFormDescriptor = {
  pendingKey: "schedule_lep",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040lep--2024.pdf",
  pageIndices: () => [0],
  fields: [
    { kind: "text", domainKey: "name", pdfField: `${page}.f1_1[0]` },
    { kind: "text", domainKey: "ssn", pdfField: `${page}.f1_2[0]` },
    ...codeGroup.map(([code, group]): PdfFieldEntry => ({
      kind: "checkboxWhen",
      domainKey: "selected_code",
      pdfField: `${page}.${group}.c1_1[0]`,
      whenValue: code,
    })),
  ],
  instances(raw, filer) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    buildScheduleLep(source, { filer });
    return source.requests.map((request) => ({
      ...requestIdentity(request.person, { filer }),
      selected_code: request.language_preference_code,
    }));
  },
};
