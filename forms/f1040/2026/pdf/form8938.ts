import {
  PDFDocument,
  type PDFFont,
  PDFHexString,
  PDFName,
  PDFString,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  detailFields,
  form8938Pdf,
  putTaxRows,
} from "../../2025/pdf/forms/general/foreign/f8938.ts";
import { isPartVAccount } from "../../2025/mef/forms/general/foreign/f8938_projection.ts";
import { calculateForeignAssetReturn2026 } from "../inputs/foreign-assets-return.ts";
import { loadPinnedDraft2026 } from "./source.ts";

type Source = Parameters<typeof calculateForeignAssetReturn2026>[0];
type Filer = { name: string; ssn: string };
const fieldMap = [...form8938Pdf.fields, ...form8938Pdf.filerFields!].map((
  entry,
) => ({
  ...entry,
  pdfField: entry.pdfField.replace(/\.f([12])_0([1-9])\[/, ".f$1_$2["),
}));
for (const [prefix, first] of [["account", 7], ["other", 22]] as const) {
  for (let i = 0; i < 4; i++) {
    fieldMap.push({
      kind: "text",
      domainKey: `${prefix}Giin${i}`,
      pdfField: `topmostSubform[0].Page2[0].f2_${first + i}[0]`,
    });
  }
}

/** Replays source-to-return bindings; never accepts a caller's computed disclosure. */
export function foreignAssetPrintPlan2026(raw: Source, filer: Filer) {
  const result = calculateForeignAssetReturn2026(raw);
  if (!result?.filing_required) {
    throw Error("This return does not require Form 8938");
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !==
      result.source_input.settled_return.taxpayer_ssn
  ) {
    throw Error("Form 8938 PDF needs matching filer identity");
  }
  const { summary, asset_values } = result.valuation;
  const assets = result.assets.map((asset) => ({
    ...asset,
    // Beneficial interests and MFS joint assets can have distinct threshold and reported values.
    maximum_value_usd:
      asset_values.find((v) => v.asset_reference === asset.asset_id)!
        .maximum_reported_dollars,
  }));
  const accounts = assets.filter(isPartVAccount),
    others = assets.filter((a) => !isPartVAccount(a));
  const fields: Record<string, unknown> = {
    calendarYearSuffix: "26",
    nameLine1: filer.name,
    primarySSN: filer.ssn,
    specifiedIndividual: true,
    ...summary.partI,
    ...summary.partII,
  };
  for (const [form, count] of Object.entries(summary.partIV)) {
    fields[`partIV_${form}`] = count;
  }
  putTaxRows(fields, 13, result.tax_items.account);
  putTaxRows(fields, 14, result.tax_items.other);
  const details = (
    account?: typeof assets[number],
    other?: typeof assets[number],
  ) => {
    const values = detailFields(account, other, 2026);
    for (const key of ["otherAcquired", "otherDisposed"]) {
      const date = values[key];
      if (typeof date === "string") {
        values[key] = `${date.slice(5, 7)}/${date.slice(8, 10)}/${
          date.slice(0, 4)
        }`;
      }
    }
    for (
      const [prefix, asset] of [["account", account], ["other", other]] as const
    ) {
      if (!asset) continue;
      const source = result.source_input.claim!.assets.find((a) =>
        a.asset_id === asset.asset_id
      )!;
      // The shared valuation retains a document reference, not a display label.
      // Use the reviewed source kind rather than guessing Treasury from its name.
      values[`${prefix}ExchangeSource`] =
        source.fx.source === "other_public_source"
          ? source.fx.document_reference
          : undefined;
      const giin = source.giin;
      if (giin) {
        if (prefix === "other" && !values.otherEntityName) {
          throw Error(
            "A GIIN requires a Part V institution or Part VI foreign entity",
          );
        }
        giin.split(".").forEach((part, i) =>
          values[`${prefix}Giin${i}`] = part
        );
      }
    }
    return values;
  };
  // The first printed page 2 has one account and one other asset. Each extra
  // asset receives its own statement, with the unused part left blank.
  return {
    result,
    copies: [
      {
        fields: { ...fields, ...details(accounts[0], others[0]) },
        pages: [1, 2],
      },
      ...accounts.slice(1).map((a) => ({ fields: details(a), pages: [2] })),
      ...others.slice(1).map((a) => ({
        fields: details(undefined, a),
        pages: [2],
      })),
    ],
  };
}

function wrap(
  font: PDFFont,
  text: string,
  width: number,
  size: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const joined = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(joined, size) <= width) {
        line = joined;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Static development draft, including per-asset continuation and overflow pages. */
export async function buildForm8938PdfBytes2026(
  raw: Source,
  filer: Filer,
): Promise<Uint8Array> {
  const plan = foreignAssetPrintPlan2026(raw, filer);
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8938.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8938--dft.pdf",
    "39a92cb3e8c67dc507a1fd53ff031081b8070f853da8574eace54e3f0e2b8a4c",
  );
  const output = await PDFDocument.create(),
    font = await output.embedFont(StandardFonts.Helvetica);
  const identity = wrap(
    font,
    `${filer.name} | TIN ${filer.ssn} | 2026`,
    540,
    7,
  );
  if (identity.length > 2) {
    throw Error("Form 8938 filer identity exceeds footer space");
  }
  const documents = [];
  const supplements: { label: string; lines: string[] }[] = [];
  for (const [copy, entry] of plan.copies.entries()) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
      form = doc.getForm();
    if (
      doc.getPageCount() !== 3 || form.getFields().length !== 131 ||
      form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
    ) {
      throw Error("Form 8938 template field inventory changed");
    }
    for (const mapping of fieldMap) {
      const value = entry.fields[mapping.domainKey];
      const field = form.getField(mapping.pdfField); // Validate every reused field path, even blank ones.
      if (value === undefined || value === null || value === "") continue;
      if (mapping.kind === "checkbox" || mapping.kind === "checkboxWhen") {
        const checked = mapping.kind === "checkbox"
          ? value === true
          : String(value) === mapping.whenValue;
        if (checked) form.getCheckBox(field.getName()).check();
      } else if (mapping.kind === "text") {
        if (value === 0 && !mapping.printZero) continue;
        const textField = form.getTextField(field.getName());
        const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
        let text = String(value),
          size = Math.min(
            9,
            9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
          );
        if (size < 7) {
          const label = `S${supplements.length + 1}`;
          const alternate = field.acroField.dict.get(PDFName.of("TU"));
          const tooltip =
            alternate instanceof PDFString || alternate instanceof PDFHexString
              ? alternate.decodeText()
              : mapping.domainKey;
          const lines = wrap(
            font,
            `Form copy ${copy + 1}; ${tooltip}\n${text}`,
            540,
            10,
          );
          supplements.push({ label, lines });
          text = label;
          size = 8;
          if (font.widthOfTextAtSize(text, size) > width) {
            throw Error("Form 8938 overflow reference exceeds field width");
          }
        }
        textField.setFontSize(size);
        if (typeof value === "number") {
          textField.setAlignment(TextAlignment.Right);
        }
        textField.setText(text);
      }
    }
    documents.push({ doc, pages: entry.pages });
  }
  // Each supplement is paginated independently and each physical continuation
  // sheet is included in the page-1 additional-statement count.
  const supplementPages = supplements.flatMap((s) =>
    Array.from(
      { length: Math.ceil(s.lines.length / 45) },
      (_, i) => ({
        label: s.label,
        part: i + 1,
        lines: s.lines.slice(i * 45, (i + 1) * 45),
      }),
    )
  );
  const additional = plan.copies.length - 1 + supplementPages.length;
  if (additional) {
    const form = documents[0].doc.getForm();
    form.getCheckBox("topmostSubform[0].Page1[0].c1_1[0]").check();
    const count = form.getTextField("topmostSubform[0].Page1[0].f1_6[0]");
    count.setFontSize(9);
    count.setText(String(additional));
  }
  const footer = (page: ReturnType<typeof output.addPage>, label: string) => {
    identity.forEach((line, i) =>
      page.drawText(line, { x: 36, y: 24 - i * 8, size: 7, font })
    );
    page.drawText(`DRAFT - NOT FOR FILING | Form 8938 ${label}`, {
      x: 36,
      y: 6,
      size: 7,
      font,
      color: rgb(.4, .1, .1),
    });
  };
  for (const [i, { doc, pages }] of documents.entries()) {
    const localFont = await doc.embedFont(StandardFonts.Helvetica);
    doc.getForm().updateFieldAppearances(localFont);
    doc.getForm().flatten();
    doc.catalog.delete(PDFName.of("AcroForm"));
    for (const page of doc.getPages()) page.node.delete(PDFName.of("Annots"));
    const flat = await PDFDocument.load(
      await doc.save({ updateFieldAppearances: false }),
    );
    for (const index of pages) {
      const page = output.addPage([612, 792]);
      page.drawPage(await output.embedPage(flat.getPage(index)));
      footer(page, i ? `additional asset statement ${i}` : `page ${index}`);
    }
  }
  for (const supplement of supplementPages) {
    const page = output.addPage([612, 792]);
    page.drawText(
      `2026 Form 8938 - supplement ${supplement.label}, page ${supplement.part}`,
      { x: 36, y: 750, size: 12, font },
    );
    supplement.lines.forEach((line, i) =>
      page.drawText(line, { x: 36, y: 724 - i * 14, size: 10, font })
    );
    footer(page, `supplement ${supplement.label}`);
  }
  for (const page of output.getPages()) page.node.delete(PDFName.of("Annots"));
  return output.save({ updateFieldAppearances: false });
}
