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
export async function buildForm5329PdfBytes2026(
  raw: RetirementSource2026,
  owner: "taxpayer" | "spouse",
  schedule2Line5: number,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const r = calculateRetirementSources2026(raw);
  const part = r.early_owners.find((o) => o.owner === owner);
  if (!part?.file_form5329 || schedule2Line5 !== r.line5_early_tax) {
    throw new Error(
      "Form 5329 draft needs source-derived owner tax and matching Schedule 2 line 5",
    );
  }
  if (!filer.name.trim() || filer.ssn.replaceAll("-", "") !== part.owner_tin) {
    throw new Error(
      "Form 5329 draft needs the individual distribution owner's identity",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f5329.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f5329--dft.pdf",
    "f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  const key = (n: number) => `topmostSubform[0].Page1[0].f1_${n}[0]`;
  if (doc.getPageCount() !== 4 || form.getFields().length !== 85) {
    throw new Error("Form 5329 draft field/page contract changed");
  }
  const fill = (n: number, value: string | number) => {
    const field = form.getTextField(key(n));
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    const text = String(value),
      size = Math.min(
        9,
        9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
    if (size < 6) {
      throw new Error("Form 5329 value exceeds its printable field");
    }
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  fill(11, part.line1);
  if (part.exception_code) {
    fill(12, part.exception_code);
    fill(13, part.line2);
  }
  fill(14, part.line3);
  fill(15, part.line4);
  // Other parts and signature remain blank.
  form.updateFieldAppearances(font);
  form.flatten();
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(doc, [1, 2, 3])) {
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
