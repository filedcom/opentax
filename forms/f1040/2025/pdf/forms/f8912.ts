import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8912IndividualLimit,
  calculateForm8912PartIVBond,
  deriveForm8912IndividualLimitInput,
} from "../../../nodes/inputs/f8912/calculation.ts";
import {
  type F8912UnreportedBond,
  inputSchema,
  interestFromItem,
  partIVRowInput,
  sourceLinesFromInput,
} from "../../../nodes/inputs/f8912/index.ts";
import { finalizedReturnLines } from "../../mef/forms/f8912.ts";

// Form 8912 (Rev. December 2024) is the current continuous-use paper form.
// Field coordinates and row counts were checked against the IRS AcroForm.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const page3 = "topmostSubform[0].Page3[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const partILines = [
  "line1",
  "line2",
  "line3",
  "line4",
  "line5",
  "line6",
  "line7",
  "line8",
  "line9",
  "line10a",
  "line10b",
  "line10c",
  "line10d",
  "line10e",
  "line11",
  "line12",
] as const;

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...partILines.map((line, index) => text(line, `${page1}.f1_${index + 3}[0]`)),
  // Lines 5 and 6 are only for estates and trusts, outside this 1040 scope.
  text("line14", `${page2}.f2_81[0]`),
  ...Array.from(
    { length: 20 },
    (_, row) =>
      ["issuer", "issuer_ein", "unique_identifier", "credit"]
        .map((column, index) =>
          text(
            `part_iii_${row + 1}_${column}`,
            `${page2}.Table_Part3[0].Row${row + 1}[0].f2_${
              1 + row * 4 + index
            }[0]`,
          )
        ),
  ).flat(),
  text("issuer", `${page3}.f3_1[0]`),
  text("issuer_ein", `${page3}.f3_2[0]`),
  text("issue_date", `${page3}.f3_3[0]`),
  text("maturity_date", `${page3}.f3_4[0]`),
  text("disposition_date", `${page3}.f3_5[0]`),
  ...Array.from(
    { length: 18 },
    (_, row) =>
      ["description", "base", "rate", "before_limit", "percentage", "credit"]
        .map((column, index) =>
          text(
            `part_iv_${row + 1}_${column}`,
            `${page3}.Table1[0].Row${row + 1}[0].f3_${6 + row * 6 + index}[0]`,
          )
        ),
  ).flat(),
  text("line19", `${page3}.f3_114[0]`),
  text("line20", `${page3}.f3_115[0]`),
];

function printedDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function sameMoney(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

function partIVPage(
  bond: F8912UnreportedBond,
  rows: F8912UnreportedBond["line18_rows"],
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    pdf_page_kind: "part_iv",
    issuer: `${bond.issuer_name}, ${bond.issuer_city}, ${bond.issuer_state}`,
    issuer_ein: bond.issuer_ein,
    issue_date: printedDate(bond.issue_date),
    maturity_date: printedDate(bond.maturity_date),
    disposition_date: printedDate(bond.disposition_date),
  };
  let line19 = 0;
  let line20 = 0;
  rows.forEach((row, index) => {
    const source = partIVRowInput(bond, row);
    const amounts = calculateForm8912PartIVBond(source);
    const prefix = `part_iv_${index + 1}_`;
    const paymentDate = printedDate(
      row.principal_payment_date ?? row.interest_payment_date,
    );
    fields[`${prefix}description`] = [row.cusip, paymentDate].filter(Boolean)
      .join("\n");
    fields[`${prefix}base`] = source.creditBaseAmount;
    fields[`${prefix}rate`] = `${(row.credit_rate * 100).toFixed(2)}%`;
    fields[`${prefix}before_limit`] = amounts.line18d;
    fields[`${prefix}percentage`] = `${
      (source.creditAllowancePercentage * 100).toFixed(2)
    }%`;
    fields[`${prefix}credit`] = amounts.line18f;
    line19 += amounts.line18f;
    line20 += amounts.line20;
  });
  fields.line19 = line19;
  fields.line20 = line20;
  return fields;
}

export const form8912Pdf: PdfFormDescriptor = {
  pendingKey: "f8912",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8912--2024.pdf",
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: `${page1}.f1_1[0]`,
      extraPdfFields: [`${page2}.f1_1[0]`, `${page3}.f1_1[0]`],
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: `${page1}.f1_2[0]`,
      extraPdfFields: [`${page2}.f1_2[0]`, `${page3}.f1_2[0]`],
    },
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8912s) || fields.f8912s.length === 0) return {};
    const input = inputSchema.parse(fields);
    const source = sourceLinesFromInput(input);
    if (source.line4 <= 0) return {};
    input.f8912s.forEach(interestFromItem);
    if (source.hasPassThroughCrebCredit) {
      throw new Error(
        "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
      );
    }
    const finalized = finalizedReturnLines({ pending: allPending }, source);
    const limit = calculateForm8912IndividualLimit(
      deriveForm8912IndividualLimitInput(source, finalized),
    );
    if (
      !sameMoney(limit.line12, finalized.schedule3Line6k) ||
      !sameMoney(Number(fields.allowed_credit), limit.line12) ||
      !sameMoney(Number(fields.unused_credit), source.line4 - limit.line12)
    ) {
      throw new Error("Form 8912 PDF does not reconcile to finalized return");
    }
    return { ...fields, ...source, ...limit };
  },
  instances(fields) {
    if (typeof fields.line4 !== "number" || fields.line4 <= 0) return [];
    const input = inputSchema.parse(fields);
    const reported = input.f8912s.flatMap((item) => item.reported_bonds);
    const unreported = input.f8912s.flatMap((item) => item.unreported_bonds);
    const pages: Record<string, unknown>[] = [{
      pdf_page_kind: "main",
      ...Object.fromEntries(partILines.map((line) => [line, fields[line]])),
    }];
    for (let start = 0; start < reported.length; start += 20) {
      const bonds = reported.slice(start, start + 20);
      const page: Record<string, unknown> = {
        pdf_page_kind: "part_iii",
        line14: bonds.reduce((sum, bond) => sum + bond.credit_amount, 0),
      };
      bonds.forEach((bond, index) => {
        const prefix = `part_iii_${index + 1}_`;
        page[`${prefix}issuer`] = bond.issuer_name;
        page[`${prefix}issuer_ein`] = bond.issuer_ein;
        page[`${prefix}unique_identifier`] = bond.unique_identifier;
        page[`${prefix}credit`] = bond.credit_amount;
      });
      pages.push(page);
    }
    for (const bond of unreported) {
      for (let start = 0; start < bond.line18_rows.length; start += 18) {
        pages.push(partIVPage(bond, bond.line18_rows.slice(start, start + 18)));
      }
    }
    return pages;
  },
  pageIndices(fields) {
    switch (fields.pdf_page_kind) {
      case "main":
        return [0];
      case "part_iii":
        return [1];
      case "part_iv":
        return [2];
      default:
        throw new Error("Unknown Form 8912 PDF page kind");
    }
  },
};
