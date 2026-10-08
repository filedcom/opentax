import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../mef/header.ts";
import {
  DependentCreditCategory,
  dependentFilingSchema,
} from "../../../../nodes/inputs/general/index.ts";

/** Print every dependent beyond the four columns on the 2025 Form 1040. */
export async function appendDependentContinuation(
  document: PDFDocument,
  source: unknown,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const dependents = dependentFilingSchema.array().parse(source ?? []);
  if (dependents.length <= 4) return;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 1040 dependent continuation needs filer identity");
  }
  const extra = dependents.slice(4);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const perPage = 8;
  const pages = Math.ceil(extra.length / perPage);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const page = document.addPage([612, 792]);
    const draw = (value: string, x: number, y: number, size = 9) => {
      if (regular.widthOfTextAtSize(value, size) > 530 - x + 40) {
        throw new Error("Form 1040 dependent continuation text exceeds page");
      }
      page.drawText(value, { x, y, size, font: regular });
    };
    page.drawText("Form 1040 (2025) - Dependent Continuation", {
      x: 40,
      y: 748,
      size: 12,
      font: bold,
    });
    draw(`Name: ${filer.nameLine1}`, 40, 727);
    draw(`SSN: ${filer.primarySSN}`, 40, 711);
    draw("Additional dependents for the page 1 Dependents section", 40, 682);
    for (
      const [index, dep] of extra.slice(
        pageIndex * perPage,
        (pageIndex + 1) * perPage,
      ).entries()
    ) {
      if (dep.lived_in_us_over_half_year === undefined) {
        throw new Error(
          "Form 1040 PDF dependent needs a reviewed U.S.-residence answer",
        );
      }
      const tin = dep.ssn ?? dep.itin ?? dep.atin;
      if (!tin) throw new Error("Form 1040 dependent continuation needs TIN");
      const top = 652 - index * 73;
      const number = 5 + pageIndex * perPage + index;
      draw(
        `${number}. First name: ${dep.first_name}    Last name: ${dep.last_name}`,
        40,
        top,
      );
      draw(
        `TIN: ${tin.replaceAll("-", "")}    Relationship: ${dep.relationship}`,
        55,
        top - 15,
      );
      draw(
        `Lived with you > half year: ${dep.months_in_home > 6 ? "Yes" : "No"}` +
          `    And in the U.S.: ${
            dep.lived_in_us_over_half_year ? "Yes" : "No"
          }`,
        55,
        top - 30,
      );
      draw(
        `Full-time student: ${dep.full_time_student === true ? "Yes" : "No"}` +
          `    Permanently and totally disabled: ${
            dep.disabled === true ? "Yes" : "No"
          }`,
        55,
        top - 45,
      );
      const credit =
        dep.credit_category === DependentCreditCategory.ChildTaxCredit
          ? "Child tax credit"
          : dep.credit_category === DependentCreditCategory.OtherDependentCredit
          ? "Credit for other dependents"
          : "Neither credit";
      draw(`Credit column: ${credit}`, 55, top - 60);
    }
    draw(`Page ${pageIndex + 1} of ${pages}`, 500, 45, 8);
  }
}
