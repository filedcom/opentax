import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { z } from "zod";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
} from "../nodes/f8812.ts";
import {
  type adoptionIncomeBridge2026Schema,
  replayAdoptionIncome2026,
} from "../inputs/adoption-settlement.ts";
import { loadPinnedDraft2026 } from "./source.ts";

type Income = z.input<typeof adoptionIncomeBridge2026Schema>;
export interface AdoptionPdfDestinations2026 {
  form1040_line1f: number;
  form1040_line11b: number;
  form1040_line18: number;
  form1040_line19: number;
  form1040_line28: number;
  form1040_line30: number;
  schedule3_line6c: number;
}
/** Replay the same atomic child/adoption/energy resolution used by the return. */
export function adoptionPrintPlan2026(
  raw: ChildCreditInput2026,
  income: Income,
) {
  const child = calculateChildCredit2026(raw), credit = child.adoption_credit;
  if (!credit) throw Error("Form 8839 PDF needs the actual adoption source");
  const exclusion = replayAdoptionIncome2026(income, credit.source_input);
  if (
    JSON.stringify(credit.source_input) !==
      JSON.stringify(exclusion.source_input)
  ) {
    throw Error(
      "Form 8839 credit and exclusion must use the same source inventory",
    );
  }
  const rows = credit.source.children.map((r, i) => ({
    source: r.source,
    credit: credit.children[i],
    exclusion: exclusion.children[i],
    print_credit: r.eligible_current_claim && r.report_child,
    print_exclusion: r.report_child &&
      (r.current_benefits > 0 || r.partIII.line24 > 0),
  }));
  // Preserve the prior printed column even when prior children are absent or
  // a joint return combines children previously reported in the same column.
  const copies: (typeof rows[number] | undefined)[][] = [];
  function place(row: typeof rows[number], column?: number) {
    let copy = copies.find((c) =>
      column === undefined ? c.some((r) => !r) : !c[column]
    );
    if (!copy) {
      copy = [undefined, undefined, undefined];
      copies.push(copy);
    }
    copy[column ?? copy.findIndex((r) => !r)] = row;
  }
  rows.filter((r) => r.source.prior_form8839).forEach((r) =>
    place(r, r.source.prior_form8839!.child_column - 1)
  );
  rows.filter((r) => !r.source.prior_form8839).forEach((r) => place(r));
  if (!copies.length) copies.push([undefined, undefined, undefined]);
  const hasExclusion = rows.some((r) => r.print_exclusion);
  return {
    child,
    credit,
    exclusion,
    copies,
    hasExclusion,
    file_form8839: credit.lines.line12 > 0 || credit.lines.line15 > 0 ||
      hasExclusion || exclusion.line1f_taxable_adoption_benefits !== 0,
    official_pages: copies.length * 2,
  };
}

/** Static development attachment, sequence 38. All repeated sheets are official
 * Form 8839 pages; aggregate amounts appear only on the first copy. */
