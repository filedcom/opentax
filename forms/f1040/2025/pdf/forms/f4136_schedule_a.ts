import { PDFDocument, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import {
  type Form4136Input,
  inputSchema,
  rateForForm4136Claim,
} from "../../../nodes/inputs/f4136/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { form4136Pdf, projectForm4136Fields } from "./f4136.ts";

const page = (number: number) => `topmostSubform[0].Page${number}[0]`;
function fieldPath(p: number, n: number): string {
  let table = "";
  let line = "";
  let column = "";
  if (
    p === 1 && n <= 8 || p === 2 && (n === 41 || n === 56 || n === 73) ||
    p === 3 && n === 156 ||
    p === 4 && (n === 17 || n === 39 || n === 40)
  ) {
    return `${page(p)}.f${p}_${n}[0]`;
  }
  if (p === 1) {
    if (n >= 9 && n <= 22) {
      table = "Line1Table";
      line = n <= 11 ? "Line1a" : n <= 15 ? "Line1b" : "Line1c";
      column = n >= 19 && n <= 20 ? "ColD" : n >= 21 ? "ColE" : "";
    } else if (n >= 39 && n <= 46) {
      table = "Line2Table";
      line = "Line2b";
      column = n >= 42 && n <= 43 ? "ColD" : n >= 44 && n <= 45 ? "ColE" : "";
    } else if (n >= 63 && n <= 73) {
      table = "Table_Line3";
      line = n <= 65 ? "Line3a" : "Line3b";
      column = n >= 69 && n <= 70 ? "ColD" : n >= 71 && n <= 72 ? "ColE" : "";
    } else if (n >= 98 && n <= 108) {
      table = "Table_Line4";
      line = n <= 100 ? "Line4a" : "Line4b";
      column = n >= 104 && n <= 105
        ? "ColD"
        : n >= 106 && n <= 107
        ? "ColE"
        : "";
    }
  } else if (p === 2) {
    if (n >= 17 && n <= 32) {
      table = "Line5Table";
      line = n <= 24 ? "Line5c" : "Line5d";
      column = n >= 20 && n <= 21 || n >= 28 && n <= 29
        ? "ColD"
        : n >= 22 && n <= 23 || n >= 30 && n <= 31
        ? "ColE"
        : "";
    } else if (n >= 42 && n <= 55) {
      table = "Line6Table";
      line = n <= 48 ? "Line6a" : "Line6b";
      column = n >= 44 && n <= 45 || n >= 51 && n <= 52
        ? "ColD"
        : n >= 46 && n <= 47 || n >= 53 && n <= 54
        ? "ColE"
        : "";
    } else if (n >= 57 && n <= 72) {
      table = "Line7Table";
      line = n <= 58 ? "Line7a" : n <= 65 ? "Line7b" : "Line7c";
      column = n >= 61 && n <= 62 || n >= 68 && n <= 69
        ? "ColD"
        : n >= 63 && n <= 64 || n >= 70 && n <= 71
        ? "ColE"
        : "";
    } else if (n >= 74 && n <= 121) {
      table = "Line8Table";
      const index = Math.floor((n - 74) / 8);
      line = `Line8${String.fromCharCode(97 + index)}`;
      const offset = (n - 74) % 8;
      column = offset === 3 || offset === 4
        ? "ColD"
        : offset === 5 || offset === 6
        ? "ColE"
        : "";
    }
  } else if (p === 3 && n >= 29 && n <= 92) {
    table = "Line11Table";
    const index = Math.floor((n - 29) / 8);
    line = `Line11${String.fromCharCode(97 + index)}`;
    const offset = (n - 29) % 8;
    column = offset === 3 || offset === 4
      ? "ColD"
      : offset === 5 || offset === 6
      ? "ColE"
      : "";
  } else if (p === 3 && n >= 157 && n <= 177) {
    table = "Table_Line13";
    const index = Math.floor((n - 157) / 7);
    line = `Line13${String.fromCharCode(97 + index)}`;
    const offset = (n - 157) % 7;
    column = offset === 2 || offset === 3
      ? "ColD"
      : offset === 4 || offset === 5
      ? "ColE"
      : "";
  } else if (p === 4 && n >= 1 && n <= 16) {
    table = "Line14Table";
    line = n <= 8 ? "Line14a" : "Line14b";
    column = n >= 4 && n <= 5 || n >= 12 && n <= 13
      ? "ColD"
      : n >= 6 && n <= 7 || n >= 14 && n <= 15
      ? "ColE"
      : "";
  } else if (p === 4 && n >= 18 && n <= 24) {
    table = "Line15Table";
    line = "Line15a";
    column = n >= 20 && n <= 21 ? "ColD" : n >= 22 && n <= 23 ? "ColE" : "";
  } else if (p === 4 && n >= 25 && n <= 38) {
    table = "Line16Table";
    line = n <= 31 ? "Line16a" : "Line16b";
    column = n >= 27 && n <= 28 || n >= 34 && n <= 35
      ? "ColD"
      : n >= 29 && n <= 30 || n >= 36 && n <= 37
      ? "ColE"
      : "";
  }
  if (!table || !line) {
    throw new Error(
      `Schedule A (Form 4136) field ${p}:${n} has no mapped IRS path`,
    );
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
const money = (key: string, p: number, dollars: number): PdfFieldEntry[] => [
  text(`${key}_dollars`, p, dollars),
  text(`${key}_cents`, p, dollars + 1),
];
const line11 = [
  "11a",
  "11b",
  "11c",
  "11d",
  "11e",
  "11f",
  "11g",
  "11h",
] as const;
const busRateY = [534, 522, 510, 498, 474, 462, 450, 438] as const;

const fields: PdfFieldEntry[] = [
  text("business_name", 1, 3),
  text("business_ein", 1, 4),
  text("principal_activity_code", 1, 5),
  text("equipment_make", 1, 6),
  text("equipment_model", 1, 7),
  text("equipment_type", 1, 8),
  text("line1a_quantity", 1, 11),
  text("line1b_quantity", 1, 14),
  ...money("line1_cost", 1, 19),
  ...money("line1_credit", 1, 21),
  text("line2b_type", 1, 39),
  text("line2b_quantity", 1, 41),
  ...money("line2b_cost", 1, 42),
  ...money("line2b_credit", 1, 44),
  text("line3a_type", 1, 63),
  text("line3a_quantity", 1, 65),
  text("line3b_quantity", 1, 68),
  ...money("line3_cost", 1, 69),
  ...money("line3_credit", 1, 71),
  text("line4a_type", 1, 98),
  text("line4a_quantity", 1, 100),
  text("line4b_quantity", 1, 103),
  ...money("line4_cost", 1, 104),
  ...money("line4_credit", 1, 106),
  text("line5c_quantity", 2, 19),
  ...money("line5c_cost", 2, 20),
  ...money("line5c_credit", 2, 22),
  text("line5d_quantity", 2, 27),
  ...money("line5d_cost", 2, 28),
  ...money("line5d_credit", 2, 30),
  text("line6_registration_number", 2, 41),
  text("line6a_quantity", 2, 43),
  ...money("line6a_cost", 2, 44),
  ...money("line6a_credit", 2, 46),
  text("line6b_quantity", 2, 50),
  ...money("line6b_cost", 2, 51),
  ...money("line6b_credit", 2, 53),
  text("line7_registration_number", 2, 56),
  text("line7a_quantity", 2, 58),
  text("line7b_quantity", 2, 60),
  ...money("line7_cost", 2, 61),
  ...money("line7_credit", 2, 63),
  text("line7c_quantity", 2, 67),
  ...money("line7c_cost", 2, 68),
  ...money("line7c_credit", 2, 70),
  text("line8_registration_number", 2, 73),
  text("line8a_quantity", 2, 76),
  ...money("line8a_cost", 2, 77),
  ...money("line8a_credit", 2, 79),
  text("line8b_quantity", 2, 84),
  ...money("line8b_cost", 2, 85),
  ...money("line8b_credit", 2, 87),
  text("line8c_quantity", 2, 92),
  ...money("line8c_cost", 2, 93),
  ...money("line8c_credit", 2, 95),
  text("line8d_type", 2, 98),
  text("line8d_quantity", 2, 100),
  ...money("line8d_cost", 2, 101),
  ...money("line8d_credit", 2, 103),
  text("line8e_type", 2, 106),
  text("line8e_quantity", 2, 108),
  ...money("line8e_cost", 2, 109),
  ...money("line8e_credit", 2, 111),
  text("line8f_quantity", 2, 116),
  ...money("line8f_cost", 2, 117),
  ...money("line8f_credit", 2, 119),
  ...line11.flatMap((line, index) => {
    const base = 29 + index * 8;
    return [
      text(`line${line}_type`, 3, base),
      text(`line${line}_quantity`, 3, base + 2),
      ...money(`line${line}_cost`, 3, base + 3),
      ...money(`line${line}_credit`, 3, base + 5),
    ];
  }),
  text("line13_registration_number", 3, 156),
  text("line13a_quantity", 3, 158),
  ...money("line13a_cost", 3, 159),
  ...money("line13a_credit", 3, 161),
  text("line13b_quantity", 3, 165),
  ...money("line13b_cost", 3, 166),
  ...money("line13b_credit", 3, 168),
  text("line13c_quantity", 3, 172),
  ...money("line13c_cost", 3, 173),
  ...money("line13c_credit", 3, 175),
  text("line14a_type", 4, 1),
  text("line14a_quantity", 4, 3),
  ...money("line14a_cost", 4, 4),
  ...money("line14a_credit", 4, 6),
  text("line14b_quantity", 4, 11),
  ...money("line14b_cost", 4, 12),
  ...money("line14b_credit", 4, 14),
  text("line15_registration_number", 4, 17),
  text("line15a_quantity", 4, 19),
  ...money("line15a_cost", 4, 20),
  ...money("line15a_credit", 4, 22),
  text("line16a_quantity", 4, 26),
  ...money("line16a_cost", 4, 27),
  ...money("line16a_credit", 4, 29),
  text("line16b_quantity", 4, 33),
  ...money("line16b_cost", 4, 34),
  ...money("line16b_credit", 4, 36),
  ...money("line17_total", 4, 39),
];

export const form4136ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "f4136",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4136sa--2025.pdf",
  fields,
  filerFields: [text("nameLine1", 1, 1), text("primarySSN", 1, 2)],
  projectFields(raw) {
    if (!Array.isArray(raw.claims) || !raw.claims.length) return {};
    const input = inputSchema.parse(raw);
    if (input.claimant_context === "home_kerosene") return {};
    if (!input.additional_activities.length) return {};
    const activities = [
      { business: input.business, claims: input.claims },
      ...input.additional_activities,
    ];
    return {
      schedule_a_instances: activities.map((activity) =>
        projectForm4136Fields({
          ...activity,
          claimant_context: "business",
          additional_activities: [],
          primary_activity_has_most_credit: true,
        })
      ),
    };
  },
  instances(fields) {
    return Array.isArray(fields.schedule_a_instances)
      ? fields.schedule_a_instances as Record<string, unknown>[]
      : [];
  },
  async decoratePages(
    document: PDFDocument,
    pages: readonly PDFPage[],
    fields,
  ) {
    const input = inputSchema.parse(fields);
    const page3 = pages[2];
    if (!page3) {
      throw new Error("Schedule A (Form 4136) needs page 3 for rates");
    }
    const font = await document.embedFont(StandardFonts.Helvetica);
    for (const [index, line] of line11.entries()) {
      const claims = input.claims.filter((claim) => claim.line === line);
      const bus = claims.find((claim) => claim.type_of_use === "05");
      if (!bus) continue;
      const y = busRateY[index];
      page3.drawRectangle({
        x: 292,
        y: y + 1,
        width: 23,
        height: 10.5,
        color: rgb(1, 1, 1),
      });
      if (claims.length > 1) continue;
      const rate = rateForForm4136Claim(bus).toFixed(3);
      page3.drawText(line === "11a" ? `$${rate.slice(1)}` : rate.slice(1), {
        x: 293.5,
        y: y + 2.8,
        size: 8,
        font,
      });
      page3.drawText("Bus", { x: 230, y: y + 2.8, size: 8, font });
    }
    const emulsionClaims = input.claims.filter((claim) => claim.line === "14a");
    if (emulsionClaims.some((claim) => claim.type_of_use === "05")) {
      const page4 = pages[3];
      if (!page4) {
        throw new Error("Schedule A (Form 4136) needs page 4 for bus rates");
      }
      page4.drawRectangle({
        x: 292,
        y: 666,
        width: 23,
        height: 11,
        color: rgb(1, 1, 1),
      });
      if (emulsionClaims.length === 1) {
        page4.drawText(".124", { x: 293.5, y: 669, size: 8, font });
        page4.drawText("Bus", { x: 260, y: 669, size: 8, font });
      }
    }
    if (
      input.claims.some((claim) =>
        claim.line === "13c" && claim.excise_tax_rate_per_gallon === 0.244
      )
    ) {
      page3.drawRectangle({
        x: 188.7,
        y: 114.2,
        width: 21,
        height: 11,
        color: rgb(1, 1, 1),
      });
      page3.drawRectangle({
        x: 297.8,
        y: 114.7,
        width: 17,
        height: 10.5,
        color: rgb(1, 1, 1),
      });
      page3.drawText("$.244", { x: 189.3, y: 116.1, size: 8, font });
      page3.drawText(".243", { x: 298.5, y: 116.4, size: 8, font });
      page3.drawText("Taxed at $.244", {
        x: 225,
        y: 116.4,
        size: 7,
        font,
      });
    }
  },
  appendSupplementalPages: form4136Pdf.appendSupplementalPages,
};

export function form4136ScheduleAFileName(index: number): string {
  return `Form4136ScheduleA${index + 1}.pdf`;
}
