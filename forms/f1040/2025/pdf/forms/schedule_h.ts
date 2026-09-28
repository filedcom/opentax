import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleH as nativeScheduleH } from "../../mef/forms/schedule_h.ts";

// The TY2025 two-page IRS AcroForm uses f1_1/f1_2/f1_3 for employer identity,
// then f1_4 through f1_11 for Part I lines 1 through 8. The former map put
// wage and tax values into identity and unrelated amount fields.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });
const answer = (
  domainKey: string,
  number: number,
  yesIndex = 0,
  prefix = page1,
): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${prefix}c${prefix === page1 ? 1 : 2}_${number}[${yesIndex}]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${prefix}c${prefix === page1 ? 1 : 2}_${number}[${
      1 - yesIndex
    }]`,
    whenValue: "false",
  },
];

const sectionBRow = (rowIndex: 0 | 1): PdfFieldEntry[] => {
  const first = rowIndex === 0 ? 5 : 14;
  const row = rowIndex + 1;
  const path = `${page2}Table_Line17[0].BodyRow${row}[0].`;
  return [
    text(`row${row}_state`, `${path}f2_${first}[0]`),
    text(`row${row}_taxable_state_wages`, `${path}f2_${first + 1}[0]`),
    text(`row${row}_rate_from`, `${path}f2_${first + 2}[0]`),
    text(`row${row}_rate_to`, `${path}f2_${first + 3}[0]`),
    text(`row${row}_experience_rate`, `${path}f2_${first + 4}[0]`),
    text(`row${row}_credit_at_54`, `${path}f2_${first + 5}[0]`),
    text(`row${row}_credit_at_state_rate`, `${path}f2_${first + 6}[0]`),
    text(`row${row}_additional_credit`, `${path}f2_${first + 7}[0]`, true),
    text(`row${row}_contributions`, `${path}f2_${first + 8}[0]`, true),
  ];
};

const pdfDate = (date: string | undefined): string | undefined =>
  date === undefined
    ? undefined
    : `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(2, 4)}`;
const pdfRate = (rate: number | undefined): string | undefined =>
  rate === undefined ? undefined : `${Number((rate * 100).toFixed(4))}%`;
type SectionBRow = NonNullable<
  ReturnType<typeof computeScheduleHAmounts>["sectionB"]
>["rows"][number];

function continuationCell(row: SectionBRow): string[] {
  return [
    row.state,
    String(Math.round(row.taxable_state_wages)),
    pdfDate(row.rate_period_from) ?? "",
    pdfDate(row.rate_period_to) ?? "",
    pdfRate(row.experience_rate) ?? "",
    row.creditAt54 === undefined ? "" : String(row.creditAt54),
    row.creditAtStateRate === undefined ? "" : String(row.creditAtStateRate),
    row.creditAt54 === undefined ? "" : String(row.additionalCredit),
    String(Math.round(row.contributions_paid_by_due_date)),
  ];
}

export const scheduleHPdf: PdfFormDescriptor = {
  pendingKey: "schedule_h",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sh--2025.pdf",
  filerFields: [
    text("nameLine1", `${page1}f1_1[0]`),
    text("primarySSN", `${page1}f1_2[0]`),
  ],
  fields: [
    text("employer_ein", `${page1}CombField[0].f1_3[0]`),
    ...answer("cash_wages_over_2025_limit", 1),
    text("ss_wages", `${page1}f1_4[0]`),
    text("line2_social_security_tax", `${page1}f1_5[0]`),
    text("medicare_wages", `${page1}f1_6[0]`),
    text("line4_medicare_tax", `${page1}f1_7[0]`),
    text("additional_medicare_wages", `${page1}f1_8[0]`, true),
    text("line6_additional_medicare_tax", `${page1}f1_9[0]`, true),
    text("federal_income_tax_withheld", `${page1}f1_10[0]`, true),
    text("line8_fica_and_withholding", `${page1}f1_11[0]`),
    // Line 9 prints No first and Yes second, unlike line A.
    ...answer("cash_wages_over_quarter_limit", 4, 1),
    ...answer("paid_only_one_state", 1, 0, `${page2}Line10[0].`),
    ...answer("all_contributions_paid_on_time", 2, 0, page2),
    ...answer("all_futa_wages_state_taxable", 3, 0, page2),
    text("section_a_state", `${page2}f2_1[0]`),
    text("section_a_contributions", `${page2}f2_2[0]`),
    text("section_a_taxable_wages", `${page2}f2_3[0]`),
    text("section_a_futa_tax", `${page2}f2_4[0]`),
    ...sectionBRow(0),
    ...sectionBRow(1),
    text("line18_additional_credit", `${page2}f2_23[0]`, true),
    text("line18_contributions", `${page2}f2_24[0]`, true),
    text("line19_tentative_credit", `${page2}f2_25[0]`),
    text("line20_futa_wages", `${page2}f2_26[0]`),
    text("line21_gross_futa_tax", `${page2}f2_27[0]`),
    text("line22_maximum_credit", `${page2}f2_28[0]`),
    {
      kind: "checkboxWhen",
      domainKey: "line23_worksheet_used",
      pdfField: `${page2}c2_4[0]`,
      whenValue: "true",
    },
    text("line23_allowed_credit", `${page2}f2_29[0]`),
    text("line24_futa_tax", `${page2}f2_30[0]`),
    text("line25_fica_and_withholding", `${page2}f2_31[0]`, true),
    text("line26_total_tax", `${page2}f2_32[0]`),
    ...answer("line27_required_to_file_1040", 5, 0, page2),
  ],
  projectFields(raw) {
    if (Object.keys(raw).length === 0) return {};
    const input = inputSchema.parse(raw);
    const amounts = computeScheduleHAmounts(input, 2025);
    const unemployment = input.federal_unemployment;
    const sectionB = amounts.sectionB;
    const rows: Record<string, unknown> = {};
    for (const [index, row] of (sectionB?.rows.slice(0, 2) ?? []).entries()) {
      const prefix = `row${index + 1}_`;
      rows[prefix + "state"] = row.state;
      rows[prefix + "taxable_state_wages"] = row.taxable_state_wages;
      rows[prefix + "rate_from"] = pdfDate(row.rate_period_from);
      rows[prefix + "rate_to"] = pdfDate(row.rate_period_to);
      rows[prefix + "experience_rate"] = pdfRate(row.experience_rate);
      rows[prefix + "credit_at_54"] = row.creditAt54;
      rows[prefix + "credit_at_state_rate"] = row.creditAtStateRate;
      rows[prefix + "additional_credit"] = row.creditAt54 === undefined
        ? undefined
        : row.additionalCredit;
      rows[prefix + "contributions"] = row.contributions_paid_by_due_date;
    }
    return {
      ...input,
      line2_social_security_tax: amounts.socialSecurityTax,
      line4_medicare_tax: amounts.medicareTax,
      line6_additional_medicare_tax: amounts.additionalMedicareTax,
      line8_fica_and_withholding: amounts.ficaAndWithholding,
      ...(unemployment === undefined ? {} : {
        paid_only_one_state: unemployment.paid_only_one_state,
        all_contributions_paid_on_time:
          unemployment.all_contributions_paid_on_time,
        all_futa_wages_state_taxable: unemployment.all_futa_wages_state_taxable,
        ...(sectionB === undefined
          ? {
            section_a_state: "state" in unemployment
              ? unemployment.state
              : undefined,
            section_a_contributions: "zero_experience_rate" in unemployment &&
                unemployment.zero_experience_rate
              ? "0% rate"
              : "contributions_paid" in unemployment
              ? unemployment.contributions_paid
              : undefined,
            section_a_taxable_wages: "taxable_wages" in unemployment
              ? unemployment.taxable_wages
              : undefined,
            section_a_futa_tax: amounts.futaTax,
          }
          : {
            ...rows,
            section_b_continuation: sectionB.rows.slice(2),
            line18_additional_credit: sectionB.additionalCredit,
            line18_contributions: sectionB.contributions,
            line19_tentative_credit: sectionB.tentativeCredit,
            line20_futa_wages: "taxable_futa_wages" in unemployment
              ? unemployment.taxable_futa_wages
              : undefined,
            line21_gross_futa_tax: sectionB.grossTax,
            line22_maximum_credit: sectionB.maximumCredit,
            line23_worksheet_used: sectionB.needsWorksheet,
            line23_allowed_credit: sectionB.allowedCredit,
            line24_futa_tax: sectionB.futaTax,
          }),
        line25_fica_and_withholding: amounts.ficaAndWithholding,
        line26_total_tax: amounts.totalTax,
        line27_required_to_file_1040: true,
      }),
    };
  },
  instances(projected, filer, allPending) {
    if (Object.keys(projected).length === 0) return [];
    const source = allPending?.schedule_h;
    if (!allPending || !source || !filer) {
      throw new Error("Schedule H PDF needs its source and filer identity");
    }
    nativeScheduleH.build(source, { filer, pending: allPending });
    if (
      JSON.stringify(projected) !==
        JSON.stringify(scheduleHPdf.projectFields!(source, allPending))
    ) {
      throw new Error("Schedule H PDF fields differ from the pending source");
    }
    const total = projected.line26_total_tax ??
      projected.line8_fica_and_withholding;
    if (
      typeof total !== "number" ||
      allPending?.schedule2?.line9_household_employment !== total
    ) {
      throw new Error(
        "Schedule H PDF tax must reconcile to Schedule 2 line 9",
      );
    }
    return [projected];
  },
  async appendSupplementalPages(document, projected, filer) {
    const rows = projected.section_b_continuation as SectionBRow[] | undefined;
    if (!rows?.length) return;
    if (!filer?.fullName || !filer.primarySSN) {
      throw new Error("Schedule H line 17 continuation needs filer identity");
    }
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const widths = [40, 76, 54, 54, 55, 68, 68, 68, 57];
    const headings = [
      "(a) State",
      "(b) Wages",
      "(c) From",
      "(c) To",
      "(d) Rate",
      "(e) x .054",
      "(f) x rate",
      "(g) Difference",
      "(h) Paid",
    ];
    const left = 36;
    const rowHeight = 22;
    const perPage = 22;
    for (let offset = 0; offset < rows.length; offset += perPage) {
      const page = document.addPage([612, 792]);
      const pageRows = rows.slice(offset, offset + perPage);
      page.drawText("Schedule H (2025) - Line 17 continuation", {
        x: left,
        y: 748,
        size: 12,
        font: bold,
      });
      page.drawText(`${filer.fullName}  SSN ${filer.primarySSN}`, {
        x: left,
        y: 728,
        size: 9,
        font,
      });
      page.drawText(
        `Additional state/rate rows ${offset + 3} through ${
          offset + pageRows.length + 2
        }`,
        { x: left, y: 710, size: 9, font },
      );
      let y = 690;
      let x = left;
      for (let column = 0; column < headings.length; column++) {
        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: widths[column],
          height: rowHeight,
          borderWidth: 0.5,
        });
        page.drawText(headings[column], {
          x: x + 3,
          y: y - 14,
          size: 7,
          font: bold,
        });
        x += widths[column];
      }
      y -= rowHeight;
      for (const row of pageRows) {
        x = left;
        const cells = continuationCell(row);
        for (let column = 0; column < cells.length; column++) {
          const width = widths[column];
          const value = cells[column];
          if (font.widthOfTextAtSize(value, 8) > width - 6) {
            throw new Error(
              `Schedule H line 17 continuation value exceeds column ${
                column + 1
              }`,
            );
          }
          page.drawRectangle({
            x,
            y: y - rowHeight,
            width,
            height: rowHeight,
            borderWidth: 0.5,
          });
          page.drawText(value, {
            x: x + 3,
            y: y - 14,
            size: 8,
            font,
          });
          x += width;
        }
        y -= rowHeight;
      }
      page.drawText(
        "Columns match Schedule H (Form 1040), line 17. Totals appear on the form's line 18.",
        { x: left, y: y - 20, size: 8, font },
      );
    }
  },
};
