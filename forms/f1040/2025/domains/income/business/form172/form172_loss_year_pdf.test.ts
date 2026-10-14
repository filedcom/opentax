import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import {
  form172PdfPartIField,
  stageForm172LossYearPdfDocument,
} from "./form172_loss_year_pdf.ts";

const evidence = new URL(
  "../../../../../../../.state/research/board-execution-2026-10-07/",
  import.meta.url,
).pathname;
const templatePath = evidence +
  "form172-loss-year-pdf-20261008-v1/canonical.pdf";
let available = false;
try {
  Deno.statSync(templatePath);
  Deno.statSync(
    evidence +
      "form172-loss-year-native-20261008-v1/output/ordinary/review.json",
  );
  available = true;
} catch { /*Private retained artifacts.*/ }
const prefix = "topmostSubform[0].Page1[0].";
async function fixture(joint = false) {
  const v = JSON.parse(
    await Deno.readTextFile(
      evidence +
        `form172-loss-year-native-20261008-v1/output/${
          joint ? "qsbs-capital" : "ordinary"
        }/review.json`,
    ),
  );
  v.pdf_identity = {
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    address: {
      type: "us",
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  };
  if (joint) {
    v.filing_status = "married_filing_jointly";
    v.spouse_ssn = "999887777";
    v.reviewed_form1040.filing_status = v.filing_status;
    v.reviewed_form1040.spouse_ssn = v.spouse_ssn;
    v.noncapital_income.push({
      item_id: "spouse-wages",
      reference: "spouse-wages-review",
      owner_ssn: v.spouse_ssn,
      business: true,
      amount: 15000,
    });
    v.prior_nol_deductions.push({
      item_id: "old-nol",
      reference: "old-nol-review",
      owner_ssn: v.spouse_ssn,
      amount: 20000,
    });
    v.noncapital_deductions[1].amount = 31500;
    v.reviewed_form1040.line11_agi = -58000;
    v.reviewed_form1040.line12_standard_or_itemized_deduction = 31500;
    v.pdf_identity = {
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      spouse_first_name: "Jamie",
      spouse_last_name: "Example",
      address: {
        type: "foreign",
        line1: "10 King St",
        city: "Toronto",
        country_name: "Canada",
        province: "Ontario",
        postal_code: "M5V 2T6",
      },
      daytime_phone: "416-555-0100",
    };
  }
  return v;
}
async function bound(v: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(v));
  const s = v as Record<string, unknown>;
  return {
    binding: {
      reference: s.reference,
      sha256: await sha256Hex(bytes),
      tax_year: 2025,
      taxpayer_ssn: s.taxpayer_ssn,
      spouse_ssn: s.spouse_ssn,
    },
    documents: [{ reference: String(s.reference), bytes }],
  };
}
async function verify(
  r: Awaited<ReturnType<typeof stageForm172LossYearPdfDocument>>,
) {
  const pdf = await PDFDocument.load(r.pdf_bytes!);
  assertEquals(pdf.getPageCount(), 3);
  const form = pdf.getForm();
  assertEquals(form.getFields().length, 109);
  for (const field of form.getFields()) {
    assertEquals(field instanceof PDFTextField, true);
    assertEquals(
      (field as PDFTextField).getText() ?? "",
      r.pdf_field_values[field.getName()] ?? "",
    );
    assertEquals(field.acroField.getWidgets().length, 1);
    assertEquals(
      field.acroField.getWidgets()[0].getNormalAppearance() !== undefined,
      true,
    );
  }
  for (const [name, value] of Object.entries(r.pdf_field_values)) {
    assertEquals(form.getTextField(name).getText(), value);
  }
  assertEquals(r.canonicalTemplateVerified, true);
  assertEquals(r.filingReady, false);
  assertEquals(r.packetAdmissionVerified, false);
  return form;
}

