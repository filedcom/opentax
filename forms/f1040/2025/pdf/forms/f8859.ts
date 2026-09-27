import { z } from "zod";
import {
  inputSchema,
  totalCarryforward,
} from "../../../nodes/inputs/f8859/index.ts";
import type { PdfFormDescriptor } from "../form-descriptor.ts";

// TY2025 IRS Form 8859 AcroForm: lines 1-4 and its printed limit worksheet.
const page = "topmostSubform[0].Page1[0]";
const amount = z.number().finite().nonnegative();
const fieldsSchema = inputSchema.extend({
  line1_carryforward: amount,
  line2_limit: amount,
  line3_allowed_credit: amount,
  line4_carryforward: amount,
  worksheet_line1_tax: amount,
  worksheet_line2_credits: amount,
});

export const form8859Pdf: PdfFormDescriptor = {
  pendingKey: "f8859",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8859--2025.pdf",
  fields: [
    {
      kind: "text",
      domainKey: "line1_carryforward",
      pdfField: `${page}.f1_3[0]`,
    },
    {
      kind: "text",
      domainKey: "line2_limit",
      pdfField: `${page}.f1_4[0]`,
      extraPdfFields: [`${page}.Col2[0].Line3[0].f1_9[0]`],
      printZero: true,
    },
    {
      kind: "text",
      domainKey: "line3_allowed_credit",
      pdfField: `${page}.f1_5[0]`,
      printZero: true,
    },
    {
      kind: "text",
      domainKey: "line4_carryforward",
      pdfField: `${page}.f1_6[0]`,
    },
    {
      kind: "text",
      domainKey: "worksheet_line1_tax",
      pdfField: `${page}.Col1[0].Line1[0].f1_7[0]`,
    },
    {
      kind: "text",
      domainKey: "worksheet_line2_credits",
      pdfField: `${page}.Col2[0].Line2[0].f1_8[0]`,
    },
  ],
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}.f1_2[0]` },
  ],
  projectFields(raw, allPending) {
    if (!Array.isArray(raw.f8859s) || raw.f8859s.length === 0) return {};
    const fields = fieldsSchema.parse(raw);
    const source = totalCarryforward(fields.f8859s);
    const schedule3 = z.object({
      line6h_dc_homebuyer_credit: amount.optional(),
    }).parse(allPending.schedule3);
    if (
      Math.round(source * 100) !==
        Math.round(fields.line1_carryforward * 100) ||
      Math.round(fields.line3_allowed_credit * 100) !==
        Math.round((schedule3.line6h_dc_homebuyer_credit ?? 0) * 100) ||
      Math.round(fields.line2_limit * 100) !==
        Math.round(
          Math.max(
            0,
            fields.worksheet_line1_tax - fields.worksheet_line2_credits,
          ) * 100,
        ) ||
      fields.line3_allowed_credit >
        Math.min(fields.line1_carryforward, fields.line2_limit) ||
      Math.round(fields.line4_carryforward * 100) !==
        Math.round(
          (fields.line1_carryforward - fields.line3_allowed_credit) * 100,
        )
    ) {
      throw new Error("Form 8859 PDF does not reconcile to finalized return");
    }
    return fields;
  },
};