export async function buildForm8839PdfBytes2026(
  raw: ChildCreditInput2026,
  income: Income,
  destinations: AdoptionPdfDestinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const p = adoptionPrintPlan2026(raw, income), { credit: c, exclusion: e } = p;
  if (!p.file_form8839) {
    throw Error("Form 8839 has no current claim or carryforward to attach");
  }
  const expected: AdoptionPdfDestinations2026 = {
    form1040_line1f: e.line1f_taxable_adoption_benefits,
    form1040_line11b: c.finalized_return.form1040_line11b_agi,
    form1040_line18: c.finalized_return.form1040_line18_tax_before_credits,
    form1040_line19: p.child.lines?.line14 ?? 0,
    form1040_line28: p.child.lines?.line27 ?? 0,
    form1040_line30: c.lines.line13,
    schedule3_line6c: c.lines.line18a,
  };
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== c.source_input.taxpayer_ssn ||
    (Object.keys(expected) as (keyof typeof expected)[]).some((key) =>
      destinations[key] !== expected[key]
    )
  ) {
    throw Error(
      "Form 8839 PDF needs matching owner and calculated return destinations",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8839.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8839--dft.pdf",
    "b8eefaaeb9faad7972f65d9f1457d8eb15ce9b2b2c84ee042620e95614384770",
  );
  const output = await PDFDocument.create();
  for (const [copyIndex, rows] of p.copies.entries()) {
    const doc = await PDFDocument.load(bytes), form = doc.getForm();
    if (
      doc.getPageCount() !== 3 || form.getFields().length !== 101 ||
      form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
    ) {
      throw Error("Form 8839 template field inventory changed");
    }
    const font = await doc.embedFont(StandardFonts.Helvetica);
    function fieldName(leaf: string) {
      const names = form.getFields().map((f) => f.getName()).filter((n) =>
        n.endsWith(`.${leaf}`)
      );
      if (names.length !== 1) {
        throw Error(`Form 8839 field mapping changed: ${leaf}`);
      }
      return names[0];
    }
    function fill(page: number, index: number, value: string | number) {
      const f = form.getTextField(fieldName(`f${page}_${index}[0]`)),
        rect = f.acroField.getWidgets()[0].getRectangle(),
        text = String(value);
      const size = Math.min(
        9,
        9 * (rect.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
      if (size < 6) throw Error("Form 8839 text exceeds its printable field");
      f.setFontSize(size);
      if (typeof value === "number") f.setAlignment(TextAlignment.Right);
      f.setText(text);
    }
    function check(page: number, index: number, occurrence = 0) {
      form.getCheckBox(fieldName(`c${page}_${index}[${occurrence}]`)).check();
    }
    function ratio(page: number, index: number, value: number) {
      const [whole, fraction] = value.toFixed(3).split(".");
      fill(page, index, whole);
      fill(page, index + 1, fraction);
    }
    fill(1, 1, filer.name);
    fill(1, 2, filer.ssn);
    rows.forEach((r, col) => {
      if (!r) return;
      const s = r.source, a = r.credit, b = r.exclusion;
      [
        s.first_name,
        s.last_name,
        s.date_of_birth.slice(0, 4),
        s.identifying_number,
      ].forEach((v, i) => fill(1, 3 + col * 4 + i, v));
      if (s.date_of_birth < "2009-01-01" && s.disability) check(1, col * 4 + 1);
      if (s.special_needs) check(1, col * 4 + 2);
      if (s.origin === "foreign") check(1, col * 4 + 3);
      if (s.finalization.kind === "final") check(1, col * 4 + 4);
      if (r.print_credit) {
        [a.line2, a.line3, a.line4, a.line5, a.line6].forEach((v, i) =>
          fill(1, 15 + col + i * 3, v)
        );
        [a.line10, a.line11a, a.line11b].forEach((v, i) =>
          fill(1, 34 + col + i * 3, v)
        );
      }
      if (r.print_exclusion) {
        [b.line19, b.line20, b.line21, b.line22].forEach((v, i) =>
          fill(2, 1 + col + i * 3, v)
        );
        fill(2, 14 + col, b.line24);
        fill(2, 21 + col, b.line28);
        fill(2, 24 + col, b.line29);
      }
    });
    if (rows.some((r) => r?.print_credit)) {
      check(
        1,
        13,
        rows.some((r) => r?.print_credit && r.source.prior_form8839) ? 1 : 0,
      );
    }
    if (rows.some((r) => r?.print_exclusion)) {
      check(
        2,
        1,
        rows.some((r) => r?.print_exclusion && r.exclusion.line20 > 0) ? 1 : 0,
      );
    }
    if (copyIndex === 0) {
      fill(1, 30, c.lines.line7);
      check(1, 14, c.lines.line8 > 0 ? 1 : 0);
      if (c.lines.line8 > 0) {
        fill(1, 31, c.lines.line8);
        ratio(1, 32, c.lines.line9);
      }
      [
        c.lines.line11c,
        c.lines.line12,
        c.lines.line13,
        c.lines.line14,
        c.lines.line15,
        c.lines.line16,
        c.lines.line17,
        c.lines.line18a,
        c.lines.line18b,
      ].forEach((v, i) => fill(1, 43 + i, v));
      if (p.hasExclusion) {
        fill(2, 13, e.lines.line23);
        fill(2, 17, e.lines.line25);
        check(2, 2, e.lines.line26 > 0 ? 1 : 0);
        if (e.lines.line26 > 0) {
          fill(2, 18, e.lines.line26);
          ratio(2, 19, e.lines.line27);
        }
        fill(2, 27, e.lines.line30);
        fill(2, 28, e.lines.line31);
        check(2, 3, e.lines.line30 > e.lines.line23 ? 1 : 0);
      }
    }
    form.updateFieldAppearances(font);
    form.flatten();
    doc.catalog.delete(PDFName.of("AcroForm"));
    if (p.copies.length > 1) {
      doc.getPage(1).drawText("See Attached", {
        x: 496,
        y: 522,
        size: 7,
        font,
      });
    }
    for (const page of doc.getPages()) page.node.delete(PDFName.of("Annots"));
    // Materialize appearance fonts before copying resources into another PDF.
    const flat = await PDFDocument.load(
      await doc.save({ updateFieldAppearances: false }),
    );
    for (const index of [1, 2]) {
      const page = flat.getPage(index);
      // Isolate the template's clipping state before drawing the footer.
      const rendered = output.addPage([612, 792]);
      rendered.drawPage(await output.embedPage(page));
      const footerFont = await output.embedFont(StandardFonts.Helvetica);
      rendered.drawText(
        `DRAFT - NOT FOR FILING | Form 8839 copy ${
          copyIndex + 1
        } of ${p.copies.length}`,
        {
          x: 36,
          y: 12,
          size: 8,
          font: footerFont,
          color: rgb(.4, .1, .1),
        },
      );
    }
  }
  // Current taxable benefits excluded from the qualifying Part III rows still
  // reach 1040 line 1f. Keep that difference visible instead of rewriting line 31.
  if (e.source.taxable_benefits_outside_partIII > 0) {
    const font = await output.embedFont(StandardFonts.Helvetica),
      page = output.addPage([612, 792]);
    const lines = [
      "2026 Form 8839 - adoption income reconciliation",
      filer.name,
      `Taxpayer SSN: ${filer.ssn}`,
      `Part III line 31: ${e.lines.line31}`,
      `Current taxable benefits outside Part III: ${e.source.taxable_benefits_outside_partIII}`,
      `Form 1040 line 1f: ${e.line1f_taxable_adoption_benefits}`,
      "Outside benefits relate to a pending foreign adoption or an ineligible separate return.",
      "These amounts are included in income and are not claimed as an exclusion.",
    ];
    lines.forEach((text, i) => {
      const baseSize = i === 0 ? 12 : 10;
      const size = Math.min(
        baseSize,
        baseSize * 540 / Math.max(1, font.widthOfTextAtSize(text, baseSize)),
      );
      if (size < 6) {
        throw Error("Adoption reconciliation text exceeds printable width");
      }
      page.drawText(text, {
        x: 36,
        y: 745 - i * 22,
        font,
        size,
      });
    });
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
  }
  output.catalog.delete(PDFName.of("AcroForm"));
  for (const page of output.getPages()) page.node.delete(PDFName.of("Annots"));
  return output.save({ updateFieldAppearances: false });
}
