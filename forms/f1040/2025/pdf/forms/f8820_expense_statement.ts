import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  calculateForm8820,
  type F8820Input,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";

function wrappedLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line.trimEnd());
      line = char === " " ? "" : char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines.length > 0 ? lines : [""];
}

/** Append the same source-backed section 280C statement used by paper and MeF. */
export async function appendForm8820ExpenseStatement(
  document: PDFDocument,
  raw: F8820Input,
  filer?: FilerIdentity,
): Promise<void> {
  const input = inputSchema.parse(raw);
  const lines = calculateForm8820(input);
  if (input.reduced_section280c_credit_election || lines.line2a === 0) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let y = 0;
  const addPage = () => {
    page = document.addPage([612, 792]);
    page.drawText("Form 8820 - Section 280C expense reduction statement", {
      x: 40,
      y: 750,
      size: 12,
      font: bold,
    });
    const name = filer?.fullName ?? filer?.nameLine1;
    if (name) {
      page.drawText(name, { x: 40, y: 730, size: 9, font: regular });
    }
    if (filer?.primarySSN) {
      page.drawText(filer.primarySSN, {
        x: 460,
        y: 730,
        size: 9,
        font: regular,
      });
    }
    page.drawText(
      "Full-credit election not made. Deduction or capitalized basis reduced by line 2a.",
      { x: 40, y: 710, size: 8, font: regular },
    );
    y = 682;
  };
  addPage();
  for (const entry of input.expense_reductions ?? []) {
    const heading = `${entry.return_form_or_schedule} ${entry.return_line} ` +
      `(${entry.return_instance_reference ?? "return"}) - ${entry.treatment}`;
    const headingLines = wrappedLines(heading, bold, 8, 530);
    const recordLines = wrappedLines(
      `Expense record: ${entry.expense_record_reference}`,
      regular,
      8,
      530,
    );
    const rowHeight = (headingLines.length + recordLines.length + 1) * 12 + 10;
    if (y - rowHeight < 75) addPage();
    for (const line of headingLines) {
      page!.drawText(line, { x: 40, y, size: 8, font: bold });
      y -= 12;
    }
    for (const line of recordLines) {
      page!.drawText(line, { x: 40, y, size: 8, font: regular });
      y -= 12;
    }
    page!.drawText(
      `Before: ${entry.amount_before_reduction}    Reduction: ${entry.reduction_amount}    After: ${entry.expense_amount_after_reduction}`,
      { x: 40, y, size: 8, font: regular },
    );
    y -= 22;
  }
  page!.drawText(`Total reduction (Form 8820 line 2a): ${lines.line2a}`, {
    x: 40,
    y: Math.max(35, y - 8),
    size: 9,
    font: bold,
  });
}
