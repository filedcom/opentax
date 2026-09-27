import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import {
  calculateForm4136,
  FORM4136_RATES,
  type Form4136Input,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

type Claim = Form4136Input["claims"][number];
type Line = Claim["line"];
const alternativeFuelLines = [
  "11a",
  "11b",
  "11c",
  "11d",
  "11e",
  "11f",
  "11g",
  "11h",
] as const;
const creditReferenceNumber: Record<Line, string> = {
  "1a": "362",
  "1b": "362",
  "2b": "324",
  "3a": "360",
  "3b": "360",
  "4a": "346",
  "4b": "346",
  "5c": "346",
  "5d": "369",
  "11a": "419",
  "11b": "420",
  "11c": "421",
  "11d": "422",
  "11e": "423",
  "11f": "424",
  "11g": "425",
  "11h": "435",
};
const page = (number: number) => `topmostSubform[0].Page${number}[0]`;
const text = (key: string, p: number, n: number): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page(p)}.f${p}_${n}[0]`,
});

// The source PDF has separate dollars/cents widgets for column (d), column
// (e), and line 17. These are actual AcroForm widgets, not inferred line tags.
const moneyFields = (
  key: string,
  p: number,
  dollars: number,
): PdfFieldEntry[] => [
  text(`${key}_dollars`, p, dollars),
  text(`${key}_cents`, p, dollars + 1),
];

const fields: PdfFieldEntry[] = [
  {
    kind: "checkbox",
    domainKey: "qualified_yes",
    pdfField: `${page(1)}.c1_1[0]`,
  },
  text("activity_count", 1, 3),
  text("business_name", 1, 4),
  text("business_ein", 1, 5),
  text("principal_activity_code", 1, 6),
  text("equipment_make", 1, 7),
  text("equipment_model", 1, 8),
  text("equipment_type", 1, 9),
  text("line1a_quantity", 1, 12),
  text("line1b_quantity", 1, 15),
  ...moneyFields("line1_cost", 1, 20),
  ...moneyFields("line1_credit", 1, 22),
  text("line2b_type", 1, 40),
  text("line2b_quantity", 1, 42),
  ...moneyFields("line2b_cost", 1, 43),
  ...moneyFields("line2b_credit", 1, 45),
  text("line3a_type", 1, 64),
  text("line3a_quantity", 1, 66),
  text("line3b_quantity", 1, 69),
  ...moneyFields("line3_cost", 1, 70),
  ...moneyFields("line3_credit", 1, 72),
  text("line4a_type", 2, 1),
  text("line4a_quantity", 2, 3),
  text("line4b_quantity", 2, 6),
  ...moneyFields("line4_cost", 2, 7),
  ...moneyFields("line4_credit", 2, 9),
  text("line5c_type", 2, 60),
  text("line5c_quantity", 2, 62),
  ...moneyFields("line5c_cost", 2, 63),
  ...moneyFields("line5c_credit", 2, 65),
  text("line5d_type", 2, 68),
  text("line5d_quantity", 2, 70),
  ...moneyFields("line5d_cost", 2, 71),
  ...moneyFields("line5d_credit", 2, 73),
  ...alternativeFuelLines.flatMap((line, index) => {
    const base = 79 + index * 8;
    return [
      text(`line${line}_type`, 3, base),
      text(`line${line}_quantity`, 3, base + 2),
      ...moneyFields(`line${line}_cost`, 3, base + 3),
      ...moneyFields(`line${line}_credit`, 3, base + 5),
    ];
  }),
  ...moneyFields("line17_total", 4, 124),
];

function putMoney(
  out: Record<string, unknown>,
  key: string,
  amount: number,
): void {
  const cents = Math.round(amount * 100);
  out[`${key}_dollars`] = String(Math.floor(cents / 100));
  out[`${key}_cents`] = String(cents % 100).padStart(2, "0");
}

function putClaimGroup(
  out: Record<string, unknown>,
  input: Form4136Input,
  lines: readonly Line[],
  key: string,
): void {
  const claims = input.claims.filter((claim) => lines.includes(claim.line));
  if (!claims.length) return;
  const total = (pick: (claim: Claim) => number) =>
    claims.reduce((sum, claim) => sum + pick(claim), 0);
  putMoney(out, `${key}_cost`, total((claim) => claim.actual_fuel_cost));
  putMoney(
    out,
    `${key}_credit`,
    total((claim) => claim.qualified_quantity * FORM4136_RATES[claim.line]),
  );
}

function putLine(
  out: Record<string, unknown>,
  input: Form4136Input,
  line: Line,
): void {
  const claims = input.claims.filter((claim) => claim.line === line);
  if (!claims.length) return;
  out[`line${line}_quantity`] = claims.reduce(
    (sum, claim) => sum + claim.qualified_quantity,
    0,
  );
  if (claims[0].type_of_use) {
    out[`line${line}_type`] = claims.length === 1
      ? claims[0].type_of_use
      : "SEE STMT";
  }
}

async function appendClaimStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const input = inputSchema.parse(fields);
  const grouped = new Map<Line, Claim[]>();
  input.claims.forEach((claim) => {
    const row = grouped.get(claim.line) ?? [];
    row.push(claim);
    grouped.set(claim.line, row);
  });
  const overflow = [...grouped.values()].filter((rows) => rows.length > 1)
    .flat();
  if (!overflow.length) return;
  const font = await document.embedFont(StandardFonts.Courier);
  const bold = await document.embedFont(StandardFonts.CourierBold);
  const rowsPerPage = 32;
  for (let offset = 0; offset < overflow.length; offset += rowsPerPage) {
    const page = document.addPage([612, 792]);
    page.drawText("2025 Form 4136 - Additional Part II Claim Detail", {
      x: 36,
      y: 750,
      size: 12,
      font: bold,
    });
    page.drawText(
      `Name: ${filer?.nameLine1 ?? ""}    SSN: ${filer?.primarySSN ?? ""}`,
      {
        x: 36,
        y: 730,
        size: 9,
        font,
      },
    );
    page.drawText(
      "Line  Use   Rate   Quantity Unit      Fuel cost   Credit   CRN",
      {
        x: 36,
        y: 698,
        size: 9,
        font: bold,
      },
    );
    overflow.slice(offset, offset + rowsPerPage).forEach((claim, index) => {
      const row = [
        claim.line.padEnd(5),
        (claim.type_of_use ?? "fixed").padEnd(5),
        FORM4136_RATES[claim.line].toFixed(3).padStart(5),
        String(claim.qualified_quantity).padStart(9),
        claim.unit.padEnd(7),
        claim.actual_fuel_cost.toFixed(2).padStart(12),
        (claim.qualified_quantity * FORM4136_RATES[claim.line]).toFixed(2)
          .padStart(8),
        creditReferenceNumber[claim.line],
      ].join(" ");
      page.drawText(row, { x: 36, y: 678 - index * 18, size: 8, font });
    });
    page.drawText(
      "Totals for each line are included on Form 4136; line 17 includes all claims.",
      {
        x: 36,
        y: 60,
        size: 8,
        font,
      },
    );
  }
}

export const form4136Pdf: PdfFormDescriptor = {
  pendingKey: "f4136",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4136--2025.pdf",
  fields,
  filerFields: [
    text("nameLine1", 1, 1),
    text("primarySSN", 1, 2),
  ],
  projectFields(raw, allPending) {
    if (!Array.isArray(raw.claims) || !raw.claims.length) return {};
    const input = inputSchema.parse(raw);
    const total = calculateForm4136(input);
    const schedule3 = z.object({
      line12_fuel_tax_credit: z.number().finite().nonnegative(),
    }).parse(allPending.schedule3);
    if (
      Math.round(total * 100) !==
        Math.round(schedule3.line12_fuel_tax_credit * 100)
    ) {
      throw new Error("Form 4136 PDF does not match Schedule 3 line 12");
    }
    const out: Record<string, unknown> = {
      ...input,
      ...input.business,
      qualified_yes: true,
    };
    for (
      const line of [
        "1a",
        "1b",
        "2b",
        "3a",
        "3b",
        "4a",
        "4b",
        "5c",
        "5d",
        ...alternativeFuelLines,
      ] as const
    ) {
      putLine(out, input, line);
    }
    putClaimGroup(out, input, ["1a", "1b"], "line1");
    putClaimGroup(out, input, ["2b"], "line2b");
    putClaimGroup(out, input, ["3a", "3b"], "line3");
    putClaimGroup(out, input, ["4a", "4b"], "line4");
    for (const line of ["5c", "5d", ...alternativeFuelLines] as const) {
      putClaimGroup(out, input, [line], `line${line}`);
    }
    putMoney(out, "line17_total", total);
    return out;
  },
  appendSupplementalPages: appendClaimStatement,
};
