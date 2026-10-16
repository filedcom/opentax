import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { jointAdoptionCareFixture2026 } from "../inputs/adoption-care.fixture.ts";
Deno.test("Adoption and care draft forms retain separate spouses' signed earned-income limits", async () => {
  const r = await buildDraftReturnPdf2026(jointAdoptionCareFixture2026());
  assertEquals(r.filingReady, false);
  const care = r.attachments.find((a) => a.form === "form2441"),
    adoption = r.attachments.find((a) => a.form === "form8839");
  assert(care && adoption);
  const doc = await PDFDocument.load(r.bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, r.bytes);
    const t = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(t.code, 0);
    assertEquals(new TextDecoder().decode(t.stderr), "");
    const pages = new TextDecoder().decode(t.stdout).split("\f");
    assertStringIncludes(pages[care.formPages[0] - 1], "50000");
    assertStringIncludes(pages[care.formPages[0] - 1], "2330");
    assertStringIncludes(pages[adoption.formPages[1] - 1], "-17670");
  } finally {
    await Deno.remove(path);
  }
});
