import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { Form8978Source } from "../../../nodes/inputs/f8978/index.ts";
import { form8978PdfSource } from "./f8978_shared.ts";

// Form 8978 (Rev. January 2023), up to four affected-year columns per filing.
const page = "topmostSubform[0].Page1[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
  printZero,
});

const lineFields: ReadonlyArray<[string, string, number]> = [
  ["line1a", "Row1a", 15],
  ["line1b", "Row1b", 19],
  ["line2", "Row2", 23],
  ["line3a", "Row3a", 27],
  ["line3b", "Row3b", 31],
  ["line4", "Row4", 35],
  ["line5", "Row5", 39],
  ["line6", "Row6", 43],
  ["line7", "Row7", 47],
  ["line8", "Row8", 51],
  ["line9a", "Row9a", 55],
  ["line9b", "Row9b", 59],
  ["line10", "Row10", 63],
  ["line11", "Row11", 67],
  ["line12", "Row12", 71],
  ["line13", "Row13", 75],
];

export const form8978Pdf: PdfFormDescriptor = {
  pendingKey: "f8978",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8978--2023.pdf",
  fields: [
    text("partner_name", "f1_01[0]"),
    text("partner_tin", "f1_02[0]"),
    {
      kind: "checkboxWhen",
      domainKey: "source",
      pdfField: `${page}.c2_1[0]`,
      whenValue: Form8978Source.BbaAudit,
    },
    {
      kind: "checkboxWhen",
      domainKey: "source",
      pdfField: `${page}.c2_2[0]`,
      whenValue: Form8978Source.Aar,
    },
    ...["a", "b", "c", "d"].flatMap((letter, i) => [
      text(
        `tax_year_month_${i}`,
        `Table_PartI[0].Header[0].${letter}[0].f1_${
          String(3 + i * 3).padStart(2, "0")
        }[0]`,
      ),
      text(
        `tax_year_day_${i}`,
        `Table_PartI[0].Header[0].${letter}[0].f1_${
          String(4 + i * 3).padStart(2, "0")
        }[0]`,
      ),
      text(
        `tax_year_year_${i}`,
        `Table_PartI[0].Header[0].${letter}[0].f1_${
          String(5 + i * 3).padStart(2, "0")
        }[0]`,
      ),
      ...lineFields.map(([key, row, n]) =>
        text(`${key}_${i}`, `Table_PartI[0].${row}[0].f1_${n + i}[0]`, true)
      ),
      text(`line15_${i}`, `Table_PartII[0].Row15[0].f1_${80 + i}[0]`),
      text(`line17_${i}`, `Table_PartIII[0].Row17[0].f1_${85 + i}[0]`),
    ]),
    text("line14", "f1_79[0]", true),
    text("line16", "f1_84[0]"),
    text("line18", "f1_89[0]"),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8978) return [];
    const { filings, name, tin } = form8978PdfSource(allPending, filer);
    return filings.map((filing) => {
      const fields: Record<string, unknown> = {
        partner_name: name,
        partner_tin: tin,
        source: filing.source,
        line14: filing.line14,
        line16: filing.line16 || undefined,
        line18: filing.line18 || undefined,
      };
      filing.years.forEach((year, i) => {
        const [yyyy, mm, dd] = year.tax_year_end.split("-");
        Object.assign(fields, {
          [`tax_year_month_${i}`]: mm,
          [`tax_year_day_${i}`]: dd,
          [`tax_year_year_${i}`]: yyyy.slice(-2),
        });
        const values = {
          line1a: year.original_income,
          line1b: year.line1b,
          line2: year.line2,
          line3a: year.original_deductions,
          line3b: year.line3b,
          line4: year.line4,
          line5: year.line5,
          line6: year.corrected_income_tax,
          line7: year.corrected_amt,
          line8: year.line8,
          line9a: year.original_credits,
          line9b: year.line9b,
          line10: year.line10,
          line11: year.line11,
          line12: year.original_tax_liability,
          line13: year.line13,
          line15: year.penalty,
          line17: year.interest,
        };
        for (const [k, v] of Object.entries(values)) fields[`${k}_${i}`] = v;
      });
      return fields;
    });
  },
};
