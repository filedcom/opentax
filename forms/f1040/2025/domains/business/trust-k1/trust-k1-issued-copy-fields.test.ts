import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { extractTrustK1IssuedCopyFields } from "./trust-k1-issued-copy-fields.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { fieldName, filer, fixture } from "./trust-k1-issued-copy.fixture.ts";
import { assertTrustK1PrintableCheckboxes } from "./trust-k1-printable-checkboxes.ts";
import { sha256Hex } from "../../execution/prepared-source.ts";

Deno.test("trust K-1 extraction retains every canonical field without enabling filing or authenticating issuer", async () => {
  const { source, documents } = await fixture();
  const [copy] = await extractTrustK1IssuedCopyFields(source, filer, documents);
  assertEquals(Object.keys(copy.canonicalFields).length, 74);
  assertEquals(copy.canonicalFields["f1_12[0]"], "234.56");
  assertEquals(copy.canonicalFields["f1_53[0]"], "67.89");
  assertEquals(copy.canonicalFields["f1_57[0]"], "45.67");
  assertEquals(copy.canonicalFields["c1_1[0]"], true);
  assertEquals(Object.isFrozen(copy.canonicalFields), true);
  assertEquals(copy.textFieldAppearancesVerified, true);
  assertEquals(copy.checkboxAppearancesVerified, true);
  assertEquals(copy.printedContentsVerified, false);
  assertEquals(copy.issuerVerified, false);
  assertThrows(
    () => buildMefXml({ k1_trust: source }, filer),
    Error,
    "line 25c is less than combined sourced other-form withholding",
  );
  await assertRejects(
    () => buildPdfBytes({ k1_trust: source }, filer),
    Error,
    "line 25c is less than combined sourced other-form withholding",
  );
});

Deno.test("trust K-1 retains checked original IRS glyph and regenerated checkbox appearances", async () => {
  const { source, documents } = await fixture((pdf) => {
    // Preserve the official glyph appearance rather than regenerating it.
    pdf.getForm().getCheckBox(fieldName("c1_1[1]")).check();
    pdf.getForm().getCheckBox(fieldName("c1_1[1]")).updateAppearances();
  });
  const [copy] = await extractTrustK1IssuedCopyFields(source, filer, documents);
  assertEquals(copy.canonicalFields["c1_1[0]"], true);
  assertEquals(copy.canonicalFields["c1_1[1]"], true);
  assertEquals(copy.checkboxAppearancesVerified, true);
  assertEquals(copy.printedContentsVerified, false);
});

Deno.test("trust K-1 checkbox verifier accepts all six original unchecked IRS appearances", async () => {
  const bytes = await Deno.readFile(".pdf-cache/form1041sk1-2025.pdf");
  assertEquals(
    await sha256Hex(bytes),
    "d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3",
  );
  await assertTrustK1PrintableCheckboxes(bytes);
});

Deno.test("trust K-1 checkbox verifier accepts each regenerated checked state at its official position", async () => {
  const keys = [
    "c1_1[0]",
    "c1_1[1]",
    "c1_2[0]",
    "c1_3[0]",
    "c1_4[0]",
    "c1_4[1]",
  ];
  const { source, documents } = await fixture((pdf) => {
    for (const key of keys) {
      const field = pdf.getForm().getCheckBox(fieldName(key));
      field.check();
      field.updateAppearances();
    }
  });
  const [copy] = await extractTrustK1IssuedCopyFields(source, filer, documents);
  for (const key of keys) assertEquals(copy.canonicalFields[key], true);
});

