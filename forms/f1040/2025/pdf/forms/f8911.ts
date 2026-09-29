import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { form8911PdfSource } from "./f8911_shared.ts";

// Form 8911 (Rev. December 2025) original IRS AcroForm fields.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${String(number).padStart(2, "0")}[0]`,
});

export const form8911Pdf: PdfFormDescriptor = {
  pendingKey: "f8911",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8911--2025.pdf",
  fields: [
    text("filer_name", 1),
    text("filer_tin", 2),
    text("property_count", 3),
    text("line4", 7),
    text("line5", 8),
    text("line6a", 9),
    text("line6b", 10),
    text("line6c", 11),
    text("line7", 12),
    text("line8", 13),
    text("line9", 14),
    text("line10", 15),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8911) return [];
    const source = form8911PdfSource(allPending, filer);
    if (!source) return [];
    const { amounts, filerName, filerTin } = source;
    return [{
      filer_name: filerName,
      filer_tin: filerTin,
      property_count: 1,
      line4: amounts.tentativeCredit,
      line5: amounts.regularTaxBeforeCredits,
      line6a: amounts.foreignTaxCredit,
      line6b: amounts.certainAllowableCredits,
      line6c: amounts.totalOtherCredits,
      line7: amounts.netRegularTax,
      line8: amounts.tentativeMinimumTax,
      line9: amounts.adjustedRegularTax,
      line10: amounts.allowedCredit,
    }];
  },
};
