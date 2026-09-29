import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8874,
  inputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import { form8874, reconciledForm8874K1Line2 } from "../../mef/forms/f8874.ts";

// Form 8874 (Rev. November 2021) has six investment rows on its only form
// page. Pages 2 and 3 in the IRS PDF are instructions, not return pages.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const rowColumns = [
  "cde",
  "ein",
  "date",
  "investment",
  "rate",
  "credit",
] as const;

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...Array.from(
    { length: 6 },
    (_, index) =>
      rowColumns.map((column, columnIndex) =>
        text(
          `row_${index + 1}_${column}`,
          `${page}.Table_Line1[0].Row${index + 1}[0].f1_${
            String(3 + index * 6 + columnIndex).padStart(2, "0")
          }[0]`,
        )
      ),
  ).flat(),
  text("line2", `${page}.f1_39[0]`),
  text("line3", `${page}.f1_40[0]`),
];

function printedDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

function printedEin(ein: string): string {
  return `${ein.slice(0, 2)}-${ein.slice(2)}`;
}

export const form8874Pdf: PdfFormDescriptor = {
  pendingKey: "f8874",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8874--2021.pdf",
  fields,
  filerFields: [
    text("nameLine1", `${page}.f1_01[0]`),
    text("primarySSN", `${page}.f1_02[0]`),
  ],
  projectFields(raw, allPending) {
    // A pass-through-only credit is reported on Form 3800 without a separate
    // Form 8874. An actual f8874 slot must be parsed and printed or rejected.
    if (!Object.hasOwn(allPending, "f8874")) return {};
    const input = inputSchema.parse(raw);
    const lines = calculateForm8874(input);
    if (lines.rows.length > 6) {
      throw new Error(
        "Form 8874 PDF has six investment rows; an overflow statement is not supported",
      );
    }
    for (const row of lines.rows) {
      if (
        !Number.isSafeInteger(
          row.investment.qualified_equity_investment_amount,
        ) ||
        !Number.isSafeInteger(row.creditAmount)
      ) {
        throw new Error(
          "Form 8874 PDF investment and credit must retain whole-dollar print precision",
        );
      }
    }

    // Native validates direct credit against Form 3800 and passive rows
    // against Form 8582-CR; line 2 uses the same K-1 reconciliation in both
    // outputs. This also rejects a filed form with no matching credit route.
    form8874.build(input, { pending: allPending });
    const line2 = reconciledForm8874K1Line2({ pending: allPending });
    const line3 = lines.line1 + line2;
    if (!Number.isSafeInteger(line3)) {
      throw new Error("Form 8874 PDF line 3 exceeds whole-dollar precision");
    }

    const printed: Record<string, unknown> = { line2, line3 };
    lines.rows.forEach((row, index) => {
      const prefix = `row_${index + 1}_`;
      const { investment } = row;
      printed[`${prefix}cde`] = [
        investment.cde_name,
        investment.cde_address.line1,
        `${investment.cde_address.city}, ${investment.cde_address.state} ${investment.cde_address.zip}`,
      ].join("\n");
      printed[`${prefix}ein`] = printedEin(investment.cde_ein);
      printed[`${prefix}date`] = printedDate(
        investment.initial_investment_date,
      );
      printed[`${prefix}investment`] =
        investment.qualified_equity_investment_amount;
      printed[`${prefix}rate`] = row.rate;
      printed[`${prefix}credit`] = row.creditAmount;
    });
    return printed;
  },
  pageIndices: () => [0],
};
