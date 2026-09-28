import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { CategorySummary } from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefBuildContext, MefPdfAttachment } from "../form-descriptor.ts";

export const CONVERSION_EXPLANATION_FILE =
  "Form1116PaidTaxConversionExplanation.pdf";
export const CONVERSION_EXPLANATION_DESCRIPTION =
  "Form 1116 paid foreign-tax currency conversion explanation";

export function conversionExplanationAttachmentId(
  context: MefBuildContext | undefined,
): string {
  const names = context?.binaryAttachmentFileNames;
  if (!names?.includes(CONVERSION_EXPLANATION_FILE)) {
    throw new Error(
      "Form 1116 paid-tax conversion needs its detailed explanation PDF attachment",
    );
  }
  if (
    context?.attachmentDescriptionsByFileName?.[CONVERSION_EXPLANATION_FILE] !==
      CONVERSION_EXPLANATION_DESCRIPTION
  ) {
    throw new Error(
      "Form 1116 conversion explanation attachment description does not match",
    );
  }
  const id = context?.documentIdsByAttachmentFileName?.[
    CONVERSION_EXPLANATION_FILE
  ];
  if (!id?.trim()) {
    throw new Error(
      "Form 1116 conversion explanation PDF is not linked in the return bundle",
    );
  }
  return id;
}

function wrap(text: string, font: PDFFont, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (line && font.widthOfTextAtSize(next, 9) > width) {
      lines.push(line.trimEnd());
      line = char === " " ? "" : char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

export async function buildConversionExplanation(
  summaries: readonly CategorySummary[],
  filer: FilerIdentity | undefined,
): Promise<MefPdfAttachment | undefined> {
  const items = summaries.flatMap((summary) =>
    summary.items.filter((item) => item.alternative_compensation_sourcing)
  );
  if (items.length === 0) return undefined;
  const name = filer?.fullName ?? filer?.nameLine1;
  const ssn = filer?.primarySSN;
  if (!ssn || !name) {
    throw new Error("Form 1116 conversion explanation needs filer identity");
  }
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let y = 0;
  const addPage = () => {
    page = document.addPage([612, 792]);
    page.drawText("Form 1116 - Foreign-tax currency conversion explanation", {
      x: 40,
      y: 750,
      size: 12,
      font: bold,
    });
    page.drawText(name, {
      x: 40,
      y: 730,
      size: 9,
      font: regular,
    });
    page.drawText(ssn, {
      x: 460,
      y: 730,
      size: 9,
      font: regular,
    });
    y = 700;
  };
  addPage();
  for (const [index, item] of items.entries()) {
    const currency = item.foreign_tax_currency;
    if (!currency?.conversion_date || !currency.conversion_rate_explanation) {
      throw new Error(
        "Form 1116 paid-tax conversion needs a date and detailed rate explanation",
      );
    }
    const rows = [
      `Item ${index + 1}: ${
        item.alternative_compensation_sourcing!
          .specific_compensation_description
      }`,
      `Income source: ${item.foreign_income_source_document_reference}`,
      `Foreign-tax record: ${currency.source_document_reference}`,
      `Country: ${item.irs_country_code}; paid: ${currency.conversion_date}`,
      `Foreign tax: ${currency.amount} ${currency.currency_code}; USD per unit: ${currency.usd_per_foreign_unit}; U.S. tax: ${item.foreign_tax_paid} USD`,
      `Rate method and evidence: ${currency.conversion_rate_explanation}`,
    ];
    for (const [rowIndex, row] of rows.entries()) {
      const font = rowIndex === 0 ? bold : regular;
      for (const line of wrap(row, font, 532)) {
        if (y < 55) addPage();
        page!.drawText(line, { x: 40, y, size: 9, font });
        y -= 13;
      }
    }
    y -= 12;
  }
  return {
    fileName: CONVERSION_EXPLANATION_FILE,
    description: CONVERSION_EXPLANATION_DESCRIPTION,
    bytes: await document.save(),
  };
}
