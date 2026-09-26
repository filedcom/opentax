import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateLikeKindExchange,
} from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import {
  inputSchema,
} from "../../../nodes/intermediate/forms/form8824/index.ts";

// Verified against the widgets in the locally cached 2025 IRS Form 8824.
// Form field numbers are not tax-form line numbers.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "relinquished_description",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "received_description",
    pdfField: "topmostSubform[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "date_acquired_pdf",
    pdfField: "topmostSubform[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "date_transferred_pdf",
    pdfField: "topmostSubform[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "date_identified_pdf",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "date_received_pdf",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "related_party",
    pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "related_party",
    pdfField: "topmostSubform[0].Page1[0].c1_1[1]",
    whenValue: "false",
  },
  {
    kind: "text",
    domainKey: "line15",
    pdfField: "topmostSubform[0].Page2[0].f2_8[0]",
  },
  {
    kind: "text",
    domainKey: "line16",
    pdfField: "topmostSubform[0].Page2[0].f2_11[0]",
  },
  {
    kind: "text",
    domainKey: "line17",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
  {
    kind: "text",
    domainKey: "line18",
    pdfField: "topmostSubform[0].Page2[0].f2_13[0]",
  },
  {
    kind: "text",
    domainKey: "line19",
    pdfField: "topmostSubform[0].Page2[0].f2_16[0]",
  },
  {
    kind: "text",
    domainKey: "line20",
    pdfField: "topmostSubform[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "line21",
    pdfField: "topmostSubform[0].Page2[0].f2_18[0]",
  },
  {
    kind: "text",
    domainKey: "line22",
    pdfField: "topmostSubform[0].Page2[0].f2_19[0]",
  },
  {
    kind: "text",
    domainKey: "line23",
    pdfField: "topmostSubform[0].Page2[0].f2_20[0]",
  },
  {
    kind: "text",
    domainKey: "line24",
    pdfField: "topmostSubform[0].Page2[0].f2_21[0]",
  },
  {
    kind: "text",
    domainKey: "line25",
    pdfField: "topmostSubform[0].Page2[0].f2_22[0]",
  },
];

function pdfDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : undefined;
}

export function form8824PdfFields(
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (
    typeof input.relinquished_basis !== "number" ||
    typeof input.received_fmv !== "number"
  ) return input;
  const lines = calculateLikeKindExchange(inputSchema.parse(input));
  return {
    ...input,
    ...lines,
    date_acquired_pdf: pdfDate(input.date_acquired),
    date_transferred_pdf: pdfDate(input.date_transferred),
    date_identified_pdf: pdfDate(input.date_identified),
    date_received_pdf: pdfDate(input.date_received),
  };
}

export const form8824Pdf: PdfFormDescriptor = {
  pendingKey: "form8824",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8824--2025.pdf",
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
      extraPdfFields: ["topmostSubform[0].Page2[0].f2_1[0]"],
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
      extraPdfFields: ["topmostSubform[0].Page2[0].f2_2[0]"],
    },
  ],
  instances(fields) {
    return [form8824PdfFields(fields)];
  },
};
