import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm8880PdfBytes2026 } from "./form8880.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { saverSource2026 } from "../inputs/savers-credit.fixture.ts";
import { saverGraph2026 } from "../inputs/savers-credit-graph.fixture.ts";
import { calculateSaversCredit2026 } from "../inputs/savers-credit-source.ts";

Deno.test("2026 Form 8880 maps both columns and omits cover and instructions from static attachment", async () => {
  for (const joint of [false, true]) {
    const s = saverSource2026(joint);
    if (joint) {
      s.wage_sources.push({
        ...s.wage_sources[0],
        source_document_reference: "spouse-wages",
        employee_ssn: s.spouse_ssn!,
        box1_wages: 0,
        box12_entries: [{ code: Box12Code.D, amount: 1234.56 }],
      });
    }
    const r = calculateSaversCredit2026(s), tax = r.source_input.finalized_tax;
    const destinations = {
      form1040_line11a: s.agi,
      form1040_line18: tax.line18,
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line6d: 0,
      schedule3_line6l: 0,
      schedule3_line4: r.lines.line12,
    };
    const filer = {
      name: joint ? "Synthetic and Joint Saver" : "Synthetic Saver",
      ssn: s.taxpayer_ssn,
    };
    const bytes = await buildForm8880PdfBytes2026(s, destinations, filer);
    const doc = await PDFDocument.load(bytes);
    assertEquals(doc.getPageCount(), 1);
    assert(!doc.catalog.has(PDFName.of("AcroForm")));
    assert(!doc.getPage(0).node.has(PDFName.of("Annots")));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, bytes);
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(text.code, 0);
      const t = new TextDecoder().decode(text.stdout);
      for (
        const value of [
          filer.name,
          s.taxpayer_ssn,
          "DRAFT - NOT FOR FILING",
          "2000",
          String(r.lines.line12),
          ...(joint ? ["1235"] : []),
        ]
      ) assertStringIncludes(t, value);
      assert(!t.includes("Credit Limit Worksheet. Complete"));
    } finally {
      await Deno.remove(path);
    }
    for (
      const key of Object.keys(destinations) as (keyof typeof destinations)[]
    ) {
      await assertRejects(() =>
        buildForm8880PdfBytes2026(s, {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer)
      );
    }
    await assertRejects(() =>
      buildForm8880PdfBytes2026(s, destinations, { ...filer, ssn: "999887777" })
    );
  }
});
Deno.test("2026 saver draft bundle reconciles Schedule 3 and omits zero credit Form 8880", async () => {
  for (const wages of [24000, 50000]) {
    const r = await buildDraftReturnPdf2026(saverGraph2026(wages, 1));
    const form = r.attachments.find((a) => a.form === "form8880");
    assertEquals(!!form, wages === 24000);
    if (form) {
      assertEquals(form.formPages.length, 1);
      const names = r.attachments.map((a) => a.form);
      assert(names.indexOf("form8880") > names.indexOf("schedule8812"));
    }
    assertEquals(r.filingReady, false);
  }
});
