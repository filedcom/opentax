import {
  computeForm8911Amounts,
  type F8911Input,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { form8911PdfSource } from "./f8911_shared.ts";

// Form 8911 (Rev. December 2025) original IRS AcroForm fields.
const page = "topmostSubform[0].Page1[0]";
const text = (
  domainKey: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  printZero,
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
    text("line1", 4),
    text("line3", 6),
    text("line4", 7),
    text("line5", 8),
    text("line6a", 9),
    text("line6b", 10),
    text("line6c", 11),
    text("line7", 12, true),
    text("line8", 13),
    text("line9", 14, true),
    text("line10", 15),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8911) return [];
    const source = form8911PdfSource(allPending, filer);
    if (!source) return [];
    const { filerName, filerTin } = source;
    return [{
      filer_name: filerName,
      filer_tin: filerTin,
      ...projectForm8911CreditAmounts(source.input),
    }];
  },
};

/** Parent field projection; source reconciliation is performed by the descriptor. */
export function projectForm8911CreditAmounts(input: F8911Input) {
  const { personal: amounts, businessCredit, properties } =
    computeForm8911Amounts(input);
  return {
    property_count: properties.length,
    ...(businessCredit > 0
      ? { line1: businessCredit, line3: businessCredit }
      : {}),
    ...(amounts
      ? {
        line4: amounts.tentativeCredit,
        line5: amounts.regularTaxBeforeCredits,
        line6a: amounts.foreignTaxCredit,
        line6b: amounts.certainAllowableCredits,
        line6c: amounts.totalOtherCredits,
        line7: amounts.netRegularTax,
        ...(amounts.netRegularTax > 0
          ? {
            line8: amounts.tentativeMinimumTax,
            line9: amounts.adjustedRegularTax,
            ...(amounts.adjustedRegularTax > 0
              ? { line10: amounts.allowedCredit }
              : {}),
          }
          : {}),
      }
      : {}),
  };
}
