import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateCareCredit2026,
  type CareCreditInput2026,
} from "../nodes/f2441.ts";
import { loadPinnedDraft2026 } from "./source.ts";

export async function buildForm2441PdfBytes2026(
  raw: CareCreditInput2026,
  destinations: {
    form1040_line1e: number;
    form1040_line11b: number;
    form1040_line18: number;
    schedule3_line2: number;
  },
  filer: { name: string; ssn: string },
) {
  const r = calculateCareCredit2026(raw);
  if (!r.file_form2441 || !r.lines || !r.benefit.details) {
    throw new Error("No Form 2441 to attach");
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !==
      raw.benefit_source.taxpayer_ssn.replaceAll("-", "")
  ) {
    throw new Error("Form 2441 needs matching filer identity");
  }
  const l = r.lines;
  if (
    l.line26 !== destinations.form1040_line1e ||
    l.line7 !== destinations.form1040_line11b ||
    l.line10 !== destinations.form1040_line18 ||
    l.line11 !== destinations.schedule3_line2
  ) {
    throw new Error(
      "Form 2441 PDF destinations disagree with calculated source lines",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f2441.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f2441--dft.pdf",
    "67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const fields = form.getFields();
  if (draft.getPageCount() !== 3 || fields.length !== 72) {
    throw new Error("Form 2441 template inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const name = (id: string, index = 0) => {
    const matches = fields.filter((f) =>
      f.getName().endsWith(`.${id}[${index}]`)
    );
    if (matches.length !== 1) {
      throw new Error(`Missing or ambiguous Form 2441 widget ${id}`);
    }
    return matches[0].getName();
  };
  const fill = (id: string, value: string | number) => {
    const field = form.getTextField(name(id));
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error(`Form 2441 ${id} text exceeds field width`);
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  const check = (id: string, index = 0) =>
    form.getCheckBox(name(id, index)).check();
  fill("f1_1", filer.name);
  fill("f1_2", filer.ssn);
  const providers = [...r.benefit.details.care_providers].sort((a, b) =>
    b.amount_paid - a.amount_paid
  );
  const people = [...r.benefit.details.qualifying_people].sort((a, b) =>
    b.credit_expenses_paid - a.credit_expenses_paid
  );
  const providerName = (p: typeof providers[number]) =>
    p.kind === "person" ? `${p.first_name} ${p.last_name}` : p.name;
  const providerTin = (p: typeof providers[number]) =>
    p.kind === "person" ? p.ssn : p.ein;
  for (const [i, p] of providers.slice(0, 3).entries()) {
    fill(`f1_${3 + i}`, providerName(p));
    // The source address widget has six lines; street has two, apartment one.
    // Static overlays align each item with its printed label.
    const rect = form.getTextField(name(`f1_${6 + i}`)).acroField
      .getWidgets()[0].getRectangle();
    const a = p.us_address;
    for (
      const [text, offset] of [
        [a.line1, 8],
        [a.line2 ?? "", 32],
        [a.city, 44],
        [a.state, 56],
        [a.zip, 68],
      ] as const
    ) {
      if (!text) continue;
      const size = Math.min(
        8,
        8 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 8)),
      );
      if (size < 6) {
        throw new Error("Form 2441 provider address exceeds printed row");
      }
      draft.getPage(1).drawText(text, {
        x: rect.x + 2,
        y: rect.y + rect.height - offset,
        font,
        size,
      });
    }
    fill(`f1_${9 + i}`, providerTin(p));
    check(`c1_${4 + i}`, p.household_employee ? 0 : 1);
    fill(`f1_${12 + i}`, p.amount_paid);
  }
  if (providers.length > 3) check("c1_3");
  if (people.length > 3) check("c1_7");
  for (const [i, p] of people.slice(0, 3).entries()) {
    fill(`f1_${15 + i * 4}`, p.first_name);
    fill(`f1_${16 + i * 4}`, p.last_name);
    fill(`f1_${17 + i * 4}`, p.ssn);
    fill(`f1_${18 + i * 4}`, p.credit_expenses_paid);
    if (p.over_12_and_disabled) check(`c1_${8 + i}`);
  }
  // IRS draft has no AcroForm widget for this printed answer.
  draft.getPage(1).drawText("X", {
    x: 264,
    y: r.part3 ? 393 : 411,
    font,
    size: 9,
  });
  const creditLines = [
    "line3",
    "line4",
    "line5",
    "line6",
    "line7",
    "line8",
    "line9a",
    "line9b",
    "line9c",
    "line10",
    "line11",
  ] as const;
  for (const [i, key] of creditLines.entries()) {
    fill(`f1_${27 + i}`, key === "line8" ? Math.round(l.line8 * 100) : l[key]);
  }
  if (r.part3) {
    check("c2_1", 0);
    for (let line = 12; line <= 31; line++) {
      fill(`f2_${line - 11}`, l[`line${line}` as keyof typeof l]);
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  for (const p of await doc.copyPages(draft, r.part3 ? [1, 2] : [1])) {
    doc.addPage(p);
  }
  const outputFont = await doc.embedFont(StandardFonts.Helvetica);
  const statements: { title: string; rows: string[] }[] = [];
  if (providers.length > 3) {
    statements.push({
      title: "Additional care providers",
      rows: providers.slice(3).map((p) => {
        const a = p.us_address;
        return `${providerName(p)} | ${a.line1}${
          a.line2 ? `, ${a.line2}` : ""
        }, ${a.city}, ${a.state} ${a.zip} | ID ${
          providerTin(p)
        } | Household employee: ${
          p.household_employee ? "Yes" : "No"
        } | Amount paid: $${p.amount_paid}`;
      }),
    });
  }
  if (people.length > 3) {
    statements.push({
      title: "Additional qualifying people",
      rows: people.slice(3).map((p) =>
        `${p.first_name} ${p.last_name} | SSN ${p.ssn} | Over 12 and disabled: ${
          p.over_12_and_disabled ? "Yes" : "No"
        } | Credit expenses: $${p.credit_expenses_paid}`
      ),
    });
  }
  for (const s of statements) {
    let page = doc.addPage([612, 792]), y = 706;
    const header = () => {
      page.drawText(`Form 2441 - ${s.title}`, {
        x: 36,
        y: 754,
        font: outputFont,
        size: 12,
      });
      page.drawText(`${filer.name}   SSN ${filer.ssn}`, {
        x: 36,
        y: 735,
        font: outputFont,
        size: 9,
      });
    };
    header();
    for (const row of s.rows) {
      let text = "";
      const write = () => {
        if (y < 52) {
          page = doc.addPage([612, 792]);
          y = 706;
          header();
        }
        page.drawText(text, { x: 36, y, font: outputFont, size: 10 });
        y -= 14;
        text = "";
      };
      for (const word of row.split(/\s+/)) {
        if (outputFont.widthOfTextAtSize(word, 10) > 540) {
          throw new Error("Form 2441 statement word exceeds page width");
        }
        if (
          outputFont.widthOfTextAtSize(text ? `${text} ${word}` : word, 10) >
            540
        ) write();
        text = text ? `${text} ${word}` : word;
      }
      if (text) write();
      y -= 7;
    }
  }
  for (const p of doc.getPages()) {
    p.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: outputFont,
      size: 8,
      color: rgb(.4, .1, .1),
    });
    p.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}
