import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildForm5329PdfBytes2026 } from "./form5329.ts";

const fields = {
  recipient: "taxpayer",
  regular_early_distribution: 2_000,
  early_simple_ira_distribution: 5_000,
  line1_early_distributions: 7_000,
  line2_exception: 0,
  line3_subject_to_tax: 7_000,
  line4_early_distribution_tax: 1_450,
};
const f1040 = {
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
};

Deno.test("TY2026 Form 5329 prints the pinned Part I and reconciles Schedule 2", async () => {
  const pdf = await PDFDocument.load(
    await buildForm5329PdfBytes2026(
      fields,
      { line5_form5329_early_tax: 1_450 },
      f1040,
    ),
  );
  assertEquals(pdf.getPageCount(), 3);
  assertEquals(pdf.getForm().getFields().length, 0);
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(
        fields,
        { line5_form5329_early_tax: 1_000 },
        f1040,
      ),
    Error,
    "disagrees with Schedule 2",
  );
});
