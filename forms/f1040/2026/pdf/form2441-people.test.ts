import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  custodialCareFixture2026,
  disabledCareOverflowFixture2026,
  disabledCarePersonFixture2026,
  disabledCareSpouseFixture2026,
} from "../inputs/dependent-care-people.fixture.ts";

Deno.test("Care PDF includes qualifying spouses and nondependents with complete overflow identities", async () => {
  for (
    const [input, expected, statements] of [
      [disabledCarePersonFixture2026(), ["CareParent", "222334444", "1050"], 0],
      [
        disabledCareSpouseFixture2026(),
        ["Joint", "444556666", "3300", "1050"],
        0,
      ],
      [custodialCareFixture2026(), ["Child1", "222334444", "1050"], 0],
      [disabledCareOverflowFixture2026(), [
        "CareParent4 Investor",
        "222334447",
        "Over 12 and disabled: Yes",
        "2100",
      ], 1],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(input);
    const a = r.attachments.find((a) => a.form === "form2441")!;
    assertEquals(a.formPages.length, 1);
    assertEquals(a.statementPages.length, statements);
    assertEquals(r.calculation.pending.f1040.dependent_details ?? [], []);
    const pdf = await PDFDocument.load(r.bytes),
      care = await PDFDocument.create();
    for (
      const p of await care.copyPages(
        pdf,
        [...a.formPages, ...a.statementPages].map((n) => n - 1),
      )
    ) care.addPage(p);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await care.save());
      const output = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      for (const value of expected) assertStringIncludes(text, value);
    } finally {
      await Deno.remove(path);
    }
  }
});
