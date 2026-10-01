import { StandardFonts } from "pdf-lib";
import {
  calculateForm8611,
  inputSchema,
} from "../../../nodes/inputs/f8611/index.ts";
import { reconcileForm8611Schedule2 } from "../../mef/forms/f8611.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Rev. December 2021 Form 8611 is the form used for TY2025. Its first page
// is the tax form; pages 2-3 contain instructions. The field mapping below was
// read from the IRS AcroForm widget list and first-page widget positions.
const page = "topmostSubform[0].Page1[0].";
const text = (
  key: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page}f1_${number}[0]`,
  printZero,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("filer_name", 1),
  text("filer_tin", 2),
  text("building_address", 3),
  text("building_bin", 4),
  text("placed_in_service_date", 5),
  {
    kind: "text",
    domainKey: "bond_issuer",
    pdfField: `${page}LineF_ReadOrder[0].f1_6[0]`,
  },
  text("bond_issue_date", 7),
  text("bond_issue_name", 8),
  text("bond_cusip", 9),
  text("line1", 10, true),
  text("line2", 11, true),
  text("line3", 12, true),
  text("line4_whole", 13),
  text("line4_fraction", 14),
  text("line5", 15, true),
  text("line6_whole", 16),
  text("line6_fraction", 17),
  text("line7", 18, true),
  text("line8", 19, true),
  text("line9", 20, true),
  text("line10", 21, true),
  text("line11", 22, true),
  text("line12", 23, true),
  text("line13", 24, true),
  text("line14", 25, true),
  text("line15", 26, true),
  // Lines 16 and 17 apply to partnership filers, not an individual recipient.
];

function printedDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

function splitRatio(value: number): { whole: string; fraction: string } {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Form 8611 PDF needs a finite recapture ratio");
  }
  const [whole, fraction = ""] = String(value).split(".");
  if (whole.includes("e") || fraction.includes("e")) {
    throw new Error("Form 8611 PDF cannot print exponential ratio notation");
  }
  return { whole, fraction: fraction.padEnd(3, "0") };
}

export const form8611Pdf: PdfFormDescriptor = {
  pendingKey: "f8611",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8611--2021.pdf",
  pageIndices: () => [0],
  fields,
  instances(raw, filer, allPending) {
    if (!("f8611s" in raw)) return [];
    const { f8611s } = inputSchema.parse(raw);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 8611 PDF needs final filer name and SSN");
    }
    if (!allPending) {
      throw new Error("Form 8611 PDF needs the finalized return");
    }
    reconcileForm8611Schedule2(f8611s, allPending);
    return f8611s.map((item) => {
      const lines = calculateForm8611(item);
      const address = item.building_us_address;
      const addressLines = [
        address.line1,
        address.line2,
        `${address.city}, ${address.state} ${address.zip}`,
      ].filter(Boolean);
      const line4 = lines.line4 === undefined
        ? undefined
        : splitRatio(lines.line4);
      const line6 = lines.line6 === undefined
        ? undefined
        : splitRatio(lines.line6);
      return {
        filer_name: filer.nameLine1,
        filer_tin: filer.primarySSN.replace(/\D/g, ""),
        building_address: addressLines.join("\n"),
        building_bin: item.building_bin,
        placed_in_service_date: printedDate(item.placed_in_service_date),
        bond_issuer: item.tax_exempt_bond?.issuer_name,
        bond_issue_date: item.tax_exempt_bond
          ? printedDate(item.tax_exempt_bond.issue_date)
          : undefined,
        bond_issue_name: item.tax_exempt_bond?.issue_name,
        bond_cusip: item.tax_exempt_bond?.cusip ??
          (item.tax_exempt_bond?.no_cusip ? "None" : undefined),
        ...lines,
        line4_whole: line4?.whole,
        line4_fraction: line4?.fraction,
        line6_whole: line6?.whole,
        line6_fraction: line6?.fraction,
        section42j5_note: item.calculation.source_type === "pass_through" &&
          item.calculation.section42j5_partnership_interest_included,
      };
    });
  },
  async decoratePages(document, pages, instance) {
    if (!instance.section42j5_note) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    pages[0].drawText("Section 42(j)(5)", {
      x: 397,
      y: 792 - 526,
      size: 7,
      font,
    });
  },
};
