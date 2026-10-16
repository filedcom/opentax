import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { createHash } from "node:crypto";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { form4852Graph2026 } from "../inputs/form4852-graph.fixture.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "../inputs/retirement.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
async function text(bytes: Uint8Array, page: number, box?: number[]) {
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: [
        "-layout",
        "-f",
        String(page),
        "-l",
        String(page),
        ...(box
          ? [
            "-x",
            String(box[0]),
            "-y",
            String(box[1]),
            "-W",
            String(box[2]),
            "-H",
            String(box[3]),
          ]
          : []),
        file,
        "-",
      ],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).trim();
  } finally {
    await Deno.remove(file);
  }
}
Deno.test("2026 return bundle carries substitute wages and complete explanations after all official form pages", async () => {
  const g = form4852Graph2026();
  g.f4852.claim.records[0].estimation_method =
    "Payroll evidence was reconstructed and checked against every payment record. "
      .repeat(45) + "FINAL ESTIMATE SENTENCE.";
  const r = await buildDraftReturnPdf2026(g);
  assertEquals(r.calculation.pending.f1040.line1a_wages, 60000);
  assertEquals(r.calculation.pending.f1040.line25a_w2_withheld, 5001);
  assertEquals(r.sourceAttachments, []);
  const a = r.attachments.find((a) => a.form === "f4852:substitute-2026")!;
  assertEquals(a.formPages.length, 1);
  assert(a.statementPages.length > 0);
  assert(
    Math.min(...a.statementPages) >
      Math.max(...r.attachments.flatMap((a) => a.formPages)),
  );
  assertEquals(
    await text(r.bytes, a.formPages[0], [237, 384, 73, 12]),
    "5000.75",
  );
  const continuation =
    (await Promise.all(a.statementPages.map((p) => text(r.bytes, p)))).join(
      " ",
    );
  assert(continuation.includes("FINAL ESTIMATE SENTENCE."));
  assert(
    (await text(r.bytes, a.formPages[0])).includes("100 Synthetic Street"),
  );
  const doc = await PDFDocument.load(r.bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  assertEquals(r.filingReady, false);
});
Deno.test("2026 retirement return attaches the substitute and preserves an unrelated withheld original byte for byte", async () => {
  const g = form4852Graph2026(true), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const original = retirementCopy2026("incorrect-pension");
  original.payer_tin = s.payer_tin;
  original.account_number = s.account_number;
  s.status = {
    kind: "incorrect",
    replaces_document_reference: original.source_document_reference,
  };
  const other = retirementCopy2026("actual-pension");
  g.f1099r!.claim.copies = [original, other];
  g.f1099r!.claim.reviews.push(retirementSource2026([other]).claim.reviews[0]);
  await assertRejects(
    () => buildDraftReturnPdf2026(g),
    Error,
    "original issued PDF",
  );
  const issued = await PDFDocument.create();
  issued.addPage().drawText("SYNTHETIC UNRELATED ISSUER COPY - TEST ONLY");
  const bytes = await issued.save();
  other.issued_copy_pdf_base64 = btoa(String.fromCharCode(...bytes));
  other.issued_copy_pdf_sha256 = createHash("sha256").update(bytes).digest(
    "hex",
  );
  other.issued_copy_attachment_file_name = "actual-pension.pdf";
  const r = await buildDraftReturnPdf2026(g);
  assertEquals(r.sourceAttachments.length, 1);
  assertEquals(r.sourceAttachments[0].bytes, bytes);
  assertEquals(r.calculation.pending.f1040.line5b_pension_taxable, 22001);
  assertEquals(r.calculation.pending.f1040.line25b_withheld_1099, 2001);
  const a = r.attachments.find((a) => a.form === "f4852:substitute-2026")!;
  assertEquals(
    await text(r.bytes, a.formPages[0], [237, 444, 73, 12]),
    "10000.25",
  );
  assertEquals(
    await text(r.bytes, a.formPages[0], [504, 432, 73, 12]),
    "1000.25",
  );
});
Deno.test("2026 joint return prints the substitute IRA's spouse owner and leaves undetermined source taxable amount blank", async () => {
  const g = form4852Graph2026(true, true), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  Object.assign(g.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "400001045",
    spouse_dob: "1966-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  s.owner_tin = s.distribution_sources[0].owner_ssn = "400001045";
  const r = await buildDraftReturnPdf2026(g),
    a = r.attachments.find((a) => a.form === "f4852:substitute-2026")!;
  assertEquals(r.calculation.pending.f1040.line4b_ira_taxable, 12000);
  assertEquals(r.sourceAttachments, []);
  assertEquals(await text(r.bytes, a.formPages[0], [237, 444, 73, 12]), "");
  assertEquals(await text(r.bytes, a.formPages[0], [504, 516, 73, 12]), "IRA");
  const content = await text(r.bytes, a.formPages[0]);
  assert(content.includes("Alex Wheat"));
  assert(content.includes("400001045"));
  assert(!content.includes("400001037"));
});
Deno.test("2026 substitute draft requires the actual supported return address", async () => {
  const g = form4852Graph2026();
  g.general.address_city = "";
  await assertRejects(
    () => buildDraftReturnPdf2026(g),
    Error,
    "actual domestic return address",
  );
});
Deno.test("2026 mixed wage and retirement substitutes retain separate form pages and aggregate withholding once", async () => {
  const g = form4852Graph2026(true),
    wage = form4852Graph2026().f4852.claim.records[0];
  if (wage.kind !== "w2") throw Error();
  wage.source_document_reference = "substitute-wage";
  wage.payer_contact.record_reference = "wage-payer-contact";
  wage.irs_notification.record_reference = "wage-irs-contact";
  wage.estimation_method =
    "Payroll estimate evidence from the wage account was checked against each payment. "
      .repeat(20);
  g.f4852.claim.records.push(wage);
  const r = await buildDraftReturnPdf2026(g);
  assertEquals(r.calculation.pending.f1040.line1a_wages, 60000);
  assertEquals(r.calculation.pending.f1040.line5b_pension_taxable, 10000);
  assertEquals(r.calculation.pending.f1040.line25d_total_withholding, 6001);
  const a = r.attachments.filter((a) => a.form.startsWith("f4852:"));
  assertEquals(a.map((a) => a.form), [
    "f4852:substitute-2026",
    "f4852:substitute-wage",
  ]);
  assertEquals(a[0].statementPages, []);
  assertEquals(
    await text(r.bytes, a[0].formPages[0], [504, 432, 73, 12]),
    "1000.25",
  );
  assertEquals(
    await text(r.bytes, a[1].formPages[0], [237, 384, 73, 12]),
    "5000.75",
  );
  assert(
    Math.min(...a[1].statementPages) >
      Math.max(...r.attachments.flatMap((a) => a.formPages)),
  );
});
