import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { z } from "zod";
import {
  calculateScheduleA2026,
  type ScheduleASource2026,
} from "../schedule-a.ts";
import {
  calculateDeductionSelection2026,
  type inputSchema as deductionSchema,
} from "../nodes/standard_deduction.ts";
import { loadPinnedDraft2026 } from "./source.ts";
export type DeductionSelectionInput2026 = z.input<typeof deductionSchema>;
export interface ScheduleADestinations2026 {
  form1040_line11b: number;
  form1040_line12e: number;
  form1040_line12f: number;
  form1040_line13a: number;
  form1040_line13b: number;
}

export function scheduleAPrintData2026(
  raw: ScheduleASource2026,
  deduction: DeductionSelectionInput2026,
  destinations: ScheduleADestinations2026,
) {
  const calculation = calculateScheduleA2026(raw);
  const selected = calculateDeductionSelection2026(deduction);
  const input = selected.source_input;
  const source = calculation.source_input;
  if (
    input.filing_status !== source.filing_status || input.agi !== source.agi ||
    input.itemized_before_overall_limit !== calculation.beforeOverallLimit ||
    input.itemized_taxes !== calculation.lines.line7 ||
    (input.charitable_contribution_base ?? input.agi) !== source.agi ||
    Math.round(input.nonitemizer_cash_contributions ?? 0) !==
      Math.round(
        calculation.cash_gifts.reduce(
          (n, gift) => n + gift.nonitemizer_eligible_amount,
          0,
        ),
      )
  ) {
    throw new Error(
      "Schedule A deduction selection disagrees with expense sources",
    );
  }
  const { resolution } = selected;
  if (resolution.selected.method !== "itemized") {
    throw new Error("This calculation does not select a Schedule A attachment");
  }
  const choice = resolution.selected;
  if (
    destinations.form1040_line11b !== source.agi ||
    destinations.form1040_line12e !== choice.line12eStandardOrItemized ||
    destinations.form1040_line12f !== choice.line12fNonitemizerCharity ||
    destinations.form1040_line13a !== choice.line13aSchedule1a ||
    destinations.form1040_line13b !== choice.line13bQbi
  ) {
    throw new Error(
      "Schedule A PDF destinations disagree with calculated sources",
    );
  }
  const sellers =
    source.mortgage_source_2026?.loans.flatMap((loan) =>
      loan.interest_statements.filter((s) =>
        s.kind === "lender_payment_statement" && s.seller_financed
      ).map((s) => ({
        name: s.lender_name,
        tin: s.lender_tin,
        address: s.seller_address!,
      }))
    ) ?? [];
  return {
    calculation,
    resolution,
    sellers,
    // The printed screening question uses the lowest status threshold, not the
    // actual status-specific §68 worksheet threshold or whether reduction > 0.
    line18WorksheetRequired:
      source.agi - choice.line13aSchedule1a - choice.line13bQbi > 384350,
    line19Election: resolution.reason === "itemization_election" &&
      !!resolution.standard &&
      choice.line12eStandardOrItemized <
        resolution.standard.line12eStandardOrItemized,
  };
}
const key = (page: number, index: number) =>
  `form1[0].Page${page}[0].${
    page === 2 && index === 1
      ? "Line11_ReadOrder[0]."
      : page === 2 && index === 7
      ? "Line17_ReadOrder[0]."
      : ""
  }f${page}_${String(index).padStart(2, "0")}[0]`;
const checkboxes = {
  sales: "form1[0].Page1[0].c1_1[0]",
  mixedMortgage: "form1[0].Page1[0].Line8_ReadOrder[0].c1_2[0]",
  gamblingBusiness: "form1[0].Page2[0].IfYou_ReadOrder[0].c1_2[0]",
  noWorksheet: "form1[0].Page2[0].c2_1[0]",
  worksheet: "form1[0].Page2[0].c2_1[1]",
  elect: "form1[0].Page2[0].Line19_ReadOrder[0].c2_2[0]",
};

