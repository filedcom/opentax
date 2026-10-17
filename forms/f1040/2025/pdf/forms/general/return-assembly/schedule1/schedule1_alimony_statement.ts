import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../../mef/header.ts";
import { FilingStatus } from "../../../../../../mef/header.ts";
import { assertTaxableAlimonySchedule1 } from "../../../../../../nodes/inputs/income/other/alimony_received/index.ts";

/** Paper continuation for the original dates behind multiple line 2a agreements. */
export async function appendSchedule1AlimonyStatement(
  document: PDFDocument,
  printed: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
  source: unknown,
): Promise<void> {
  const owners = filer
    ? [
      filer.primarySSN,
      ...(filer.filingStatus === FilingStatus.MarriedFilingJointly &&
          filer.spouse?.ssn
        ? [filer.spouse.ssn]
        : []),
    ]
    : undefined;
  const summary = assertTaxableAlimonySchedule1(
    printed.line2a_alimony_received,
    source,
    owners,
  );
  if (!summary || summary.agreements.length <= 1) return;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Schedule 1 line 2b statement needs filer identity");
  }
  const printedMonth = `${summary.agreementMonth.slice(5)}/${
    summary.agreementMonth.slice(0, 4)
  }`;
  if (printed.print_line2b_alimony_agreement_month !== printedMonth) {
    throw new Error("Schedule 1 line 2b differs from highest-income agreement");
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([612, 792]);
  const draw = (value: string, x: number, y: number, font = regular) => {
    page.drawText(value, { x, y, size: 9, font });
  };
  draw(
    "2025 Schedule 1 (Form 1040) line 2b - Alimony agreements",
    40,
    748,
    bold,
  );
  draw(filer.nameLine1, 40, 728);
  draw(`SSN ${filer.primarySSN}`, 40, 712);
  draw(`Total taxable alimony on line 2a: ${summary.amount}`, 40, 682, bold);
  draw(`Line 2b original agreement: ${printedMonth}`, 40, 665);
  draw("Other original agreements", 40, 631, bold);
  draw("Agreement reference", 40, 613, bold);
  draw("Original month", 290, 613, bold);
  draw("Amount", 400, 613, bold);
  draw("Recipient SSN", 475, 613, bold);
  for (const [index, agreement] of summary.agreements.slice(1).entries()) {
    if (regular.widthOfTextAtSize(agreement.reference, 9) > 235) {
      throw new Error("Schedule 1 line 2b agreement reference cannot fit");
    }
    if (regular.widthOfTextAtSize(String(agreement.amount), 9) > 65) {
      throw new Error("Schedule 1 line 2b agreement amount cannot fit");
    }
    const y = 594 - index * 22;
    draw(agreement.reference, 40, y);
    draw(
      `${agreement.agreementMonth.slice(5)}/${
        agreement.agreementMonth.slice(0, 4)
      }`,
      290,
      y,
    );
    draw(String(agreement.amount), 400, y);
    draw(agreement.recipientSsn, 475, y);
  }
}
