import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  StandardFonts,
} from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  calculateFiling,
  type Form8978Input,
  inputSchema,
} from "../../../nodes/inputs/f8978/index.ts";
import type { MefPdfAttachment } from "../form-descriptor.ts";

export function statementFileName(index: number): string {
  return `Form8978TaxCalculation${index + 1}.pdf`;
}

function displayText(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!/^[\x20-\x7E]*$/.test(text)) {
    throw new Error(
      "Form 8978 statement text must use printable ASCII characters",
    );
  }
  return text;
}

export async function buildForm8978Statements(
  raw: Form8978Input,
  filer?: FilerIdentity,
): Promise<ReadonlyArray<MefPdfAttachment>> {
  const input = inputSchema.parse(raw);
  if (!filer?.fullName || !filer.primarySSN) {
    throw new Error("Form 8978 tax-computation statement needs filer identity");
  }
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  return await Promise.all(input.filings.map(async (filing, index) => {
    const calculation = calculateFiling(filing);
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page: PDFPage = pdf.addPage([612, 792]);
    let y = 740;

    const nextPage = () => {
      page = pdf.addPage([612, 792]);
      y = 740;
    };
    const line = (value: string, font: PDFFont = regular, size = 10) => {
      const printable = displayText(value);
      if (font.widthOfTextAtSize(printable, size) > 504) {
        throw new Error("Form 8978 statement line is too wide for the page");
      }
      if (y < 54) nextPage();
      page.drawText(printable, { x: 54, y, size, font });
      y -= size + 7;
    };
    const paragraph = (value: string) => {
      const words = displayText(value).split(" ");
      let current = "";
      for (const word of words) {
        if (regular.widthOfTextAtSize(word, 10) > 500) {
          throw new Error(
            "Form 8978 statement has a word too wide for the page",
          );
        }
        const candidate = current ? `${current} ${word}` : word;
        if (regular.widthOfTextAtSize(candidate, 10) > 500 && current) {
          line(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) line(current);
    };

    line(`Form 8978 tax-computation statement ${index + 1}`, bold, 13);
    line(`Taxpayer: ${filer.fullName}`, bold);
    line(`SSN: ${filer.primarySSN.replace(/\D/g, "")}`);
    line(
      `Adjustment source: ${
        filing.source === "aar" ? "AAR filing" : "BBA audit"
      }`,
    );
    y -= 8;
    for (const year of calculation.years) {
      line(`Affected tax year ended ${year.tax_year_end}`, bold, 11);
      line(`Corrected income: ${money(year.line2)}`);
      line(`Corrected deductions: ${money(year.line4)}`);
      line(`Corrected taxable income: ${money(year.line5)}`);
      if (year.line5 !== year.line2 - year.line4) {
        line("Line 5 separate calculation:", bold);
        paragraph(year.corrected_taxable_income_explanation!);
      }
      line(`Corrected income tax: ${money(year.corrected_income_tax)}`);
      line(`Corrected AMT: ${money(year.corrected_amt)}`);
      line(`Corrected credits: ${money(year.line10)}`);
      line(`Corrected income tax liability: ${money(year.line11)}`);
      if (year.line11 !== year.line8 - year.line10) {
        line("Line 11 separate calculation:", bold);
        paragraph(year.corrected_income_tax_liability_explanation!);
      }
      line(
        `Previously reported income tax liability: ${
          money(year.original_tax_liability)
        }`,
      );
      line(
        `Form 8978 line 13 increase or decrease: ${money(year.line13)}`,
        bold,
      );
      line("Affected-year tax calculation:", bold);
      paragraph(year.tax_calculation_explanation);
      if (year.penalty) {
        line(`Penalty: ${money(year.penalty)}`, bold);
        paragraph(year.penalty_calculation_explanation!);
      }
      if (year.interest) {
        line(`Interest: ${money(year.interest)}`, bold);
        paragraph(year.interest_calculation_explanation!);
      }
      y -= 10;
    }
    line(`Form 8978 line 14 total: ${money(calculation.line14)}`, bold, 11);
    return {
      fileName: statementFileName(index),
      description: `Form 8978 tax calculation statement ${index + 1}`,
      bytes: await pdf.save(),
    };
  }));
}
