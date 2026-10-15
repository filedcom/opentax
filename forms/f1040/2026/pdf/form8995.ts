import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { loadPinnedDraft2026 } from "./source.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import type { QbiPrintRow2026 } from "../inputs/qbi-common.ts";
import { FilingStatus } from "../../nodes/types.ts";
type Owner = { name: string; ssn: string };
export type Form8995Print2026 = {
  rows: QbiPrintRow2026[];
  lines: Record<string, number>;
};

/** Internal rendering primitive. Source-facing callers must replay deduction selection. */
export async function renderForm8995Draft2026(
  qbi: Form8995Print2026,
  filer: Owner,
) {
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8995.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8995--dft.pdf",
    "d698390e2990de21b8df9ccb485f9309b817707d4871581118337bf7c1b14fd8",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = doc.getForm(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  if (doc.getPageCount() !== 2 || form.getFields().length !== 36) {
    throw new Error("Form 8995 template inventory changed");
  }
  const field = (i: number) => {
    const fields = form.getFields().filter((f) =>
      f.getName().endsWith(`.f1_${i}[0]`)
    );
    if (fields.length !== 1 || fields[0].acroField.getWidgets().length !== 1) {
      throw new Error("Form 8995 text field inventory changed");
    }
    return form.getTextField(fields[0].getName());
  };
  for (let i = 1; i <= 35; i++) field(i);
  const numeric = (n: number) => n < 0 ? `(${Math.abs(n)})` : String(n);
  const fill = (i: number, value: string | number) => {
    const f = field(i),
      r = f.acroField.getWidgets()[0].getRectangle(),
      text = typeof value === "number" ? numeric(value) : value;
    const size = Math.min(
      9,
      9 * (r.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 8995 text exceeds printable field");
    f.setFontSize(size);
    if (typeof value === "number") f.setAlignment(TextAlignment.Right);
    f.setText(text);
  };
  if (qbi.rows.reduce((n, r) => n + r.qbi, 0) !== qbi.lines.line2) {
    throw new Error("Form 8995 rows do not reconcile to line 2");
  }
  fill(1, filer.name);
  fill(2, filer.ssn);
  qbi.rows.slice(0, 5).forEach((r, i) => {
    fill(3 + i * 3, r.business_name);
    fill(4 + i * 3, r.identification_number);
    fill(5 + i * 3, r.qbi);
  });
  for (let line = 2; line <= 19; line++) {
    fill(line + 16, qbi.lines[`line${line}`]);
  }
  form.updateFieldAppearances(font);
  form.flatten();
  doc.catalog.delete(PDFName.of("AcroForm"));
  for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
  const out = await PDFDocument.create(),
    [page] = await out.copyPages(doc, [1]);
  out.addPage(page);
  const f = await out.embedFont(StandardFonts.Helvetica);
  const mark = (p: ReturnType<typeof out.addPage>) =>
    p.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: f,
      size: 8,
      color: rgb(.4, .1, .1),
    });
  mark(page);
  const wrap = (text: string, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const ch of text) {
      if (line && f.widthOfTextAtSize(line + ch, 9) > width) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
    if (line) lines.push(line);
    return lines;
  };
  if (qbi.rows.length > 5) {
    let p: ReturnType<typeof out.addPage>, y = 0;
    const newPage = () => {
      p = out.addPage([612, 792]);
      y = 740;
      mark(p);
      for (
        const text of [
          "2026 Form 8995 - Additional businesses included in line 2",
          `${filer.name} | SSN ${filer.ssn}`,
        ]
      ) {
        for (const line of wrap(text, 528)) {
          p.drawText(line, { x: 42, y, font: f, size: 9 });
          y -= 14;
        }
      }
      y -= 15;
    };
    newPage();
    const rows = qbi.rows.slice(5).map((r) => ({
      description: `${r.business_name} | TIN ${r.identification_number}`,
      amount: numeric(r.qbi),
    }));
    rows.push({
      description: `Line 2 includes all ${qbi.rows.length} businesses: ${
        numeric(qbi.lines.line2)
      }`,
      amount: "",
    });
    for (const row of rows) {
      const width = f.widthOfTextAtSize(row.amount, 9);
      if (width > 75) {
        throw new Error(
          "Form 8995 continuation amount exceeds printable column",
        );
      }
      for (const [i, line] of wrap(row.description, 440).entries()) {
        if (y < 55) newPage();
        p!.drawText(line, { x: 42, y, font: f, size: 9 });
        if (i === 0) {
          p!.drawText(row.amount, { x: 570 - width, y, font: f, size: 9 });
        }
        y -= 12;
      }
      y -= 5;
    }
  }
  for (const p of out.getPages()) p.node.delete(PDFName.of("Annots"));
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}

export async function buildCombinedQbiPdfBytes2026(
  raw: Parameters<typeof calculateDeductionSelection2026>[0],
  destinations: {
    form1040_line11b: number;
    form1040_line12e: number;
    form1040_line12f: number;
    form1040_line13a: number;
    form1040_line13b: number;
    form1040_line15: number;
  },
  owners: { taxpayer: Owner; spouse?: Owner },
) {
  const selection = calculateDeductionSelection2026(raw),
    r = selection.combined_qbi_workpaper;
  if (!r) {
    throw new Error(
      "Combined Form 8995 requires its retained source workpaper",
    );
  }
  const d = selection.resolution.selected, s = r.land.loss.finalized_sources;
  const expected = [
    selection.source_input.agi,
    d.line12eStandardOrItemized,
    d.line12fNonitemizerCharity,
    d.line13aSchedule1a,
    d.line13bQbi,
    d.line15TaxableIncome,
  ];
  const actual = [
    destinations.form1040_line11b,
    destinations.form1040_line12e,
    destinations.form1040_line12f,
    destinations.form1040_line13a,
    destinations.form1040_line13b,
    destinations.form1040_line15,
  ];
  if (actual.some((n, i) => !Number.isSafeInteger(n) || n !== expected[i])) {
    throw new Error(
      "Combined Form 8995 destinations disagree with deduction selection",
    );
  }
  for (
    const [role, tin] of [["taxpayer", s.taxpayer_ssn], [
      "spouse",
      s.filing_status === FilingStatus.MFJ ? s.spouse_ssn : undefined,
    ]] as const
  ) {
    const o = owners[role];
    if (
      tin
        ? !o?.name.trim() || o.ssn.replaceAll("-", "") !== tin
        : o !== undefined
    ) throw new Error("Combined Form 8995 needs matching filer identities");
  }
  const qbi = d.qbi.forms.form8995 as Form8995Print2026;
  return renderForm8995Draft2026(qbi, {
    name: [owners.taxpayer.name, owners.spouse?.name].filter(Boolean).join(
      " & ",
    ),
    ssn: owners.taxpayer.ssn,
  });
}
