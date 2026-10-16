import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateRetirementSources2026,
  type RetirementSource2026,
} from "../inputs/retirement-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Static development attachment; source replay preserves owner-specific tax and identity. */
export async function buildForm8606PdfBytes2026(
  raw: RetirementSource2026,
  owner: "taxpayer" | "spouse",
  form1040Line4b: number,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const r = calculateRetirementSources2026(raw);
  const ownerTin = owner === "taxpayer" ? raw.taxpayer_ssn : raw.spouse_ssn;
  const part = r.ira_basis?.calculation.forms.find((o) =>
    o.owner_tin === ownerTin
  );
  if (
    !part?.requires_form8606 || form1040Line4b !== r.lines.line4b_ira_taxable
  ) {
    throw Error(
      "Form 8606 draft needs source-derived owner basis and matching Form 1040 line 4b",
    );
  }
  if (!filer.name.trim() || filer.ssn.replaceAll("-", "") !== part.owner_tin) {
    throw Error("Form 8606 draft needs the individual IRA owner's identity");
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8606.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8606--dft.pdf",
    "4d7e8fe466cf0534817d78bc5e6e84d78971b59cbbed0523eaa6448a20c2f2a6",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  const key = (page: number, n: number) =>
    `topmostSubform[0].Page${page}[0].f${page}_${n}[0]`;
  if (doc.getPageCount() !== 3 || form.getFields().length !== 47) {
    throw new Error("Form 8606 draft field/page contract changed");
  }
  const fill = (page: number, n: number, value: string | number) => {
    const field = form.getTextField(key(page, n));
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    const text = String(value),
      size = Math.min(
        9,
        9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
    if (size < 6) {
      throw new Error("Form 8606 value exceeds its printable field");
    }
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  if (part.partI) {
    const p = part.partI;
    const fields: Record<string, [number, number]> = {
      line1: [1, 11],
      line2: [1, 12],
      line3: [1, 13],
      line4: [1, 14],
      line5: [1, 15],
      line6: [1, 16],
      line7: [1, 17],
      line8: [1, 18],
      line9: [1, 19],
      line11: [1, 22],
      line12: [1, 23],
      line13: [1, 24],
      line14: [1, 25],
      line15a: [2, 1],
      line15b: [2, 2],
      line15c: [2, 3],
    };
    for (const [line, [page, field]] of Object.entries(fields)) {
      const value = (p as Record<string, number | undefined>)[line];
      if (value !== undefined) fill(page, field, value);
    }
    if (p.line10 !== undefined) {
      const decimal = p.line10.toFixed(5).replace(/0{1,2}$/, "");
      const [whole, fraction] = decimal.split(".");
      fill(1, 20, whole);
      fill(1, 21, fraction);
    }
  }
  if (part.partII) {
    fill(2, 4, part.partII.line16);
    fill(2, 5, part.partII.line17);
    fill(2, 6, part.partII.line18);
  }
  // Attached to Form 1040: standalone mailing address, Part III, signatures
  // and paid-preparer fields remain blank.
  form.updateFieldAppearances(font);
  form.flatten();
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(doc, [1, 2])) {
    page.node.delete(PDFName.of("Annots"));
    out.addPage(page);
  }
  const footer = await out.embedFont(StandardFonts.Helvetica);
  for (const page of out.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 2,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
    page.drawText("INCOMPLETE 2026 IMPLEMENTATION", {
      x: 350,
      y: 2,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
    // Drawing initializes an empty Annots array in pdf-lib; remove it after
    // the final draw so standalone components retain the static-PDF contract.
    page.node.delete(PDFName.of("Annots"));
  }
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}
