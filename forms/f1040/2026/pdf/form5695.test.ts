import { syntheticInvestmentClaim2026 } from "../inputs/investment.fixture.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm5695PdfBytes2026 } from "./form5695.ts";
import { energyGraphFixture2026 } from "../inputs/energy.fixture.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";
Deno.test("2026 Form 5695 bundle includes unused carryforward and matches final Schedule 3 and child credit", async () => {
  for (
    const [wages, children, carry] of [[0, 0, 8000], [50000, 1, 8000], [
      50000,
      1,
      1000,
    ], [35000, 3, 8000]]
  ) {
    const result = await buildDraftReturnPdf2026(
      energyGraphFixture2026(wages, children, carry),
    );
    const p = result.calculation.pending,
      child = p.f8812.calculation_2026 as ReturnType<
        typeof calculateChildCredit2026
      >,
      e = child.energy_credit!;
    const a = result.attachments.find((a) => a.form === "form5695")!;
    assertEquals(a.formPages.length, 1);
    assertEquals(a.statementPages, []);
    assertEquals(result.filingReady, false);
    const doc = await PDFDocument.load(result.bytes);
    assert(!doc.catalog.has(PDFName.of("AcroForm")));
    assert(
      doc.getPages().every((page) => !page.node.has(PDFName.of("Annots"))),
    );
    if (e.lines.line3 === 0) {
      assert(!result.attachments.some((a) => a.form === "schedule3"));
    }
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, result.bytes);
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(text.code, 0);
      const page =
        new TextDecoder().decode(text.stdout).split("\f")[a.formPages[0] - 1];
      assertStringIncludes(page, "Synthetic Investor");
      assertStringIncludes(page, "Carryforward of Residential Energy Credit");
      for (const amount of [e.lines.line1, e.lines.line2, e.lines.line3]) {
        assertStringIncludes(page, String(amount));
      }
      if (e.lines.line4) assertStringIncludes(page, String(e.lines.line4));
      assertStringIncludes(page, "DRAFT - NOT FOR FILING");
    } finally {
      await Deno.remove(path);
    }
    const destinations = {
      form1040_line18: Number(p.f1040.line18_total_tax_before_credits),
      form1040_line19: Number(p.f1040.line19_child_tax_credit),
      schedule3_line5a: e.lines.line3,
    };
    const filer = { name: "Synthetic Investor", ssn: "123456789" };
    for (const key of Object.keys(destinations)) {
      await assertRejects(
        () =>
          buildForm5695PdfBytes2026(child.source_input, {
            ...destinations,
            [key]: -1,
          }, filer),
        Error,
        "matching owner and calculated credit",
      );
    }
    await assertRejects(
      () =>
        buildForm5695PdfBytes2026(child.source_input, destinations, {
          ...filer,
          ssn: "987654321",
        }),
      Error,
      "matching owner",
    );
  }
});

Deno.test("2026 energy attachment follows Medicare and NIIT by official sequence", async () => {
  const r = await buildDraftReturnPdf2026({
    ...energyGraphFixture2026(250000, 0),
    investment_income: syntheticInvestmentClaim2026(),
  });
  const names = r.attachments.map((a) => a.form);
  const medicare = names.indexOf("form8959"),
    niit = names.indexOf("form8960"),
    energy = names.indexOf("form5695");
  assert(medicare >= 0 && niit > medicare && energy > niit);
});