Deno.test("Form 172 PDF Part I map handles read-order groups and every printed line", () => {
  assertEquals([1, 5, 7, 10, 12, 24].map(form172PdfPartIField), [
    prefix + "f1_16[0]",
    prefix + "Line5_ReadOrder[0].f1_20[0]",
    prefix + "Line7_ReadOrder[0].f1_22[0]",
    prefix + "Line10_ReadOrder[0].f1_25[0]",
    prefix + "Line12_ReadOrder[0].f1_27[0]",
    prefix + "f1_39[0]",
  ]);
  for (const n of [0, 25, 1.5]) assertThrows(() => form172PdfPartIField(n));
});
Deno.test({
  name:
    "Form 172 interactive ordinary PDF preserves paper-skipped capital cells and blank Part II",
  ignore: !available,
}, async () => {
  const f = await bound(await fixture()),
    r = await stageForm172LossYearPdfDocument(
      f.binding,
      f.documents,
      await Deno.readFile(templatePath),
    ),
    form = await verify(r);
  assertEquals(form.getTextField(prefix + "f1_01[0]").getText(), "2025");
  assertEquals(
    form.getTextField(prefix + "f1_04[0]").getText(),
    "Alex Example",
  );
  assertEquals(
    form.getTextField(prefix + "SSN_ReadOrder[0].f1_05[0]").getText(),
    "111223333",
  );
  assertEquals(form.getTextField(form172PdfPartIField(1)).getText(), "-65750");
  assertEquals(form.getTextField(form172PdfPartIField(24)).getText(), "-50000");
  for (let line = 16; line <= 21; line++) {
    assertEquals(
      form.getTextField(form172PdfPartIField(line)).getText() ?? "",
      "",
    );
  }
  for (
    const field of form.getFields().filter((f) =>
      /\.Page[23]\[0\]\./.test(f.getName())
    )
  ) assertEquals((field as PDFTextField).getText() ?? "", "");
});
Deno.test({
  name:
    "Form 172 joint foreign-address PDF reconciles every capital line and spouse-owned prior NOL",
  ignore: !available,
}, async () => {
  const f = await bound(await fixture(true)),
    r = await stageForm172LossYearPdfDocument(
      f.binding,
      f.documents,
      await Deno.readFile(templatePath),
    ),
    form = await verify(r);
  assertEquals(r.regularNol, 34000);
  assertEquals(
    form.getTextField(prefix + "f1_04[0]").getText(),
    "Alex Example and Jamie Example",
  );
  assertEquals(
    form.getTextField(prefix + "SSN_ReadOrder[0].f1_06[0]").getText(),
    "999887777",
  );
  assertEquals(form.getTextField(prefix + "f1_13[0]").getText(), "Canada");
  assertEquals(form.getTextField(prefix + "f1_14[0]").getText(), "Ontario");
  assertEquals(form.getTextField(prefix + "f1_10[0]").getText() ?? "", "");
  assertEquals(form.getTextField(prefix + "f1_11[0]").getText() ?? "", "");
  for (
    const [line, value] of [[1, -89500], [17, 1000], [21, 1000], [23, 20000], [
      24,
      -34000,
    ]]
  ) {
    assertEquals(
      form.getTextField(form172PdfPartIField(line)).getText(),
      String(value),
    );
  }
});
Deno.test({
  name:
    "Form 172 PDF rejects detached template, missing names and inconsistent spouse identity",
  ignore: !available,
}, async () => {
  const v = await fixture(),
    f = await bound(v),
    template = await Deno.readFile(templatePath),
    changed = template.slice();
  changed[10] ^= 1;
  await assertRejects(() =>
    stageForm172LossYearPdfDocument(f.binding, f.documents, changed)
  );
  const without = structuredClone(v);
  delete without.pdf_identity;
  const missing = await bound(without);
  await assertRejects(() =>
    stageForm172LossYearPdfDocument(
      missing.binding,
      missing.documents,
      template,
    )
  );
  const joint = await fixture(true);
  delete joint.pdf_identity.spouse_first_name;
  const j = await bound(joint);
  await assertRejects(() =>
    stageForm172LossYearPdfDocument(j.binding, j.documents, template)
  );
  v.pdf_identity.spouse_first_name = "Wrong";
  v.pdf_identity.spouse_last_name = "Owner";
  const bad = await bound(v);
  await assertRejects(() =>
    stageForm172LossYearPdfDocument(bad.binding, bad.documents, template)
  );
});
Deno.test({
  name:
    "Form 172 PDF refuses clipped names and preserves the owned template/source snapshot",
  ignore: !available,
}, async () => {
  const v = await fixture();
  v.pdf_identity.taxpayer_last_name = "Long".repeat(1000);
  const long = await bound(v), template = await Deno.readFile(templatePath);
  await assertRejects(() =>
    stageForm172LossYearPdfDocument(long.binding, long.documents, template)
  );
  const f = await bound(await fixture()),
    promise = stageForm172LossYearPdfDocument(f.binding, f.documents, template);
  f.documents[0].bytes.fill(0);
  f.binding.taxpayer_ssn = "999887777";
  template.fill(0);
  const r = await promise;
  await verify(r);
  assertEquals(r.regularNol, 50000);
});
Deno.test({
  name: "Form 172 non-loss emits no PDF and no placeholder attachment",
  ignore: !available,
}, async () => {
  const v = await fixture();
  v.noncapital_income[0].amount = 80000;
  v.reviewed_form1040.line11_agi = 20000;
  const f = await bound(v),
    r = await stageForm172LossYearPdfDocument(
      f.binding,
      f.documents,
      await Deno.readFile(templatePath),
    );
  assertEquals(r.pdf_bytes, undefined);
  assertEquals(r.native_xml, undefined);
  assertEquals(r.pdf_field_values, {});
});
