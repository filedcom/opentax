import type { Form8814Lines } from "../../../nodes/inputs/f8814/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { rgb, StandardFonts } from "pdf-lib";

const base = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  number: string,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey,
  pdfField: `${base}f1_${number}[0]`,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("child_name", "03"),
  text("child_ssn", "04"),
  { kind: "checkbox", domainKey: "multiple_forms", pdfField: `${base}c1_1[0]` },
  text("line1a", "05"),
  text("line1b", "06"),
  text("line2a", "07"),
  text("line2b", "08"),
  text("line3", "09"),
  text("line4", "10"),
  text("line6", "12"),
  text("line7_whole", "13"),
  text("line7_fraction", "14"),
  text("line8_whole", "15"),
  text("line8_fraction", "16"),
  { ...text("line9", "17"), printZero: true },
  { ...text("line10", "18"), printZero: true },
  { ...text("line11", "19"), printZero: true },
  text("line12", "20"),
  text("line14", "22"),
  {
    kind: "checkboxWhen",
    domainKey: "line15_under_1350",
    pdfField: `${base}Line15_ReadOrder[0].c1_2[0]`,
    whenValue: "false",
  },
  {
    kind: "checkboxWhen",
    domainKey: "line15_under_1350",
    pdfField: `${base}Line15_ReadOrder[0].c1_2[1]`,
    whenValue: "true",
  },
  text("line15", "23"),
];

function toPdfFields(
  line: Form8814Lines,
  multiple: boolean,
): Record<string, unknown> {
  const item = line.item;
  const partI = line.line4 > 2_700;
  const allocatePreferredIncome = (item.qualified_dividends ?? 0) > 0 ||
    (item.capital_gain_distributions ?? 0) > 0;
  const proportion = (ratio: number) => {
    const rounded = Math.round(ratio * 100_000);
    return {
      whole: String(Math.floor(rounded / 100_000)),
      fraction: String(rounded % 100_000).padStart(5, "0"),
    };
  };
  const line7Ratio = proportion(line.line7);
  const line8Ratio = proportion(line.line8);
  const interestAdjustments = item.interest_adjustments;
  const interestNotes = [
    interestAdjustments?.nominee_distribution !== undefined
      ? `ND $${interestAdjustments.nominee_distribution}`
      : "",
    interestAdjustments?.accrued_interest !== undefined
      ? `Accrued interest $${interestAdjustments.accrued_interest}`
      : "",
    interestAdjustments?.abp_adjustment !== undefined
      ? `ABP adjustment $${interestAdjustments.abp_adjustment}`
      : "",
    interestAdjustments?.oid_adjustment !== undefined
      ? `OID adjustment $${interestAdjustments.oid_adjustment}`
      : "",
  ].filter(Boolean);
  return {
    child_name: item.child_name,
    child_ssn: item.child_ssn,
    multiple_forms: multiple,
    line1a: item.interest_income,
    line1b: item.tax_exempt_interest,
    line2a: line.line2a,
    line2b: item.qualified_dividends,
    line3: item.capital_gain_distributions,
    line4: line.line4,
    line6: partI ? line.line6 : undefined,
    line7_whole: partI && allocatePreferredIncome
      ? line7Ratio.whole
      : undefined,
    line7_fraction: partI && allocatePreferredIncome
      ? line7Ratio.fraction
      : undefined,
    line8_whole: partI && allocatePreferredIncome
      ? line8Ratio.whole
      : undefined,
    line8_fraction: partI && allocatePreferredIncome
      ? line8Ratio.fraction
      : undefined,
    line9: partI && allocatePreferredIncome ? line.line9 : undefined,
    line10: partI && allocatePreferredIncome ? line.line10 : undefined,
    line11: partI ? allocatePreferredIncome ? line.line11 : "-0-" : undefined,
    line12: partI ? line.line12 : undefined,
    line14: line.line14,
    line15_under_1350: line.line14 < 1_350,
    line15: line.line15,
    interest_adjustment_notes: interestNotes,
    dividend_nominee_note: item.dividend_nominee_distribution !== undefined
      ? `ND $${item.dividend_nominee_distribution}`
      : undefined,
    capital_gain_nominee_note:
      item.capital_gain_nominee_distribution !== undefined
        ? `ND $${item.capital_gain_nominee_distribution}`
        : undefined,
  };
}

