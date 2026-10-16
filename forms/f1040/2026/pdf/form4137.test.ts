import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm4137PdfBytes2026 } from "./form4137.ts";
import { syntheticForm4137_2026 } from "../inputs/form4137.fixture.ts";
import { syntheticForm4137Continuation2026 } from "./form4137.fixture.ts";
import { calculateForm4137_2026 } from "../inputs/form4137.ts";
const filers = {
  taxpayer: { name: "Ada Q Rivera", ssn: "111223333" },
  spouse: { name: "Ben Rivera", ssn: "222334444" },
};
Deno.test("2026 Form 4137 renders each spouse and all continuation rows with reconciled payroll", async () => {
  for (const count of [5, 6]) {
    const input = syntheticForm4137Continuation2026();
    input.forms![0].employers.length = count;
    input.w2_tip_sources = input.w2_tip_sources!.filter((s) =>
      s.employer_ein !== "980000005" || count === 6
    );
    const result = calculateForm4137_2026(input);
    assertEquals(
      result.forms.map((f) => [f.unreportedTips, f.medicareTips, f.ssTips]),
      [[count * 2000, count * 2000 - 19, 500], [2000, 2000, 0]],
    );
    const bytes = await buildForm4137PdfBytes2026(input, {
      form1040_line1c: result.forms.reduce((n, f) => n + f.unreportedTips, 0),
      schedule2_line16a: result.forms.reduce((n, f) => n + f.totalTax, 0),
    }, filers);
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getPageCount(), count === 5 ? 2 : 3);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    for (const page of pdf.getPages()) {
      assertEquals(page.node.has(PDFName.of("Annots")), false);
    }
  }
});
Deno.test("2026 Form 4137 PDF rejects stale destinations, owner identity and missing source", async () => {
  const input = syntheticForm4137_2026();
  const totals = { form1040_line1c: 2000, schedule2_line16a: 153 };
  await assertRejects(
    () =>
      buildForm4137PdfBytes2026(
        input,
        { ...totals, schedule2_line16a: 0 },
        filers,
      ),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () => buildForm4137PdfBytes2026(input, totals, { taxpayer: filers.spouse }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm4137PdfBytes2026(
        { ...input, forms: undefined, w2_tip_sources: [] },
        totals,
        filers,
      ),
    Error,
    "needs tip sources",
  );
});
