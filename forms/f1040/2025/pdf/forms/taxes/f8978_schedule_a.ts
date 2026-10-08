import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import {
  type Form8978Lines,
  Form8978Source,
} from "../../../../nodes/inputs/f8978/index.ts";
import { form8978PdfSource } from "./f8978_shared.ts";

// Schedule A (Form 8978), Rev. January 2023. Align source rows across four
// year columns and preserve additional rows on seven-row continuation sheets.
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

const categories = [
  { key: "income", table: "Table_1_Income", line: "1", first: 15 },
  { key: "deduction", table: "Table_3_Deductions", line: "3", first: 61 },
  { key: "credit", table: "Table_5_Credits", line: "5", first: 107 },
] as const;
const letters = ["a", "b", "c", "d", "e", "f", "g"] as const;

type Adjustment = Form8978Lines["years"][number]["income_adjustments"][number];

function trackingNumber(row: Adjustment): string | undefined {
  const number = row.tracking_number ?? row.aar_tracking_number ??
    row.audit_control_number ?? row.ein ?? row.ssn ?? row.missing_ein_reason;
  if (row.origin === "partner_tax_attribute") {
    if (number || !row.attribute_explanation) {
      throw new Error(
        "Form8978 partner attribute needs blank tracking and explanation",
      );
    }
    return undefined;
  }
  if (!number) {
    throw new Error(
      "Form8978 Form8986 adjustment needs actual tracking identifier",
    );
  }
  return number;
}
function rowFields(category: typeof categories[number]): PdfFieldEntry[] {
  return letters.flatMap((letter, index) => {
    const row = `${category.table}[0].Row${category.line}${letter}[0]`,
      first = category.first + index * 6;
    return [
      text(`${category.key}_${index}_tracking`, `${row}.f1_${first + 1}[0]`),
      ...[0, 1, 2, 3].map((i) =>
        text(
          `${category.key}_${index}_amount_${i}`,
          `${row}.f1_${first + 2 + i}[0]`,
          true,
        )
      ),
    ];
  });
}
function alignedRows(
  filing: Form8978Lines,
  key: typeof categories[number]["key"],
) {
  const rows = new Map<
    string,
    { row: Adjustment; amounts: Record<number, number> }
  >();
  filing.years.forEach((year, i) => {
    const occurrences = new Map<string, number>();
    for (const row of year[`${key}_adjustments`]) {
      const base = JSON.stringify([
        row.description,
        trackingNumber(row),
        row.origin,
        row.attribute_explanation,
      ]);
      const n = occurrences.get(base) ?? 0;
      occurrences.set(base, n + 1);
      const identity = base + ":" + n;
      const entry = rows.get(identity) ?? { row, amounts: {} };
      entry.amounts[i] = row.amount;
      rows.set(identity, entry);
    }
  });
  return [...rows.values()];
}

export const form8978ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "form8978_schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8978sa--2023.pdf",
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
        `${letter}[0].f1_${String(3 + i * 3).padStart(2, "0")}[0]`,
      ),
      text(
        `tax_year_day_${i}`,
        `${letter}[0].f1_${String(4 + i * 3).padStart(2, "0")}[0]`,
      ),
      text(
        `tax_year_year_${i}`,
        `${letter}[0].f1_${String(5 + i * 3).padStart(2, "0")}[0]`,
      ),
      text(`line2_${i}`, `f1_${60 - i}[0]`, true),
      text(`line4_${i}`, `f1_${106 - i}[0]`, true),
      text(`line6_${i}`, `f1_${152 - i}[0]`, true),
    ]),
    ...categories.flatMap(rowFields),
  ],
  async decoratePages(document, pages, fields) {
    const font = await document.embedFont(StandardFonts.Helvetica),
      page = pages[0];
    if (!page) return;
    for (const [c, category] of categories.entries()) {
      for (let r = 0; r < 7; r++) {
        const description = fields[`${category.key}_${r}_description`];
        if (typeof description !== "string") {
          continue;
        }
        // The IRS description widget is only 100pt wide. Preserve the full
        // retained 50-character source in up to three lines inside its 24pt row.
        const lines: string[] = [];
        let line = "";
        for (const ch of description) {
          if (font.widthOfTextAtSize(line + ch, 6) > 98) {
            lines.push(line);
            line = "";
          }
          line += ch;
        }
        if (line) lines.push(line);
        if (lines.length > 3) {
          throw new Error(
            "Form8978 ScheduleA description cannot fit its reviewed row",
          );
        }
        lines.forEach((line, i) =>
          page.drawText(line, {
            x: 65,
            y: 618 - c * 192 - r * 24 - i * 7,
            size: 6,
            font,
          })
        );
      }
    }
  },
  instances(_fields, filer, allPending) {
    if (!allPending?.f8978) return [];
    const { filings, name, tin } = form8978PdfSource(allPending, filer);
    return filings.flatMap((filing) => {
      const aligned = categories.map((c) => alignedRows(filing, c.key));
      const count = Math.max(
        1,
        ...aligned.map((rows) => Math.ceil(rows.length / 7)),
      );
      return Array.from({ length: count }, (_, sheet) => {
        const fields: Record<string, unknown> = {
          partner_name: name,
          partner_tin: tin,
          source: filing.source,
        };
        filing.years.forEach((year, i) => {
          const [yyyy, mm, dd] = year.tax_year_end.split("-");
          Object.assign(fields, {
            [`tax_year_month_${i}`]: mm,
            [`tax_year_day_${i}`]: dd,
            [`tax_year_year_${i}`]: yyyy.slice(-2),
          });
        });
        categories.forEach((category, c) => {
          const rows = aligned[c].slice(sheet * 7, sheet * 7 + 7);
          rows.forEach((entry, r) => {
            fields[`${category.key}_${r}_description`] = entry.row.description;
            fields[`${category.key}_${r}_tracking`] = trackingNumber(entry.row);
            for (const [i, amount] of Object.entries(entry.amounts)) {
              fields[`${category.key}_${r}_amount_${i}`] = amount;
            }
          });
          filing.years.forEach((_, i) =>
            fields[
              `${
                {
                  income: "line2",
                  deduction: "line4",
                  credit: "line6",
                }[category.key]
              }_${i}`
            ] = rows.reduce((sum, r) => sum + (r.amounts[i] ?? 0), 0)
          );
        });
        return fields;
      });
    });
  },
};
