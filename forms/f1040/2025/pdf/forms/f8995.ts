import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertOneBusiness8995 } from "../../mef/forms/f8995-route.ts";

const page1 = "topmostSubform[0].Page1[0].";
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "line1_business_name",
    pdfField: `${page1}Table[0].Row1i[0].f1_03[0]`,
  },
  {
    kind: "text",
    domainKey: "line1_ein",
    pdfField: `${page1}Table[0].Row1i[0].f1_04[0]`,
  },
  {
    kind: "text",
    domainKey: "line1_qbi",
    pdfField: `${page1}Table[0].Row1i[0].f1_05[0]`,
  },
  ...Array.from({ length: 16 }, (_, index): PdfFieldEntry => {
    const line = index + 2;
    const field = `f1_${String(index + 18).padStart(2, "0")}[0]`;
    const prefix = line === 2
      ? `${page1}Line2_ReadOrder[0].`
      : line === 6
      ? `${page1}Line6_ReadOrder[0].`
      : page1;
    return {
      kind: "text",
      domainKey: `line${line}`,
      pdfField: `${prefix}${field}`,
      printZero: true,
    };
  }),
];

export const form8995Pdf: PdfFormDescriptor = {
  pendingKey: "form8995",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995--2025.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page1}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}f1_02[0]` },
  ],
  fields,
  projectFields(fields, allPending) {
    const deduction = fields.qbi_deduction;
    if (deduction === undefined || deduction === null || deduction === 0) {
      return {};
    }
    if (
      typeof deduction !== "number" || !Number.isFinite(deduction) ||
      deduction < 0
    ) {
      throw new Error("Form 8995 PDF needs a valid nonnegative QBI deduction");
    }
    const { businessName, tin, qbi, lines } = assertOneBusiness8995(
      fields,
      allPending,
    );
    return {
      line1_business_name: businessName,
      line1_ein: tin.value,
      line1_qbi: qbi,
      ...Object.fromEntries(
        Object.entries(lines).map(([line, amount]) => [`line${line}`, amount]),
      ),
    };
  },
};
