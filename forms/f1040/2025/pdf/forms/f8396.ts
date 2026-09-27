import { qualifiedHomeAddressSchema } from "../../../nodes/intermediate/forms/form8396/calculation.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const page1 = "topmostSubform[0].Page1[0].";
const worksheet = "topmostSubform[0].Page2[0].Col2[0].Line8_Worksheet[0].";

const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

// The 2025 AcroForm uses f1_1-f1_6 for identity and certificate details,
// then f1_7-f1_23 for printed lines 1-17 in order.
const fields: ReadonlyArray<PdfFieldEntry> = [
  text("qualified_home_address_print", `${page1}f1_3[0]`),
  text("certificate_issuer_name", `${page1}f1_4[0]`),
  text("certificate_number", `${page1}f1_5[0]`),
  text("certificate_issue_date_print", `${page1}f1_6[0]`),
  text("line1", `${page1}f1_7[0]`),
  text("line2_percent", `${page1}f1_8[0]`),
  ...Array.from(
    { length: 14 },
    (_, index) => text(`line${index + 3}`, `${page1}f1_${index + 9}[0]`),
  ),
  {
    kind: "text",
    domainKey: "line17",
    pdfField: `${page1}f1_23[0]`,
    printZero: true,
  },
  text("credit_limit_worksheet_line1", `${worksheet}Line1[0].f2_1[0]`),
  text("credit_limit_worksheet_line2", `${worksheet}Line2[0].f2_2[0]`),
  text("credit_limit_worksheet_line3", `${worksheet}Line3[0].f2_3[0]`),
];

export const form8396Pdf: PdfFormDescriptor = {
  pendingKey: "form8396",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8396--2025.pdf",
  fields,
  filerFields: [
    text("nameLine1", `${page1}f1_1[0]`),
    text("primarySSN", `${page1}f1_2[0]`),
  ],
  projectFields(fields) {
    if (fields.certificate_issuer_name === undefined) {
      if (fields.line7 !== undefined) {
        throw new Error("Form 8396 PDF needs the certificate issuer");
      }
      return {};
    }
    if (
      typeof fields.line7 !== "number" ||
      typeof fields.line8 !== "number" ||
      typeof fields.line9 !== "number" ||
      typeof fields.credit_limit_worksheet_line1 !== "number" ||
      typeof fields.credit_limit_worksheet_line2 !== "number"
    ) {
      throw new Error("Form 8396 PDF needs the finalized credit and worksheet");
    }
    if (
      fields.line8 !== Math.max(
          0,
          fields.credit_limit_worksheet_line1 -
            fields.credit_limit_worksheet_line2,
        ) || fields.line9 !== Math.min(fields.line7, fields.line8)
    ) {
      throw new Error(
        "Form 8396 PDF credit does not reconcile to its worksheet",
      );
    }
    const rate = fields.line2;
    if (rate !== undefined && typeof rate !== "number") {
      throw new Error("Form 8396 PDF certificate rate is invalid");
    }
    const address = qualifiedHomeAddressSchema.optional().parse(
      fields.qualified_home_address_if_different,
    );
    const issueDate = fields.certificate_issue_date;
    if (
      typeof issueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)
    ) {
      throw new Error("Form 8396 PDF needs the certificate issue date");
    }
    return {
      ...fields,
      certificate_issue_date_print: `${issueDate.slice(5, 7)}/${
        issueDate.slice(8, 10)
      }/${issueDate.slice(0, 4)}`,
      qualified_home_address_print: address
        ? [
          address.line1,
          address.line2,
          `${address.city}, ${address.state} ${address.zip}`,
        ].filter(Boolean).join(", ")
        : undefined,
      line2_percent: rate === undefined
        ? undefined
        : String(Number((rate * 100).toFixed(3))),
      credit_limit_worksheet_line3: fields.line8,
    };
  },
};
