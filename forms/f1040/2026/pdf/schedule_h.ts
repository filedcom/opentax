import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateHousehold2026,
  type HouseholdSource2026,
} from "../inputs/household-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";
export async function buildScheduleHPdfBytes2026(
  raw: HouseholdSource2026,
  destinations: { schedule2_line17a: number },
  employer: { name: string; ssn: string },
) {
  const r = calculateHousehold2026(raw);
  if (
    !r.file_schedule_h || !employer.name.trim() ||
    employer.ssn.replaceAll("-", "") !== r.source_input.claim.employer_tin ||
    destinations.schedule2_line17a !== r.total_tax
  ) {
    throw new Error(
      "Schedule H PDF needs matching employer and calculated tax destination",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040sh.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040sh--dft.pdf",
    "0fbdf600ded379d23f381286a3f9b35d15af062c83072b50de149d5c5afb3077",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = draft.getForm();
  if (
    draft.getPageCount() !== 3 || form.getFields().length !== 72 ||
    form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
  ) throw new Error("Schedule H template inventory changed");
  const prefix = (page: number) => `topmostSubform[0].Page${page}[0].`;
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (page: number, index: number, value: string | number) => {
    const field = form.getTextField(
      prefix(page) + (page === 1 && index === 3 ? "CombField[0]." : "") +
        `f${page}_${index}[0]`,
    );
    const rect = field.acroField.getWidgets()[0].getRectangle(),
      text = String(value),
      size = Math.min(
        9,
        9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
    if (size < 6) throw new Error("Schedule H text exceeds printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  const check = (page: number, group: number, index: number) =>
    form.getCheckBox(
      prefix(page) + (page === 2 && group === 1 ? "Line10[0]." : "") +
        `c${page}_${group}[${index}]`,
    ).check();
  fill(1, 1, employer.name);
  fill(1, 2, employer.ssn);
  fill(1, 3, r.source_input.claim.employer_ein);
  check(1, 1, r.answers.a ? 0 : 1);
  if (r.answers.b !== undefined) check(1, 2, r.answers.b ? 0 : 1);
  if (r.answers.c !== undefined) check(1, 3, r.answers.c ? 1 : 0);
  if (r.answers.line9 !== undefined) check(1, 4, r.answers.line9 ? 0 : 1);
  for (const [key, value] of Object.entries(r.lines)) {
    const line = Number(key.slice(4));
    if (line <= 8) fill(1, line + 3, value);
    else {fill(
        2,
        ({ 14: 2, 15: 3, 16: 4, 25: 31, 26: 32 } as Record<number, number>)[
          line
        ],
        value,
      );}
  }
  if (r.lines.line26 !== undefined) {
    for (const group of [1, 2, 3]) check(2, group, 0);
    fill(2, 1, r.source_input.claim.state_unemployment!.state);
    check(2, 5, 0);
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create(),
    footer = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of await doc.copyPages(draft, [1, 2])) {
    doc.addPage(page);
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
