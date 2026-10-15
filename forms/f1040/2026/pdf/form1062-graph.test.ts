import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  form1062CreditsGraph2026,
  form1062ExtensionReceipt2026,
  form1062GraphFixture2026,
} from "../inputs/form1062-graph.fixture.ts";

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).split("\f");
  } finally {
    await Deno.remove(file);
  }
}

Deno.test("2026 election bundle reconciles 1040, Schedule 3, Form 1062 and Schedule A while preserving covenant originals", async () => {
  const f = await form1062GraphFixture2026();
  const r = await buildDraftReturnPdf2026(f.graph, f.documents);
  const text = await inspect(r.bytes);
  const pages = (form: string) =>
    r.attachments.find((a) => a.form === form)!.formPages;
  const form = (name: string) => text[pages(name)[0] - 1];
  const schedule = r.attachments.find((a) =>
    a.form.startsWith("form1062_schedule_a:")
  )!;
  assert(pages("form8995")[0] < pages("form1062")[0]);
  assert(pages("form1062")[0] < schedule.formPages[0]);
  assertEquals(pages("form1062").length, 1);
  assertEquals(schedule.formPages.length, 1);
  for (
    const page of [
      ...pages("form1062"),
      ...schedule.formPages,
      ...schedule.statementPages,
    ]
  ) {
    assertEquals(
      text[page - 1].match(/INCOMPLETE 2026 IMPLEMENTATION/g)?.length,
      1,
    );
  }
  for (const value of ["5871", "2503", "3368", "842"]) {
    assertStringIncludes(form("form1062"), value);
  }
  assertStringIncludes(form("schedule3"), "3368");
  for (const value of ["5871", "842", "6713", "3368"]) {
    assertStringIncludes(text[pages("f1040")[1] - 1], value);
  }
  assertStringIncludes(text[schedule.formPages[0] - 1], "45000");
  assertEquals(r.sourceAttachments.length, 1);
  assertEquals(r.sourceAttachments[0].requiredForForms, [schedule.form]);
  assertEquals(r.sourceAttachments[0].bytes, f.documents[0].bytes);
  const original = await PDFDocument.load(r.sourceAttachments[0].bytes);
  assertEquals(
    original.getForm().getTextField("synthetic-original-record").getText(),
    "Preserve original bytes",
  );
  assertEquals(r.filingReady, false);
  assertEquals(r.calculation.diagnostics, []);
});

Deno.test("2026 election bundle keeps actual credit pages alongside the hypothetical Form 1062 replay", async () => {
  const f = await form1062GraphFixture2026(form1062CreditsGraph2026());
  const r = await buildDraftReturnPdf2026(f.graph, f.documents),
    text = await inspect(r.bytes);
  const form = (name: string) =>
    text[r.attachments.find((a) => a.form === name)!.formPages[0] - 1];
  assertStringIncludes(form("form1062"), "1024");
  assertStringIncludes(form("form1062"), "256");
  assertStringIncludes(form("form5695"), "997");
  assert(r.attachments.some((a) => a.form === "form2441"));
  assert(r.attachments.some((a) => a.form === "form8863"));
  assert(r.attachments.some((a) => a.form === "schedule8812"));
  assertEquals(r.calculation.pending.f1040.line28_actc, 0);
  assertEquals(r.calculation.pending.f1040.line29_refundable_aotc, 500);
});

Deno.test("2026 election bundle refuses missing documents and unresolved election timing", async () => {
  const f = await form1062GraphFixture2026();
  await assertRejects(
    () => buildDraftReturnPdf2026(f.graph),
    Error,
    "exact claimed",
  );
  f.graph.form1062.claim.installment_records.filing.on = "2027-04-16";
  await assertRejects(
    () => buildDraftReturnPdf2026(f.graph, f.documents),
    Error,
    "late election",
  );
});

Deno.test("2026 extended-election bundle credits the full extension receipt once alongside the tax deferral", async () => {
  const f = await form1062GraphFixture2026();
  const records = f.graph.form1062.claim.installment_records;
  records.as_of = records.filing.on = "2027-10-15";
  records.extension = {
    record_reference: "extension",
    requested_on: "2027-04-15",
    valid_six_month_filing_extension: true,
  };
  records.payments = [{
    record_reference: "first-payment",
    account_record_reference: "tax-account",
    effective_on: "2027-04-15",
    amount_cents: 84200,
    allocations: [{ installment: 1, amount_cents: 84200 }],
  }];
  const r = await buildDraftReturnPdf2026({
    ...f.graph,
    extension_payments: form1062ExtensionReceipt2026(),
  }, f.documents);
  const text = await inspect(r.bytes);
  const schedule =
    text[r.attachments.find((a) => a.form === "schedule3")!.formPages[0] - 1];
  for (const amount of ["1000", "3368", "4368"]) {
    assertStringIncludes(schedule, amount);
  }
  assertEquals(r.calculation.pending.f1040.line37_amount_owed, 2245);
});
