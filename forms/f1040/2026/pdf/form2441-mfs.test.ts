import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  separateCareFixture2026,
  separateDisabledSpouseFixture2026,
  separatePriorOnlyCareFixture2026,
} from "../inputs/dependent-care-mfs.fixture.ts";

Deno.test("MFS draft care forms reconcile benefit limits and preserve the prior-only worksheet", async () => {
  for (
    const [input, expected, count, statements] of [
      [separateCareFixture2026(), ["7500", "350"], 2, 0],
      [separateCareFixture2026(false, 6000, 6000), ["3750", "2250"], 2, 0],
      [await separateDisabledSpouseFixture2026(), ["3300", "2700"], 2, 0],
      [
        await separatePriorOnlyCareFixture2026(),
        ["210", "2025 expenses paid in 2026 - Worksheet A"],
        1,
        1,
      ],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(input),
      a = r.attachments.find((a) => a.form === "form2441")!;
    assertEquals(a.formPages.length, count);
    assertEquals(a.statementPages.length, statements);
    const pdf = await PDFDocument.load(r.bytes),
      care = await PDFDocument.create();
    for (
      const p of await care.copyPages(
        pdf,
        [...a.formPages, ...a.statementPages].map((p) => p - 1),
      )
    ) care.addPage(p);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await care.save());
      const out = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(out.code, 0);
      const text = new TextDecoder().decode(out.stdout);
      for (const value of expected) assertStringIncludes(text, value);
      if (input.form2441.claim.mfs_review.kind === "not_considered_unmarried") {
        const currentCredit = text.split("Part II")[1];
        assert(!currentCredit.includes("Child1"));
        // Benefit-only MFS must not fill the credit calculation; prior-only
        // MFS still prints 9a through 11 and its Worksheet A statement.
        if (statements === 0) {
          assert(!/\b(?:4093|4147)\b/.test(currentCredit));
          assert(!/27\s+3000\b/.test(text));
        }
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
