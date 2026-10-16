import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateLandDispositions2026,
  type LandDispositionSource2026,
  section1231FinalizedLoss2026Schema,
} from "../inputs/land-disposition-source.ts";
import type { z } from "zod";
import { loadPinnedDraft2026 } from "./source.ts";

/** Internal land component: the current source graph/bundle still owns registration. */
export async function buildForm4797PdfBytes2026(
  raw: LandDispositionSource2026,
  destinations: {
    schedule_d_line11: number;
    schedule1_line4: number;
    section1231_loss_taken_into_account: number;
  },
  filer: { name: string; ssn: string },
  finalizedLoss?: z.input<typeof section1231FinalizedLoss2026Schema>,
) {
  const r = calculateLandDispositions2026(raw, finalizedLoss), d = destinations;
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== r.source_input.taxpayer_ssn
  ) throw new Error("Form 4797 needs matching filer identity");
  if (
    Object.values(d).some((n) => !Number.isSafeInteger(n)) ||
    d.schedule_d_line11 !== r.line10_long_term_gain ||
    d.schedule1_line4 !== r.line20b_schedule1_gain_loss ||
    d.section1231_loss_taken_into_account !==
      r.history.current.loss_taken_into_account
  ) {
    throw new Error(
      "Form 4797 destinations disagree with source-derived character and finalized loss",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f4797-2026-10-01.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f4797--dft.pdf",
    "66e57b82213189baa8564ed9cb83e75d6f556edb0bd051df458879280bc1fec9",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = doc.getForm();
  const fields = form.getFields();
  if (
    doc.getPageCount() !== 3 || fields.length !== 188 ||
    fields.some((f) => f.acroField.getWidgets().length !== 1)
  ) throw new Error("Form 4797 template inventory changed");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const field = (n: number) => {
    const found = fields.filter((f) => f.getName().endsWith(`.f1_${n}[0]`));
    if (found.length !== 1) {
      throw new Error("Form 4797 page-one fields changed");
    }
    return form.getTextField(found[0].getName());
  };
  // Verify every page-one key, including skipped fields, before writing anything.
  for (let n = 1; n <= 79; n++) field(n);
  const numeric = (n: number) => n < 0 ? `(${Math.abs(n)})` : String(n);
  const fill = (n: number, value: string | number) => {
    const f = field(n),
      rect = f.acroField.getWidgets()[0].getRectangle(),
      text = typeof value === "number" ? numeric(value) : value;
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 4797 value exceeds printable field");
    f.setFontSize(size);
    if (typeof value === "number") f.setAlignment(TextAlignment.Right);
    f.setText(text);
  };
  const date = (s: string) =>
    `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`;
  fill(1, filer.name);
  fill(2, filer.ssn);
  fill(3, r.line1a_information_return_proceeds);
  const continuations: { part: "I" | "II"; rows: typeof r.rows }[] = [];
  for (const part of ["I", "II"] as const) {
    const rows = r.rows.filter((x) => x.part === part),
      start = part === "I" ? 6 : 42;
    if (!rows.length) continue;
    const needsStatement = rows.length > 4 ||
      rows.some((x) => font.widthOfTextAtSize(x.source.description, 6) > 117);
    if (needsStatement) {
      fill(start, "See attached statement");
      for (
        const [offset, key] of [[3, "gross_sales_price"], [4, "depreciation"], [
          5,
          "basis_plus_selling_expenses",
        ], [6, "gain"]] as const
      ) {
        fill(start + offset, rows.reduce((n, x) => n + x.printed[key], 0));
      }
      continuations.push({ part, rows });
    } else {rows.forEach((x, i) => {
        const n = start + i * 7;
        [
          x.source.description,
          date(x.source.acquired_on),
          date(x.source.closing.settled_on),
          x.printed.gross_sales_price,
          0,
          x.printed.basis_plus_selling_expenses,
          x.printed.gain,
        ]
          .forEach((value, j) => fill(n + j, value));
      });}
  }
  const hasLong = r.rows.some((x) => x.part === "I"),
    hasShort = r.rows.some((x) => x.part === "II");
  if (hasLong) {
    fill(39, r.line8_net_section1231);
    if (r.line8_net_section1231 <= 0) {
      // Line 12 has parentheses printed on the form already.
      fill(70, Math.abs(r.line12_section1231_loss));
    } else if (r.line9_nonrecaptured_loss > 0) {
      fill(40, r.line9_nonrecaptured_loss);
      fill(41, r.line10_long_term_gain);
      fill(71, r.line13_prior_loss_recapture);
    }
    // Positive gain with no lookback loss goes directly to D; lines 9/10/12/13 stay blank.
  }
  if (
    hasShort || (hasLong && r.line8_net_section1231 <= 0) ||
    r.line13_prior_loss_recapture > 0
  ) {
    fill(77, r.line19_ordinary_gain_loss);
    fill(79, r.line20b_schedule1_gain_loss);
  }
  form.updateFieldAppearances(font);
  form.flatten();
  for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
  doc.catalog.delete(PDFName.of("AcroForm"));
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(doc, [1]);
  out.addPage(page);
  const outFont = await out.embedFont(StandardFonts.Helvetica),
    bold = await out.embedFont(StandardFonts.HelveticaBold);
  const mark = (p: ReturnType<typeof out.addPage>) =>
    p.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 15,
      font: outFont,
      size: 8,
      color: rgb(.4, .1, .1),
    });
  mark(page);
  const wrap = (value: string, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const char of value) {
      if (char === "\n") {
        lines.push(line);
        line = "";
        continue;
      }
      if (font.widthOfTextAtSize(line + char, 8) > width) {
        const space = line.lastIndexOf(" ");
        if (space > 0) {
          lines.push(line.slice(0, space));
          line = line.slice(space + 1) + char;
        } else {
          lines.push(line);
          line = char;
        }
      } else line += char;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };
  // Statement rows repeat all seven tax columns and retain sale/owner references.
  // Long descriptions may continue on another page; amounts print only once.
  const xs = [36, 184, 240, 296, 366, 416, 496, 576];
  for (const statement of continuations) {
    let p!: ReturnType<typeof out.addPage>;
    let y = 0, sequence = 0;
    const newPage = () => {
      p = out.addPage([612, 792]);
      sequence++;
      mark(p);
      p.drawText(
        `Form 4797 - Part ${statement.part}, line ${
          statement.part === "I" ? 2 : 11
        } continuation (${sequence})`,
        { x: 36, y: 752, font: bold, size: 11 },
      );
      p.drawText(filer.name, {
        x: 36,
        y: 733,
        font: outFont,
        size: Math.min(
          9,
          9 * 430 / Math.max(1, outFont.widthOfTextAtSize(filer.name, 9)),
        ),
      });
      p.drawText(filer.ssn, { x: 480, y: 733, font: outFont, size: 9 });
      [
        "Property / owner",
        "Acquired",
        "Sold",
        "Gross price",
        "Deprec.",
        "Basis + costs",
        "Gain / (loss)",
      ].forEach((s, i) =>
        p.drawText(s, {
          x: xs[i] + 2,
          y: 708,
          font: bold,
          size: i === 0 ? 8 : 7,
        })
      );
      p.drawLine({
        start: { x: 36, y: 702 },
        end: { x: 576, y: 702 },
        thickness: .7,
      });
      y = 687;
    };
    newPage();
    const number = (i: number, n: number, at: number) => {
      const s = numeric(n),
        size = Math.min(
          8,
          8 * (xs[i + 1] - xs[i] - 5) /
            Math.max(1, outFont.widthOfTextAtSize(s, 8)),
        );
      if (size < 6) {
        throw new Error("Form 4797 continuation amount is too wide");
      }
      p.drawText(s, {
        x: xs[i + 1] - 2 - outFont.widthOfTextAtSize(s, size),
        y: at,
        font: outFont,
        size,
      });
    };
    for (const row of statement.rows) {
      const lines = wrap(
        `${row.source.description}\nOwner ${row.source.owner_tin}; sale ${row.source.sale_reference}`,
        144,
      );
      let first = true;
      while (lines.length) {
        if (y < 75) newPage();
        const count = Math.max(1, Math.floor((y - 60) / 11)),
          chunk = lines.splice(0, count);
        chunk.forEach((s, i) =>
          p.drawText(s, { x: 38, y: y - i * 11, font: outFont, size: 8 })
        );
        if (first) {
          p.drawText(date(row.source.acquired_on), {
            x: xs[1] + 2,
            y,
            font: outFont,
            size: 8,
          });
          p.drawText(date(row.source.closing.settled_on), {
            x: xs[2] + 2,
            y,
            font: outFont,
            size: 8,
          });
          [
            row.printed.gross_sales_price,
            0,
            row.printed.basis_plus_selling_expenses,
            row.printed.gain,
          ].forEach((n, i) => number(i + 3, n, y));
          first = false;
        }
        const bottom = y - (chunk.length - 1) * 11 - 8;
        p.drawLine({
          start: { x: 36, y: bottom },
          end: { x: 576, y: bottom },
          thickness: .3,
          color: rgb(.75, .75, .75),
        });
        y = bottom - 14;
      }
    }
    if (y < 75) newPage();
    p!.drawText("Total carried to form", { x: 38, y, font: bold, size: 8 });
    for (
      const [i, key] of [[3, "gross_sales_price"], [4, "depreciation"], [
        5,
        "basis_plus_selling_expenses",
      ], [6, "gain"]] as const
    ) number(i, statement.rows.reduce((n, r) => n + r.printed[key], 0), y);
  }
  for (const page of out.getPages()) page.node.delete(PDFName.of("Annots"));
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}
