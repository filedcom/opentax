import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateCapitalGains2026,
  type CapitalGainInput2026,
} from "../nodes/capital-gains.ts";
import { loadPinnedDraft2026 } from "./source.ts";
export async function buildCapitalPdfBytes2026(
  raw: CapitalGainInput2026,
  destinations: {
    form1040_line7a: number;
    form1040_line7b: boolean;
    form1040_line3a: number;
    preferential_gain: number;
    form4797_line10?: number;
    schedule1_line4?: number;
  },
  filer: { name: string; ssn: string },
  kind: "schedule_d" | "form8949",
): Promise<Uint8Array> {
  const r = calculateCapitalGains2026(raw);
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== r.source_input.taxpayer_ssn
  ) throw new Error("Capital PDF needs matching filer identity");
  if (
    r.return_gain !== destinations.form1040_line7a ||
    r.direct_distribution !== destinations.form1040_line7b ||
    r.qualified_dividends !== destinations.form1040_line3a ||
    r.preferential_gain !== destinations.preferential_gain ||
    (r.land !== undefined && (
      destinations.form4797_line10 !== r.line11_form4797 ||
      destinations.schedule1_line4 !== r.ordinary_disposition_gain_loss
    ))
  ) {
    throw new Error(
      "Capital PDF destinations disagree with calculated sources",
    );
  }
  if (kind === "schedule_d" ? !r.file_schedule_d : !r.file_form8949) {
    throw new Error("No capital form is required for this selection");
  }
  const schedule = kind === "schedule_d";
  const bytes = await loadPinnedDraft2026(
    new URL(
      schedule
        ? "../../../../docs/ty2026/corpus/draft/f1040sd.pdf"
        : "../../../../docs/ty2026/corpus/draft/f8949.pdf",
      import.meta.url,
    ),
    schedule
      ? "https://www.irs.gov/pub/irs-dft/f1040sd--dft.pdf"
      : "https://www.irs.gov/pub/irs-dft/f8949--dft.pdf",
    schedule
      ? "0df9af0711964b3198ea04bb0037b29d6afa85578a671553daed46251630b5f1"
      : "891d869c87ffe9c6d7f79079d19ebf4ac0afa7257f6374cd95936e44a7079ffe",
  );
  const out = await PDFDocument.create();
  const parts = ["A", "B", "C", "G", "H", "I", "D", "E", "F", "J", "K", "L"];
  async function render(page: 1 | 2, rows: typeof r.file_rows = [], part = "") {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
      form = doc.getForm();
    if (
      doc.getPageCount() !== 3 ||
      form.getFields().length !== (schedule ? 55 : 202)
    ) throw new Error("Capital template field inventory changed");
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const name = (leaf: string) => {
      const matches = form.getFields().filter((f) =>
        f.getName().endsWith(`.${leaf}`)
      );
      if (matches.length !== 1) {
        throw new Error(`Capital PDF field changed: ${leaf}`);
      }
      return matches[0].getName();
    };
    const fill = (index: number, value: string | number) => {
      const leaf = `f${page}_${
          schedule ? index : String(index).padStart(2, "0")
        }[0]`,
        f = form.getTextField(name(leaf));
      const text = typeof value === "number" && value < 0
          ? `(${Math.abs(value)})`
          : String(value),
        rect = f.acroField.getWidgets()[0].getRectangle();
      const size = Math.min(
        9,
        9 * (rect.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
      if (size < 6) {
        throw new Error("Capital PDF text exceeds its printable field");
      }
      f.setFontSize(size);
      if (typeof value === "number") f.setAlignment(TextAlignment.Right);
      f.setText(text);
    };
    const check = (index: number, choice: number) =>
      form.getCheckBox(name(`c${page}_${index}[${choice}]`)).check();
    if (schedule) {
      if (page === 1) {
        fill(1, filer.name);
        fill(2, filer.ssn);
        check(1, 1);
        const direct = (start: number, d: typeof r.direct_short) => {
          if (d.proceeds || d.cost) {
            fill(start, Math.round(d.proceeds));
            fill(start + 1, Math.round(d.cost));
            fill(start + 3, d.gain);
          }
        };
        direct(3, r.direct_short);
        direct(23, r.direct_long);
        for (
          const [start, g] of [
            [7, r.groups.line1b],
            [11, r.groups.line2],
            [15, r.groups.line3],
            [27, r.groups.line8b],
            [31, r.groups.line9],
            [35, r.groups.line10],
          ] as const
        ) {
          if (g.proceeds || g.cost || g.adjustment) {
            [g.proceeds, g.cost, g.adjustment, g.gain].forEach((v, i) =>
              fill(start + i, v)
            );
          }
        }
        if (r.carry.short_term) fill(21, r.carry.short_term);
        fill(22, r.line7);
        if (r.line11_form4797) fill(39, r.line11_form4797);
        if (r.distributions) fill(41, r.distributions);
        if (r.carry.long_term) fill(42, r.carry.long_term);
        fill(43, r.line15);
      } else {
        fill(1, r.line16);
        const both = r.line15 > 0 && r.line16 > 0;
        if (r.line16 > 0) check(1, both ? 0 : 1);
        if (both) {
          fill(2, 0);
          fill(3, 0);
          check(2, 0);
        } else {
          if (r.line16 < 0) fill(4, Math.abs(r.return_gain));
          check(3, r.qualified_dividends > 0 ? 0 : 1);
        }
      }
    } else {
      fill(1, filer.name);
      fill(2, filer.ssn);
      check(1, parts.indexOf(part) % 6);
      const date = (s: string) =>
        `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`;
      rows.forEach((row, i) => {
        [
          row.description,
          date(row.date_acquired),
          date(row.date_sold),
          row.proceeds,
          row.cost_basis,
          row.adjustment_codes ?? "",
          row.adjustment_amount ?? "",
          row.gain_loss,
        ].forEach((v, j) => fill(3 + 8 * i + j, v));
      });
      for (
        const [index, key] of [[91, "proceeds"], [92, "cost_basis"], [
          94,
          "adjustment_amount",
        ], [95, "gain_loss"]] as const
      ) fill(index, rows.reduce((n, row) => n + (row[key] ?? 0), 0));
    }
    form.updateFieldAppearances(font);
    form.flatten();
    doc.getPage(page).drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
    for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
    doc.catalog.delete(PDFName.of("AcroForm"));
    const [p] = await out.copyPages(doc, [page]);
    out.addPage(p);
  }
  if (schedule) {
    await render(1);
    await render(2);
  } else {
    for (const part of parts) {
      const rows = r.file_rows.filter((row) => row.part === part);
      for (let offset = 0; offset < rows.length; offset += 11) {
        await render(
          parts.indexOf(part) < 6 ? 1 : 2,
          rows.slice(offset, offset + 11),
          part,
        );
      }
    }
  }
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}
