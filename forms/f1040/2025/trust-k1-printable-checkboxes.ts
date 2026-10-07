import {
  decodePDFRawStream,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFString,
} from "pdf-lib";
import { trustK1CanonicalFields } from "./trust-k1-canonical-fields.ts";

// Positions/on states from the pinned official TY2025 template, SHA256
// d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3.
const positions = [
  ["c1_1[0]", 324, 745.001, 10, "1"],
  ["c1_1[1]", 410.4, 745.001, 10, "0"],
  ["c1_2[0]", 49.983, 418.5, 12, "1"],
  ["c1_3[0]", 50.81, 385.499, 12, "1"],
  ["c1_4[0]", 50.4, 65.999, 12, "1"],
  ["c1_4[1]", 180, 65.999, 12, "0"],
] as const;

function contents(stream: unknown): string | undefined {
  const text = stream instanceof PDFRawStream
    ? new TextDecoder().decode(decodePDFRawStream(stream).decode())
    : stream instanceof PDFContentStream
    ? stream.getContentsString()
    : undefined;
  // Both standard DeviceRGB and DeviceGray black draw the same mark.
  return text?.replace(/\b0 0 0 RG\b/g, "0 G");
}

function officialMark(size: number): string {
  return size === 10
    ? "q\n1 1 8 8 re\nW\nn\nBT\n/ZaDb 8 Tf\n1.956 2.2921 Td\n7.704 TL\n<36> Tj\nET\nQ\n"
    : "q\n1 1 10 10 re\nW\nn\nBT\n/ZaDb 9.6 Tf\n2.3472 2.7505 Td\n9.2448 TL\n<36> Tj\nET\nQ\n";
}

function officialResources(stream: PDFRawStream): boolean {
  const resources = stream.dict.lookup(PDFName.of("Resources"));
  const fonts = resources instanceof PDFDict
    ? resources.lookup(PDFName.of("Font"))
    : undefined;
  const font = fonts instanceof PDFDict
    ? fonts.lookup(PDFName.of("ZaDb"))
    : undefined;
  return resources instanceof PDFDict && resources.keys().length === 2 &&
    resources.lookup(PDFName.of("ProcSet"))?.toString() === "[ /PDF /Text ]" &&
    fonts instanceof PDFDict && fonts.keys().length === 1 &&
    font instanceof PDFDict && font.keys().length === 3 &&
    font.get(PDFName.of("Type"))?.toString() === "/Font" &&
    font.get(PDFName.of("Subtype"))?.toString() === "/Type1" &&
    font.get(PDFName.of("BaseFont"))?.toString() === "/ZapfDingbats";
}

function validStream(stream: unknown, size: number): stream is PDFRawStream {
  const allowed = new Set([
    "Type",
    "Subtype",
    "FormType",
    "BBox",
    "Matrix",
    "Resources",
    "Filter",
    "Length",
  ]);
  return stream instanceof PDFRawStream &&
    stream.dict.keys().every((key) => allowed.has(key.decodeText())) &&
    stream.dict.get(PDFName.of("Type"))?.toString() === "/XObject" &&
    stream.dict.get(PDFName.of("Subtype"))?.toString() === "/Form" &&
    (!stream.dict.has(PDFName.of("FormType")) ||
      stream.dict.lookup(PDFName.of("FormType"))?.toString() === "1") &&
    stream.dict.lookup(PDFName.of("BBox"))?.toString() ===
      `[ 0 0 ${size} ${size} ]` &&
    stream.dict.lookup(PDFName.of("Matrix"))?.toString() ===
      "[ 1 0 0 1 0 0 ]";
}

/** Verify every checkbox's normal print appearance without repairing source bytes.
 * This authenticates neither issuance nor static page content/overlays. */
export async function assertTrustK1PrintableCheckboxes(
  bytes: Uint8Array,
): Promise<void> {
  const pdf = await PDFDocument.load(bytes);
  const comparison = await PDFDocument.load(bytes);
  const form = pdf.getForm(), referenceForm = comparison.getForm();
  for (const [key, x, y, size, state] of positions) {
    const fail = () => {
      throw Error(
        `Trust K-1 ${key} needs its matching printable checkbox appearance`,
      );
    };
    const name = trustK1CanonicalFields.find((field) => field.key === key)!
      .pdfField;
    const field = form.getCheckBox(name);
    const widgets = field.acroField.getWidgets();
    if (widgets.length !== 1) fail();
    const widget = widgets[0], r = widget.getRectangle();
    const normal = widget.AP()?.lookup(PDFName.of("N"));
    if (!(normal instanceof PDFDict)) return fail();
    const on = PDFName.of(state), off = PDFName.of("Off");
    const value = field.acroField.getValue();
    const flags = widget.getFlags();
    const pages = pdf.getPages().filter((page) =>
      page.node.Annots()?.asArray().some((ref) =>
        pdf.context.lookup(ref) === widget.dict
      )
    );
    const crop = pages[0]?.getCropBox();
    if (
      value !== on && value !== off ||
      widget.getAppearanceState() !== value || widget.getOnValue() !== on ||
      !(flags & 4) || flags & (1 | 2 | 32) ||
      widget.dict.has(PDFName.of("OC")) ||
      (widget.getAppearanceCharacteristics()?.getRotation() ?? 0) !== 0 ||
      pages.length !== 1 || pages[0] !== pdf.getPage(0) ||
      pages[0].getRotation().angle !== 0 || !crop ||
      r.x !== x || r.y !== y || r.width !== size || r.height !== size ||
      r.x < crop.x || r.y < crop.y ||
      r.x + size > crop.x + crop.width || r.y + size > crop.y + crop.height
    ) fail();
    if (normal.keys().some((key) => key !== on && key !== off)) fail();
    const onStream = normal.lookup(on), offStream = normal.lookup(off);
    if (!validStream(onStream, size)) return fail();
    // The official unchecked template has no /Off stream: its static page
    // prints the outline. Accept that representation only with the exact
    // official /On glyph and font dictionary, never with arbitrary fallback.
    if (
      offStream === undefined && contents(onStream) === officialMark(size) &&
      officialResources(onStream)
    ) continue;

    // Rebuild a separate comparison using canonical black, unrotated style.
    // Submitted appearance settings cannot define their own expected result.
    const reference = referenceForm.getCheckBox(name);
    reference.acroField.setDefaultAppearance("0 g");
    const expectedWidget = reference.acroField.getWidgets()[0];
    expectedWidget.dict.delete(PDFName.of("BS"));
    expectedWidget.dict.delete(PDFName.of("DA"));
    expectedWidget.dict.set(
      PDFName.of("MK"),
      comparison.context.obj({ CA: PDFString.of("6") }),
    );
    reference.updateAppearances();
    const expected = expectedWidget.AP()?.lookup(PDFName.of("N"));
    if (!(expected instanceof PDFDict) || !validStream(offStream, size)) {
      return fail();
    }
    if (
      onStream.dict.has(PDFName.of("Resources")) ||
      offStream.dict.has(PDFName.of("Resources")) ||
      contents(onStream) !== contents(expected.lookup(on)) ||
      contents(offStream) !== contents(expected.lookup(off))
    ) fail();
  }
}
