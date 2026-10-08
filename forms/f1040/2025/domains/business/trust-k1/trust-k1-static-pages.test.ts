import { assertEquals, assertRejects } from "@std/assert";
import { PDFDict, PDFDocument, PDFName, PDFString, rgb } from "pdf-lib";
import {
  assertTrustK1StaticPages,
  trustK1StaticPageFingerprint,
} from "./trust-k1-static-pages.ts";
import { extractTrustK1IssuedCopyFields } from "./trust-k1-issued-copy-fields.ts";
import { fieldName, filer, fixture } from "./trust-k1-issued-copy.fixture.ts";
import { sha256Hex } from "../../execution/prepared-source.ts";

Deno.test("trust K-1 static fingerprint is derived from the pinned official template and excludes editable values", async () => {
  const { source, documents } = await fixture();
  const original = await Deno.readFile(".pdf-cache/form1041sk1-2025.pdf");
  assertEquals(
    await sha256Hex(original),
    "d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3",
  );
  assertEquals(
    await trustK1StaticPageFingerprint(original),
    "404eb351de23e2218af04adfc7b3f183f1b27828fd772eecaff2ffd3764addca",
  );
  await assertTrustK1StaticPages(documents[0].bytes);
  const [copy] = await extractTrustK1IssuedCopyFields(source, filer, documents);
  assertEquals(copy.staticPageLayoutVerified, true);
  assertEquals(copy.printedContentsVerified, false);
  assertEquals(copy.issuerVerified, false);
});

for (
  const [label, change] of [
    [
      "white overlay concealing source amount",
      (pdf: PDFDocument) =>
        pdf.getPage(0).drawRectangle({
          x: 350,
          y: 220,
          width: 200,
          height: 200,
          color: rgb(1, 1, 1),
        }),
    ],
    [
      "altered instruction page",
      (pdf: PDFDocument) => pdf.getPage(1).drawText("Changed tax instructions"),
    ],
    [
      "missing static content",
      (pdf: PDFDocument) =>
        pdf.getPage(0).node.set(PDFName.of("Contents"), pdf.context.obj([])),
    ],
    ["substituted page font", (pdf: PDFDocument) => {
      const resources = pdf.getPage(0).node.Resources()!;
      const fonts = resources.lookup(PDFName.of("Font")) as PDFDict;
      const font = fonts.lookup(PDFName.of("T1_0")) as PDFDict;
      font.set(PDFName.of("BaseFont"), PDFName.of("Helvetica"));
    }],
    ["additional annotation", (pdf: PDFDocument) => {
      pdf.getPage(0).node.addAnnot(
        pdf.context.register(
          pdf.context.obj({
            Type: "Annot",
            Subtype: "Text",
            Rect: [50, 50, 100, 100],
            Contents: PDFString.of("Altered source"),
          }),
        ),
      );
    }],
    ["duplicate widget annotation", (pdf: PDFDocument) => {
      const annots = pdf.getPage(0).node.Annots()!;
      annots.push(annots.get(0));
    }],
    ["moved printed amount", (pdf: PDFDocument) => {
      const w = pdf.getForm().getTextField(fieldName("f1_51[0]")).acroField
        .getWidgets()[0];
      w.setRectangle({ ...w.getRectangle(), x: w.getRectangle().x + 30 });
    }],
    ["page transparency group", (pdf: PDFDocument) =>
      pdf.getPage(0).node.set(
        PDFName.of("Group"),
        pdf.context.obj({ S: "Transparency" }),
      )],
    ["replacement document script", (pdf: PDFDocument) =>
      pdf.catalog.set(
        PDFName.of("Names"),
        pdf.context.obj({
          JavaScript: {
            Names: [PDFString.of("altered"), {
              S: "JavaScript",
              JS: PDFString.of("this.print();"),
            }],
          },
        }),
      )],
    [
      "automatic widget action",
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(fieldName("f1_51[0]")).acroField.dict.set(
          PDFName.of("AA"),
          pdf.context.obj({}),
        ),
    ],
    [
      "optional content configuration",
      (pdf: PDFDocument) =>
        pdf.catalog.set(PDFName.of("OCProperties"), pdf.context.obj({})),
    ],
    ["print range omitting instructions", (pdf: PDFDocument) =>
      pdf.catalog.set(
        PDFName.of("ViewerPreferences"),
        pdf.context.obj({ PrintPageRange: [0, 0] }),
      )],
  ] as const
) {
  Deno.test(`trust K-1 static-page verification rejects rehashed ${label}`, async () => {
    const { documents } = await fixture(change);
    await assertRejects(() => assertTrustK1StaticPages(documents[0].bytes));
  });
}

Deno.test("trust K-1 source extraction rejects an overlay even with matching visible field appearances and rehashed metadata", async () => {
  const { source, documents } = await fixture((pdf) =>
    pdf.getPage(0).drawRectangle({
      x: 350,
      y: 220,
      width: 200,
      height: 200,
      color: rgb(1, 1, 1),
    })
  );
  await assertRejects(
    () => extractTrustK1IssuedCopyFields(source, filer, documents),
    Error,
    "unchanged official static pages and field layout",
  );
});
