import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { form1062Fixture2026 } from "../inputs/form1062.fixture.ts";
import { buildForm1062Schedules2026 } from "./form1062-schedule-a.ts";
const filer = { name: "Synthetic Land Seller", ssn: "123456789" };
export async function form1062PdfFixture2026() {
  const f = form1062Fixture2026(), doc = await PDFDocument.create();
  const page = doc.addPage(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("SYNTHETIC TEST COVENANT - NOT A LEGAL DOCUMENT", {
    x: 36,
    y: 750,
    size: 14,
    font,
  });
  page.drawText(
    "Parcel 1; parties 123456789 and 234567891; farming-use test record.",
    { x: 36, y: 720, size: 11, font },
  );
  const field = doc.getForm().createTextField("synthetic-original-record");
  field.setText("Preserve original bytes");
  field.addToPage(page, { x: 36, y: 650, width: 400, height: 24 });
  const bytes = await doc.save();
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  f.election.sales[0].covenant.sha256 = Array.from(
    hash,
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const documents = [{
    reference: f.election.sales[0].covenant.document_reference,
    bytes,
  }];
  return { ...f, documents };
}
async function text(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(r.code, 0);
    return {
      pages: doc.getPageCount(),
      value: new TextDecoder().decode(r.stdout),
    };
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 Form 1062 Schedule A prints source gains and preserves covenant originals", async () => {
  const f = await form1062PdfFixture2026(),
    r = await buildForm1062Schedules2026(
      f.land,
      f.election,
      f.documents,
      filer,
    );
  assertEquals(r.schedules.length, 1);
  assertEquals(r.covenants.length, 1);
  assertEquals(r.covenants[0].bytes, f.documents[0].bytes);
  const t = await text(r.schedules[0].bytes);
  assertEquals(t.pages, 1);
  for (
    const value of [
      "Synthetic Land Seller",
      "Synthetic farmland",
      "06/02/2026",
      "100000",
      "95000",
      "50000",
      "45000",
      "DRAFT - NOT FOR FILING",
    ]
  ) assertStringIncludes(t.value, value);
  const original = await PDFDocument.load(r.covenants[0].bytes);
  assertEquals(
    original.getForm().getTextField("synthetic-original-record").getText(),
    "Preserve original bytes",
  );
});
Deno.test("2026 Form 1062 Schedule A requires exact covenant bytes and matching identity", async () => {
  const f = await form1062PdfFixture2026();
  await assertRejects(
    () => buildForm1062Schedules2026(f.land, f.election, [], filer),
    Error,
    "exact claimed document set",
  );
  await assertRejects(
    () =>
      buildForm1062Schedules2026(f.land, f.election, [
        ...f.documents,
        ...f.documents,
      ], filer),
    Error,
    "exact claimed document set",
  );
  const changed = f.documents[0].bytes.slice();
  changed[changed.length - 2] ^= 1;
  await assertRejects(
    () =>
      buildForm1062Schedules2026(f.land, f.election, [{
        ...f.documents[0],
        bytes: changed,
      }], filer),
    Error,
    "SHA-256",
  );
  await assertRejects(
    () =>
      buildForm1062Schedules2026(f.land, f.election, f.documents, {
        ...filer,
        ssn: "987654321",
      }),
    Error,
    "matching filer",
  );
  const fake = new TextEncoder().encode("not a PDF");
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", fake));
  f.election.sales[0].covenant.sha256 = Array.from(
    hash,
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  await assertRejects(
    () =>
      buildForm1062Schedules2026(f.land, f.election, [{
        ...f.documents[0],
        bytes: fake,
      }], filer),
    Error,
    "readable, unencrypted PDF",
  );
});
Deno.test("2026 Form 1062 Schedule A retains long property descriptions on source attachments", async () => {
  const f = await form1062PdfFixture2026();
  f.land.claim.sales[0].description =
    "Synthetic legal boundary description. ".repeat(150) +
    "FINAL-PARCEL-MARKER";
  const r = await buildForm1062Schedules2026(
      f.land,
      f.election,
      f.documents,
      filer,
    ),
    t = await text(r.schedules[0].bytes);
  assertEquals(t.pages, 3);
  assertStringIncludes(t.value, "See attached property description");
  assertStringIncludes(t.value, "Sale: sale-1");
  assertStringIncludes(t.value, "FINAL-PARCEL-MARKER");
  assertEquals(t.value.split("45000").length - 1, 1);
});
