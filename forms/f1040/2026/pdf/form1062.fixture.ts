import { PDFDocument, StandardFonts } from "pdf-lib";
import { form1062Fixture2026 } from "../inputs/form1062.fixture.ts";
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
