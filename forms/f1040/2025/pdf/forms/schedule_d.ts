import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { rgb, StandardFonts } from "pdf-lib";
import { form8814ParentPrintAmounts } from "./f8814.ts";

// IRS Schedule D (2025) AcroForm field names.
// Verified against the f1040sd--2025.pdf AcroForm field dump.
//
// Page 1:
//   f1_1 = name, f1_2 = SSN, c1_1[0]/c1_1[1] = QOF disposition Yes(/1)/No(/2)
//   Part I (short-term) table — columns (d) proceeds, (e) cost, (g) adjustment,
//   (h) gain/loss:
//     Row1a f1_3–f1_6, Row1b f1_7–f1_10, Row2 f1_11–f1_14, Row3 f1_15–f1_18
//     f1_19 = line 4, f1_20 = line 5, f1_21 = line 6 carryover, f1_22 = line 7
//   Part II (long-term) table:
//     Row8a f1_23–f1_26, Row8b f1_27–f1_30, Row9 f1_31–f1_34, Row10 f1_35–f1_38
//     f1_39 = line 11, f1_40 = line 12, f1_41 = line 13 capital gain
//     distributions, f1_42 = line 14 carryover, f1_43 = line 15
// Page 2:
//   f2_1 = line 16, c2_1[0]/[1] = line 17 Yes/No, f2_2 = line 18 (28% rate
//   gain), f2_3 = line 19 (unrecaptured §1250), c2_2[0]/[1] = line 20 Yes/No,
//   f2_4 = line 21 loss limit, c2_3[0]/[1] = line 22 Yes/No
//
// print_* keys are self-emitted by the schedule_d node.

const transactionRows = [
  { line: "1b", parts: ["A", "G"], table: "PartI", row: "Row1b", first: 7 },
  { line: "2", parts: ["B", "H"], table: "PartI", row: "Row2", first: 11 },
  { line: "3", parts: ["C", "I"], table: "PartI", row: "Row3", first: 15 },
  { line: "8b", parts: ["D", "J"], table: "PartII", row: "Row8b", first: 27 },
  { line: "9", parts: ["E", "K"], table: "PartII", row: "Row9", first: 31 },
  { line: "10", parts: ["F", "L"], table: "PartII", row: "Row10", first: 35 },
] as const;
const transactionFields: PdfFieldEntry[] = transactionRows.flatMap((row) =>
  (["proceeds", "cost", "adjustment", "gain"] as const).map(
    (column, index) => ({
      kind: "text" as const,
      domainKey: `print_line${row.line}_${column}`,
      pdfField:
        `topmostSubform[0].Page1[0].Table_${row.table}[0].${row.row}[0].f1_${
          row.first + index
        }[0]`,
    }),
  )
);

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── QOF disposition question (top of page 1) ─────────────────────────────────
  {
    kind: "checkboxWhen",
    domainKey: "print_qof_disposition",
    pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_qof_disposition",
    pdfField: "topmostSubform[0].Page1[0].c1_1[1]",
    whenValue: "false",
  },

  // ── Part I: Short-Term — line 1a direct-reported totals ─────────────────────
  {
    kind: "text",
    domainKey: "print_line1a_proceeds",
    pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "print_line1a_cost",
    pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "print_line1a_gain",
    pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_6[0]",
  },
  ...transactionFields.filter((field) =>
    field.domainKey.startsWith("print_line1b_") ||
    field.domainKey.startsWith("print_line2_") ||
    field.domainKey.startsWith("print_line3_")
  ),
  {
    kind: "text",
    domainKey: "line_4_other_st",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "line_5_k1_st",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
  },
  {
    kind: "text",
    domainKey: "line_6_carryover",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "print_line7_st_total",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
  },

  // ── Part II: Long-Term — line 8a direct-reported totals ─────────────────────
  {
    kind: "text",
    domainKey: "print_line8a_proceeds",
    pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "print_line8a_cost",
    pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "print_line8a_gain",
    pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_26[0]",
  },
  ...transactionFields.filter((field) =>
    field.domainKey.startsWith("print_line8b_") ||
    field.domainKey.startsWith("print_line9_") ||
    field.domainKey.startsWith("print_line10_")
  ),
  {
    kind: "text",
    domainKey: "line_11_form2439",
    pdfField: "topmostSubform[0].Page1[0].f1_39[0]",
  },
  {
    kind: "text",
    domainKey: "line_12_k1_lt",
    pdfField: "topmostSubform[0].Page1[0].f1_40[0]",
  },
  {
    kind: "text",
    domainKey: "print_line13_cap_gain_distrib",
    pdfField: "topmostSubform[0].Page1[0].f1_41[0]",
  },
  {
    kind: "text",
    domainKey: "line_14_carryover",
    pdfField: "topmostSubform[0].Page1[0].f1_42[0]",
  },
  {
    kind: "text",
    domainKey: "print_line15_lt_total",
    pdfField: "topmostSubform[0].Page1[0].f1_43[0]",
  },

  // ── Part III: Summary (page 2) ───────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "print_line16_combined",
    pdfField: "topmostSubform[0].Page2[0].f2_1[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_line17_both_gains",
    pdfField: "topmostSubform[0].Page2[0].c2_1[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_line17_both_gains",
    pdfField: "topmostSubform[0].Page2[0].c2_1[1]",
    whenValue: "false",
  },
  {
    kind: "text",
    domainKey: "print_line18_28pct",
    pdfField: "topmostSubform[0].Page2[0].f2_2[0]",
  },
  {
    kind: "text",
    domainKey: "print_line19_unrecaptured_1250",
    pdfField: "topmostSubform[0].Page2[0].f2_3[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_line20_qdcgt",
    pdfField: "topmostSubform[0].Page2[0].c2_2[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_line20_qdcgt",
    pdfField: "topmostSubform[0].Page2[0].c2_2[1]",
    whenValue: "false",
  },
  {
    kind: "text",
    domainKey: "print_line21_loss",
    pdfField: "topmostSubform[0].Page2[0].f2_4[0]",
  },
];

