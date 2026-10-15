import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  monthlyCareCreditOnlyFixture2026,
  monthlyCareFixture2026,
} from "../inputs/dependent-care-earned.fixture.ts";

Deno.test("Monthly care income and independent combat election survive the draft bundle", async () => {
  for (
    const [input, expected, count] of [
      [monthlyCareFixture2026(), ["51200", "1800", "1200", "420"], 2],
      [monthlyCareCreditOnlyFixture2026(), ["50300", "50000", "1050"], 1],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(input);
    const a = r.attachments.find((a) => a.form === "form2441")!;
    assertEquals(a.formPages.length, count);
    const pdf = await PDFDocument.load(r.bytes),
      component = await PDFDocument.create();
    for (
      const p of await component.copyPages(
        pdf,
        a.formPages.map((p) => p - 1),
      )
    ) component.addPage(p);
    const bytes = await component.save();
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, bytes);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(extracted.code, 0);
      const text = new TextDecoder().decode(extracted.stdout);
      for (const value of expected) assertStringIncludes(text, value);
    } finally {
      await Deno.remove(path);
    }
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    assertEquals(r.calculation.pending.f1040.line1i_combat_pay ?? 0, 0);
  }
});
