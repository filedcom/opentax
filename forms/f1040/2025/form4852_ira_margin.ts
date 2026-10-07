import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRawStream,
  PDFString,
} from "pdf-lib";

// Visible annotation in the right margin of line 8j on the official Rev. 9-2020
// retained form. This is source evidence, not an invented IRS AcroForm field.
const rect = [578, 276, 607, 288];
const labels = ["IRA", "SEP", "SIMPLE"];
const appearance = (label: string) =>
  `q\n0 g\nBT\n/FMargin 6 Tf\n2 3 Td\n(${label}) Tj\nET\nQ\n`;
export function addForm4852IraMargin(
  document: PDFDocument,
  page: PDFPage,
  label: string,
): void {
  if (!labels.includes(label)) {
    throw new Error("Invalid Form4852 IRA margin label");
  }
  const context = document.context;
  const font = context.register(
    context.obj({
      Type: "Font",
      Subtype: "Type1",
      BaseFont: "Helvetica",
      Encoding: "WinAnsiEncoding",
    }),
  );
  const stream = context.register(context.flateStream(appearance(label), {
    Type: "XObject",
    Subtype: "Form",
    BBox: [0, 0, 29, 12],
    Resources: { Font: { FMargin: font } },
  }));
  page.node.addAnnot(context.register(context.obj({
    Type: "Annot",
    Subtype: "FreeText",
    Rect: rect,
    F: 4,
    Contents: PDFString.of(label),
    DA: PDFString.of("/FMargin 6 Tf 0 g"),
    AP: { N: stream },
    Border: [0, 0, 0],
  })));
}

/** Parse the actual printable normal appearance as well as its visible position.
 * Flattened/handwritten or different appearance encodings need a separate source
 * parser; hidden annotation metadata alone never establishes paper compliance. */
export function assertForm4852IraMargin(
  document: PDFDocument,
  expected?: string,
): void {
  const annotations = document.getPage(0).node.Annots();
  const candidates: PDFDict[] = [];
  if (annotations) {
    for (const ref of annotations.asArray()) {
      const annotation = document.context.lookup(ref);
      if (!(annotation instanceof PDFDict)) continue;
      if (
        annotation.get(PDFName.of("Subtype"))?.toString() !== "/FreeText"
      ) continue;
      const text = annotation.lookup(PDFName.of("Contents"));
      if (
        text instanceof PDFString && labels.includes(text.decodeText())
      ) candidates.push(annotation);
    }
  }
  if (candidates.length !== (expected ? 1 : 0)) {
    throw new Error(
      "Retained Form4852 IRA/SEP/SIMPLE margin label inventory differs from actual account type",
    );
  }
  if (!expected) return;
  const page = document.getPage(0);
  const crop = page.getCropBox();
  if (
    page.getRotation().angle !== 0 || crop.x > rect[0] || crop.y > rect[1] ||
    crop.x + crop.width < rect[2] || crop.y + crop.height < rect[3]
  ) {
    throw new Error(
      "Retained Form4852 IRA margin is outside the visible unrotated page",
    );
  }
  const annotation = candidates[0];
  const contents = annotation.lookup(PDFName.of("Contents"));
  const rectangle = annotation.lookup(PDFName.of("Rect"));
  const flags = annotation.lookup(PDFName.of("F"));
  const ap = annotation.lookup(PDFName.of("AP"));
  const stream = ap instanceof PDFDict ? ap.lookup(PDFName.of("N")) : undefined;
  const box = stream instanceof PDFRawStream
    ? stream.dict.lookup(PDFName.of("BBox"))
    : undefined;
  const numbers = (value: unknown) =>
    value instanceof PDFArray
      ? value.asArray().map((n) => n instanceof PDFNumber ? n.asNumber() : NaN)
      : [];
  if (
    !(contents instanceof PDFString) || contents.decodeText() !== expected ||
    JSON.stringify(numbers(rectangle)) !== JSON.stringify(rect) ||
    !(flags instanceof PDFNumber) || flags.asNumber() !== 4 ||
    !(stream instanceof PDFRawStream) ||
    JSON.stringify(numbers(box)) !== JSON.stringify([0, 0, 29, 12]) ||
    stream.dict.get(PDFName.of("Type"))?.toString() !== "/XObject" ||
    stream.dict.get(PDFName.of("Subtype"))?.toString() !== "/Form" ||
    stream.dict.has(PDFName.of("Matrix")) ||
    stream.dict.has(PDFName.of("OC")) ||
    stream.dict.has(PDFName.of("Group")) ||
    ["CA", "ca", "OC", "RD", "Rotate"].some((key) =>
      annotation.has(PDFName.of(key))
    ) ||
    !(ap instanceof PDFDict) || ap.keys().length !== 1 ||
    new TextDecoder().decode(decodePDFRawStream(stream).decode()) !==
      appearance(expected)
  ) {
    throw new Error(
      "Retained Form4852 IRA margin must have the matching visible printable normal appearance at line8j",
    );
  }
  const resources = stream.dict.lookup(PDFName.of("Resources"));
  const fonts = resources instanceof PDFDict
    ? resources.lookup(PDFName.of("Font"))
    : undefined;
  const font = fonts instanceof PDFDict
    ? fonts.lookup(PDFName.of("FMargin"))
    : undefined;
  if (
    !(font instanceof PDFDict) || font.keys().length !== 4 ||
    font.get(PDFName.of("Type"))?.toString() !== "/Font" ||
    font.get(PDFName.of("BaseFont"))?.toString() !== "/Helvetica" ||
    font.get(PDFName.of("Subtype"))?.toString() !== "/Type1" ||
    font.get(PDFName.of("Encoding"))?.toString() !== "/WinAnsiEncoding"
  ) {
    throw new Error(
      "Retained Form4852 IRA margin appearance font differs from parsed source",
    );
  }
}
