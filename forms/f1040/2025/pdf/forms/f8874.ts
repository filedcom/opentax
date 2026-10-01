import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8874,
  inputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import { assertForm8874AIssuanceOwners } from "../../../nodes/inputs/f8874/issuance_evidence.ts";
import { form8874, reconciledForm8874K1Line2 } from "../../mef/forms/f8874.ts";
import { appendForm8874InvestmentStatement } from "./f8874_overflow_statement.ts";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import { assertForm3800FinalCreditJoin } from "../../form3800_final_credit_join.ts";

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
const cdeFont = await (await PDFDocument.create()).embedFont(
  StandardFonts.Helvetica,
);
const CDE_PRINT_WIDTH = 176;

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

function printedCdeAddress(investment: {
  cde_address: { line1: string; city: string; state: string; zip: string };
}): string {
  return `${investment.cde_address.line1}, ${investment.cde_address.city}, ${investment.cde_address.state} ${investment.cde_address.zip}`;
}

function fitsCdeField(name: string, address: string): boolean {
  return !/[\r\n]/.test(name + address) &&
    cdeFont.widthOfTextAtSize(name, 8) <= CDE_PRINT_WIDTH &&
    cdeFont.widthOfTextAtSize(address, 8) <= CDE_PRINT_WIDTH;
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
    assertForm8874AIssuanceOwners(input, allPending);
    const lines = calculateForm8874(input);
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

    const printable = lines.rows.filter((row) =>
      fitsCdeField(
        row.investment.cde_name,
        printedCdeAddress(row.investment),
      )
    );
    const needsStatement = printable.length !== lines.rows.length ||
      lines.rows.length > 6;
    const directRows = printable.slice(0, needsStatement ? 5 : 6);
    const directInvestments = new Set(directRows.map((row) => row.investment));
    const attachedRows = lines.rows.filter((row) =>
      !directInvestments.has(row.investment)
    );
    const printed: Record<string, unknown> = { line2, line3 };
    directRows.forEach((row, index) => {
      const prefix = `row_${index + 1}_`;
      const { investment } = row;
      printed[`${prefix}cde`] = [
        investment.cde_name,
        printedCdeAddress(investment),
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
    if (needsStatement) {
      printed.row_6_cde = "See attached";
      printed.row_6_credit = attachedRows.reduce(
        (sum, row) => sum + row.creditAmount,
        0,
      );
      printed.print_overflow_rows = attachedRows.map((
        { investment, rate, creditAmount },
      ) => ({
        cdeName: investment.cde_name,
        address: printedCdeAddress(investment),
        ein: printedEin(investment.cde_ein),
        initialDate: printedDate(investment.initial_investment_date),
        investmentAmount: investment.qualified_equity_investment_amount,
        rate,
        creditAmount,
      }));
    }
    return printed;
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending?.f8874) {
      throw new Error("Form 8874 PDF needs its finalized source return");
    }
    const source = inputSchema.parse(allPending.f8874);
    const lines = calculateForm8874(source);
    // The parent checks mixed and passive allocations. This child check binds
    // the retained direct, nonpassive Form 8874 copy to its own filed document.
    if (
      lines.nonpassiveCredit === 0 ||
      lines.rows.some((row) => row.investment.subject_to_passive_activity_limit)
    ) return [fields];
    if (reconciledForm8874K1Line2({ pending: allPending }) > 0) {
      return [fields];
    }
    const claim = f3800InputSchema.parse(allPending.f3800);
    if (!prepared) {
      throw new Error("Form 8874 PDF needs the prepared Form 3800 document");
    }
    const rows = prepared.currentRows.filter((row) => row.line === "1i");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "1i");
    const details = prepared.currentDetails.filter((row) => row.line === "1i");
    const [row] = rows;
    const [amount] = amounts;
    const [detail] = details;
    if (
      JSON.stringify(fields) !==
        JSON.stringify(form8874Pdf.projectFields!(source, allPending)) ||
      fields.line2 !== 0 || fields.line3 !== lines.line1 ||
      claim.f8874_credit?.credit_amount !== lines.line1 ||
      claim.f8874_credit?.subject_to_passive_activity_limit !== false ||
      rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
      row.metadata.sourceCount !== 1 ||
      row.metadata.referenceDocumentName !== "IRS8874" ||
      !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
      amount.nonpassiveCredit !== lines.line1 ||
      amount.totalCredit !== lines.line1 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !== detail.appliedCredit ||
      detail.credit !== lines.line1 ||
      detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
      detail.passThroughEin !== undefined ||
      prepared.lines.line38 !== claim.allowed_credit
    ) {
      throw new Error(
        "Form 8874 PDF differs from prepared Form 3800 line 1i",
      );
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
  pageIndices: () => [0],
  appendSupplementalPages: appendForm8874InvestmentStatement,
};
