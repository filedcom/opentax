import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateHsaReturnSources2026,
  type HsaReturnSource2026,
} from "../inputs/hsa-source.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { loadPinnedDraft2026 } from "./source.ts";

export type HsaDestinations2026 = Pick<
  ReturnType<typeof calculateHsaReturnSources2026>,
  | "schedule1_line8f"
  | "schedule1_line13"
  | "schedule1_line8z_earnings"
  | "schedule1_line8z_employer"
  | "schedule2_line13c"
  | "schedule2_line13d"
  | "schedule2_line18"
>;

/** Reconcile actual return destinations before printing an owner's source-derived form. */
export async function buildForm8889PdfBytes2026(
  raw: HsaReturnSource2026,
  owner: "taxpayer" | "spouse",
  destinations: HsaDestinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const r = calculateHsaReturnSources2026(raw);
  for (
    const key of [
      "schedule1_line8f",
      "schedule1_line13",
      "schedule1_line8z_earnings",
      "schedule1_line8z_employer",
      "schedule2_line13c",
      "schedule2_line13d",
      "schedule2_line18",
    ] as const
  ) {
    if (destinations[key] !== r[key]) {
      throw Error(
        "Form 8889 draft needs matching source-derived Schedule 1 and 2 destinations",
      );
    }
  }
  const o = r.owners.find((o) => o.owner === owner);
  if (!o?.file_form8889) {
    throw Error("Form 8889 draft needs a reportable HSA owner");
  }
  if (!filer.name.trim() || filer.ssn.replaceAll("-", "") !== o.owner_tin) {
    throw Error(
      "Form 8889 draft needs the individual account owner's identity",
    );
  }
  const doc = await PDFDocument.load(
    await loadPinnedDraft2026(
      new URL(
        "../../../../docs/ty2026/corpus/draft/f8889.pdf",
        import.meta.url,
      ),
      "https://www.irs.gov/pub/irs-dft/f8889--dft.pdf",
      "c94550b7d4b735b11e9901c5dbff5dab0aa6dcbbefab04864c61cd5275cafec8",
    ),
    { ignoreEncryption: true },
  );
  const form = doc.getForm(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  if (doc.getPageCount() !== 2 || form.getFields().length !== 27) {
    throw Error("Form 8889 draft field/page contract changed");
  }
  const prefix = "topmostSubform[0].Page1[0].";
  const fill = (n: number, value: string | number) => {
    const field = form.getTextField(`${prefix}f1_${n}[0]`);
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    const text = String(value);
    const size = Math.min(
      9,
      9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw Error("Form 8889 value exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const l = o.form8889;
  if (l.line1 !== undefined) {
    form.getCheckBox(
      `${prefix}c1_1[${l.line1 === CoverageType.Family ? 1 : 0}]`,
    ).check();
  }
  if (l.line17a) form.getCheckBox(`${prefix}c1_2[0]`).check();
  const fields = [
    l.line2,
    l.line3,
    l.line4,
    l.line5,
    l.line6,
    l.line7,
    l.line8,
    l.line9,
    l.line10,
    l.line11,
    l.line12,
    l.line13,
    l.line14a,
    l.line14b,
    l.line14c,
    l.line15,
    l.line16,
    l.line17b,
    l.line18,
    l.line19,
    l.line20,
    l.line21,
  ];
  fields.forEach((value, i) => fill(i + 3, value));
  form.updateFieldAppearances(font);
  form.flatten();
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(doc, [1]);
  out.addPage(page);
  const footer = await out.embedFont(StandardFonts.Helvetica);
  for (
    const [text, x] of [["DRAFT - NOT FOR FILING", 36], [
      "INCOMPLETE 2026 IMPLEMENTATION",
      350,
    ]] as const
  ) {
    page.drawText(text, {
      x,
      y: 2,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
  }
  page.node.delete(PDFName.of("Annots"));
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}
