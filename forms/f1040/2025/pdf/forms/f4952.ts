import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm4952DividendPath } from "../../form4952_dividend_reconciliation.ts";
import { reconcileForm4952InterestPath } from "../../form4952_interest_reconciliation.ts";
import { reconcileForm4952CombinedPath } from "../../form4952_combined_reconciliation.ts";
import { reconcileForm4952PartnershipPath } from "../../form4952_partnership_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099Path } from "../../form4952_k1_1099int_reconciliation.ts";
import { reconcileForm4952K1InterestAgainst1099DivPath } from "../../form4952_k1_1099div_reconciliation.ts";
import { reconcileForm4952MiscRoyaltyPath } from "../../form4952_misc_royalty_reconciliation.ts";

// TY2025 AcroForm order: f1_01/f1_02 are taxpayer name and identifying
// number; the numbered form lines start at f1_03.
const page = "topmostSubform[0].Page1[0].";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1", pdfField: `${page}f1_03[0]` },
  { kind: "text", domainKey: "line2", pdfField: `${page}f1_04[0]` },
  { kind: "text", domainKey: "line3", pdfField: `${page}f1_05[0]` },
  {
    kind: "text",
    domainKey: "line4a",
    pdfField: `${page}Line4a_ReadOrder[0].f1_06[0]`,
  },
  { kind: "text", domainKey: "line4b", pdfField: `${page}f1_07[0]` },
  { kind: "text", domainKey: "line4c", pdfField: `${page}f1_08[0]` },
  { kind: "text", domainKey: "line4d", pdfField: `${page}f1_09[0]` },
  { kind: "text", domainKey: "line4e", pdfField: `${page}f1_10[0]` },
  { kind: "text", domainKey: "line4f", pdfField: `${page}f1_11[0]` },
  { kind: "text", domainKey: "line4g", pdfField: `${page}f1_12[0]` },
  { kind: "text", domainKey: "line4h", pdfField: `${page}f1_13[0]` },
  { kind: "text", domainKey: "line5", pdfField: `${page}f1_14[0]` },
  { kind: "text", domainKey: "line6", pdfField: `${page}f1_15[0]` },
  { kind: "text", domainKey: "line7", pdfField: `${page}f1_16[0]` },
  { kind: "text", domainKey: "line8", pdfField: `${page}f1_17[0]` },
];

export const form4952Pdf: PdfFormDescriptor = {
  pendingKey: "form4952",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  // The 2025 source has one form page, followed by a blank page and instructions.
  pageIndices: () => [0],
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  projectFields(fields, allPending) {
    if (Object.keys(fields).length === 0) return fields;
    if (
      fields.source_1099_royalties !== undefined
    ) {
      reconcileForm4952MiscRoyaltyPath(fields, allPending);
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_1099_interest !== undefined
    ) {
      reconcileForm4952CombinedPath(fields, allPending);
    } else if (
      fields.source_1099_dividends !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099DivPath(fields, allPending);
    } else if (fields.source_1099_dividends !== undefined) {
      reconcileForm4952DividendPath(fields, allPending);
    } else if (
      fields.source_1099_interest !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952K1InterestAgainst1099Path(fields, allPending);
    } else if (fields.source_1099_interest !== undefined) {
      reconcileForm4952InterestPath(fields, allPending);
    } else if (
      fields.source_k1_interest !== undefined &&
      fields.source_k1_investment_interest !== undefined
    ) {
      reconcileForm4952PartnershipPath(fields, allPending);
    } else {
      throw new Error(
        "Form 4952 export needs a source-reconciled investment-income route",
      );
    }
    return fields;
  },
  instances(fields, filer, allPending) {
    if (fields.source_1099_royalties !== undefined) {
      if (!filer || !allPending) {
        throw new Error("Form 4952 PDF linked royalty needs filer identity");
      }
      reconcileForm4952MiscRoyaltyPath(fields, allPending, filer);
    }
    return [fields];
  },
};
