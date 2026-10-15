import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  businessCreditGraphFixture2026,
  jointBusinessCreditGraphFixture2026,
  statutoryBusinessCreditGraphFixture2026,
} from "../inputs/business-earned.fixture.ts";
Deno.test("Business EIC and ACTC reconcile through settlement and both credit attachments", async () => {
  for (
    const [source, earned, actc] of [
      [businessCreditGraphFixture2026(), "9293", 1019],
      [statutoryBusinessCreditGraphFixture2026(), "10000", 1125],
      [jointBusinessCreditGraphFixture2026(), "33874", 5100],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(source);
    assertEquals(r.calculation.pending.f1040.line28_actc, actc);
    const credit = r.attachments.find((a) => a.form === "schedule8812")!;
    const eic = r.attachments.find((a) => a.form === "schedule_eic")!;
    assert(credit && eic);
    assertEquals(credit.formPages.length, 2);
    const d = await PDFDocument.load(r.bytes);
    assert(!d.catalog.has(PDFName.of("AcroForm")));
    assert(d.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, r.bytes);
      const p = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(credit.formPages[1]),
          "-l",
          String(credit.formPages[1]),
          path,
          "-",
        ],
      }).output();
      assertEquals(p.code, 0);
      const text = new TextDecoder().decode(p.stdout);
      assertStringIncludes(text, earned);
      assertStringIncludes(text, String(actc));
      if (actc === 5100) {
        assertStringIncludes(text, "330");
        assertStringIncludes(text, "16126");
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
