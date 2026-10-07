import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { sha256Hex } from "./prepared-source.ts";
import { trustK1CanonicalFields } from "./trust-k1-canonical-fields.ts";
import { extractTrustK1IssuedCopyFields } from "./trust-k1-issued-copy-fields.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const filer = extractFilerIdentity({
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
})!;
const reference = "synthetic-trust-k1.pdf";
const fieldName = (key: string) =>
  trustK1CanonicalFields.find((f) => f.key === key)!.pdfField;

async function fixture(change?: (pdf: PDFDocument) => void) {
  const path = ".pdf-cache/form1041sk1-2025.pdf";
  let template: Uint8Array;
  try {
    template = await Deno.readFile(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    const response = await fetch(
      "https://www.irs.gov/pub/irs-prior/f1041sk1--2025.pdf",
    );
    if (!response.ok) throw Error(`Trust K-1 template HTTP ${response.status}`);
    template = new Uint8Array(await response.arrayBuffer());
    await Deno.mkdir(".pdf-cache", { recursive: true });
    await Deno.writeFile(path, template);
  }
  assertEquals(
    await sha256Hex(template),
    "d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3",
  );
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  for (const field of trustK1CanonicalFields.filter((f) => f.kind === "text")) {
    form.getTextField(field.pdfField).setText("");
  }
  for (
    const [key, value] of Object.entries({
      "f1_6[0]": "12-3456789",
      "f1_7[0]": "Synthetic Family Trust",
      "f1_8[0]": "Synthetic Fiduciary, 2 Test Way, Austin TX 78701",
      "f1_10[0]": "111-22-3333",
      "f1_11[0]": "Test Taxpayer, 1 Test Way, Austin TX 78701",
      "f1_12[0]": "234.56",
      "f1_50[0]": "B",
      "f1_51[0]": "125.25",
      "f1_52[0]": "A",
      "f1_53[0]": "67.89",
      "f1_56[0]": "E",
      "f1_57[0]": "45.67",
    })
  ) form.getTextField(fieldName(key)).setText(value);
  form.getCheckBox(fieldName("c1_1[0]")).check();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  change?.(pdf);
  const bytes = await pdf.save({ updateFieldAppearances: false });
  const source = {
    k1_trusts: [{
      estate_trust_name: "Synthetic Family Trust",
      estate_trust_ein: "123456789",
      beneficiary_ssn: "111223333",
      source_document_reference: "synthetic 2025 issued copy",
      box13_code_b_backup_withholding: 125.25,
      box13_code_b_issued_copy_review: {
        pdf_reference: reference,
        pdf_sha256: await sha256Hex(bytes),
        tax_year: 2025 as const,
        estate_trust_ein: "123456789",
        beneficiary_ssn: "111223333",
        box13_code_b_backup_withholding: 125.25,
      },
    }],
  };
  return { source, documents: [{ reference, bytes }] };
}

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
    "trust K-1 backup withholding needs",
  );
  await assertRejects(
    () => buildPdfBytes({ k1_trust: source }, filer),
    Error,
    "trust K-1 backup withholding needs",
  );
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