for (
  const [label, change] of [
    ["value and appearance state conflict", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField.getWidgets()[0]
        .setAppearanceState(PDFName.of("Off"));
    }],
    ["blank checked appearance", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_1[0]")).updateAppearances();
      const w = pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField
        .getWidgets()[0];
      const n = w.AP()!.lookup(PDFName.of("N")) as PDFDict;
      n.set(PDFName.of("1"), n.get(PDFName.of("Off"))!);
    }],
    ["marked unchecked appearance", (pdf: PDFDocument) => {
      const field = pdf.getForm().getCheckBox(fieldName("c1_1[0]"));
      field.uncheck();
      const n = field.acroField.getWidgets()[0].AP()!.lookup(
        PDFName.of("N"),
      ) as PDFDict;
      n.set(PDFName.of("Off"), n.get(PDFName.of("1"))!);
    }],
    ["hidden unchecked widget", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_3[0]")).acroField.getWidgets()[0]
        .setFlags(4 | 2);
    }],
    ["nonprinting checkbox", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField.getWidgets()[0]
        .setFlags(0);
    }],
    ["moved checkbox", (pdf: PDFDocument) => {
      const w = pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField
        .getWidgets()[0];
      w.setRectangle({ ...w.getRectangle(), x: 330 });
    }],
    ["optional-content checkbox", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField.getWidgets()[0]
        .dict.set(PDFName.of("OC"), pdf.context.obj({}));
    }],
    ["transformed appearance", (pdf: PDFDocument) => {
      const n = pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField
        .getWidgets()[0]
        .AP()!.lookup(PDFName.of("N")) as PDFDict;
      const s = n.lookup(PDFName.of("1")) as PDFRawStream;
      s.dict.set(PDFName.of("Matrix"), pdf.context.obj([1, 0, 0, 1, 30, 30]));
    }],
    ["substituted original glyph font", (pdf: PDFDocument) => {
      const n = pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField
        .getWidgets()[0]
        .AP()!.lookup(PDFName.of("N")) as PDFDict;
      const s = n.lookup(PDFName.of("1")) as PDFRawStream;
      const resources = s.dict.lookup(PDFName.of("Resources")) as PDFDict;
      const fonts = resources.lookup(PDFName.of("Font")) as PDFDict;
      const font = fonts.lookup(PDFName.of("ZaDb")) as PDFDict;
      font.set(PDFName.of("BaseFont"), PDFName.of("Helvetica"));
    }],
    ["missing normal appearance", (pdf: PDFDocument) => {
      pdf.getForm().getCheckBox(fieldName("c1_1[0]")).acroField.getWidgets()[0]
        .AP()!.delete(PDFName.of("N"));
    }],
    ["nonblack regenerated check mark", (pdf: PDFDocument) => {
      const field = pdf.getForm().getCheckBox(fieldName("c1_1[0]"));
      field.acroField.setDefaultAppearance("1 0 0 rg");
      field.updateAppearances();
    }],
  ] as const
) {
  Deno.test(`trust K-1 rejects rehashed ${label}`, async () => {
    const { source, documents } = await fixture(change);
    await assertRejects(
      () => extractTrustK1IssuedCopyFields(source, filer, documents),
      Error,
      "matching printable checkbox appearance",
    );
  });
}

Deno.test("trust K-1 extraction uses the exact verified byte snapshot despite caller buffer mutation", async () => {
  const { source, documents } = await fixture();
  const expectedHash =
    source.k1_trusts[0].box13_code_b_issued_copy_review.pdf_sha256;
  const extraction = extractTrustK1IssuedCopyFields(source, filer, documents);
  documents[0].bytes.fill(0);
  source.k1_trusts[0].estate_trust_ein = "987654321";
  source.k1_trusts[0].box13_code_b_issued_copy_review.estate_trust_ein =
    "987654321";
  const [copy] = await extraction;
  assertEquals(copy.pdfSha256, expectedHash);
  assertEquals(copy.estateTrustEin, "123456789");
  assertEquals(copy.canonicalFields["f1_6[0]"], "12-3456789");
  assertEquals(copy.backupWithholding, 125.25);
});

for (
  const [key, value] of [
    ["f1_6[0]", "98-7654321"],
    ["f1_6[0]", "X123456789"],
    ["f1_10[0]", "999-88-7777"],
    ["f1_51[0]", "124.25"],
    ["f1_51[0]", "1,25.25"],
    ["f1_50[0]", "A"],
    ["f1_52[0]", "B"],
  ]
) {
  Deno.test(`trust K-1 extraction rejects rehashed printed mismatch ${key}=${value}`, async () => {
    const { source, documents } = await fixture((pdf) => {
      const field = pdf.getForm().getTextField(fieldName(key));
      field.setText(value);
      field.updateAppearances(pdf.getForm().getDefaultFont());
    });
    await assertRejects(() =>
      extractTrustK1IssuedCopyFields(source, filer, documents)
    );
  });
}

for (
  const [label, change] of [
    ["missing field", (pdf: PDFDocument) =>
      pdf.getForm().removeField(
        pdf.getForm().getTextField(fieldName("f1_57[0]")),
      )],
    ["missing explanation page", (pdf: PDFDocument) => pdf.removePage(1)],
    [
      "hidden withholding",
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(fieldName("f1_51[0]")).acroField
          .getWidgets()[0].setFlags(2),
    ],
    [
      "stale amount appearance",
      (pdf: PDFDocument) =>
        pdf.getForm().getTextField(fieldName("f1_51[0]")).setText("124.25"),
    ],
  ] as const
) {
  Deno.test(`trust K-1 extraction rejects rehashed ${label}`, async () => {
    const { source, documents } = await fixture(change);
    await assertRejects(() =>
      extractTrustK1IssuedCopyFields(source, filer, documents)
    );
  });
}
