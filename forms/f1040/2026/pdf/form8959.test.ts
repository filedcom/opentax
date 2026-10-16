import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm8959PdfBytes2026 } from "./form8959.ts";
import { syntheticMedicare2026 } from "../nodes/form8959.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
const filer = { name: "Ada Q Rivera", ssn: "111223333" };
const totals = {
  schedule2_line17b: 450,
  schedule2_line11: 0,
  form8959_withholding_component: 450,
};
Deno.test("2026 Form 8959 renders one static draft page from reviewed sources", async () => {
  const bytes = await buildForm8959PdfBytes2026(
    syntheticMedicare2026(),
    totals,
    filer,
  );
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 1);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  assertEquals(pdf.getPage(0).node.has(PDFName.of("Annots")), false);
});
Deno.test("2026 Form 8959 renders withholding credit with zero joint tax", async () => {
  const source = {
    ...syntheticMedicare2026(),
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "222334444",
  };
  const bytes = await buildForm8959PdfBytes2026(source, {
    ...totals,
    schedule2_line17b: 0,
  }, { ...filer, name: "Ada Q Rivera & Ben Rivera" });
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
});
Deno.test("2026 Form 8959 PDF rejects stale destinations and a different filer", async () => {
  await assertRejects(
    () =>
      buildForm8959PdfBytes2026(syntheticMedicare2026(), {
        ...totals,
        schedule2_line17b: 0,
      }, filer),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () =>
      buildForm8959PdfBytes2026(syntheticMedicare2026(), totals, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
