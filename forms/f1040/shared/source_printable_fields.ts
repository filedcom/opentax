import {
  decodePDFRawStream,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  type PDFTextField,
  StandardFonts,
} from "pdf-lib";
function appearanceBytes(stream: unknown): string | undefined {
  const value = stream instanceof PDFRawStream
    ? new TextDecoder().decode(decodePDFRawStream(stream).decode())
    : stream instanceof PDFContentStream
    ? stream.getContentsString()
    : undefined;
  // DeviceRGB/DeviceCMYK black and DeviceGray black render the same color.
  return value?.replace(/\b0 0 0 rg\b/g, "0 g").replace(
    /\b0 0 0 1 k\b/g,
    "0 g",
  );
}

/** The supported Copy B uses printable standard Helvetica normal appearances.
 * This does not authenticate the issuer, signatures, or the whole page. */
function assertPrintableField(
  pdf: PDFDocument,
  field: PDFTextField,
  reference: PDFTextField,
  domainKey: string,
  label: string,
) {
  const widgets = field.acroField.getWidgets();
  const expectedWidgets = reference.acroField.getWidgets();
  if (!widgets.length || widgets.length !== expectedWidgets.length) {
    throw new Error(
      `${label} ${domainKey} needs printable field widgets`,
    );
  }
  for (const [index, widget] of widgets.entries()) {
    const flags = widget.getFlags(), r = widget.getRectangle();
    const pages = pdf.getPages().filter((page) =>
      page.node.Annots()?.asArray().some((ref) =>
        pdf.context.lookup(ref) === widget.dict
      )
    );
    const page = pages[0], crop = page?.getCropBox();
    const stream = widget.AP()?.lookup(PDFName.of("N"));
    const expected = expectedWidgets[index].AP()?.lookup(PDFName.of("N"));
    if (
      !(flags & 4) || (flags & (1 | 2 | 32)) || pages.length !== 1 ||
      !crop || page.getRotation().angle !== 0 ||
      ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
      r.width <= 0 || r.height <= 0 ||
      r.x < crop.x || r.y < crop.y ||
      r.x + r.width > crop.x + crop.width ||
      r.y + r.height > crop.y + crop.height ||
      widget.dict.has(PDFName.of("OC")) ||
      !(stream instanceof PDFRawStream) ||
      !(expected instanceof PDFContentStream) ||
      ["OC", "Group"].some((key) => stream.dict.has(PDFName.of(key))) ||
      stream.dict.lookup(PDFName.of("BBox"))?.toString() !==
        expected.dict.lookup(PDFName.of("BBox"))?.toString() ||
      stream.dict.lookup(PDFName.of("Matrix"))?.toString() !==
        expected.dict.lookup(PDFName.of("Matrix"))?.toString() ||
      appearanceBytes(stream) !== appearanceBytes(expected)
    ) {
      throw new Error(
        `${label} ${domainKey} needs its matching visible printable normal appearance`,
      );
    }
    const resources = stream.dict.lookup(PDFName.of("Resources"));
    const fonts = resources instanceof PDFDict
      ? resources.lookup(PDFName.of("Font"))
      : undefined;
    const font = fonts instanceof PDFDict
      ? fonts.lookup(PDFName.of("Helvetica"))
      : undefined;
    if (
      !(resources instanceof PDFDict) || resources.keys().length !== 1 ||
      !(fonts instanceof PDFDict) || fonts.keys().length !== 1 ||
      !(font instanceof PDFDict) || font.keys().length !== 4 ||
      font.get(PDFName.of("Type"))?.toString() !== "/Font" ||
      font.get(PDFName.of("Subtype"))?.toString() !== "/Type1" ||
      font.get(PDFName.of("BaseFont"))?.toString() !== "/Helvetica" ||
      font.get(PDFName.of("Encoding"))?.toString() !== "/WinAnsiEncoding"
    ) {
      throw new Error(
        `${label} ${domainKey} appearance font differs from parsed source`,
      );
    }
  }
}

/** Compare original static standard-font appearances without repairing submitted bytes.
 * Issuer/signature authenticity and whole-page overlays require separate evidence. */
export async function assertPrintableSourceTextFields(
  bytes: Uint8Array,
  fields: readonly { pdfField: string; domainKey: string }[],
  label: string,
): Promise<void> {
  const pdf = await PDFDocument.load(bytes);
  const acroForm = pdf.catalog.lookup(PDFName.of("AcroForm"));
  if (
    acroForm instanceof PDFDict &&
    (acroForm.has(PDFName.of("XFA")) ||
      acroForm.lookup(PDFName.of("NeedAppearances"))?.toString() === "true")
  ) {
    throw Error(
      `${label} needs static normal appearances without XFA or viewer regeneration`,
    );
  }
  const form = pdf.getForm();
  const comparison = await PDFDocument.load(bytes);
  const comparisonForm = comparison.getForm();
  const font = await comparison.embedFont(StandardFonts.Helvetica);
  for (const field of fields) {
    const originalField = form.getTextField(field.pdfField);
    const comparisonField = comparisonForm.getTextField(field.pdfField);
    const color = (da: string | undefined) =>
      [...(da ?? "").matchAll(/((?:[-+]?\d*\.?\d+\s+){1,4})(g|rg|k)\b/g)].at(
        -1,
      )?.[0].trim().replace(/\s+/g, " ");
    const fieldColor = color(
      comparisonField.acroField.getDefaultAppearance(),
    );
    for (const widget of comparisonField.acroField.getWidgets()) {
      const effective = color(widget.getDefaultAppearance()) ?? fieldColor ??
        "0 g";
      if (
        !["0 g", "0 0 0 rg", "0 0 0.502 rg", "0 0 0 1 k"].includes(effective)
      ) {
        throw new Error(
          `${label} ${field.domainKey} needs a visible standard text appearance color`,
        );
      }
    }
    comparisonField.updateAppearances(font);
    assertPrintableField(
      pdf,
      originalField,
      comparisonField,
      field.domainKey,
      label,
    );
  }
}
