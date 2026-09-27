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
  if (p === 1 && n <= 8 || p === 4 && (n === 39 || n === 40)) {
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
  } else if (p === 2 && n >= 17 && n <= 32) {
    table = "Line5Table";
    line = n <= 24 ? "Line5c" : "Line5d";
    column = n >= 20 && n <= 21 || n >= 28 && n <= 29
      ? "ColD"
      : n >= 22 && n <= 23 || n >= 30 && n <= 31
      ? "ColE"
      : "";
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
  ...line11.flatMap((line, index) => {
    const base = 29 + index * 8;
    return [
      text(`line${line}_type`, 3, base),
      text(`line${line}_quantity`, 3, base + 2),
      ...money(`line${line}_cost`, 3, base + 3),
      ...money(`line${line}_credit`, 3, base + 5),
    ];
  }),
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
    if (!input.claims.some((claim) => claim.type_of_use === "05")) return;
    const page3 = pages[2];
    if (!page3) {
      throw new Error("Schedule A (Form 4136) needs page 3 for bus rates");
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
  },
  appendSupplementalPages: form4136Pdf.appendSupplementalPages,
};

export function form4136ScheduleAFileName(index: number): string {
  return `Form4136ScheduleA${index + 1}.pdf`;
}
