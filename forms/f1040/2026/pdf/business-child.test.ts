import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  businessChildFixture2026,
  capitalBusinessChildFixture2026,
} from "../inputs/business-child.fixture.ts";

Deno.test("Business child-tax drafts reconcile Schedule C, SE, QBI and full or stopped Form 8615", async () => {
  const cases = [
    businessChildFixture2026(20000, 10000),
    businessChildFixture2026(1000, 5000),
    capitalBusinessChildFixture2026(),
  ];
  for (const [i, input] of cases.entries()) {
    const r = await buildDraftReturnPdf2026(input), p = r.calculation.pending;
    assertEquals(r.filingReady, false);
    assertEquals(p.f1040.line16_income_tax, [410, 0, 432][i]);
    assertEquals(p.f1040.line15_taxable_income, [3640, 0, 3640][i]);
    assertEquals(
      p.form8615.line1_child_unearned_income,
      [5000, 5000, 12212][i],
    );
    assertEquals(p.f1040.line13b_qbi, [910, 0, 910][i]);
    assert(r.attachments.some((a) => a.form === "schedule_c"));
    assert(r.attachments.some((a) => a.form === "form8995"));
    assertEquals(r.attachments.some((a) => a.form === "schedule_se"), i !== 1);
    const form = r.attachments.find((a) => a.form === "form8615");
    assert(form);
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(
      pdf.getPages().every((page) => !page.node.has(PDFName.of("Annots"))),
    );
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, r.bytes);
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(text.code, 0);
      const pages = new TextDecoder().decode(text.stdout).split("\f");
      const childPage = pages[form.formPages[0] - 1];
      assertStringIncludes(childPage, String([5000, 5000, 12212][i]));
      assertStringIncludes(childPage, "Synthetic Parent");
      if (i !== 1) {
        assertStringIncludes(childPage, String([410, 0, 432][i]));
        assertStringIncludes(pages[1], String([410, 0, 432][i]));
      } else assertEquals(p.form8615.line18_child_tax, undefined);
    } finally {
      await Deno.remove(path);
    }
  }
});
