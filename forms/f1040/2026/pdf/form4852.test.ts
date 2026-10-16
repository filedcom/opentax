import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { form4852Source2026 } from "../inputs/form4852.fixture.ts";
import { buildForm4852PdfBytes2026 } from "./form4852.ts";
const filers = [{
  name: "Synthetic Owner",
  ssn: "400001037",
  address: "10 Example Street, Boston, MA 02108",
}];
async function text(bytes: Uint8Array, page?: number, box?: number[]) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: [
        "-layout",
        ...(page ? ["-f", String(page), "-l", String(page)] : []),
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
        path,
        "-",
      ],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).trim();
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 Form 4852 W-2 draft prints federal and FICA withholding on their distinct physical lines", async () => {
  const r = await buildForm4852PdfBytes2026(form4852Source2026(), filers),
    doc = await PDFDocument.load(r.bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(doc.getPage(0).node.has(PDFName.of("Annots")), false);
  for (
    const [box, value] of [[[237, 384, 73, 12], "5000.75"], [
      [504, 384, 73, 12],
      "3720.02",
    ], [[504, 396, 73, 12], "870.00"]] as const
  ) assertEquals(await text(r.bytes, 1, [...box]), value);
  const all = await text(r.bytes);
  assert(all.includes("2026"));
  assert(all.includes("Requested the missing statement"));
  assert(all.includes("notified the IRS on March 2."));
  assertEquals(r.attachments[0].statementPages, []);
  assertEquals(r.filingReady, false);
});
Deno.test("2026 Form 4852 retirement draft preserves taxable income and prints the sourced IRA margin label", async () => {
  const raw = form4852Source2026(true), s = raw.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.amounts.is_ira = true;
  s.distribution_sources[0].is_ira = true;
  s.distribution_sources[0].account_type = "traditional_ira";
  const r = await buildForm4852PdfBytes2026(raw, filers);
  assertEquals(await text(r.bytes, 1, [237, 444, 73, 12]), "10000.25");
  assertEquals(await text(r.bytes, 1, [504, 432, 73, 12]), "1000.25");
  assertEquals(await text(r.bytes, 1, [504, 516, 73, 12]), "IRA");
  s.amounts.taxable_amount_not_determined = true;
  delete s.amounts.taxable_amount;
  s.distribution_sources[0].taxable_amount_not_determined = true;
  delete s.distribution_sources[0].taxable_amount;
  const unknown = await buildForm4852PdfBytes2026(raw, filers);
  assertEquals(await text(unknown.bytes, 1, [237, 444, 73, 12]), "");
});
Deno.test("2026 Form 4852 continuation keeps complete long explanations across pages", async () => {
  const raw = form4852Source2026();
  raw.claim.records[0].estimation_method =
    "Payroll evidence was reconstructed and checked against each payment record. "
      .repeat(50) + "FINAL EVIDENCE SENTENCE.";
  raw.claim.records[0].payer_efforts_explanation =
    "The employer was contacted and the retained chronology was reviewed. "
      .repeat(50) + "FINAL CONTACT SENTENCE.";
  const r = await buildForm4852PdfBytes2026(raw, filers),
    all = await text(r.bytes);
  assert(all.includes("FINAL EVIDENCE SENTENCE."));
  assert(all.includes("FINAL CONTACT SENTENCE."));
  assert(r.attachments[0].statementPages.length >= 2);
});
Deno.test("2026 Form 4852 PDF refuses missing duplicate or incorrect beneficiary identities", async () => {
  for (
    const owners of [[], [...filers, ...filers], [{
      ...filers[0],
      ssn: "400001099",
    }]]
  ) {
    await assertRejects(
      () => buildForm4852PdfBytes2026(form4852Source2026(), owners),
      Error,
      "each actual substitute owner",
    );
  }
});
