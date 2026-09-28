import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8888 } from "../../form8888_reconciliation.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${pdfField}`,
});
const accountType = (
  domainKey: string,
  checkbox: number,
): readonly PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}c1_${checkbox}[0]`,
    whenValue: "checking",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}c1_${checkbox}[1]`,
    whenValue: "savings",
  },
];

// Canonical December 2025 IRS AcroForm: page 1 has 20 named fields and 20
// widgets. f1_13 is reserved line 4 and must stay blank; pages 2-3 are
// instructions and are not part of the filed form.
const fields: readonly PdfFieldEntry[] = [
  text("calendar_year", "PgHeader[0].CalendarYear[0].f1_1[0]"),
  text("header_name", "f1_2[0]"),
  text("header_ssn", "f1_3[0]"),
  text("account_1_amount", "f1_4[0]"),
  text("account_1_routing", "Line1bCombfield[0].f1_5[0]"),
  ...accountType("account_1_type", 1),
  text("account_1_number", "Line1dCombfield[0].f1_6[0]"),
  text("account_2_amount", "f1_7[0]"),
  text("account_2_routing", "Line2bCombfield[0].f1_8[0]"),
  ...accountType("account_2_type", 2),
  text("account_2_number", "Line2dCombfield[0].f1_9[0]"),
  text("account_3_amount", "f1_10[0]"),
  text("account_3_routing", "Line3bCombfield[0].f1_11[0]"),
  ...accountType("account_3_type", 3),
  text("account_3_number", "Line3dCombfield[0].f1_12[0]"),
  text("line5_total", "f1_14[0]"),
];

export const form8888Pdf: PdfFormDescriptor = {
  pendingKey: "f8888",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8888--2025.pdf",
  fields,
  pageIndices: () => [0],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const source = reconcileForm8888(raw, filer, allPending);
    if (!filer) throw new Error("Form 8888 PDF needs filer identity");
    return [{
      calendar_year: "25",
      header_name: filer.nameLine1,
      header_ssn: filer.primarySSN,
      account_1_amount: source.account_1.amount,
      account_1_routing: source.account_1.routing_number,
      account_1_type: source.account_1.account_type,
      account_1_number: source.account_1.account_number,
      account_2_amount: source.account_2.amount,
      account_2_routing: source.account_2.routing_number,
      account_2_type: source.account_2.account_type,
      account_2_number: source.account_2.account_number,
      account_3_amount: source.account_3?.amount,
      account_3_routing: source.account_3?.routing_number,
      account_3_type: source.account_3?.account_type,
      account_3_number: source.account_3?.account_number,
      line5_total: source.total_allocation,
    }];
  },
};
