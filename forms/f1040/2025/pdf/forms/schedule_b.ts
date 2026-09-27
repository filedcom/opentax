import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { rgb, StandardFonts } from "pdf-lib";
import { appendScheduleBInterestStatement } from "./schedule_b_interest_statement.ts";
import { appendScheduleBDividendStatement } from "./schedule_b_dividend_statement.ts";
import { appendScheduleBSellerFinancedStatement } from "./schedule_b_seller_financed_statement.ts";
import { appendScheduleBInterestAdjustmentsStatement } from "./schedule_b_interest_adjustments_statement.ts";
import { appendScheduleBNomineeDividendStatement } from "./schedule_b_nominee_dividend_statement.ts";
import { scheduleBFilingRequired } from "../../../schedule_b_filing.ts";
import {
  appendScheduleBForeignCountriesStatement,
  foreignCountryPrintFields,
} from "./schedule_b_foreign_countries_statement.ts";

// IRS Schedule B (2025) AcroForm field names.
// Verified against the f1040sb--2025.pdf AcroForm field dump (one page):
//   f1_01 = name, f1_02 = SSN
//   Part I — line 1 payer table: 14 name/amount pairs f1_03/f1_04 … f1_29/f1_30
//   f1_31 = line 2 total, f1_32 = line 3 EE-bond exclusion, f1_33 = line 4
//   Part II — line 5 payer table: 15 name/amount pairs f1_34/f1_35 … f1_62/f1_63
//   f1_64 = line 6 total
//   Part III — c1_1 = 7a Yes/No, c1_2 = FinCEN 114 Yes/No, f1_65/f1_66 = 7b
//   countries, c1_3 = line 8 Yes/No. The child Form 8814 source can force Yes
//   on lines 7a/8; the FBAR filing answer remains an explicit taxpayer fact.
//
// print_* keys are self-emitted by the schedule_b node. The schedule itself is
// included for threshold income or an affirmative foreign account/trust fact.

function interestRow(i: number): PdfFieldEntry[] {
  const nameField = i === 1
    ? "topmostSubform[0].Page1[0].Line1_ReadOrder[0].f1_03[0]"
    : `topmostSubform[0].Page1[0].f1_${String(2 * i + 1).padStart(2, "0")}[0]`;
  return [
    { kind: "text", domainKey: `print_int_payer_${i}`, pdfField: nameField },
    {
      kind: "text",
      domainKey: `print_int_amount_${i}`,
      pdfField: `topmostSubform[0].Page1[0].f1_${
        String(2 * i + 2).padStart(2, "0")
      }[0]`,
    },
  ];
}

function dividendRow(i: number): PdfFieldEntry[] {
  const nameField = i === 1
    ? "topmostSubform[0].Page1[0].ReadOrderControl[0].f1_34[0]"
    : `topmostSubform[0].Page1[0].f1_${32 + 2 * i}[0]`;
  return [
    { kind: "text", domainKey: `print_div_payer_${i}`, pdfField: nameField },
    {
      kind: "text",
      domainKey: `print_div_amount_${i}`,
      pdfField: `topmostSubform[0].Page1[0].f1_${33 + 2 * i}[0]`,
    },
  ];
}

