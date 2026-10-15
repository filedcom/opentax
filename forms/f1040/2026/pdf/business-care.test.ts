import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  businessCareFixture2026,
  monthlyBusinessCareFixture2026,
} from "../inputs/business-care.fixture.ts";

Deno.test("Business care earnings reconcile through the complete return and printed benefit/credit pages", async () => {
  for (
    const [input, earned, credit, exclusion, taxable] of [
      [businessCareFixture2026(), 59293, 1050, 0, 0],
      [businessCareFixture2026(-9000, 10000, 7500, 9000), 7500, 0, 1000, 6500],
      [monthlyBusinessCareFixture2026(), 2000, 0, 1929, 71],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(input);
    assertEquals(
      r.calculation.pending.schedule3.line2_childcare_credit,
      credit,
    );
    assertEquals(r.calculation.pending.f1040.line1e_taxable_dep_care, taxable);
    const care = r.attachments.find((a) => a.form === "form2441")!;
    assert(care);
    assertEquals(care.formPages.length, exclusion ? 2 : 1);
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, r.bytes);
      const p = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(care.formPages[0]),
          "-l",
          String(care.formPages.at(-1)),
          path,
          "-",
        ],
      }).output();
      assertEquals(p.code, 0);
      const text = new TextDecoder().decode(p.stdout);
      assertStringIncludes(text, String(earned));
      if (credit) assertStringIncludes(text, String(credit));
      if (exclusion) {
        assertStringIncludes(text, String(exclusion));
        assertStringIncludes(text, String(taxable));
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
