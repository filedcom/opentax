import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../mef/header.ts";
import {
  currentYearDistributionLines,
  type Form8915FItem,
  itemSchema,
} from "../../../../nodes/inputs/f8915f/index.ts";
import type { MefPdfAttachment } from "../../form-descriptor.ts";

export function repaymentWorksheetFileName(item: Form8915FItem): string {
  return item.retirement_source_kind === "plan"
    ? "Form8915FWorksheet3.pdf"
    : "Form8915FWorksheet5.pdf";
}

export async function buildForm8915FRepaymentWorksheet(
  raw: Form8915FItem,
  filer?: FilerIdentity,
): Promise<MefPdfAttachment> {
  const item = itemSchema.parse(raw);
  if (item.repayment.kind !== "timely") {
    throw new Error("Form 8915-F repayment worksheet needs a repayment");
  }
  if (!filer?.primarySSN) {
    throw new Error("Form 8915-F repayment worksheet needs filer identity");
  }
  const lines = currentYearDistributionLines(item, {
    planGross: 0,
    iraGross: 0,
  });
  const worksheetNumber = item.retirement_source_kind === "plan" ? 3 : 5;
  const priorRepaymentLine = worksheetNumber === 3 ? 14 : 25;
  const priorIncomeLine = worksheetNumber === 3 ? 13 : 24;
  const amount = item.repayment.amount;
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 740;
  const write = (value: string, strong = false) => {
    if (!/^[\x20-\x7E]*$/.test(value)) {
      throw new Error(
        "Form 8915-F repayment worksheet requires printable ASCII",
      );
    }
    const font = strong ? bold : regular;
    if (font.widthOfTextAtSize(value, 10) > 504) {
      throw new Error("Form 8915-F repayment worksheet line is too wide");
    }
    page.drawText(value, { x: 54, y, size: 10, font });
    y -= 23;
  };
  write(`2025 Form 8915-F Worksheet ${worksheetNumber}`, true);
  const ownerName = item.owner === "T"
    ? filer.fullName ?? filer.nameLine1 ?? ""
    : filer.spouse
    ? [
      filer.spouse.firstName,
      filer.spouse.middleInitial,
      filer.spouse.lastName,
      filer.spouse.suffix,
    ].filter(Boolean).join(" ")
    : "";
  if (!ownerName) {
    throw new Error("Form 8915-F repayment worksheet needs owner name");
  }
  write(`Name: ${ownerName}`);
  write(`SSN: ${item.recipient_ssn}`);
  write(`FEMA disaster: ${item.fema_number}`);
  write(`Distribution date: ${item.distribution_date}`);
  write(`Repayment date: ${item.repayment.date}`);
  write(`2025 return filing date: ${item.repayment.return_filing_date}`);
  write(
    `Filing deadline: ${
      item.repayment.filing_deadline.kind === "ordinary"
        ? "2026-04-15 (ordinary)"
        : "2026-10-15 (automatic extension)"
    }`,
  );
  y -= 16;
  write(`Line 1. Last year's Form 8915-F line ${priorRepaymentLine}: $0`);
  write(`Line 2. Last year's Form 8915-F line ${priorIncomeLine}: $0`);
  write("Line 3a. Line 1 minus line 2, minimum zero: $0");
  write("Line 3b. Amount already carried back: $0");
  write("Line 3c. Line 3a minus line 3b: $0");
  write(`Line 4. Repayments before filing the 2025 return: $${amount}`);
  write(
    `Line 5. Total repayments for Form 8915-F line ${
      worksheetNumber === 3 ? 14 : 25
    }: $${amount}`,
    true,
  );
  y -= 16;
  write(
    `Current year income before repayment: $${
      item.retirement_source_kind === "plan"
        ? lines.line13_total_income
        : lines.line24_total_ira_income
    }`,
  );
  write(
    `Current year income after repayment: $${
      item.retirement_source_kind === "plan"
        ? lines.line15_form1040_line5b
        : lines.line26_form1040_line4b
    }`,
  );
  const fileName = repaymentWorksheetFileName(item);
  return {
    fileName,
    description: `2025 Form 8915-F Worksheet ${worksheetNumber} repayment`,
    bytes: await pdf.save(),
  };
}
