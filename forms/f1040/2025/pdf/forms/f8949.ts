import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8949 (2025) — Sales and Other Dispositions of Capital Assets.
//
// Field structure (verified via PDF inspection):
//   Page 1 (Part I — short-term):
//     f1_01[0]        taxpayer name
//     f1_02[0]        SSN
//     c1_1[0–5]       checkboxes: boxes A, B, C, D, E, F
//     Table_Line1_Part1[0].Row{1–11}[0].f1_{03–90}[0]  transaction rows (11 rows × 8 cols)
//     f1_91–f1_95     totals (proceeds, cost basis, adjustment, gain/loss, blank)
//
//   Page 2 (Part II — long-term): identical structure with Page2 / f2_ prefix.
//
// Row field numbers follow a sequential pattern:
//   fieldNum = fieldNumBase + rowIndex * rowStride   (rowStride = 8)
//   e.g. description col: row 1 → f1_03, row 2 → f1_11, row 3 → f1_19 …
//
// Two separate rows descriptors are not supported by PdfFormDescriptor (only one rows field).
// Part I and Part II share the same domain key "transactions" — the builder fills
// Part I rows (short-term) first. Part II (long-term) requires the same descriptor
// applied to a second PDF page; pagination is handled by the builder when row count
// exceeds maxRows.
//
// For now, Part I (short-term) rows are fully mapped. Part II fields are included
// as scalar `fields` entries for the totals rows, with the transaction rows commented
// as a known limitation pending multi-page row support in the builder.

export const form8949Pdf: PdfFormDescriptor = {
  pendingKey: "f8949",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8949.pdf",

  // Scalar fields: Part I totals (line 2) and Part II totals (line 4)
  fields: [
    // Part I totals — line 2 columns d, e, g, h
    { kind: "text", domainKey: "short_term_proceeds_total",        pdfField: "topmostSubform[0].Page1[0].f1_91[0]" },
    { kind: "text", domainKey: "short_term_cost_total",            pdfField: "topmostSubform[0].Page1[0].f1_92[0]" },
    { kind: "text", domainKey: "short_term_adjustment_total",      pdfField: "topmostSubform[0].Page1[0].f1_94[0]" },
    { kind: "text", domainKey: "short_term_gain_loss_total",       pdfField: "topmostSubform[0].Page1[0].f1_95[0]" },
    // Part II totals — line 4 columns d, e, g, h
    { kind: "text", domainKey: "long_term_proceeds_total",         pdfField: "topmostSubform[0].Page2[0].f2_91[0]" },
    { kind: "text", domainKey: "long_term_cost_total",             pdfField: "topmostSubform[0].Page2[0].f2_92[0]" },
    { kind: "text", domainKey: "long_term_adjustment_total",       pdfField: "topmostSubform[0].Page2[0].f2_94[0]" },
    { kind: "text", domainKey: "long_term_gain_loss_total",        pdfField: "topmostSubform[0].Page2[0].f2_95[0]" },
  ],

  // Part I (short-term) transaction rows.
  // pdfFieldPattern uses both {row} (1-based row number) and {field_num}
  // (computed as fieldNumBase + rowIndex * rowStride).
  // rowStride = 8 because each row occupies 8 sequential AcroForm fields.
  rows: {
    domainKey: "transactions",
    maxRows: 11,
    rowStride: 8,
    rowFields: [
      {
        kind: "text",
        domainKey: "description",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 3,
      },
      {
        kind: "text",
        domainKey: "dateAcquired",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 4,
      },
      {
        kind: "text",
        domainKey: "dateSold",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 5,
      },
      {
        kind: "text",
        domainKey: "proceeds",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 6,
      },
      {
        kind: "text",
        domainKey: "costBasis",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 7,
      },
      {
        kind: "text",
        domainKey: "adjustmentCode",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 8,
      },
      {
        kind: "text",
        domainKey: "adjustmentAmount",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 9,
      },
      {
        kind: "text",
        domainKey: "gainLoss",
        pdfFieldPattern: "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row{row}[0].f1_{field_num}[0]",
        fieldNumBase: 10,
      },
    ],
  },
};