/** Static component for reviewed expenses and the connected no-QBI resolver. */
export async function buildScheduleAPdfBytes2026(
  raw: ScheduleASource2026,
  deduction: DeductionSelectionInput2026,
  destinations: ScheduleADestinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const data = scheduleAPrintData2026(raw, deduction, destinations);
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !==
      data.calculation.source_input.taxpayer_ssn.replaceAll("-", "")
  ) throw new Error("Schedule A PDF needs matching filer identity");
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040sa.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040sa--dft.pdf",
    "d49acff9afc2faa178b7bf1f70d826d03c2c6def43700880f8ae5bb8bb5a0ffa",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const expected = [
    ...Array.from({ length: 22 }, (_, i) => key(1, i + 1)),
    ...Array.from({ length: 19 }, (_, i) => key(2, i + 1)),
    ...Object.values(checkboxes),
  ];
  if (
    draft.getPageCount() !== 3 || form.getFields().length !== 47 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) throw new Error("Schedule A template field inventory changed");
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fit = (text: string, width: number) => {
    const size = Math.min(
      9,
      9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule A text exceeds its printable field");
    }
    return size;
  };
  const fill = (page: number, index: number, value: string | number) => {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new Error("Schedule A PDF needs whole-dollar amounts");
    }
    const text = typeof value === "number" && value < 0
      ? `(${-value})`
      : String(value);
    const field = form.getTextField(key(page, index));
    field.setFontSize(
      fit(text, field.acroField.getWidgets()[0].getRectangle().width - 4),
    );
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  const mapping: Record<string, [number, number]> = {
    line1: [1, 3],
    line2: [1, 4],
    line3: [1, 5],
    line4: [1, 6],
    line5a: [1, 7],
    line5b: [1, 8],
    line5c: [1, 9],
    line5d: [1, 10],
    line5e: [1, 11],
    line6: [1, 13],
    line7: [1, 14],
    line8a: [1, 15],
    line8b: [1, 16],
    line8c: [1, 18],
    line8d: [1, 19],
    line8e: [1, 20],
    line9: [1, 21],
    line10: [1, 22],
    line11: [2, 1],
    line12: [2, 2],
    line13: [2, 3],
    line14: [2, 4],
    line15: [2, 5],
    line16: [2, 6],
    line17k: [2, 17],
    line17z: [2, 18],
  };
  for (const [line, value] of Object.entries(data.calculation.lines)) {
    const destination = mapping[line];
    if (!destination) {
      throw new Error(`Unmapped Schedule A calculated line: ${line}`);
    }
    if (value !== 0 || line === "line4") {
      fill(destination[0], destination[1], value);
    }
  }
  fill(2, 19, data.resolution.selected.line12eStandardOrItemized);
  if (data.calculation.source_input.tax_election === "actual_sales") {
    form.getCheckBox(checkboxes.sales).check();
  }
  form.getCheckBox(
    data.line18WorksheetRequired
      ? checkboxes.worksheet
      : checkboxes.noWorksheet,
  ).check();
  if (data.line19Election) form.getCheckBox(checkboxes.elect).check();
  // Current mortgage sources affirm all proceeds acquired/improved the home.
  // Mixed use, investment interest and other itemized branches remain rejected
  // by their source contracts; do not infer their fields from unrelated totals.
  if (data.sellers.length) fill(1, 17, "See attached seller details");
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  for (const page of await doc.copyPages(draft, [1, 2])) doc.addPage(page);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  if (data.sellers.length) {
    const newPage = () => {
      const page = doc.addPage([612, 792]);
      page.drawText("Schedule A (Form 1040) 2026 - Line 8b Seller Details", {
        x: 36,
        y: 748,
        size: 11,
        font: regular,
      });
      page.drawText(filer.name, {
        x: 36,
        y: 726,
        size: fit(filer.name, 540),
        font: regular,
      });
      page.drawText(`SSN: ${filer.ssn}`, {
        x: 36,
        y: 710,
        size: 9,
        font: regular,
      });
      page.drawText(
        `Total mortgage interest reported on line 8b: ${data.calculation.lines.line8b}`,
        { x: 36, y: 64, size: 9, font: regular },
      );
      return page;
    };
    let page = newPage();
    let y = 678;
    for (const [i, seller] of data.sellers.entries()) {
      for (
        const value of [
          `${i + 1}. ${seller.name}`,
          `Identifying number: ${seller.tin}`,
          seller.address,
        ]
      ) {
        let line = "";
        const draw = () => {
          if (y < 100) {
            page = newPage();
            y = 678;
          }
          page.drawText(line, { x: 36, y, size: 9, font: regular });
          y -= 16;
        };
        for (const word of value.trim().split(/\s+/)) {
          if (line && regular.widthOfTextAtSize(`${line} ${word}`, 9) > 540) {
            draw();
            line = "";
          }
          if (line) line += " ";
          for (const char of word) {
            if (regular.widthOfTextAtSize(line + char, 9) > 540) {
              draw();
              line = "";
            }
            line += char;
          }
        }
        if (line) draw();
      }
      y -= 8;
    }
  }
  for (const page of doc.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font: regular,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
