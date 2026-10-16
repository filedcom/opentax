import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm4852Sources2026,
  type Form4852Source2026,
} from "../inputs/form4852-source.ts";
import { form4852IraMarginLabel } from "../../nodes/inputs/income/wages/f4852/retirement-account.ts";
import { FormType } from "../../nodes/inputs/income/wages/f4852/index.ts";
import { loadPinnedDraft2026 } from "./source.ts";
/** Standalone reviewed source draft. This does not assert that the corresponding
 * 1040 calculation, public intake or MeF attachment has been completed. */
export async function buildForm4852PdfBytes2026(
  raw: Form4852Source2026,
  filers: readonly { ssn: string; name: string; address: string }[],
) {
  const r = calculateForm4852Sources2026(raw);
  const owners = [...new Set(r.rows.map((row) => row.source.owner_tin))];
  if (
    filers.length !== owners.length ||
    new Set(filers.map((f) => f.ssn)).size !== filers.length ||
    filers.some((f) =>
      !owners.includes(f.ssn) || !f.name.trim() || !f.address.trim()
    )
  ) {
    throw Error(
      "Form 4852 PDF needs each actual substitute owner and address once",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/authorities/f4852--2020.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-pdf/f4852.pdf",
    "810e5e4df3022cf5421094b1d19dcf47eee020c751c47585b72d3249309cd066",
  );
  const output = await PDFDocument.create(),
    font = await output.embedFont(StandardFonts.Helvetica);
  const attachments: {
    reference: string;
    formPages: number[];
    statementPages: number[];
  }[] = [];
  for (const { source: s } of r.rows) {
    const filer = filers.find((f) => f.ssn === s.owner_tin)!;
    const doc = await PDFDocument.load(bytes), form = doc.getForm();
    const prefix = "topmostSubform[0].Page1[0].";
    const path = (i: number) =>
      `${prefix}${
        i >= 7 && i <= 11
          ? "Line7Lft[0]."
          : i >= 12 && i <= 17
          ? "Line7Rght[0]."
          : i >= 18 && i <= 20
          ? "Line8Lft[0]."
          : i >= 21 && i <= 28
          ? "Line8Rght[0]."
          : ""
      }f1_${i}[0]`;
    const expected = [
      ...Array.from({ length: 30 }, (_, i) => path(i + 1)),
      `${prefix}c1_1[0]`,
      `${prefix}c1_1[1]`,
      `${prefix}Line8Lft[0].c1_2[0]`,
      `${prefix}Line8Lft[0].c1_3[0]`,
    ];
    if (
      doc.getPageCount() !== 2 || form.getFields().length !== 34 ||
      form.getFields().some((f) =>
        !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
      )
    ) throw Error("Form 4852 template field inventory changed");
    const fieldFont = await doc.embedFont(StandardFonts.Helvetica);
    const fill = (i: number, value: string | number) => {
      const field = form.getTextField(path(i)),
        rect = field.acroField.getWidgets()[0].getRectangle();
      const text = typeof value === "number" ? value.toFixed(2) : value;
      const lines = text.split("\n");
      const size = Math.min(
        9,
        9 * (rect.width - 4) /
          Math.max(1, ...lines.map((t) => fieldFont.widthOfTextAtSize(t, 9))),
      );
      if (size < 6 || lines.length * Math.max(size, 8) > rect.height - 2) {
        throw Error("Form 4852 value exceeds printable field");
      }
      if (lines.length > 1) field.enableMultiline();
      if (typeof value === "number") field.setAlignment(TextAlignment.Right);
      field.setFontSize(size);
      field.setText(text);
    };
    fill(1, filer.name);
    fill(2, filer.ssn);
    fill(3, filer.address);
    fill(4, "2026");
    fill(
      5,
      `${s.payer_name}\n${s.payer_address.street}, ${s.payer_address.city}, ${s.payer_address.state} ${s.payer_address.postal_code}`,
    );
    fill(6, s.payer_tin);
    form.getCheckBox(`${prefix}c1_1[${s.kind === "w2" ? 0 : 1}]`).check();
    if (s.kind === "w2") {
      const a = s.amounts;
      for (
        const [i, n] of [
          [7, a.wages],
          [8, a.social_security_wages],
          [9, a.medicare_wages],
          [10, a.social_security_tips],
          [11, a.federal_withheld],
          [12, a.state_tax_withheld],
          [14, a.local_tax_withheld],
          [16, a.social_security_withheld],
          [17, a.medicare_withheld],
        ]
      ) fill(i, n);
      if (a.state_name) fill(13, a.state_name);
      if (a.locality_name) fill(15, a.locality_name);
    } else {
      const a = s.amounts;
      for (
        const [i, n] of [
          [18, a.gross_distribution],
          [20, a.capital_gain],
          [21, a.federal_withheld],
          [22, a.state_tax_withheld],
          [24, a.local_tax_withheld],
          [26, a.employee_contributions],
        ]
      ) fill(i, n);
      if (a.taxable_amount !== undefined) fill(19, a.taxable_amount);
      if (a.taxable_amount_not_determined) {
        form.getCheckBox(`${prefix}Line8Lft[0].c1_2[0]`).check();
      }
      if (a.total_distribution) {
        form.getCheckBox(`${prefix}Line8Lft[0].c1_3[0]`).check();
      }
      if (a.state_name) fill(23, a.state_name);
      if (a.locality_name) fill(25, a.locality_name);
      fill(27, a.distribution_code.split("").join(", "));
      const label = form4852IraMarginLabel({
        form_type: FormType.R_1099,
        distribution_code: a.distribution_code,
        is_ira: a.is_ira,
        distribution_source: s.distribution_sources[0],
      });
      if (label) fill(28, label);
    }
    // Keep source narratives complete even when the form's two short lines
    // cannot fit them; the form explicitly points to its linked statement.
    const statements: { line: number; text: string }[] = [];
    for (
      const [line, text] of [[9, s.estimation_method], [
        10,
        s.payer_efforts_explanation,
      ]] as const
    ) {
      if (
        text.length <= 100 && !text.includes("\n") &&
        fieldFont.widthOfTextAtSize(text, 9) <= 536
      ) {
        fill(line === 9 ? 29 : 30, text);
      } else {
        fill(line === 9 ? 29 : 30, `See attached statement for line ${line}.`);
        statements.push({ line, text });
      }
    }
    form.updateFieldAppearances(fieldFont);
    form.flatten();
    const [page] = await output.copyPages(doc, [0]);
    output.addPage(page);
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 10,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
    const attachment = {
      reference: s.source_document_reference,
      formPages: [output.getPageCount()],
      statementPages: [] as number[],
    };
    let statementPage: ReturnType<typeof output.addPage> | undefined, y = 0;
    const newPage = () => {
      statementPage = output.addPage([612, 792]);
      attachment.statementPages.push(output.getPageCount());
      y = 698;
      statementPage.drawText("2026 Form 4852 - supporting statement", {
        x: 36,
        y: 756,
        size: 12,
        font,
      });
      statementPage.drawText(`${filer.name} | ${filer.ssn}`, {
        x: 36,
        y: 738,
        size: 9,
        font,
      });
      const payerHeading = `${s.payer_name} | payer TIN ${s.payer_tin}`;
      const headingSize = Math.min(
        9,
        9 * 540 / font.widthOfTextAtSize(payerHeading, 9),
      );
      if (headingSize < 6) {
        throw Error(
          "Form 4852 statement payer name exceeds the printable header",
        );
      }
      statementPage.drawText(payerHeading, {
        x: 36,
        y: 722,
        size: headingSize,
        font,
      });
      statementPage.drawText("DRAFT - NOT FOR FILING", {
        x: 36,
        y: 20,
        size: 8,
        font,
        color: rgb(.4, .1, .1),
      });
    };
    for (const st of statements) {
      if (!statementPage || y < 80) newPage();
      statementPage!.drawText(`Line ${st.line}`, {
        x: 36,
        y,
        size: 10,
        font,
      });
      y -= 18;
      for (const paragraph of st.text.split("\n")) {
        let line = "";
        for (const word of paragraph.split(/\s+/)) {
          if (font.widthOfTextAtSize(word, 9) > 540) {
            throw Error(
              "Form 4852 statement contains an unbreakable overlong word",
            );
          }
          const next = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(next, 9) > 540) {
            if (y < 45) newPage();
            statementPage!.drawText(line, { x: 36, y, size: 9, font });
            y -= 12;
            line = word;
          } else line = next;
        }
        if (y < 45) newPage();
        statementPage!.drawText(line, { x: 36, y, size: 9, font });
        y -= 14;
      }
      y -= 12;
    }
    attachments.push(attachment);
  }
  output.catalog.delete(PDFName.of("AcroForm"));
  return {
    bytes: await output.save({ updateFieldAppearances: false }),
    attachments,
    source: r,
    filingReady: false as const,
  };
}
