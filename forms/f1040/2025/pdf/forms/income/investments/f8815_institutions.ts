import { institutionAddressLines } from "./f8815_address.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { type PDFFont, StandardFonts } from "pdf-lib";
import type { PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  calculateForm8815,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { assertForm8815FinalReturn } from "../../../../domains/income/investments/form8815/form8815_final_return.ts";

function wrapped(value: string, font: PDFFont): string[] {
  const lines: string[] = [];
  let line = "";
  for (const character of value) {
    if (font.widthOfTextAtSize(line + character, 10) > 520) {
      lines.push(line);
      line = "";
    }
    line += character;
  }
  if (line) lines.push(line);
  return lines;
}

/** Form 8815 line 1 permits an attached list when its three rows are full. */
export const appendForm8815Institutions: NonNullable<
  PdfFormDescriptor["appendSupplementalPages"]
> = async (document, fields, filer, allPending) => {
  const source = inputSchema.parse(Object.fromEntries(
    Object.keys(inputSchema.shape).map((key) => [key, fields[key]]),
  ));
  const remaining = source.eligible_students.slice(3);
  if (remaining.length === 0) return;
  if (
    !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
  ) {
    throw new Error("Form 8815 continuation needs the return name and SSN");
  }
  const spouse = filer.filingStatus === FilingStatus.MarriedFilingJointly
    ? filer.spouse
    : undefined;
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    (!spouse?.firstName || !spouse.lastName)
  ) {
    throw new Error("Form 8815 joint continuation needs the spouse name");
  }
  const calculated = calculateForm8815(source, CONFIG_BY_YEAR[2025]);
  for (const [key, value] of Object.entries(calculated)) {
    if (fields[key] !== value) {
      throw new Error(`Form 8815 continuation ${key} differs from its sources`);
    }
  }
  assertForm8815FinalReturn(source, calculated, allPending);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const newPage = (number: number) => {
    const page = document.addPage([612, 792]);
    page.drawText("Form 8815 (2025) - Line 1 continuation", {
      x: 40,
      y: 750,
      size: 12,
      font: bold,
    });
    page.drawText(`${filer.nameLine1}   SSN ${filer.primarySSN}`, {
      x: 40,
      y: 730,
      size: 9,
      font,
    });
    if (spouse) {
      page.drawText(
        `Joint filer: ${
          [
            spouse.firstName,
            spouse.middleInitial,
            spouse.lastName,
            spouse.suffix,
          ].filter(Boolean).join(" ")
        }`,
        {
          x: 40,
          y: 715,
          size: 9,
          font,
        },
      );
    }
    page.drawText("Additional people and eligible educational institutions", {
      x: 40,
      y: spouse ? 697 : 710,
      size: 10,
      font,
    });
    page.drawText(
      `Line 1 statement page ${number} - amounts remain on Form 8815`,
      {
        x: 40,
        y: 35,
        size: 9,
        font,
      },
    );
    return page;
  };
  let pageNumber = 1;
  let page = newPage(pageNumber);
  let y = 680;
  for (const [index, student] of remaining.entries()) {
    const address = student.institution_address;
    const lines = [
      `${index + 4}. Person: ${student.person_name}`,
      `Institution: ${student.institution_name}`,
      ...institutionAddressLines(address),
    ].flatMap((line) => wrapped(line, font));
    const height = lines.length * 14 + 18;
    if (y - height < 60) {
      page = newPage(++pageNumber);
      y = 680;
    }
    for (const line of lines) {
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
    }
    y -= 18;
  }
};
