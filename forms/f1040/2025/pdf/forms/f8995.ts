import { appendQbiBusinessContinuation } from "./f8995_continuation.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  assertNoUnfiled8995Loss,
  assertPositive8995,
} from "../../mef/forms/f8995-route.ts";

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
    printZero: true,
    pdfField: `${page1}Table[0].Row1i[0].f1_05[0]`,
  },
  {
    kind: "text",
    domainKey: "line1ii_business_name",
    pdfField: `${page1}Table[0].Row1ii[0].f1_06[0]`,
  },
  {
    kind: "text",
    domainKey: "line1ii_ein",
    pdfField: `${page1}Table[0].Row1ii[0].f1_07[0]`,
  },
  {
    kind: "text",
    domainKey: "line1ii_qbi",
    printZero: true,
    pdfField: `${page1}Table[0].Row1ii[0].f1_08[0]`,
  },
  ...["iii", "iv", "v"].flatMap((suffix, index): PdfFieldEntry[] =>
    ["business_name", "ein", "qbi"].map((key, column) => ({
      kind: "text",
      domainKey: `line1${suffix}_${key}`,
      ...(key === "qbi" ? { printZero: true } : {}),
      pdfField: `${page1}Table[0].Row1${suffix}[0].f1_${
        String(9 + index * 3 + column).padStart(2, "0")
      }[0]`,
    }))
  ),
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
  appendSupplementalPages(document, fields, filer) {
    return appendQbiBusinessContinuation(
      document,
      fields.pdf_overflow_businesses,
      filer,
    );
  },
  projectFields(fields, allPending) {
    const deduction = fields.qbi_deduction;
    if (
      (deduction === undefined || deduction === null || deduction === 0) &&
      fields.multi_business_filing_rows === undefined &&
      fields.joint_owner_filing_rows === undefined &&
      fields.owned_s_corp_loss_source === undefined &&
      !(typeof fields.line1_qbi === "number" && fields.line1_qbi > 0 &&
        typeof fields.line1_business_reference === "string")
    ) {
      assertNoUnfiled8995Loss(fields, allPending);
      return {};
    }
    if (
      typeof deduction !== "number" || !Number.isFinite(deduction) ||
      deduction < 0
    ) {
      throw new Error("Form 8995 PDF needs a valid nonnegative QBI deduction");
    }
    const { businesses, lines } = assertPositive8995(
      fields,
      allPending,
    );
    return {
      ...Object.fromEntries(
        businesses.slice(0, 5).flatMap((row, index) => {
          const prefix =
            ["line1", "line1ii", "line1iii", "line1iv", "line1v"][index];
          return [[`${prefix}_business_name`, row.businessName], [
            `${prefix}_ein`,
            row.tin.value,
          ], [`${prefix}_qbi`, row.qbi]];
        }),
      ),
      pdf_overflow_businesses: businesses.slice(5),
      ...Object.fromEntries(
        Object.entries(lines).map(([line, amount]) => [`line${line}`, amount]),
      ),
    };
  },
};