/** Values printed as the Form 8814 portion of the parents' return lines. */
export function form8814ParentPrintAmounts(
  allPending: Record<string, Record<string, unknown>>,
): { readonly dividends: number; readonly capitalGain: number } {
  const items = allPending.form8814?.items;
  if (items === undefined) return { dividends: 0, capitalGain: 0 };
  if (!Array.isArray(items)) {
    throw new Error("Form 8814 PDF needs calculated child line items");
  }
  let dividends = 0;
  let capitalGain = 0;
  for (const item of items) {
    if (
      item === null || typeof item !== "object" ||
      typeof item.line9 !== "number" ||
      !Number.isFinite(item.line9) ||
      typeof item.line10 !== "number" ||
      !Number.isFinite(item.line10)
    ) {
      throw new Error("Form 8814 PDF needs calculated lines 9 and 10");
    }
    dividends += item.line9;
    capitalGain += item.line10;
  }
  return { dividends, capitalGain };
}

export function form8814DottedNotes(fields: Record<string, unknown>): {
  interest: string | undefined;
  interestAttachment: readonly string[];
  dividends: string | undefined;
  capitalGains: string | undefined;
} {
  const interest = Array.isArray(fields.interest_adjustment_notes)
    ? fields.interest_adjustment_notes as string[]
    : [];
  // The IRS line 1a dotted space is narrow. Keep all details on the form when
  // they fit; otherwise point to a child-specific continuation with each amount.
  const interestText = interest.join("; ");
  const needsAttachment = interestText.length > 42;
  return {
    interest: interest.length === 0
      ? undefined
      : needsAttachment
      ? "See attached interest adjustments"
      : interestText,
    interestAttachment: needsAttachment ? interest : [],
    dividends: typeof fields.dividend_nominee_note === "string"
      ? fields.dividend_nominee_note
      : undefined,
    capitalGains: typeof fields.capital_gain_nominee_note === "string"
      ? fields.capital_gain_nominee_note
      : undefined,
  };
}

export const form8814Pdf: PdfFormDescriptor = {
  pendingKey: "form8814",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8814--2025.pdf",
  instances(fields) {
    const items = fields.items;
    if (!Array.isArray(items)) return [];
    return (items as Form8814Lines[]).map((line) =>
      toPdfFields(line, items.length > 1)
    );
  },
  fields,
  filerFields: [
    text("nameLine1", "01"),
    text("primarySSN", "02"),
  ],
  async decoratePages(document, pages, fields) {
    const page = pages[0];
    if (!page) return;
    const notes = form8814DottedNotes(fields);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const printNote = (note: string | undefined, x: number, y: number) => {
      if (!note) return;
      page.drawRectangle({
        x,
        y: y - 2,
        width: 478 - x,
        height: 11,
        color: rgb(1, 1, 1),
      });
      page.drawText(note, {
        x: x + 2,
        y,
        size: 7,
        font,
        color: rgb(0, 0, 0),
        maxWidth: 474 - x,
      });
    };
    printNote(notes.interest, 280, 552);
    printNote(notes.dividends, 335, 516);
    printNote(notes.capitalGains, 190, 480);
  },
  async appendSupplementalPages(document, fields, filer) {
    const notes = form8814DottedNotes(fields);
    if (notes.interestAttachment.length === 0) return;
    const page = document.addPage([612, 792]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("Form 8814 (2025) - Line 1a interest adjustments", {
      x: 40,
      y: 744,
      size: 13,
      font: bold,
    });
    page.drawText(`Child: ${String(fields.child_name)}`, {
      x: 40,
      y: 715,
      size: 10,
      font: regular,
    });
    page.drawText(`Child SSN: ${String(fields.child_ssn)}`, {
      x: 40,
      y: 697,
      size: 10,
      font: regular,
    });
    if (filer) {
      page.drawText(`Parent: ${filer.nameLine1}  SSN: ${filer.primarySSN}`, {
        x: 40,
        y: 679,
        size: 9,
        font: regular,
      });
    }
    page.drawText("Amounts excluded from Form 8814 line 1a:", {
      x: 40,
      y: 642,
      size: 10,
      font: bold,
    });
    notes.interestAttachment.forEach((note, index) =>
      page.drawText(note, {
        x: 52,
        y: 618 - index * 22,
        size: 10,
        font: regular,
      })
    );
  },
};
