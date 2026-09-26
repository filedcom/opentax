import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form6781/index.ts";

// IRS Form 6781 (2025) Part I AcroForm fields. The printed form has three
// account rows; never silently omit additional accounts from a PDF copy.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "totalLoss",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "totalGain",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "netLine3",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "netLine5",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "netLine7",
    pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "shortTerm",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "longTerm",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
  },
];

export const form6781Pdf: PdfFormDescriptor = {
  pendingKey: "form6781",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f6781--2025.pdf",
  instances(raw) {
    const input = inputSchema.parse(raw);
    if (!input.accounts?.length) {
      if (input.net_section_1256_gain !== undefined) {
        throw new Error("Form 6781 PDF needs Part I account rows");
      }
      return [];
    }
    if (input.accounts.length > 3) {
      throw new Error(
        "Form 6781 PDF supports three printed account rows; an account-detail continuation is required",
      );
    }
    if ((input.prior_year_loss_carryover ?? 0) !== 0) {
      throw new Error(
        "Form 6781 prior-year carryover is not a valid Part I input",
      );
    }
    const net = input.accounts.reduce((sum, row) => sum + row.gain_loss, 0);
    if (
      input.net_section_1256_gain !== undefined &&
      input.net_section_1256_gain !== net
    ) {
      throw new Error(
        "Form 6781 account rows do not match net_section_1256_gain",
      );
    }
    return [{
      totalLoss: input.accounts.reduce(
        (sum, row) => sum + Math.max(0, -row.gain_loss),
        0,
      ),
      totalGain: input.accounts.reduce(
        (sum, row) => sum + Math.max(0, row.gain_loss),
        0,
      ),
      net,
      netLine3: net,
      netLine5: net,
      netLine7: net,
      shortTerm: net * 0.4,
      longTerm: net * 0.6,
      accounts: input.accounts.map((row) => ({
        account_identification: row.account_identification,
        loss: row.gain_loss < 0 ? -row.gain_loss : undefined,
        gain: row.gain_loss > 0 ? row.gain_loss : undefined,
      })),
    }];
  },
  fields,
  rows: {
    domainKey: "accounts",
    maxRows: 3,
    rowStride: 3,
    rowFields: [
      {
        kind: "text",
        domainKey: "account_identification",
        pdfFieldPattern:
          "topmostSubform[0].Page1[0].Table_Line1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 3,
      },
      {
        kind: "text",
        domainKey: "loss",
        pdfFieldPattern:
          "topmostSubform[0].Page1[0].Table_Line1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 4,
      },
      {
        kind: "text",
        domainKey: "gain",
        pdfFieldPattern:
          "topmostSubform[0].Page1[0].Table_Line1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 5,
      },
    ],
  },
};
