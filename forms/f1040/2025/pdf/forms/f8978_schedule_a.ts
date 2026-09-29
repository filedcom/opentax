import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  type Form8978Lines,
  Form8978Source,
} from "../../../nodes/inputs/f8978/index.ts";
import { form8978PdfSource } from "./f8978_shared.ts";

// Schedule A (Form 8978), Rev. January 2023. The source gate allows only
// column (a) and no more than seven source rows in each printed category.
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

function trackingNumber(row: Adjustment): string {
  const number = row.tracking_number ?? row.aar_tracking_number ??
    row.audit_control_number ?? row.ein ?? row.ssn;
  if (!number || row.missing_ein_reason) {
    throw new Error(
      "Form 8978 Schedule A PDF needs a Form 8986 tracking number, audit control number, or issuer TIN for every printed adjustment; partner-level attribute rows need separate source classification",
    );
  }
  return number;
}

function rowFields(
  category: typeof categories[number],
): PdfFieldEntry[] {
  return letters.flatMap((letter, index) => {
    const row = `${category.table}[0].Row${category.line}${letter}[0]`;
    const first = category.first + index * 6;
    return [
      text(`${category.key}_${index}_description`, `${row}.f1_${first}[0]`),
      text(`${category.key}_${index}_tracking`, `${row}.f1_${first + 1}[0]`),
      text(
        `${category.key}_${index}_amount`,
        `${row}.f1_${first + 2}[0]`,
        true,
      ),
    ];
  });
}

function adjustmentFields(
  category: typeof categories[number]["key"],
  rows: readonly Adjustment[],
): Record<string, unknown> {
  return Object.fromEntries(rows.flatMap((row, index) => [
    [`${category}_${index}_description`, row.description],
    [`${category}_${index}_tracking`, trackingNumber(row)],
    [`${category}_${index}_amount`, row.amount],
  ]));
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
    text("tax_year_month", "a[0].f1_03[0]"),
    text("tax_year_day", "a[0].f1_04[0]"),
    text("tax_year_year", "a[0].f1_05[0]"),
    ...categories.flatMap(rowFields),
    text("line2", "f1_57[0]", true),
    text("line4", "f1_103[0]", true),
    text("line6", "f1_149[0]", true),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8978) return [];
    const { filing, name, tin } = form8978PdfSource(allPending, filer);
    const year = filing.years[0];
    const [taxYearYear, taxYearMonth, taxYearDay] = year.tax_year_end.split(
      "-",
    );
    return [{
      partner_name: name,
      partner_tin: tin,
      source: filing.source,
      tax_year_month: taxYearMonth,
      tax_year_day: taxYearDay,
      tax_year_year: taxYearYear.slice(-2),
      ...adjustmentFields("income", year.income_adjustments),
      ...adjustmentFields("deduction", year.deduction_adjustments),
      ...adjustmentFields("credit", year.credit_adjustments),
      line2: year.line1b,
      line4: year.line3b,
      line6: year.line9b,
    }];
  },
};
