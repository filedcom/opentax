import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm8919PdfBytes2026 } from "./form8919.ts";
import { syntheticForm8919_2026 } from "../inputs/form8919.fixture.ts";
import { syntheticForm8919Continuation2026 } from "./form8919.fixture.ts";
import { calculateForm8919_2026 } from "../inputs/form8919.ts";
const filers = {
  taxpayer: { name: "Ada Q Rivera", ssn: "111223333" },
  spouse: { name: "Ben Rivera", ssn: "222334444" },
};
Deno.test("2026 Form 8919 creates separate owner and continuation pages without live widgets", async () => {
  for (const count of [5, 6]) {
    const input = syntheticForm8919Continuation2026();
    input.forms![0].employers.length = count;
    const result = calculateForm8919_2026(input);
    const bytes = await buildForm8919PdfBytes2026(input, {
      form1040_line1g: result.forms.reduce((n, f) => n + f.line6, 0),
      schedule2_line16b: result.forms.reduce((n, f) => n + f.line13, 0),
      form8919_withholding_component: result.withholding,
    }, filers);
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getPageCount(), count === 5 ? 2 : 3);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    for (const page of pdf.getPages()) {
      assertEquals(page.node.has(PDFName.of("Annots")), false);
    }
  }
});
Deno.test("2026 Form 8919 PDF rejects inconsistent destinations and owner identity", async () => {
  const input = syntheticForm8919_2026();
  const totals = {
    form1040_line1g: 10_000,
    schedule2_line16b: 424,
    form8919_withholding_component: 1000,
  };
  await assertRejects(
    () =>
      buildForm8919PdfBytes2026(
        input,
        { ...totals, schedule2_line16b: 0 },
        filers,
      ),
    Error,
    "destinations disagree",
  );
  await assertRejects(
    () => buildForm8919PdfBytes2026(input, totals, { taxpayer: filers.spouse }),
    Error,
    "identity",
  );
});
