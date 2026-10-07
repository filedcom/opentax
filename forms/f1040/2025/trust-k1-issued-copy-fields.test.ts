import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { extractTrustK1IssuedCopyFields } from "./trust-k1-issued-copy-fields.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { fieldName, filer, fixture } from "./trust-k1-issued-copy.fixture.ts";

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
