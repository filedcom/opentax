import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form6781/index.ts";
import { rgb, StandardFonts } from "pdf-lib";

const PRINTED_ACCOUNTS = 3;
const CONTINUATION_ROWS_PER_PAGE = 28;

interface AccountRow {
  account_identification: string;
  gain_loss: number;
}

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
  // The archived PDF has the one-page form followed by three instruction pages.
  pageIndices: () => [0],
  filerFields: [
    {
      kind: "text",
      domainKey: "nameShownOnForm1040",
      pdfField: "topmostSubform[0].Page1[0].f1_01[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_02[0]",
    },
  ],
  instances(raw) {
    const input = inputSchema.parse(raw);
    if (!input.accounts?.length) {
      if (input.net_section_1256_gain !== undefined) {
        throw new Error("Form 6781 PDF needs Part I account rows");
      }
      return [];
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
      accounts: input.accounts.slice(0, PRINTED_ACCOUNTS).map((row) => ({
        account_identification: row.account_identification,
        loss: row.gain_loss < 0 ? -row.gain_loss : undefined,
        gain: row.gain_loss > 0 ? row.gain_loss : undefined,
      })),
      overflow_accounts: input.accounts.slice(PRINTED_ACCOUNTS),
    }];
  },
  async appendSupplementalPages(document, fields, filer) {
    const overflow = fields.overflow_accounts;
    if (!Array.isArray(overflow) || overflow.length === 0) return;
    if (!filer) {
      throw new Error("Form 6781 account continuation needs filer identity");
    }
    if (
      overflow.some((row) =>
        row === null || typeof row !== "object" ||
        typeof row.account_identification !== "string" ||
        !row.account_identification.trim() ||
        typeof row.gain_loss !== "number" || !Number.isFinite(row.gain_loss)
      )
    ) {
      throw new Error(
        "Form 6781 account continuation needs valid account rows",
      );
    }
    const rows = overflow as AccountRow[];
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const pageCount = Math.ceil(rows.length / CONTINUATION_ROWS_PER_PAGE);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = document.addPage([612, 792]);
      page.drawText("Form 6781 (2025) - Part I, line 1 account continuation", {
        x: 36,
        y: 748,
        size: 11,
        font: bold,
      });
      page.drawText(`Name: ${filer.nameLine1}`, {
        x: 36,
        y: 727,
        size: 9,
        font: regular,
      });
      page.drawText(`SSN: ${filer.primarySSN}`, {
        x: 36,
        y: 711,
        size: 9,
        font: regular,
      });
      page.drawText("(a) Identification of account", {
        x: 36,
        y: 679,
        size: 9,
        font: bold,
      });
      page.drawText("(b) Loss", { x: 420, y: 679, size: 9, font: bold });
      page.drawText("(c) Gain", { x: 510, y: 679, size: 9, font: bold });
      page.drawLine({
        start: { x: 36, y: 670 },
        end: { x: 576, y: 670 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      const first = pageIndex * CONTINUATION_ROWS_PER_PAGE;
      const last = Math.min(first + CONTINUATION_ROWS_PER_PAGE, rows.length);
      for (let index = first; index < last; index++) {
        const row = rows[index];
        const y = 651 - (index - first) * 20;
        const accountLabel = `${
          PRINTED_ACCOUNTS + index + 1
        }. ${row.account_identification}`;
        const nameSize = Math.min(
          9,
          360 * 9 /
            Math.max(
              360,
              regular.widthOfTextAtSize(accountLabel, 9),
            ),
        );
        if (nameSize < 6) {
          throw new Error(
            `Form 6781 account ${
              PRINTED_ACCOUNTS + index + 1
            } is too long for the continuation`,
          );
        }
        page.drawText(accountLabel, {
          x: 36,
          y,
          size: nameSize,
          font: regular,
        });
        page.drawText(String(Math.round(Math.abs(row.gain_loss))), {
          x: row.gain_loss < 0 ? 420 : 510,
          y,
          size: 9,
          font: regular,
        });
      }
      page.drawText(
        `Accounts ${PRINTED_ACCOUNTS + first + 1}-${
          PRINTED_ACCOUNTS + last
        } of ${
          PRINTED_ACCOUNTS + rows.length
        }; included in Form 6781 line 2 totals.`,
        { x: 36, y: 55, size: 8, font: regular },
      );
      page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
        x: 510,
        y: 55,
        size: 8,
        font: regular,
      });
    }
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
