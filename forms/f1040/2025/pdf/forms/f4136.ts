import { PDFDocument, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import {
  allForm4136Claims,
  calculateForm4136,
  form4136ClaimCreditCents,
  type Form4136Input,
  inputSchema,
  rateForForm4136Claim,
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
// Top-of-page text coordinates measured on the 2025 IRS page 3. Line 11e
// wraps, so its rate sits one row lower than the regular 12-point cadence.
const alternativeFuelRateTop = [
  475.593,
  487.592,
  499.591,
  511.590,
  535.591,
  547.590,
  559.589,
  571.588,
] as const;
const creditReferenceNumber: Record<Line, string> = {
  "1a": "362",
  "1b": "362",
  "1c": "362",
  "1d": "411",
  "2a": "354",
  "2b": "324",
  "2c": "412",
  "2d": "433",
  "3a": "360",
  "3b": "360",
  "3c": "353",
  "3d": "350",
  "3e": "413",
  "4a": "346",
  "4b": "346",
  "4c": "347",
  "4d": "414",
  "4e": "377",
  "4f": "369",
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
function fieldPath(p: number, n: number): string {
  if (p === 1 && n <= 9 || p === 4 && (n === 124 || n === 125)) {
    return `${page(p)}.f${p}_${n}[0]`;
  }
  let table = "";
  let line = "";
  let column = "";
  if (p === 1) {
    if (n >= 10 && n <= 31) {
      table = "Table_Line1";
      line = n <= 12
        ? "Line1a"
        : n <= 16
        ? "Line1b"
        : n <= 23
        ? "Line1c"
        : "Line1d";
      column = n >= 20 && n <= 21 || n >= 27 && n <= 28
        ? "ColD"
        : n >= 22 && n <= 23 || n >= 29 && n <= 30
        ? "ColE"
        : "";
    } else if (n >= 32 && n <= 63) {
      table = "Table_Line2";
      line = n <= 39
        ? "Line2a"
        : n <= 47
        ? "Line2b"
        : n <= 55
        ? "Line2c"
        : "Line2d";
      column = n >= 35 && n <= 36 || n >= 43 && n <= 44 ||
          n >= 51 && n <= 52 || n >= 59 && n <= 60
        ? "ColD"
        : n >= 37 && n <= 38 || n >= 45 && n <= 46 ||
            n >= 53 && n <= 54 || n >= 61 && n <= 62
        ? "ColE"
        : "";
    } else if (n >= 64 && n <= 98) {
      table = "Table_Line3";
      line = n <= 66
        ? "Line3a"
        : n <= 74
        ? "Line3b"
        : n <= 82
        ? "Line3c"
        : n <= 90
        ? "Line3d"
        : "Line3e";
      column = n >= 70 && n <= 71 || n >= 78 && n <= 79 ||
          n >= 86 && n <= 87 || n >= 94 && n <= 95
        ? "ColD"
        : n >= 72 && n <= 73 || n >= 80 && n <= 81 ||
            n >= 88 && n <= 89 || n >= 96 && n <= 97
        ? "ColE"
        : "";
    }
  } else if (p === 2) {
    if (n >= 1 && n <= 43) {
      table = "Table_Line4";
      line = n <= 3
        ? "Line4a"
        : n <= 11
        ? "Line4b"
        : n <= 19
        ? "Line4c"
        : n <= 27
        ? "Line4d"
        : n <= 35
        ? "Line4e"
        : "Line4f";
      column = n >= 7 && n <= 8 || n >= 15 && n <= 16 ||
          n >= 23 && n <= 24 || n >= 31 && n <= 32 ||
          n >= 39 && n <= 40
        ? "ColD"
        : n >= 9 && n <= 10 || n >= 17 && n <= 18 ||
            n >= 25 && n <= 26 || n >= 33 && n <= 34 ||
            n >= 41 && n <= 42
        ? "ColE"
        : "";
    } else if (n >= 60 && n <= 75) {
      table = "Table_Line5";
      line = n <= 67 ? "Line5c" : "Line5d";
      column = n >= 63 && n <= 64 || n >= 71 && n <= 72
        ? "ColD"
        : n >= 65 && n <= 66 || n >= 73 && n <= 74
        ? "ColE"
        : "";
    }
  } else if (p === 3 && n >= 79 && n <= 142) {
    table = "Table_Line11";
    const index = Math.floor((n - 79) / 8);
    line = `Line11${String.fromCharCode(97 + index)}`;
    const offset = (n - 79) % 8;
    column = offset === 3 || offset === 4
      ? "ColD"
      : offset === 5 || offset === 6
      ? "ColE"
      : "";
  }
  if (!table || !line) {
    throw new Error(`Form 4136 field ${p}:${n} has no mapped IRS path`);
  }
  return `${page(p)}.${table}[0].${line}[0].${
    column ? `${column}[0].` : ""
  }f${p}_${n}[0]`;
}
const text = (key: string, p: number, n: number): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: fieldPath(p, n),
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
  text("line1c_type", 1, 17),
  text("line1c_quantity", 1, 19),
  ...moneyFields("line1_cost", 1, 20),
  ...moneyFields("line1_credit", 1, 22),
  text("line1d_quantity", 1, 26),
  ...moneyFields("line1d_cost", 1, 27),
  ...moneyFields("line1d_credit", 1, 29),
  text("line2a_quantity", 1, 34),
  ...moneyFields("line2a_cost", 1, 35),
  ...moneyFields("line2a_credit", 1, 37),
  text("line2b_type", 1, 40),
  text("line2b_quantity", 1, 42),
  ...moneyFields("line2b_cost", 1, 43),
  ...moneyFields("line2b_credit", 1, 45),
  text("line2c_quantity", 1, 50),
  ...moneyFields("line2c_cost", 1, 51),
  ...moneyFields("line2c_credit", 1, 53),
  text("line2d_quantity", 1, 58),
  ...moneyFields("line2d_cost", 1, 59),
  ...moneyFields("line2d_credit", 1, 61),
  text("line3a_type", 1, 64),
  text("line3a_quantity", 1, 66),
  text("line3b_quantity", 1, 69),
  ...moneyFields("line3_cost", 1, 70),
  ...moneyFields("line3_credit", 1, 72),
  text("line3c_quantity", 1, 77),
  ...moneyFields("line3c_cost", 1, 78),
  ...moneyFields("line3c_credit", 1, 80),
  text("line3d_quantity", 1, 85),
  ...moneyFields("line3d_cost", 1, 86),
  ...moneyFields("line3d_credit", 1, 88),
  text("line3e_quantity", 1, 93),
  ...moneyFields("line3e_cost", 1, 94),
  ...moneyFields("line3e_credit", 1, 96),
  text("line4a_type", 2, 1),
  text("line4a_quantity", 2, 3),
  text("line4b_quantity", 2, 6),
  ...moneyFields("line4_cost", 2, 7),
  ...moneyFields("line4_credit", 2, 9),
  text("line4c_quantity", 2, 14),
  ...moneyFields("line4c_cost", 2, 15),
  ...moneyFields("line4c_credit", 2, 17),
  text("line4d_quantity", 2, 22),
  ...moneyFields("line4d_cost", 2, 23),
  ...moneyFields("line4d_credit", 2, 25),
  text("line4e_type", 2, 28),
  text("line4e_quantity", 2, 30),
  ...moneyFields("line4e_cost", 2, 31),
  ...moneyFields("line4e_credit", 2, 33),
  text("line4f_type", 2, 36),
  text("line4f_quantity", 2, 38),
  ...moneyFields("line4f_cost", 2, 39),
  ...moneyFields("line4f_credit", 2, 41),
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
  const claims = allForm4136Claims(input).filter((claim) =>
    lines.includes(claim.line)
  );
  if (!claims.length) return;
  const total = (pick: (claim: Claim) => number) =>
    claims.reduce((sum, claim) => sum + pick(claim), 0);
  putMoney(out, `${key}_cost`, total((claim) => claim.actual_fuel_cost));
  putMoney(
    out,
    `${key}_credit`,
    total((claim) => form4136ClaimCreditCents(claim)) / 100,
  );
}

function putLine(
  out: Record<string, unknown>,
  input: Form4136Input,
  line: Line,
): void {
  const claims = allForm4136Claims(input).filter((claim) =>
    claim.line === line
  );
  if (!claims.length) return;
  out[`line${line}_quantity`] = claims.length === 1
    ? claims[0].qualified_quantity
    : "STMT";
  if (claims[0].type_of_use) {
    out[`line${line}_type`] = claims.length === 1
      ? claims[0].type_of_use
      : "STMT";
  }
}

async function decorateBusRates(
  document: PDFDocument,
  pages: readonly PDFPage[],
  fields: Record<string, unknown>,
): Promise<void> {
  const input = inputSchema.parse(fields);
  if (!allForm4136Claims(input).some((claim) => claim.type_of_use === "05")) {
    return;
  }
  const page = pages[2];
  if (!page) throw new Error("Form 4136 bus rates require page 3");
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const [index, line] of alternativeFuelLines.entries()) {
    const claims = allForm4136Claims(input).filter((claim) =>
      claim.line === line
    );
    const bus = claims.find((claim) => claim.type_of_use === "05");
    if (!bus) continue;
    const y = page.getHeight() - alternativeFuelRateTop[index] - 9.328;
    // The source field is read-only and displays the standard rate. Its
    // flattened appearance must be covered before drawing the bus rate.
    page.drawRectangle({
      x: 292,
      y: y - 0.5,
      width: 23,
      height: 10.5,
      color: rgb(1, 1, 1),
    });
    if (claims.length > 1) continue;
    const rate = rateForForm4136Claim(bus).toFixed(3);
    page.drawText(line === "11a" ? `$${rate.slice(1)}` : rate.slice(1), {
      x: 293.5,
      y: y + 1.3,
      size: 8,
      font,
    });
    page.drawText("Bus", { x: 230, y: y + 1.3, size: 8, font });
  }
}

async function appendClaimStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const input = inputSchema.parse(fields);
  const grouped = new Map<Line, Claim[]>();
  allForm4136Claims(input).forEach((claim) => {
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
      "Line  Use     Rate   Quantity Unit      Fuel cost   Credit   CRN",
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
        (claim.type_of_use === "05" ? "05 Bus" : claim.type_of_use ?? "fixed")
          .padEnd(7),
        rateForForm4136Claim(claim).toFixed(3).padStart(5),
        String(claim.qualified_quantity).padStart(9),
        claim.unit.padEnd(7),
        claim.actual_fuel_cost.toFixed(2).padStart(12),
        (form4136ClaimCreditCents(claim) / 100).toFixed(2).padStart(8),
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

export function projectForm4136Fields(
  input: Form4136Input,
): Record<string, unknown> {
  const total = calculateForm4136(input);
  const out: Record<string, unknown> = {
    ...input,
    ...(input.claimant_context === "business" ? input.business : {}),
    ...(input.claimant_context === "business"
      ? { activity_count: 1 + input.additional_activities.length }
      : {}),
    qualified_yes: true,
  };
  for (
    const line of [
      "1a",
      "1b",
      "1c",
      "1d",
      "2a",
      "2b",
      "2c",
      "2d",
      "3a",
      "3b",
      "3c",
      "3d",
      "3e",
      "4a",
      "4b",
      "4c",
      "4d",
      "4e",
      "4f",
      "5c",
      "5d",
      ...alternativeFuelLines,
    ] as const
  ) {
    putLine(out, input, line);
  }
  putClaimGroup(out, input, ["1a", "1b", "1c"], "line1");
  putClaimGroup(out, input, ["1d"], "line1d");
  for (const line of ["2a", "2b", "2c", "2d"] as const) {
    putClaimGroup(out, input, [line], `line${line}`);
  }
  putClaimGroup(out, input, ["3a", "3b"], "line3");
  for (const line of ["3c", "3d", "3e"] as const) {
    putClaimGroup(out, input, [line], `line${line}`);
  }
  putClaimGroup(out, input, ["4a", "4b"], "line4");
  for (const line of ["4c", "4d", "4e", "4f"] as const) {
    putClaimGroup(out, input, [line], `line${line}`);
  }
  for (const line of ["5c", "5d", ...alternativeFuelLines] as const) {
    putClaimGroup(out, input, [line], `line${line}`);
  }
  putMoney(out, "line17_total", total);
  return out;
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
    return projectForm4136Fields(input);
  },
  decoratePages: decorateBusRates,
  appendSupplementalPages: appendClaimStatement,
};
