import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateIncomeTax2026,
  type IncomeTax2026Input,
} from "../nodes/income-tax.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Replays the reviewed family and child worksheets; attachment sequence 33. */
export async function buildForm8615PdfBytes2026(
  raw: IncomeTax2026Input,
  destinations: {
    form1040_line11b: number;
    form1040_line12e: number;
    form1040_line15: number;
    form1040_line16: number;
  },
  filer: { name: string; ssn: string },
) {
  const tax = calculateIncomeTax2026(raw),
    result = tax.form8615,
    review = tax.child_tax_review;
  if (!result || !review?.eligibility?.applies) {
    throw new Error("Form 8615 has no reviewed child tax to attach");
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !==
      review.source_input.child_context.taxpayer_ssn ||
    review.source_input.income_context.agi !== destinations.form1040_line11b ||
    raw.form8615_child_deduction !== destinations.form1040_line12e ||
    raw.taxable_income !== destinations.form1040_line15 ||
    tax.line16IncomeTax !== destinations.form1040_line16
  ) {
    throw new Error(
      "Form 8615 PDF identity or destinations disagree with reviewed child sources",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8615.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8615--dft.pdf",
    "11db7889385b13ea63d2f05cd0bbb4e92afe34523917a7b9f9fc4ddecd7996d7",
  );
  const doc = await PDFDocument.load(bytes), form = doc.getForm();
  if (doc.getPageCount() !== 2 || form.getFields().length !== 32) {
    throw new Error("Form 8615 draft field inventory changed");
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fieldName = (leaf: string) => {
    const matches = form.getFields().map((f) => f.getName()).filter((n) =>
      n.endsWith(`.${leaf}`)
    );
    if (matches.length !== 1) {
      throw new Error(`Form 8615 field mapping changed: ${leaf}`);
    }
    return matches[0];
  };
  const fill = (index: number, value: string | number | undefined) => {
    if (value === undefined) return;
    const f = form.getTextField(fieldName(`f1_${index}[0]`)),
      text = String(value),
      rect = f.acroField.getWidgets()[0].getRectangle();
    const size = Math.min(
      9,
      9 * (rect.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 8615 text exceeds its printable field");
    f.setFontSize(size);
    if (typeof value === "number") f.setAlignment(TextAlignment.Right);
    f.setText(text);
  };
  const f = result.fields;
  fill(1, filer.name);
  fill(2, filer.ssn.replaceAll("-", ""));
  fill(3, f.parent_name);
  fill(4, f.parent_ssn);
  const statuses = [
    FilingStatus.Single,
    FilingStatus.MFJ,
    FilingStatus.MFS,
    FilingStatus.HOH,
    FilingStatus.QSS,
  ];
  form.getCheckBox(
    fieldName(`c1_1[${statuses.indexOf(f.parent_filing_status)}]`),
  ).check();
  [
    f.line1_child_unearned_income,
    f.line2_kiddie_deduction,
    f.line3_adjusted_unearned_income,
    f.line4_child_taxable_income,
    f.line5_child_net_unearned_income,
    f.line6_parent_taxable_income,
    f.line7_other_children_income,
    f.line8_family_income,
    f.line9_family_tax,
    f.line10_parent_tax,
    f.line11_children_tax,
    f.line12a_children_income,
  ].forEach((v, i) => fill(i + 5, v));
  if (f.line12b_allocation_ratio !== undefined) {
    const [whole, fraction] = f.line12b_allocation_ratio.toFixed(3).split(".");
    fill(17, fraction);
    // The official widget covers only the fractional digits after its printed
    // decimal point. The rounded allocation can be 1.000 for a small sibling.
    doc.getPage(1).drawText(whole, { x: 547, y: 297, size: 9, font });
  }
  [
    f.line13_allocable_tax,
    f.line14_child_net_income,
    f.line15_child_net_income_tax,
    f.line16_combined_child_tax,
    f.line17_child_regular_tax,
    f.line18_child_tax,
  ].forEach((v, i) => fill(i + 18, v));
  [
    f.line9_preferential_tax_used,
    f.line10_preferential_tax_used,
    f.line15_preferential_tax_used,
    f.line17_preferential_tax_used,
  ].forEach((v, i) => {
    if (v) form.getCheckBox(fieldName(`c1_${i + 2}[0]`)).check();
  });
  form.updateFieldAppearances(font);
  form.flatten();
  doc.removePage(0);
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of("Annots"));
    page.drawText("DEVELOPMENT DRAFT - NOT FOR FILING", {
      x: 36,
      y: 20,
      size: 8,
      font,
      color: rgb(.55, 0, 0),
    });
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
