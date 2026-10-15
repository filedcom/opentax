import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  providerCareFixture2026,
  providerOverflowFixture2026,
} from "../inputs/dependent-care-providers.fixture.ts";
import { priorCareFixture2026 } from "../inputs/dependent-care-prior.fixture.ts";

Deno.test("Special care provider labels, disclosures and continuations appear on static draft forms", async () => {
  const prior = priorCareFixture2026(true);
  const exempt =
    providerCareFixture2026("tax_exempt").form2441.claim.providers[0];
  exempt.amount_paid = 600;
  prior.form2441.claim.providers = [exempt];
  for (
    const [input, expected, minimumStatements] of [
      [providerCareFixture2026("tax_exempt"), ["Tax-Exempt", "1050"], 0],
      [
        providerCareFixture2026("foreign"),
        ["LAFCP", "Stockholm", "11428 SE"],
        0,
      ],
      [providerCareFixture2026("incomplete"), [
        "See Attached Statement",
        "Care provider missing information",
        "refused to disclose",
        "2026-10-01",
      ], 1],
      [providerCareFixture2026("employer_furnished"), ["See W-2", "2000"], 0],
      [providerCareFixture2026("none"), ["none", "6000"], 0],
      [providerOverflowFixture2026(true), [
        "Tax-Exempt",
        "LAFCP",
        "See W-2",
        "Additional care providers",
        "Care provider missing information",
      ], 3],
      [prior, ["Tax-Exempt", "Worksheet A", "210"], 1],
    ] as const
  ) {
    const r = await buildDraftReturnPdf2026(input);
    const a = r.attachments.find((a) => a.form === "form2441")!;
    assert(a.statementPages.length >= minimumStatements);
    const whole = await PDFDocument.load(r.bytes),
      care = await PDFDocument.create();
    assertEquals(whole.catalog.get(PDFName.of("AcroForm")), undefined);
    assert(whole.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    for (
      const p of await care.copyPages(
        whole,
        [...a.formPages, ...a.statementPages].map((p) => p - 1),
      )
    ) care.addPage(p);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await care.save());
      const result = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(result.code, 0);
      const text = new TextDecoder().decode(result.stdout);
      for (const value of expected) assertStringIncludes(text, value);
      if (input.form2441.claim.providers.length === 0) {
        assert(!text.includes("Synthetic Childcare"));
      }
    } finally {
      await Deno.remove(path);
    }
  }
});
