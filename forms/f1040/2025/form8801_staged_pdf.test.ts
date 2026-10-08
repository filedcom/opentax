import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import {
  form8801PdfFieldForLine,
  stageForm8801PdfDocument,
} from "./form8801_staged_pdf.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";

const templatePath = new URL(
  "../../../.state/research/board-execution-2026-10-07/form8801-pdf-20261008-v1/canonical.pdf",
  import.meta.url,
).pathname;
let available = false;
try {
  Deno.statSync(templatePath);
  available = true;
} catch { /* Private reviewed template. */ }
const template = () => Deno.readFile(templatePath);

async function verify(
  result: Awaited<ReturnType<typeof stageForm8801PdfDocument>>,
  pages: number,
) {
  const pdf = await PDFDocument.load(result.pdf_bytes!);
  assertEquals(pdf.getPageCount(), pages);
  const form = pdf.getForm();
  for (const field of form.getFields()) {
    assertEquals(field instanceof PDFTextField, true);
    assertEquals(
      (field as PDFTextField).getText() ?? "",
      result.pdf_field_values[field.getName()] ?? "",
    );
  }
  for (const [name, expected] of Object.entries(result.pdf_field_values)) {
    assertEquals(form.getTextField(name).getText(), expected);
  }
  assertEquals(result.filingReady, false);
  for (const format of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(result.projected_pending, format),
      Error,
      "Form 8801",
    );
  }
  return form;
}

Deno.test("8801 PDF mapping follows printed parts including shared native lines", () => {
  assertEquals(
    [1, 15, 16, 17, 26, 27, 41, 42, 43, 55].map(form8801PdfFieldForLine),
    [
      "topmostSubform[0].Page1[0].f1_3[0]",
      "topmostSubform[0].Page1[0].f1_17[0]",
      "topmostSubform[0].Page2[0].f2_1[0]",
      "topmostSubform[0].Page2[0].f2_2[0]",
      "topmostSubform[0].Page2[0].f2_11[0]",
      "topmostSubform[0].Page3[0].f3_1[0]",
      "topmostSubform[0].Page3[0].f3_15[0]",
      "topmostSubform[0].Page3[0].f3_16[0]",
      "topmostSubform[0].Page4[0].f4_1[0]",
      "topmostSubform[0].Page4[0].f4_13[0]",
    ],
  );
  for (const n of [0, 56, 1.5]) assertThrows(() => form8801PdfFieldForLine(n));
});

Deno.test({
  name: "8801 interactive PDF binds partial credit, carry and current identity",
  ignore: !available,
}, async () => {
  const f = await fixture();
  f.inputs.w2[0].box1_wages = 30_000;
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    await template(),
  );
  const form = await verify(r, 2);
  assertEquals(
    form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").getText(),
    "Alex Example",
  );
  assertEquals(
    form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").getText(),
    "111223333",
  );
  assertEquals(form.getTextField(form8801PdfFieldForLine(17)).getText(), "918");
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(25)).getText(),
    "1475",
  );
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(26)).getText(),
    "3707",
  );
  assertEquals(form.getFields().length, 28);
});

Deno.test({
  name: "8801 PDF Schedule D fills every printed line including 25 percent tax",
  ignore: !available,
}, async () => {
  const facts = packageFacts();
  facts.prior_form6251.line1 = 300_000;
  facts.prior_credit_carryforward.amount = 100_000;
  const f = await fixture({
    ...facts,
    capital_rate_workpaper: {
      reference: "reviewed capital workpaper",
      method: "schedule_d_worksheet",
      line28: 100_000,
      line29: 30_000,
      schedule_d_line10: 130_000,
      line35: 0,
      line42: 0,
      amt_and_foreign_modifications_reviewed: true,
    },
  });
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    await template(),
  );
  const form = await verify(r, 4);
  assertEquals(Object.keys(r.pdf_field_values).length, 57);
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(41)).getText(),
    "47025",
  );
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(52)).getText(),
    "7500",
  );
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(55)).getText(),
    "42564",
  );
});

