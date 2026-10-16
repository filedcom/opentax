import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm4137_2026,
  type Form4137Input2026,
} from "../inputs/form4137.ts";
import { loadPinnedDraft2026 } from "./source.ts";

type Identity = { name: string; ssn: string };
const digits = (value: string) => value.replaceAll("-", "");

/** Static component; the pinned draft's stale Schedule 2 cross-reference is preserved. */
export async function buildForm4137PdfBytes2026(
  raw: Form4137Input2026,
  destinations: { form1040_line1c: number; schedule2_line16a: number },
  filers: { taxpayer: Identity; spouse?: Identity },
): Promise<Uint8Array> {
  const result = calculateForm4137_2026(raw);
  if (!result.forms.length) throw new Error("Form 4137 PDF needs tip sources");
  if (
    destinations.form1040_line1c !==
      result.forms.reduce((n, f) => n + f.unreportedTips, 0) ||
    destinations.schedule2_line16a !==
      result.forms.reduce((n, f) => n + f.totalTax, 0)
  ) {
    throw new Error(
      "Form 4137 PDF destinations disagree with calculated sources",
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
      throw new Error("Form 4137 PDF needs matching recipient identity");
    }
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f4137.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f4137--dft.pdf",
    "5aa2841964470753f5106136dc9d505c9301c024ef683f014ea1f6bec852dbc0",
  );
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  const prefix = "topmostSubform[0].Page1[0].";
  for (const calculated of result.forms) {
    const identity = filers[calculated.recipient]!;
    for (let offset = 0; offset < calculated.employers.length; offset += 5) {
      const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = draft.getForm();
      if (form.getFields().length !== 34 || draft.getPageCount() !== 3) {
        throw new Error("Form 4137 template field inventory changed");
      }
      const font = await draft.embedFont(StandardFonts.Helvetica);
      const fill = (fieldName: string, value: string | number) => {
        const field = form.getTextField(prefix + fieldName);
        const rect = field.acroField.getWidgets()[0].getRectangle();
        const text = typeof value === "number"
          ? String(Math.round(value))
          : value;
        const size = Math.min(
          9,
          9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
        );
        if (size < 6) {
          throw new Error("Form 4137 text exceeds its printable field");
        }
        field.setFontSize(size);
        if (typeof value === "number") field.setAlignment(TextAlignment.Right);
        field.setText(text);
      };
      fill("f1_1[0]", identity.name);
      const ssn = digits(identity.ssn);
      fill("f1_2[0]", `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}`);
      calculated.employers.slice(offset, offset + 5).forEach(
        (employer, index) => {
          const row = `Table_Line1[0].BodyRow${index + 1}[0].`;
          const first = 3 + 4 * index;
          const ein = digits(employer.ein!);
          fill(`${row}f1_${first}[0]`, employer.name);
          fill(
            `${row}f1_${first + 1}[0]`,
            `${ein.slice(0, 2)}-${ein.slice(2)}`,
          );
          fill(`${row}f1_${first + 2}[0]`, employer.tips_received);
          fill(`${row}f1_${first + 3}[0]`, employer.tips_reported);
        },
      );
      if (offset === 0) {
        const values = [
          calculated.totalTipsReceived,
          calculated.totalTipsReported,
          calculated.unreportedTips,
          calculated.incidentalTips,
          calculated.medicareTips,
          // Line 7's tiny dummy field stays empty; the wage base is preprinted.
          undefined,
          calculated.ssWagesAndTips,
          calculated.ssWageBaseRoom,
          calculated.ssTips,
          calculated.ssTax,
          calculated.medicareTax,
          calculated.totalTax,
        ];
        values.forEach((value, index) => {
          if (value !== undefined) fill(`f1_${23 + index}[0]`, value);
        });
        if (calculated.governmentEmployeeTips > 0) {
          const text = `1.45% tips ${calculated.governmentEmployeeTips}`;
          const size = Math.min(7, 7 * 85 / font.widthOfTextAtSize(text, 7));
          if (size < 6) {
            throw new Error(
              "Form 4137 government tip annotation exceeds its field",
            );
          }
          draft.getPage(1).drawText(text, { x: 405, y: 330, size, font });
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
