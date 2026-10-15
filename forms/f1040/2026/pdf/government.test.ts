import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import {
  familyLeaveFixture2026,
  governmentGraphFixture2026,
  governmentRefundFixture2026,
} from "../inputs/government.fixture.ts";
import {
  syntheticInvestmentClaim2026,
  syntheticPabReview2026,
} from "../inputs/investment.fixture.ts";
export function governmentPdfCases2026() {
  const investment = syntheticInvestmentClaim2026();
  investment.f1099divs = [];
  investment.f1099ints[0].box1 = 0;
  Object.assign(investment.f1099ints[0], {
    box8: 200000,
    box9: 200000,
    pab_review: syntheticPabReview2026(),
  });
  const repaid = governmentGraphFixture2026();
  repaid.government_payments.claim.copies[0].unemployment_review!.repayments[0]
    .amount = 20000;
  return [governmentGraphFixture2026(), familyLeaveFixture2026(40000), {
    ...governmentRefundFixture2026(),
    investment_income: investment,
  }, repaid];
}
Deno.test("Government payments print reconciled income, repayment, withholding and AMT refund lines", async () => {
  for (const [i, input] of governmentPdfCases2026().entries()) {
    const r = await buildDraftReturnPdf2026(input), p = r.calculation.pending;
    assertEquals(p.f1040.line11b_agi, [57000, 43300, 60000, 40000][i]);
    assertEquals(p.f1040.line16_income_tax, [4663, 3019, 5023, 2623][i]);
    assertEquals(p.f1040.line25b_withheld_1099, 2000);
    assertEquals(r.filingReady, false);
    assert(!r.attachments.some((a) => a.form === "f1099g"));
    const doc = await PDFDocument.load(r.bytes);
    assert(!doc.catalog.has(PDFName.of("AcroForm")));
    assert(doc.getPages().every((pg) => !pg.node.has(PDFName.of("Annots"))));
    const file = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(file, r.bytes);
      const t = await new Deno.Command("pdftotext", {
        args: ["-layout", file, "-"],
      }).output();
      assertEquals(t.code, 0);
      const pages = new TextDecoder().decode(t.stdout).split("\f"),
        s1 = r.attachments.find((a) => a.form === "schedule1")!;
      const text = pages[s1.formPages[0] - 1];
      if (i === 1) {
        assertEquals(s1.statementPages.length, 1);
        assertStringIncludes(text, "3300");
        const statement = pages[s1.statementPages[0] - 1];
        assertStringIncludes(statement, "State paid family leave");
        assertStringIncludes(statement, "RTAA payments");
        assertStringIncludes(statement, "Taxable grants");
      } else {
        assertStringIncludes(text, i === 3 ? "20000" : "3000");
        assertStringIncludes(text, "enter amount repaid:");
      }
      assertStringIncludes(pages[1], "2000");
      if (i === 2) {
        assertEquals(p.f1040.line17_additional_taxes, 38371);
        const amt = r.attachments.find((a) => a.form === "form6251")!;
        assertStringIncludes(pages[amt.formPages[0] - 1], "3000");
        assertStringIncludes(pages[amt.formPages[0] - 1], "257000");
      }
    } finally {
      await Deno.remove(file);
    }
  }
});