Deno.test({
  name: "8801 PDF preserves signed net deferral and blank skipped Part I tax",
  ignore: !available,
}, async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  facts.prior_credit_carryforward.amount = 10_000;
  const f = await fixture(facts);
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    await template(),
  );
  const form = await verify(r, 2);
  assertEquals(
    form.getTextField(form8801PdfFieldForLine(18)).getText(),
    "-3918",
  );
  facts.prior_form6251.line2a = -20_000;
  const g = await fixture(facts);
  const s = await stageForm8801PdfDocument(
    g.inputs,
    g.binding,
    g.documents,
    await template(),
  );
  const skipped = await verify(s, 2);
  assertEquals(
    skipped.getTextField(form8801PdfFieldForLine(2)).getText(),
    "-20000",
  );
  for (const line of [11, 12, 13, 14]) {
    assertEquals(
      skipped.getTextField(form8801PdfFieldForLine(line)).getText() ?? "",
      "",
    );
  }
});

Deno.test({
  name: "8801 PDF qualified dividends keeps skipped capital cells blank",
  ignore: !available,
}, async () => {
  const f = await fixture({
    ...packageFacts(),
    capital_rate_workpaper: {
      reference: "reviewed QD",
      method: "qualified_dividends_worksheet",
      line28: 10_000,
      line29: 0,
      line35: 0,
      line42: 0,
      amt_and_foreign_modifications_reviewed: true,
    },
  });
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    await template(),
  );
  const form = await verify(r, 4);
  for (const line of [29, 50, 51, 52]) {
    assertEquals(
      form.getTextField(form8801PdfFieldForLine(line)).getText() ?? "",
      "",
    );
  }
});

Deno.test({
  name:
    "8801 PDF rejects unverified templates and emits nothing after a nonpositive stop",
  ignore: !available,
}, async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  const f = await fixture(facts);
  const bytes = await template();
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    bytes,
  );
  assertEquals(r.pdf_bytes, undefined);
  bytes[0] ^= 1;
  await assertRejects(
    () => stageForm8801PdfDocument(f.inputs, f.binding, f.documents, bytes),
    Error,
    "verified TY2025 template",
  );
});

Deno.test({
  name:
    "8801 PDF joint identity includes both names and rejects an incomplete spouse",
  ignore: !available,
}, async () => {
  const f = await fixture();
  Object.assign(f.inputs.general, {
    filing_status: "mfj",
    spouse_ssn: "444556666",
    spouse_first_name: "Casey",
    spouse_last_name: "Example",
  });
  const r = await stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    await template(),
  );
  const form = await verify(r, 2);
  assertEquals(
    form.getTextField("topmostSubform[0].Page1[0].f1_1[0]").getText(),
    "Alex Example and Casey Example",
  );
  assertEquals(
    form.getTextField("topmostSubform[0].Page1[0].f1_2[0]").getText(),
    "111223333",
  );
  delete f.inputs.general.spouse_first_name;
  const templateBytes = await template();
  await assertRejects(() =>
    stageForm8801PdfDocument(f.inputs, f.binding, f.documents, templateBytes)
  );
});

Deno.test({
  name: "8801 PDF snapshots every caller input before template digest awaits",
  ignore: !available,
}, async () => {
  const f = await fixture();
  const bytes = await template();
  const promise = stageForm8801PdfDocument(
    f.inputs,
    f.binding,
    f.documents,
    bytes,
  );
  f.inputs.w2[0].box1_wages = 0;
  f.binding.sha256 = "0".repeat(64);
  f.documents[0].bytes.fill(0);
  bytes.fill(0);
  const r = await promise;
  await verify(r, 2);
  assertEquals(r.final_form1040.line22_tax_after_credits, 12685);
});
