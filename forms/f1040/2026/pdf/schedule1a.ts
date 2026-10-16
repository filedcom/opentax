import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { loadPinnedDraft2026 } from "./source.ts";
import {
  calculateSchedule1A2026,
  type Schedule1A2026Input,
} from "../nodes/schedule1a.ts";

const sourcePath = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s1a.pdf",
  import.meta.url,
);
const sourceHash =
  "e22aec7feb2f5b734e16ee74d70acfdfdc0d66a5292f69cf0ced3b87543d95ac";
const prefix = (page: number) => `form1[0].Page${page}[0].`;
const fieldName = (page: number, field: number) =>
  `${prefix(page)}f${page}_${String(field).padStart(2, "0")}[0]`;

/** Static draft attachment; recalculates the internal source input before printing. */
export async function buildSchedule1APdfBytes2026(
  raw: Schedule1A2026Input,
  f1040: { line13a_schedule1a: number },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const calculation = calculateSchedule1A2026(raw);
  const lines = calculation.lines;
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== raw.taxpayer_ssn.replaceAll("-", "")
  ) {
    throw new Error("Schedule 1-A PDF requires matching filer identity");
  }
  if (f1040.line13a_schedule1a !== lines.line44) {
    throw new Error("Schedule 1-A PDF total disagrees with Form 1040 line 13a");
  }
  const bytes = await loadPinnedDraft2026(
    sourcePath,
    "https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf",
    sourceHash,
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (name: string, value: string | number) => {
    const field = form.getTextField(name);
    const text = String(value);
    const rectangle = field.acroField.getWidgets()[0].getRectangle();
    const size = Math.min(
      9,
      rectangle.height - 2,
      9 * (rectangle.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule 1-A PDF text exceeds its printable field");
    }
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  const amounts = (
    page: number,
    mapping: readonly (readonly [number, number])[],
  ) => {
    for (const [field, value] of mapping) fill(fieldName(page, field), value);
  };
  fill(fieldName(1, 1), filer.name);
  fill(fieldName(1, 2), filer.ssn);
  amounts(1, [
    [3, lines.line1],
    [4, lines.line2a],
    [5, lines.line2b],
    [6, lines.line2c],
    [7, lines.line2d],
    [8, lines.line2e],
    [9, lines.line3],
  ]);
  for (const [i, row] of calculation.employee_rows.slice(0, 5).entries()) {
    const base = 10 + i * 5;
    const rowPrefix = `${prefix(1)}Table_Line4[0].Row4${"abcde"[i]}[0].`;
    [
      row.employer_name,
      row.employer_ein,
      row.qualified_w2_tips,
      row.form4137_tips,
      row.line4_tips,
    ]
      .forEach((value, column) =>
        fill(`${rowPrefix}f1_${base + column}[0]`, value)
      );
  }
  if (calculation.employee_rows.length) {
    amounts(1, [
      [35, lines.line5],
      [101, lines.line7],
      [102, lines.line8],
      [103, lines.line9],
      [104, lines.line10],
      [105, lines.line11],
      [106, lines.line12],
      [107, lines.line13],
      [108, lines.line14],
      [109, lines.line15],
    ]);
  }
  for (const [i, row] of calculation.overtime_rows.slice(0, 5).entries()) {
    const base = 1 + i * 3;
    const rowPrefix = `${prefix(2)}Table_Line16[0].Row16${"abcde"[i]}[0].`;
    [row.employer_name, row.employer_ein, row.line16_overtime].forEach((
      value,
      column,
    ) =>
      fill(`${rowPrefix}f2_${String(base + column).padStart(2, "0")}[0]`, value)
    );
  }
  if (calculation.overtime_rows.length) {
    amounts(2, [
      [16, lines.line17],
      [37, lines.line19],
      [38, lines.line20],
      [39, lines.line21],
      [40, lines.line22],
      [41, lines.line23],
      [42, lines.line24],
      [43, lines.line25],
      [44, lines.line26],
      [45, lines.line27],
    ]);
  }
  const vehicles = calculation.vehicle_rows.filter((r) =>
    r.qualified_interest > 0
  );
  for (const [i, row] of vehicles.slice(0, 2).entries()) {
    const base = 1 + i * 3;
    const rowPrefix = `${prefix(3)}Table_Line28${"ab"[i]}[0].Line28${
      "ab"[i]
    }[0].`;
    fill(
      `${rowPrefix}VIN-${i + 1}_Comb[0].f3_${String(base).padStart(2, "0")}[0]`,
      row.vin,
    );
    fill(
      `${rowPrefix}f3_${String(base + 1).padStart(2, "0")}[0]`,
      row.line28_business_interest,
    );
    fill(
      `${rowPrefix}f3_${String(base + 2).padStart(2, "0")}[0]`,
      row.line28_schedule1a_interest,
    );
    form.getCheckBox(`${prefix(3)}c3_${i * 2 + 1}[0]`).check();
    form.getCheckBox(`${prefix(3)}c3_${i * 2 + 2}[0]`).check();
  }
  if (vehicles.length) {
    amounts(3, [
      [7, lines.line29],
      [8, lines.line30],
      [9, lines.line31],
      [10, lines.line32],
      [11, lines.line33],
      [12, lines.line34],
      [13, lines.line35],
      [14, lines.line36],
    ]);
  }
  if (
    raw.filing_status !== "mfs" &&
    ((raw.taxpayer_age_65_or_older && raw.taxpayer_has_valid_ssn) ||
      (raw.filing_status === "mfj" && raw.spouse_age_65_or_older &&
        raw.spouse_has_valid_ssn))
  ) {
    amounts(3, [
      [15, lines.line37],
      [16, lines.line38],
      [17, lines.line39],
      [18, lines.line40],
      [19, lines.line41],
      [20, lines.line42a],
      [21, lines.line42b],
      [22, lines.line43],
    ]);
  }
  fill(fieldName(3, 23), lines.line44);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  for (const page of await document.copyPages(draft, [1, 2, 3])) {
    page.node.delete(PDFName.of("Annots"));
    document.addPage(page);
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (const page of [document.getPage(1), document.getPage(2)]) {
    page.drawText("DRAFT - DO NOT FILE", {
      x: 36,
      y: 12,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 1,
    });
  }
  if (
    calculation.employee_rows.length > 5 ||
    calculation.overtime_rows.length > 5 || vehicles.length > 2
  ) {
    document.getPage(0).drawText(
      "Additional rows appear in the attached continuation sheets.",
      { x: 36, y: 18, size: 7, font: regular },
    );
  }

  const continuation = (
    title: string,
    headers: readonly string[],
    starts: readonly number[],
    rows: readonly (readonly (string | number)[])[],
    totalLabel: string,
    total: number,
  ) => {
    for (let offset = 0; offset < rows.length; offset += 28) {
      const page = document.addPage([612, 792]);
      page.drawText(`Schedule 1-A (2026) - ${title}`, {
        x: 36,
        y: 750,
        size: 11,
        font: bold,
      });
      page.drawText("DRAFT - DO NOT FILE", {
        x: 36,
        y: 732,
        size: 9,
        font: bold,
      });
      const nameSize = Math.min(
        9,
        9 * 430 / regular.widthOfTextAtSize(filer.name, 9),
      );
      if (nameSize < 6) {
        throw new Error("Schedule 1-A continuation filer name is too long");
      }
      page.drawText(filer.name, {
        x: 36,
        y: 713,
        size: nameSize,
        font: regular,
      });
      page.drawText(filer.ssn, { x: 480, y: 713, size: 9, font: regular });
      headers.forEach((h, i) =>
        page.drawText(h, { x: starts[i], y: 686, size: 8, font: bold })
      );
      rows.slice(offset, offset + 28).forEach((row, i) =>
        row.forEach((value, c) => {
          const text = String(value);
          const width = (starts[c + 1] ?? 576) - starts[c] - 8;
          const size = Math.min(
            9,
            9 * width / Math.max(1, regular.widthOfTextAtSize(text, 9)),
          );
          if (size < 6) {
            throw new Error(
              "Schedule 1-A continuation text exceeds its column",
            );
          }
          page.drawText(text, {
            x: starts[c],
            y: 666 - i * 19,
            size,
            font: regular,
          });
        })
      );
      page.drawText(`${totalLabel}: ${total}`, {
        x: 36,
        y: 75,
        size: 9,
        font: bold,
      });
      page.drawText(`Continuation ${offset / 28 + 1}`, {
        x: 480,
        y: 55,
        size: 8,
        font: regular,
      });
    }
  };
  continuation(
    "line 4 employee tips",
    ["Employer", "EIN", "W-2 TP", "4137", "Larger"],
    [36, 290, 390, 458, 520],
    calculation.employee_rows.slice(5).map((
      r,
    ) => [
      r.employer_name,
      r.employer_ein,
      r.qualified_w2_tips,
      r.form4137_tips,
      r.line4_tips,
    ]),
    "Line 5 total, all employers",
    lines.line5,
  );
  continuation(
    "line 16 overtime",
    ["Employer", "EIN", "W-2 TT"],
    [36, 380, 500],
    calculation.overtime_rows.slice(5).map((
      r,
    ) => [r.employer_name, r.employer_ein, r.line16_overtime]),
    "Line 17 total, all employers",
    lines.line17,
  );
  continuation(
    "line 28 vehicle interest",
    ["VIN", "Business", "Schedule 1-A", "Original use", "US assembly"],
    [36, 200, 280, 388, 485],
    vehicles.slice(2).map((
      r,
    ) => [
      r.vin,
      r.line28_business_interest,
      r.line28_schedule1a_interest,
      "Yes",
      "Yes",
    ]),
    "Line 29 total, all vehicles",
    lines.line29,
  );
  for (const page of document.getPages()) {
    page.node.delete(PDFName.of("Annots"));
  }
  document.catalog.delete(PDFName.of("AcroForm"));
  return document.save({ updateFieldAppearances: false });
}
