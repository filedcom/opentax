import { assertRejects } from "@std/assert";
import {
  type PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  type PDFRawStream,
} from "pdf-lib";
import { w2gPayerCopyFixture } from "../../domains/income/other/w2g_payer_copy.fixture.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { w2gPdf } from "../../pdf/forms/income/other/w2g.ts";
import { assertW2GPayerCopyContents } from "./w2g-payer-copy.ts";
import type { MefFormsPending } from "../types.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  fullName: "Test Taxpayer",
  nameLine1: "Test Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "123 Main St",
    city: "Springfield",
    state: "IL",
    zip: "62701",
  },
  filingStatus: FilingStatus.Single,
};

const item = {
  calendar_year: 2025,
  source_document_reference: "2025 payer-issued W-2G",
  issued_copy_attachment_file_name: "IssuedW2G.pdf",
  issued_copy_pdf_sha256: "a".repeat(64),
  payer_name: "Casino Inc",
  payer_name_control: "CASI",
  payer_us_address: {
    line1: "500 Casino Way",
    city: "Las Vegas",
    state: "NV",
    zip: "89101",
  },
  payer_ein: "12-3456789",
  winner_name: "Test Taxpayer",
  winner_us_address: filer.address,
  box9_winner_tin: "111-22-3333",
  box1_winnings: 10_000,
  box4_federal_withheld: 2_400,
  standard_or_nonstandard_code: "S",
};

const pending = {
  w2g: { w2gs: [item] },
  f1040: { line25c_total: 2_400 },
} as MefFormsPending;

function copy(changed: Record<string, string> = {}): Promise<Uint8Array> {
  const projected = w2gPdf.instances?.(
    { w2gs: [item] },
    filer,
    { f1040: { line25c_total: 2_400 } },
  )?.[0];
  if (!projected) throw new Error("Missing W-2G recipient projection");
  return w2gPayerCopyFixture({ ...projected, ...changed });
}

Deno.test("W-2G bundle matches readable payer-copy contents to source", async () => {
  const bytes = await copy();
  await assertW2GPayerCopyContents(pending, filer, [{
    fileName: "IssuedW2G.pdf",
    description: "Payer-issued W-2G",
    bytes,
  }]);
  await assertRejects(
    async () =>
      assertW2GPayerCopyContents(pending, filer, [{
        fileName: "IssuedW2G.pdf",
        description: "Payer-issued W-2G",
        bytes: await copy({ box4_federal_withheld: "2399" }),
      }]),
    Error,
    "box4_federal_withheld differs",
  );
});

Deno.test("W-2G rejects field metadata without printable recipient widgets", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const projected = w2gPdf.instances!({ w2gs: [item] }, filer, {
    f1040: { line25c_total: 2400 },
  })![0];
  for (const field of w2gPdf.fields) {
    if (field.kind === "text" && field.domainKey !== "payer_phone") {
      pdf.getForm().createTextField(field.pdfField).setText(
        String(projected[field.domainKey] ?? ""),
      );
    }
  }
  const metadata = await pdf.save();
  await assertRejects(
    () =>
      assertW2GPayerCopyContents(pending, filer, [{
        fileName: "IssuedW2G.pdf",
        description: "Metadata-only negative source",
        bytes: metadata,
      }]),
    Error,
    "printable field widgets",
  );
});

Deno.test("W-2G rejects hidden, offpage, stale, missing and forged-font normal appearances", async () => {
  const name =
    w2gPdf.fields.find((f) => f.domainKey === "box4_federal_withheld")!
      .pdfField;
  for (
    const change of [
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(name).acroField.getWidgets()[0].setFlags(6),
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(name).acroField.getWidgets()[0].setRectangle(
          { x: 900, y: 900, width: 50, height: 20 },
        ),
      (pdf: PDFDocument) => pdf.getForm().getTextField(name).setText("2399"),
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(name).acroField.getWidgets()[0].dict.delete(
          PDFName.of("AP"),
        ),
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(name).acroField.getWidgets()[0]
          .setDefaultAppearance("/Helvetica 8 Tf 1 g"),
      (pdf: PDFDocument) => pdf.getPage(0).setCropBox(0, 0, 1, 1),
      (pdf: PDFDocument) =>
        (pdf.catalog.lookup(PDFName.of("AcroForm")) as PDFDict).set(
          PDFName.of("XFA"),
          pdf.context.register(pdf.context.stream("conflicting XFA source")),
        ),
      (pdf: PDFDocument) =>
        (pdf.catalog.lookup(PDFName.of("AcroForm")) as PDFDict).set(
          PDFName.of("NeedAppearances"),
          pdf.context.obj(true),
        ),

      (pdf: PDFDocument) => {
        const widget =
          pdf.getForm().getTextField(name).acroField.getWidgets()[0];
        const stream = widget.AP()!.lookup(PDFName.of("N")) as PDFRawStream;
        const resources = stream.dict.lookup(
          PDFName.of("Resources"),
        ) as PDFDict;
        const fonts = resources.lookup(PDFName.of("Font")) as PDFDict;
        const font = fonts.lookup(PDFName.of("Helvetica")) as PDFDict;
        font.set(PDFName.of("BaseFont"), PDFName.of("Courier"));
      },
      (pdf: PDFDocument) => {
        const widget =
          pdf.getForm().getTextField(name).acroField.getWidgets()[0];
        const stream = widget.AP()!.lookup(PDFName.of("N")) as PDFRawStream;
        stream.dict.set(
          PDFName.of("Group"),
          pdf.context.obj({ S: "Transparency" }),
        );
      },

      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(name).acroField.getWidgets()[0].dict.set(
          PDFName.of("F"),
          PDFNumber.of(0),
        ),
    ]
  ) {
    const pdf = await PDFDocument.load(await copy());
    change(pdf);
    const bytes = await pdf.save({ updateFieldAppearances: false });
    await assertRejects(
      () =>
        assertW2GPayerCopyContents(pending, filer, [{
          fileName: "IssuedW2G.pdf",
          description: "Appearance-conflict negative source",
          bytes,
        }]),
      Error,
      "appearance",
    );
  }
});
