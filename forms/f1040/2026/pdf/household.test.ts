import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  householdFixture2026,
  householdFutaFixture2026,
  householdParentFixture2026,
} from "../inputs/household.fixture.ts";
export function householdPdfFixtures2026() {
  const only = householdFutaFixture2026(2000);
  only.household_employment.claim.employees[0].payments.push({
    record_reference: "prior",
    paid_date: "2025-06-01",
    gross_cash_wages: 1000,
    federal_income_tax_withheld: 0,
    work_state: "MA",
  });
  const withholding = householdFixture2026(2000),
    e = withholding.household_employment.claim.employees[0];
  e.relationship = "child";
  e.birth_date = "2010-02-01";
  e.w4_agreement_reference = "w4";
  e.payments[0].federal_income_tax_withheld = 123.6;
  e.w2!.box2_withheld = 123.6;
  return [
    householdParentFixture2026(),
    householdFutaFixture2026(),
    only,
    withholding,
  ];
}
Deno.test("Household employer payroll prints both Schedule H pages and reconciles Schedule 2 liability", async () => {
  for (const [i, input] of householdPdfFixtures2026().entries()) {
    const r = await buildDraftReturnPdf2026(input);
    const h = r.attachments.find((a) => a.form === "schedule_h")!;
    assertEquals(h.formPages.length, 2);
    assertEquals(h.statementPages, []);
    assertEquals(
      r.calculation.pending.f1040.line23_other_taxes,
      [627, 1266, 12, 124][i],
    );
    assertEquals(r.filingReady, false);
    const pdf = await PDFDocument.load(r.bytes);
    assert(!pdf.catalog.has(PDFName.of("AcroForm")));
    assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const file = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(file, r.bytes);
      const t = await new Deno.Command("pdftotext", {
        args: ["-layout", file, "-"],
      }).output();
      assertEquals(t.code, 0);
      const pages = new TextDecoder().decode(t.stdout).split("\f"),
        part1 = pages[h.formPages[0] - 1],
        part2 = pages[h.formPages[1] - 1];
      assertStringIncludes(part1, "Synthetic Investor");
      assertStringIncludes(
        i === 1 || i === 2 ? part2 : part1,
        String([627, 1266, 12, 124][i]),
      );
      if (i === 1) {
        assertStringIncludes(part2, "7000");
        assertStringIncludes(part2, "MA");
      }
      if (i === 0) {
        assertStringIncludes(part1, "4100");
        assertStringIncludes(part1, "508");
        assertStringIncludes(part1, "119");
      }
      if (i === 2) assertStringIncludes(part2, "2000");
    } finally {
      await Deno.remove(file);
    }
  }
});
