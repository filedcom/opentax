import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { priorCareFixture2026 } from "../inputs/dependent-care-prior.fixture.ts";

Deno.test("Prior care statement includes worksheet, provider and person facts after official forms", async () => {
  for (const priorOnly of [false, true]) {
    const result = await buildDraftReturnPdf2026(
      priorCareFixture2026(priorOnly),
    );
    const attachment = result.attachments.find((a) => a.form === "form2441")!;
    assertEquals(attachment.formPages.length, 1);
    assertEquals(attachment.statementPages.length, 1);
    const lastOfficial = Math.max(
      ...result.attachments.flatMap((a) => a.formPages),
    );
    assert(attachment.statementPages[0] > lastOfficial);
    const pdf = await PDFDocument.load(result.bytes);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const statement = await PDFDocument.create();
    for (
      const page of await statement.copyPages(
        pdf,
        attachment.statementPages.map((p) => p - 1),
      )
    ) statement.addPage(page);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await statement.save());
      const output = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      for (
        const expected of [
          "2025 expenses paid in 2026 - Worksheet A",
          "1. 2025 Form 2441 line 3 expenses: $2000",
          "2. Qualified 2025 expenses paid in 2026: $600",
          "9. 2025 credit expense base (Form 2441 line 6): $2000",
          "12. 2025 credit rate: 0.35",
          "13. Additional credit (line 10 x line 12) to 2026 Form 2441 line 9b: $210",
          "Synthetic Childcare",
          "123 Example Road",
          "Boston, MA 02110",
          "120000099",
          "Household employee: No",
          "Over 12 and disabled during care: No",
          "Care 2025-12-01 through 2025-12-31; paid 2026-01-15",
          priorCareFixture2026().form2441.claim.prior_year_expenses.payments[0]
            .person_ssn,
        ]
      ) assertStringIncludes(text, expected);
    } finally {
      await Deno.remove(path);
    }
    assertEquals(
      result.calculation.pending.schedule3.line2_childcare_credit,
      priorOnly ? 210 : 1260,
    );
  }
});

Deno.test("Prior care worksheet retains all 25 people across statement pages", async () => {
  const { priorCareOverflowFixture2026 } = await import(
    "../inputs/dependent-care-prior.fixture.ts"
  );
  const r = await buildDraftReturnPdf2026(priorCareOverflowFixture2026());
  const a = r.attachments.find((a) => a.form === "form2441")!;
  assert(a.statementPages.length > 1);
  const pdf = await PDFDocument.load(r.bytes),
    statement = await PDFDocument.create();
  for (
    const p of await statement.copyPages(
      pdf,
      a.statementPages.map((n) => n - 1),
    )
  ) statement.addPage(p);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, await statement.save());
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(output.code, 0);
    const text = new TextDecoder().decode(output.stdout);
    for (let i = 1; i <= 25; i++) {
      assertStringIncludes(text, `PriorPerson${i} Investor`);
    }
    assertStringIncludes(text, "Over 12 and disabled during care: Yes");
    assertStringIncludes(text, "line 9b: $1400");
  } finally {
    await Deno.remove(path);
  }
});
