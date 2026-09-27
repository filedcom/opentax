import { PDFDocument, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import {
  allForm4136Claims,
  calculateForm4136,
  form4136BlenderCertification,
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
  "5a": "417",
  "5b": "355",
  "5c": "346",
  "5d": "369",
  "5e": "433",
  "6a": "360",
  "6b": "350",
  "7a": "346",
  "7b": "346",
  "7c": "347",
  "8a": "355",
  "8b": "417",
  "8c": "418",
  "8d": "346",
  "8e": "369",
  "8f": "433",
  "11a": "419",
  "11b": "420",
  "11c": "421",
  "11d": "422",
  "11e": "423",
  "11f": "424",
  "11g": "425",
  "11h": "435",
  "13a": "360",
  "13b": "346",
  "13c": "369",
  "14a": "309",
  "14b": "306",
  "15a": "310",
  "16a": "415",
  "16b": "416",
};
const page = (number: number) => `topmostSubform[0].Page${number}[0]`;
function fieldPath(p: number, n: number): string {
  if (
    p === 1 && n <= 9 || p === 2 && (n === 84 || n === 99) ||
    p === 3 && n === 1 ||
    p === 4 && (n === 64 || n === 102 || n === 124 || n === 125)
  ) {
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
    } else if (n >= 44 && n <= 83) {
      table = "Table_Line5";
      line = n <= 51
        ? "Line5a"
        : n <= 59
        ? "Line5b"
        : n <= 67
        ? "Line5c"
        : n <= 75
        ? "Line5d"
        : "Line5e";
      column = n >= 47 && n <= 48 || n >= 55 && n <= 56 ||
          n >= 63 && n <= 64 || n >= 71 && n <= 72 ||
          n >= 79 && n <= 80
        ? "ColD"
        : n >= 49 && n <= 50 || n >= 57 && n <= 58 ||
            n >= 65 && n <= 66 || n >= 73 && n <= 74 ||
            n >= 81 && n <= 82
        ? "ColE"
        : "";
    } else if (n >= 85 && n <= 98) {
      table = "Table_Line6";
      line = n <= 91 ? "Line6a" : "Line6b";
      column = n >= 87 && n <= 88 || n >= 94 && n <= 95
        ? "ColD"
        : n >= 89 && n <= 90 || n >= 96 && n <= 97
        ? "ColE"
        : "";
    } else if (n >= 100 && n <= 115) {
      table = "Table_Line7";
      line = n <= 101 ? "Line7a" : n <= 108 ? "Line7b" : "Line7c";
      column = n >= 104 && n <= 105 || n >= 111 && n <= 112
        ? "ColD"
        : n >= 106 && n <= 107 || n >= 113 && n <= 114
        ? "ColE"
        : "";
    }
  } else if (p === 3 && n >= 2 && n <= 49) {
    table = "Table_Line8";
    const index = Math.floor((n - 2) / 8);
    line = `Line8${String.fromCharCode(97 + index)}`;
    const offset = (n - 2) % 8;
    column = offset === 3 || offset === 4
      ? "ColD"
      : offset === 5 || offset === 6
      ? "ColE"
      : "";
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
  } else if (p === 4 && n >= 65 && n <= 85) {
    table = "Table_Line13";
    const index = Math.floor((n - 65) / 7);
    line = `Line13${String.fromCharCode(97 + index)}`;
    const offset = (n - 65) % 7;
    column = offset === 2 || offset === 3
      ? "ColD"
      : offset === 4 || offset === 5
      ? "ColE"
      : "";
  } else if (p === 4 && n >= 86 && n <= 101) {
    table = "Table_Line14";
    line = n <= 93 ? "Line14a" : "Line14b";
    column = n >= 89 && n <= 90 || n >= 97 && n <= 98
      ? "ColD"
      : n >= 91 && n <= 92 || n >= 99 && n <= 100
      ? "ColE"
      : "";
  } else if (p === 4 && n >= 103 && n <= 109) {
    table = "Table_Line15";
    line = "Line15a";
    column = n >= 105 && n <= 106 ? "ColD" : n >= 107 && n <= 108 ? "ColE" : "";
  } else if (p === 4 && n >= 110 && n <= 123) {
    table = "Table_Line16";
    line = n <= 116 ? "Line16a" : "Line16b";
    column = n >= 112 && n <= 113 || n >= 119 && n <= 120
      ? "ColD"
      : n >= 114 && n <= 115 || n >= 121 && n <= 122
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
  text("line5a_quantity", 2, 46),
  ...moneyFields("line5a_cost", 2, 47),
  ...moneyFields("line5a_credit", 2, 49),
  text("line5b_quantity", 2, 54),
  ...moneyFields("line5b_cost", 2, 55),
  ...moneyFields("line5b_credit", 2, 57),
  text("line5c_type", 2, 60),
  text("line5c_quantity", 2, 62),
  ...moneyFields("line5c_cost", 2, 63),
  ...moneyFields("line5c_credit", 2, 65),
  text("line5d_type", 2, 68),
  text("line5d_quantity", 2, 70),
  ...moneyFields("line5d_cost", 2, 71),
  ...moneyFields("line5d_credit", 2, 73),
  text("line5e_quantity", 2, 78),
  ...moneyFields("line5e_cost", 2, 79),
  ...moneyFields("line5e_credit", 2, 81),
  text("line6_registration_number", 2, 84),
  text("line6a_quantity", 2, 86),
  ...moneyFields("line6a_cost", 2, 87),
  ...moneyFields("line6a_credit", 2, 89),
  text("line6b_quantity", 2, 93),
  ...moneyFields("line6b_cost", 2, 94),
  ...moneyFields("line6b_credit", 2, 96),
  text("line7_registration_number", 2, 99),
  text("line7a_quantity", 2, 101),
  text("line7b_quantity", 2, 103),
  ...moneyFields("line7_cost", 2, 104),
  ...moneyFields("line7_credit", 2, 106),
  text("line7c_quantity", 2, 110),
  ...moneyFields("line7c_cost", 2, 111),
  ...moneyFields("line7c_credit", 2, 113),
  text("line8_registration_number", 3, 1),
  text("line8a_quantity", 3, 4),
  ...moneyFields("line8a_cost", 3, 5),
  ...moneyFields("line8a_credit", 3, 7),
  text("line8b_quantity", 3, 12),
  ...moneyFields("line8b_cost", 3, 13),
  ...moneyFields("line8b_credit", 3, 15),
  text("line8c_quantity", 3, 20),
  ...moneyFields("line8c_cost", 3, 21),
  ...moneyFields("line8c_credit", 3, 23),
  text("line8d_type", 3, 26),
  text("line8d_quantity", 3, 28),
  ...moneyFields("line8d_cost", 3, 29),
  ...moneyFields("line8d_credit", 3, 31),
  text("line8e_type", 3, 34),
  text("line8e_quantity", 3, 36),
  ...moneyFields("line8e_cost", 3, 37),
  ...moneyFields("line8e_credit", 3, 39),
  text("line8f_quantity", 3, 44),
  ...moneyFields("line8f_cost", 3, 45),
  ...moneyFields("line8f_credit", 3, 47),
  ...alternativeFuelLines.flatMap((line, index) => {
    const base = 79 + index * 8;
    return [
      text(`line${line}_type`, 3, base),
      text(`line${line}_quantity`, 3, base + 2),
      ...moneyFields(`line${line}_cost`, 3, base + 3),
      ...moneyFields(`line${line}_credit`, 3, base + 5),
    ];
  }),
  text("line13_registration_number", 4, 64),
  text("line13a_quantity", 4, 66),
  ...moneyFields("line13a_cost", 4, 67),
  ...moneyFields("line13a_credit", 4, 69),
  text("line13b_quantity", 4, 73),
  ...moneyFields("line13b_cost", 4, 74),
  ...moneyFields("line13b_credit", 4, 76),
  text("line13c_quantity", 4, 80),
  ...moneyFields("line13c_cost", 4, 81),
  ...moneyFields("line13c_credit", 4, 83),
  text("line14a_type", 4, 86),
  text("line14a_quantity", 4, 88),
  ...moneyFields("line14a_cost", 4, 89),
  ...moneyFields("line14a_credit", 4, 91),
  text("line14b_quantity", 4, 96),
  ...moneyFields("line14b_cost", 4, 97),
  ...moneyFields("line14b_credit", 4, 99),
  text("line15_registration_number", 4, 102),
  text("line15a_quantity", 4, 104),
  ...moneyFields("line15a_cost", 4, 105),
  ...moneyFields("line15a_credit", 4, 107),
  text("line16a_quantity", 4, 111),
  ...moneyFields("line16a_cost", 4, 112),
  ...moneyFields("line16a_credit", 4, 114),
  text("line16b_quantity", 4, 118),
  ...moneyFields("line16b_cost", 4, 119),
  ...moneyFields("line16b_credit", 4, 121),
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

async function decorateConditionalRates(
  document: PDFDocument,
  pages: readonly PDFPage[],
  fields: Record<string, unknown>,
): Promise<void> {
  const input = inputSchema.parse(fields);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = pages[2];
  if (!page) throw new Error("Form 4136 rates require page 3");
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
  const emulsionClaims = allForm4136Claims(input).filter((claim) =>
    claim.line === "14a"
  );
  if (emulsionClaims.some((claim) => claim.type_of_use === "05")) {
    const page4 = pages[3];
    if (!page4) throw new Error("Form 4136 bus rates require page 4");
    page4.drawRectangle({
      x: 292,
      y: 324,
      width: 23,
      height: 11,
      color: rgb(1, 1, 1),
    });
    if (emulsionClaims.length === 1) {
      page4.drawText(".124", { x: 293.5, y: 327, size: 8, font });
      page4.drawText("Bus", { x: 260, y: 327, size: 8, font });
    }
  }
  if (
    allForm4136Claims(input).some((claim) =>
      claim.line === "13c" && claim.excise_tax_rate_per_gallon === 0.244
    )
  ) {
    const page4 = pages[3];
    if (!page4) throw new Error("Form 4136 line 13c needs page 4");
    page4.drawRectangle({
      x: 188.7,
      y: 408.3,
      width: 21,
      height: 11,
      color: rgb(1, 1, 1),
    });
    page4.drawRectangle({
      x: 297.8,
      y: 408.8,
      width: 17,
      height: 10.5,
      color: rgb(1, 1, 1),
    });
    page4.drawText("$.244", { x: 189.3, y: 410.2, size: 8, font });
    page4.drawText(".243", { x: 298.5, y: 410.5, size: 8, font });
    page4.drawText("Taxed at $.244", {
      x: 225,
      y: 410.5,
      size: 7,
      font,
    });
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
    if (overflow.some((claim) => claim.line === "16a")) {
      page.drawText(
        "Use: dyedDs=dyed diesel; gasBl=gasoline blendstock",
        { x: 36, y: 714, size: 8, font },
      );
    }
    overflow.slice(offset, offset + rowsPerPage).forEach((claim, index) => {
      const useLabel = claim.exported_fuel_kind === "dyed_diesel"
        ? "dyedDs"
        : claim.exported_fuel_kind === "gasoline_blendstock"
        ? "gasBl"
        : claim.exported_fuel_kind === "dyed_kerosene"
        ? "dyedKr"
        : claim.type_of_use === "05"
        ? "05 Bus"
        : claim.type_of_use ?? "fixed";
      const row = [
        claim.line.padEnd(5),
        useLabel.padEnd(7),
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
  for (const [line, fuel] of [["6a", "diesel"], ["7a", "kerosene"]] as const) {
    const governmentSales = allForm4136Claims(input)
      .filter((claim) => claim.line === line)
      .flatMap((claim) => claim.government_sales ?? []);
    if (!governmentSales.length) continue;
    const buyers = new Map<string, {
      name: string;
      ein: string;
      gallons: number;
    }>();
    for (const sale of governmentSales) {
      const key = `${sale.buyer_ein}:${sale.buyer_name}`;
      const prior = buyers.get(key);
      buyers.set(key, {
        name: sale.buyer_name,
        ein: sale.buyer_ein,
        gallons: (prior?.gallons ?? 0) + sale.gallons,
      });
    }
    const buyerRows = [...buyers.values()];
    for (let offset = 0; offset < buyerRows.length; offset += 32) {
      const page = document.addPage([612, 792]);
      page.drawText(`2025 Form 4136 line ${line} - Government ${fuel} buyers`, {
        x: 36,
        y: 750,
        size: 12,
        font: bold,
      });
      page.drawText(
        `Name: ${filer?.nameLine1 ?? ""}    SSN: ${filer?.primarySSN ?? ""}`,
        { x: 36, y: 730, size: 9, font },
      );
      page.drawText("Government unit name", {
        x: 36,
        y: 699,
        size: 9,
        font: bold,
      });
      page.drawText("EIN", { x: 430, y: 699, size: 9, font: bold });
      page.drawText("Gallons", { x: 510, y: 699, size: 9, font: bold });
      buyerRows.slice(offset, offset + 32).forEach((buyer, index) => {
        const y = 680 - index * 18;
        page.drawText(buyer.name, { x: 36, y, size: 8, font });
        page.drawText(buyer.ein, { x: 430, y, size: 8, font });
        page.drawText(String(buyer.gallons), { x: 510, y, size: 8, font });
      });
    }
  }
  const blenderClaims = allForm4136Claims(input).filter((claim) =>
    claim.line === "15a"
  );
  for (const claim of blenderClaims) {
    const page = document.addPage([612, 792]);
    page.drawText("2025 Form 4136 line 15a - Blender certification", {
      x: 36,
      y: 750,
      size: 12,
      font: bold,
    });
    page.drawText(
      `Name: ${filer?.nameLine1 ?? ""}    SSN: ${filer?.primarySSN ?? ""}`,
      { x: 36, y: 730, size: 9, font },
    );
    const explanation = form4136BlenderCertification(claim);
    const maxWidth = 540;
    const lines: string[] = [];
    let line = "";
    for (const word of explanation.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 9) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, 9) > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    lines.forEach((value, index) => {
      page.drawText(value, {
        x: 36,
        y: 690 - index * 16,
        size: 9,
        font,
      });
    });
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
      "5a",
      "5b",
      "5c",
      "5d",
      "5e",
      "6a",
      "6b",
      "7a",
      "7b",
      "7c",
      "8a",
      "8b",
      "8c",
      "8d",
      "8e",
      "8f",
      "13a",
      "13b",
      "13c",
      "14a",
      "14b",
      "15a",
      "16a",
      "16b",
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
  for (
    const line of [
      "5a",
      "5b",
      "5c",
      "5d",
      "5e",
      ...alternativeFuelLines,
    ] as const
  ) {
    putClaimGroup(out, input, [line], `line${line}`);
  }
  putClaimGroup(out, input, ["6a"], "line6a");
  putClaimGroup(out, input, ["6b"], "line6b");
  putClaimGroup(out, input, ["7a", "7b"], "line7");
  putClaimGroup(out, input, ["7c"], "line7c");
  putClaimGroup(out, input, ["8a"], "line8a");
  putClaimGroup(out, input, ["8b"], "line8b");
  putClaimGroup(out, input, ["8c"], "line8c");
  putClaimGroup(out, input, ["8d"], "line8d");
  putClaimGroup(out, input, ["8e"], "line8e");
  putClaimGroup(out, input, ["8f"], "line8f");
  putClaimGroup(out, input, ["13a"], "line13a");
  putClaimGroup(out, input, ["13b"], "line13b");
  putClaimGroup(out, input, ["13c"], "line13c");
  putClaimGroup(out, input, ["14a"], "line14a");
  putClaimGroup(out, input, ["14b"], "line14b");
  putClaimGroup(out, input, ["15a"], "line15a");
  putClaimGroup(out, input, ["16a"], "line16a");
  putClaimGroup(out, input, ["16b"], "line16b");
  out.line6_registration_number = allForm4136Claims(input).find((claim) =>
    claim.line === "6a" || claim.line === "6b"
  )?.vendor_registration_number;
  out.line7_registration_number = allForm4136Claims(input).find((claim) =>
    claim.line === "7a" || claim.line === "7b" || claim.line === "7c"
  )?.vendor_registration_number;
  out.line8_registration_number = allForm4136Claims(input).find((claim) =>
    ["8a", "8b", "8c", "8d", "8e", "8f"].includes(claim.line)
  )?.vendor_registration_number;
  out.line13_registration_number = allForm4136Claims(input).find((claim) =>
    claim.line === "13a" || claim.line === "13b" || claim.line === "13c"
  )?.credit_card_issuer_registration_number;
  out.line15_registration_number = allForm4136Claims(input).find((claim) =>
    claim.line === "15a"
  )?.blender_registration_number;
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
  decoratePages: decorateConditionalRates,
  appendSupplementalPages: appendClaimStatement,
};