export const scheduleDPdf: PdfFormDescriptor = {
  pendingKey: "schedule_d",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sd--2025.pdf",
  projectFields(fields, allPending) {
    const rows = [
      ...(Array.isArray(fields.transaction)
        ? fields.transaction
        : fields.transaction
        ? [fields.transaction]
        : []),
      ...(Array.isArray(fields.transactions) ? fields.transactions : []),
    ];
    const hasQsbsRow = rows.some((row) =>
      typeof row === "object" && row !== null &&
      (("qsbs_code" in row && row.qsbs_code !== undefined) ||
        ("qsbs_amount" in row && row.qsbs_amount !== undefined) ||
        ("adjustment_codes" in row &&
          typeof row.adjustment_codes === "string" &&
          row.adjustment_codes.includes("Q")))
    );
    if (
      (typeof fields.box2c_qsbs === "number" && fields.box2c_qsbs > 0) ||
      hasQsbsRow
    ) {
      throw new Error(
        "Schedule D section 1202 source needs a sourced Form 8949 exclusion and Form 6251 line 2h preference before filing",
      );
    }
    const child = form8814ParentPrintAmounts(allPending);
    const form8949Rows = allPending.form8949?.transaction;
    const saleRows = (Array.isArray(form8949Rows) ? form8949Rows : [])
      .filter((row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null
      );
    const saleTotals: Record<string, number> = {};
    for (const group of transactionRows) {
      const selected = saleRows.filter((row) =>
        group.parts.some((part) => part === row.part) &&
        // Unadjusted broker-basis rows already print on lines 1a/8a.
        !((row.part === "A" || row.part === "D") &&
          !row.adjustment_codes && row.adjustment_amount === undefined)
      );
      if (selected.length === 0) continue;
      for (
        const [column, key] of [
          ["proceeds", "proceeds"],
          ["cost", "cost_basis"],
          ["adjustment", "adjustment_amount"],
          ["gain", "gain_loss"],
        ] as const
      ) {
        saleTotals[`print_line${group.line}_${column}`] = selected.reduce(
          (total, row) => {
            const value = row[key];
            if (value === undefined && key === "adjustment_amount") {
              return total;
            }
            if (typeof value !== "number") {
              throw new Error(`Schedule D PDF needs numeric Form 8949 ${key}`);
            }
            return total + value;
          },
          0,
        );
      }
    }
    return {
      ...fields,
      ...saleTotals,
      print_form8814_line13_note: child.capitalGain > 0 &&
          typeof fields.print_line13_cap_gain_distrib === "number"
        ? `Form 8814 $${child.capitalGain}`
        : undefined,
    };
  },
  fields,
  async decoratePages(document, pages, fields) {
    const note = fields.print_form8814_line13_note;
    const page = pages[0];
    if (!page || typeof note !== "string") return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    // The 2025 Schedule D source PDF has line 13's dotted space at x260-470,
    // y96-107; its amount field starts at x504.
    page.drawRectangle({
      x: 260,
      y: 96,
      width: 210,
      height: 11,
      color: rgb(1, 1, 1),
    });
    page.drawText(note, { x: 263, y: 99, size: 7, font });
  },
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
};