function numericAmount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function scheduleBForm8814DottedLines(
  fields: Record<string, unknown>,
): readonly ("7a" | "8")[] {
  return [
    ...(fields.form8814_foreign_account === true ? ["7a" as const] : []),
    ...(fields.form8814_foreign_trust === true ? ["8" as const] : []),
  ];
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: Interest payer rows + totals ────────────────────────────────────
  ...Array.from({ length: 14 }, (_, i) => interestRow(i + 1)).flat(),
  {
    kind: "text",
    domainKey: "print_line2_total",
    pdfField: "topmostSubform[0].Page1[0].f1_31[0]",
  },
  {
    kind: "text",
    domainKey: "ee_bond_exclusion",
    pdfField: "topmostSubform[0].Page1[0].f1_32[0]",
  },
  {
    kind: "text",
    domainKey: "print_line4_total",
    pdfField: "topmostSubform[0].Page1[0].f1_33[0]",
  },

  // ── Part II: Dividend payer rows + total ────────────────────────────────────
  ...Array.from({ length: 15 }, (_, i) => dividendRow(i + 1)).flat(),
  {
    kind: "text",
    domainKey: "print_line6_total",
    pdfField: "topmostSubform[0].Page1[0].f1_64[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "foreign_accounts_question",
    pdfField: "topmostSubform[0].Page1[0].TagcorrectingSubform[0].c1_1[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "foreign_accounts_question",
    pdfField: "topmostSubform[0].Page1[0].TagcorrectingSubform[0].c1_1[1]",
    whenValue: "false",
  },
  {
    kind: "checkboxWhen",
    domainKey: "fincen_form114_required",
    pdfField: "topmostSubform[0].Page1[0].c1_2[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "fincen_form114_required",
    pdfField: "topmostSubform[0].Page1[0].c1_2[1]",
    whenValue: "false",
  },
  {
    kind: "text",
    domainKey: "print_foreign_country_line1",
    pdfField: "topmostSubform[0].Page1[0].f1_65[0]",
  },
  {
    kind: "text",
    domainKey: "print_foreign_country_line2",
    pdfField: "topmostSubform[0].Page1[0].f1_66[0]",
  },
  {
    kind: "checkboxWhen",
    domainKey: "foreign_trust_question",
    pdfField: "topmostSubform[0].Page1[0].c1_3[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "foreign_trust_question",
    pdfField: "topmostSubform[0].Page1[0].c1_3[1]",
    whenValue: "false",
  },
];

export const scheduleBPdf: PdfFormDescriptor = {
  pendingKey: "schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sb--2025.pdf",
  fields,
  async decoratePages(document, pages, fields) {
    const page = pages[0];
    if (!page) return;
    const lines = scheduleBForm8814DottedLines(fields);
    if (lines.length === 0) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    const note = (y: number) => {
      page.drawRectangle({
        x: 432,
        y: y - 2,
        width: 86,
        height: 10,
        color: rgb(1, 1, 1),
      });
      page.drawText("Form 8814", { x: 435, y, size: 7, font });
    };
    // IRS instructions require the literal beside 7a and/or 8 for a child.
    // These positions are the 2025 source PDF's dotted spaces, before Yes/No.
    if (lines.includes("7a")) note(135);
    if (lines.includes("8")) note(39);
  },
  projectFields(fields) {
    const names = fields.foreign_country_names;
    return {
      ...fields,
      ...(Array.isArray(names) ? foreignCountryPrintFields(names) : {}),
    };
  },
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: "topmostSubform[0].Page1[0].f1_01[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_02[0]",
    },
  ],
  includeWhen: (fields) =>
    scheduleBFilingRequired({
      taxableInterest: numericAmount(fields["print_line4_total"]),
      ordinaryDividends: numericAmount(fields["print_line6_total"]),
      sellerFinancedInterest:
        ((fields["seller_financed_rows"] as unknown[] | undefined)?.length ??
          0) >
          0,
      nomineeInterest: numericAmount(fields["interest_nominee"]),
      accruedInterest: numericAmount(fields["interest_accrued"]),
      oidAdjustment: numericAmount(fields["interest_oid_adjustment"]),
      bondPremiumAdjustment: numericAmount(fields["interest_bond_premium"]),
      savingsBondExclusion: numericAmount(fields["ee_bond_exclusion"]),
      nomineeDividends: numericAmount(fields["dividend_nominee"]),
      foreignAccount: fields["foreign_accounts_question"] === true ||
        fields["form8814_foreign_account"] === true,
      foreignTrust: fields["foreign_trust_question"] === true ||
        fields["form8814_foreign_trust"] === true,
    }),
  async appendSupplementalPages(document, fields, filer) {
    await appendScheduleBSellerFinancedStatement(document, fields, filer);
    await appendScheduleBInterestStatement(document, fields, filer);
    await appendScheduleBInterestAdjustmentsStatement(document, fields, filer);
    await appendScheduleBDividendStatement(document, fields, filer);
    await appendScheduleBNomineeDividendStatement(document, fields, filer);
    await appendScheduleBForeignCountriesStatement(document, fields, filer);
  },
};
