import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule B (2025) AcroForm field names.
// Verified against the f1040sb--2025.pdf AcroForm field dump (one page):
//   f1_01 = name, f1_02 = SSN
//   Part I — line 1 payer table: 14 name/amount pairs f1_03/f1_04 … f1_29/f1_30
//   f1_31 = line 2 total, f1_32 = line 3 EE-bond exclusion, f1_33 = line 4
//   Part II — line 5 payer table: 15 name/amount pairs f1_34/f1_35 … f1_62/f1_63
//   f1_64 = line 6 total
//   Part III — c1_1 = 7a Yes/No, c1_2 = FinCEN 114 Yes/No, f1_65/f1_66 = 7b
//   countries, c1_3 = line 8 Yes/No. Left blank: no engine data source — the
//   taxpayer answers Part III by hand when this schedule is filed.
//
// print_* keys are self-emitted by the schedule_b node. The schedule itself is
// only included when required: over $1,500 of taxable interest (line 4) or
// ordinary dividends (line 6). (Schedule B instructions; the foreign-account
// trigger is unmodeled.)

function interestRow(i: number): PdfFieldEntry[] {
  const nameField = i === 1
    ? "topmostSubform[0].Page1[0].Line1_ReadOrder[0].f1_03[0]"
    : `topmostSubform[0].Page1[0].f1_${String(2 * i + 1).padStart(2, "0")}[0]`;
  return [
    { kind: "text", domainKey: `print_int_payer_${i}`, pdfField: nameField },
    { kind: "text", domainKey: `print_int_amount_${i}`, pdfField: `topmostSubform[0].Page1[0].f1_${String(2 * i + 2).padStart(2, "0")}[0]` },
  ];
}

function dividendRow(i: number): PdfFieldEntry[] {
  const nameField = i === 1
    ? "topmostSubform[0].Page1[0].ReadOrderControl[0].f1_34[0]"
    : `topmostSubform[0].Page1[0].f1_${32 + 2 * i}[0]`;
  return [
    { kind: "text", domainKey: `print_div_payer_${i}`, pdfField: nameField },
    { kind: "text", domainKey: `print_div_amount_${i}`, pdfField: `topmostSubform[0].Page1[0].f1_${33 + 2 * i}[0]` },
  ];
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: Interest payer rows + totals ────────────────────────────────────
  ...Array.from({ length: 14 }, (_, i) => interestRow(i + 1)).flat(),
  { kind: "text", domainKey: "print_line2_total", pdfField: "topmostSubform[0].Page1[0].f1_31[0]" },
  { kind: "text", domainKey: "ee_bond_exclusion", pdfField: "topmostSubform[0].Page1[0].f1_32[0]" },
  { kind: "text", domainKey: "print_line4_total", pdfField: "topmostSubform[0].Page1[0].f1_33[0]" },

  // ── Part II: Dividend payer rows + total ────────────────────────────────────
  ...Array.from({ length: 15 }, (_, i) => dividendRow(i + 1)).flat(),
  { kind: "text", domainKey: "print_line6_total", pdfField: "topmostSubform[0].Page1[0].f1_64[0]" },
];

export const scheduleBPdf: PdfFormDescriptor = {
  pendingKey: "schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sb--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
  ],
  includeWhen: (fields) =>
    ((fields["print_line4_total"] as number | undefined) ?? 0) > 1500 ||
    ((fields["print_line6_total"] as number | undefined) ?? 0) > 1500,
};
