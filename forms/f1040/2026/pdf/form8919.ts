import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm8919_2026,
  type Form8919Input2026,
} from "../inputs/form8919.ts";
import { loadPinnedDraft2026 } from "./source.ts";

type Identity = { name: string; ssn: string };
const digits = (value: string) => value.replaceAll("-", "");
const printSsn = (value: string) => {
  const n = digits(value);
  return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`;
};

/** One static first page per owner, with additional firm rows on continuation copies. */
export async function buildForm8919PdfBytes2026(
  raw: Form8919Input2026,
  destinations: {
    form1040_line1g: number;
    schedule2_line16b: number;
    form8919_withholding_component: number;
  },
  filers: { taxpayer: Identity; spouse?: Identity },
): Promise<Uint8Array> {
  const result = calculateForm8919_2026(raw);
  if (!result.forms.length) {
    throw new Error("Form 8919 PDF needs employee wage sources");
  }
  if (
    destinations.form1040_line1g !==
      result.forms.reduce((n, f) => n + f.line6, 0) ||
    destinations.schedule2_line16b !==
      result.forms.reduce((n, f) => n + f.line13, 0) ||
    destinations.form8919_withholding_component !== result.withholding
  ) {
    throw new Error(
      "Form 8919 PDF destinations disagree with calculated sources",
    );
  }
  for (const calculated of result.forms) {
    const identity = filers[calculated.recipient];
    const expected = calculated.recipient === "taxpayer"
      ? raw.taxpayer_ssn
      : raw.spouse_ssn;
    if (
      !identity?.name.trim() || !expected ||
      digits(identity.ssn) !== digits(expected)
    ) {
      throw new Error("Form 8919 PDF needs matching recipient identity");
    }
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8919.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8919--dft.pdf",
    "75f93ccf99e6c06effb2d880909e6c90b194703aa10abdbcbf9a3d3f09885bbf",
  );
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  const prefix = "topmostSubform[0].Page1[0].";
  for (const calculated of result.forms) {
    const identity = filers[calculated.recipient]!;
    for (let offset = 0; offset < calculated.employers.length; offset += 5) {
      const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = draft.getForm();
      if (form.getFields().length !== 40 || draft.getPageCount() !== 3) {
        throw new Error("Form 8919 template field inventory changed");
      }
      const font = await draft.embedFont(StandardFonts.Helvetica);
      const fill = (fieldName: string, value: string | number) => {
        const field = form.getTextField(prefix + fieldName);
        const rect = field.acroField.getWidgets()[0].getRectangle();
        const text = String(value);
        const size = Math.min(
          9,
          9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
        );
        if (size < 6) {
          throw new Error("Form 8919 text exceeds its printable field");
        }
        field.setFontSize(size);
        if (typeof value === "number") field.setAlignment(TextAlignment.Right);
        field.setText(text);
      };
      fill("f1_1[0]", identity.name);
      fill("f1_2[0]", printSsn(identity.ssn));
      calculated.employers.slice(offset, offset + 5).forEach(
        (employer, index) => {
          const row = `Pg1Table[0].Row${index + 1}[0].`;
          const first = 3 + 5 * index;
          const tin = employer.tin ? digits(employer.tin) : undefined;
          fill(`${row}f1_${first}[0]`, employer.name);
          fill(
            `${row}f1_${first + 1}[0]`,
            tin
              ? employer.tin_type === "ssn"
                ? printSsn(tin)
                : `${tin.slice(0, 2)}-${tin.slice(2)}`
              : "unknown",
          );
          fill(`${row}f1_${first + 2}[0]`, employer.reason_code);
          const date = employer.correspondence_received_date;
          if (date) {
            fill(
              `${row}f1_${first + 3}[0]`,
              `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}`,
            );
          }
          if (employer.form1099_received) {
            form.getCheckBox(`${prefix}${row}c1_${index + 1}[0]`).check();
          }
          fill(`${row}f1_${first + 4}[0]`, employer.wages);
        },
      );
      if (offset === 0) {
        fill("f1_28[0]", calculated.line6);
        // Line 7 is preprinted; its one-point dummy widget must remain empty.
        for (let line = 8; line <= 13; line++) {
          fill(
            `f1_${line + 22}[0]`,
            calculated[
              `line${line}` as
                | "line8"
                | "line9"
                | "line10"
                | "line11"
                | "line12"
                | "line13"
            ],
          );
        }
      }
      form.updateFieldAppearances(font);
      form.flatten();
      const [page] = await doc.copyPages(draft, [1]);
      doc.addPage(page);
      page.drawText("DRAFT - NOT FOR FILING", {
        x: 36,
        y: 12,
        font: footer,
        size: 8,
        color: rgb(0.4, 0.1, 0.1),
        opacity: 1,
      });
      page.node.delete(PDFName.of("Annots"));
    }
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
