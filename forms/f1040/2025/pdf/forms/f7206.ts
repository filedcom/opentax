import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// TY2025 AcroForm has two identity fields followed by printed lines 1-14.
// Line 11 is blank for this Schedule C route, and line 6 prints a percentage.
const page = "topmostSubform[0].Page1[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "recipient_name", pdfField: `${page}.f1_1[0]` },
  { kind: "text", domainKey: "recipient_ssn", pdfField: `${page}.f1_2[0]` },
  ...([1, 2, 3, 4, 5] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
  { kind: "text", domainKey: "line6_pct", pdfField: `${page}.f1_8[0]` },
  ...([7, 8, 9, 10] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
  ...([12, 13, 14] as const).map((line) => ({
    kind: "text" as const,
    domainKey: `line${line}`,
    pdfField: `${page}.f1_${line + 2}[0]`,
  })),
];

function projectFields(
  fields: Record<string, unknown>,
) {
  if (Object.keys(fields).length === 0) return fields;
  throw new Error(
    "Form 7206 one-plan PDF filing needs primary premium-month, business-owner, and return deduction reconciliation",
  );
}

export const form7206Pdf: PdfFormDescriptor = {
  pendingKey: "form7206",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7206--2025.pdf",
  projectFields,
  fields,
};
