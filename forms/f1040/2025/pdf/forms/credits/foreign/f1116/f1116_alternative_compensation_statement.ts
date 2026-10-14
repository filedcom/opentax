import { StandardFonts } from "pdf-lib";
import type { PdfFormDescriptor } from "../../../../review-support/form-descriptor.ts";
import { categorySummarySchema } from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { assertAlternativeCompensationSources } from "../../../../../mef/forms/credits/foreign/f1116/f1116_alternative_compensation_source.ts";

/** Paper counterpart of the linked native Form 1116 line 1b statement. */
export const appendAlternativeCompensationStatement: NonNullable<
  PdfFormDescriptor["appendSupplementalPages"]
> = async (document, fields, filer, allPending) => {
  const summaries = categorySummarySchema.array().parse(
    fields.category_summaries ?? [],
  );
  const details = summaries.flatMap((summary) =>
    summary.items.flatMap((item) =>
      item.alternative_compensation_sourcing
        ? [item.alternative_compensation_sourcing]
        : []
    )
  );
  if (details.length === 0) return;
  if (
    !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
  ) {
    throw new Error(
      "Form 1116 alternative compensation statement needs taxpayer name and SSN",
    );
  }
  assertAlternativeCompensationSources(summaries, {
    pending: allPending,
    filer,
  });
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]);
  let pageNumber = 0;
  let y = 696;
  const header = () => {
    pageNumber++;
    page.drawText("Form 1116 (2025) - Alternative compensation allocation", {
      x: 40,
      y: 750,
      size: 11,
      font: bold,
    });
    page.drawText(
      `${filer.nameLine1}   SSN ${filer.primarySSN}   Page ${pageNumber}`,
      { x: 40, y: 730, size: 9, font },
    );
    page.drawText(
      "Statement supporting Part I, line 1b - amounts in U.S. dollars",
      { x: 40, y: 712, size: 9, font },
    );
    y = 690;
  };
  header();
  const write = (value: string) => {
    let line = "";
    const flush = () => {
      if (y < 55) {
        page = document.addPage([612, 792]);
        header();
      }
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
      line = "";
    };
    for (const word of value.split(/\s+/).filter(Boolean)) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, 10) > 532) flush();
      if (line) line += " ";
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, 10) > 532) flush();
        line += character;
      }
    }
    if (line) flush();
    y -= 7;
  };
  const amount = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  for (const [index, item] of details.entries()) {
    write(
      `Compensation item ${
        index + 1
      }: ${item.specific_compensation_description}`,
    );
    write(
      `Specific compensation total: $${
        amount(item.compensation_item_total_usd)
      }.`,
    );
    write(`Alternative allocation basis: ${item.alternative_allocation_basis}`);
    write(
      `Alternative allocation computation: ${item.alternative_allocation_computation}`,
    );
    write(
      `Alternative basis: U.S. source $${
        amount(item.alternative_us_source_usd)
      }; foreign source $${amount(item.alternative_foreign_source_usd)}.`,
    );
    write(
      `Ordinary time/geographical basis: U.S. source $${
        amount(item.ordinary_us_source_usd)
      }; foreign source $${amount(item.ordinary_foreign_source_usd)}.`,
    );
    write(
      `Ordinary service-day calculation: ${item.ordinary_time_basis.us_service_days} U.S. days and ${item.ordinary_time_basis.foreign_service_days} foreign days; salary for one 2025 compensation period, excluding fringe benefits.`,
    );
    write(`Comparison of methods: ${item.geographical_comparison}`);
    write(`Compensation record: ${item.source_document_reference}`);
    write(
      `Workday record: ${item.ordinary_time_basis.workday_ledger_document_reference}`,
    );
  }
};
