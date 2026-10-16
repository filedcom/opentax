import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { adoptionEducationFixture2026 } from "../inputs/adoption-support.fixture.ts";
import { childTaxFixture2026 } from "../inputs/child-tax.fixture.ts";

Deno.test("Adoption compensation reconciles refundable education and child-tax draft selection", async () => {
  for (const support of [26000, 30000]) {
    const input = adoptionEducationFixture2026(),
      c = childTaxFixture2026(10000, 10000);
    const review = input.f8863.claim.refundable_review;
    assert(review.kind === "under24_nonjoint");
    review.support_records[0].amount = support;
    c.f8615.claim!.support_records[0].amount = support;
    c.f8615.claim!.adoption_inventory_reference =
      input.form8839.claim.record_reference;
    const r = await buildDraftReturnPdf2026({
      ...input,
      f8615: c.f8615,
      investment_income: c.investment_income,
    });
    assertEquals(r.filingReady, false);
    assertEquals(r.calculation.pending.f1040.line11b_agi, 20000);
    assertEquals(
      r.calculation.pending.f1040.line29_refundable_aotc,
      support === 26000 ? 1000 : 0,
    );
    assertEquals(r.calculation.pending.f1040.line30_refundable_adoption, 5120);
    const adoption = r.attachments.find((a) => a.form === "form8839"),
      education = r.attachments.find((a) => a.form === "form8863"),
      child = r.attachments.find((a) => a.form === "form8615");
    assert(adoption && education);
    assertEquals(!!child, support === 30000);
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, r.bytes);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(extracted.code, 0);
      assertEquals(new TextDecoder().decode(extracted.stderr), "");
      const pages = new TextDecoder().decode(extracted.stdout).split("\f");
      assertStringIncludes(pages[adoption.formPages[0] - 1], "5120");
      assertStringIncludes(
        pages[education.formPages[0] - 1],
        support === 26000 ? "1000" : "2500",
      );
      if (child) {
        assertStringIncludes(pages[child.formPages[0] - 1], "10000");
        assertStringIncludes(pages[child.formPages[0] - 1], "Synthetic Parent");
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
