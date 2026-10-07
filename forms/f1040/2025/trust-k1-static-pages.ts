import {
  decodePDFRawStream,
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  type PDFObject,
  PDFRawStream,
  PDFRef,
  PDFString,
} from "pdf-lib";
import { sha256Hex } from "./prepared-source.ts";
import { trustK1CanonicalFields } from "./trust-k1-canonical-fields.ts";

// Derived from the official TY2025 template, SHA256
// d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3.
const canonicalFingerprint =
  "404eb351de23e2218af04adfc7b3f183f1b27828fd772eecaff2ffd3764addca";

/** Resolve object numbers and compression without discarding rendering data. */
function canonicalObject(
  pdf: PDFDocument,
  value: PDFObject | undefined,
  ancestors = new Set<PDFObject>(),
): unknown {
  if (value === undefined) return null;
  if (value instanceof PDFRef) {
    return canonicalObject(pdf, pdf.context.lookup(value), ancestors);
  }
  if (ancestors.has(value) || ancestors.size > 64) {
    throw Error(
      "Trust K-1 static resources need an acyclic bounded object tree",
    );
  }
  const next = new Set(ancestors).add(value);
  if (value instanceof PDFRawStream) {
    const dict = Object.fromEntries(
      value.dict.keys()
        .filter((key) =>
          !["Length", "Filter", "DecodeParms"].includes(key.decodeText())
        )
        .sort((a, b) =>
          a.decodeText() < b.decodeText()
            ? -1
            : a.decodeText() > b.decodeText()
            ? 1
            : 0
        )
        .map(
          (key) => [
            key.decodeText(),
            canonicalObject(pdf, value.dict.get(key), next),
          ],
        ),
    );
    const decoded = decodePDFRawStream(value).decode();
    return {
      dict,
      decoded: Array.from(decoded, (b) => b.toString(16).padStart(2, "0")).join(
        "",
      ),
    };
  }
  if (value instanceof PDFDict) {
    return Object.fromEntries(
      value.keys()
        .sort((a, b) =>
          a.decodeText() < b.decodeText()
            ? -1
            : a.decodeText() > b.decodeText()
            ? 1
            : 0
        )
        .map(
          (key) => [
            key.decodeText(),
            canonicalObject(pdf, value.get(key), next),
          ],
        ),
    );
  }
  if (value instanceof PDFArray) {
    return value.asArray().map((v) => canonicalObject(pdf, v, next));
  }
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return {
      bytes: Array.from(value.asBytes(), (b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }
  if (value instanceof PDFName) return { name: value.decodeText() };
  if (
    value instanceof PDFNumber || value instanceof PDFBool || value === PDFNull
  ) return value.toString();
  throw Error("Trust K-1 static resources contain an unsupported PDF object");
}

/** Fingerprint the printable static pages and layout, excluding editable values.
 * The official template's name-tree JavaScript is included verbatim in the
 * fingerprint; new scripts/actions/optional content are never accepted. */
export async function trustK1StaticPageFingerprint(
  bytes: Uint8Array,
): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const fail = () => {
    throw Error(
      "Trust K-1 needs unchanged official static pages and field layout",
    );
  };
  if (pdf.getPageCount() !== 2) fail();
  if (
    ["OpenAction", "AA", "OCProperties"].some((key) =>
      pdf.catalog.has(PDFName.of(key))
    )
  ) fail();
  const form = pdf.getForm();
  if (form.getFields().length !== trustK1CanonicalFields.length) fail();
  const widgets = new Set<PDFDict>();
  const layout = trustK1CanonicalFields.map((field) => {
    const value = field.kind === "text"
      ? form.getTextField(field.pdfField)
      : form.getCheckBox(field.pdfField);
    const ws = value.acroField.getWidgets();
    if (ws.length !== 1) fail();
    let parent: PDFObject | undefined = value.acroField.dict;
    const parents = new Set<PDFDict>();
    while (parent instanceof PDFDict) {
      const dict = parent;
      if (
        parents.has(parent) ||
        ["AA", "A"].some((key) => dict.has(PDFName.of(key)))
      ) fail();
      parents.add(parent);
      parent = parent.lookup(PDFName.of("Parent"));
    }
    const w = ws[0];
    if (
      w.dict.get(PDFName.of("Subtype")) !== PDFName.of("Widget") ||
      w.dict.has(PDFName.of("OC"))
    ) fail();
    widgets.add(w.dict);
    return { key: field.key, rectangle: w.getRectangle() };
  });
  const allowedKeys = new Set([
    "Annots",
    "Contents",
    "CropBox",
    "MediaBox",
    "Parent",
    "Resources",
    "Rotate",
    "StructParents",
    "Tabs",
    "Type",
  ]);
  const pages = pdf.getPages().map((page, i) => {
    if (page.node.keys().some((key) => !allowedKeys.has(key.decodeText()))) {
      fail();
    }
    if (
      ["Contents", "CropBox", "MediaBox", "Resources", "Rotate"].some((key) =>
        !page.node.has(PDFName.of(key))
      )
    ) fail();
    const annotations = page.node.Annots()?.asArray().map((ref) =>
      pdf.context.lookup(ref)
    ) ?? [];
    if (i === 0) {
      if (
        annotations.length !== widgets.size ||
        new Set(annotations).size !== widgets.size ||
        annotations.some((a) => !(a instanceof PDFDict) || !widgets.has(a))
      ) fail();
    } else if (annotations.length) fail();
    return canonicalObject(
      pdf,
      pdf.context.obj({
        Contents: page.node.get(PDFName.of("Contents")),
        Resources: page.node.get(PDFName.of("Resources")),
        MediaBox: page.node.get(PDFName.of("MediaBox")),
        CropBox: page.node.get(PDFName.of("CropBox")),
        Rotate: page.node.get(PDFName.of("Rotate")),
      }),
    );
  });
  const catalog = {
    names: canonicalObject(pdf, pdf.catalog.get(PDFName.of("Names"))),
    viewerPreferences: canonicalObject(
      pdf,
      pdf.catalog.get(PDFName.of("ViewerPreferences")),
    ),
  };
  return await sha256Hex(
    new TextEncoder().encode(JSON.stringify({ pages, layout, catalog })),
  );
}

/** No issuer authentication is implied by canonical template/layout equality. */
export async function assertTrustK1StaticPages(
  bytes: Uint8Array,
): Promise<void> {
  if (await trustK1StaticPageFingerprint(bytes) !== canonicalFingerprint) {
    throw Error(
      "Trust K-1 needs unchanged official static pages and field layout",
    );
  }
}
