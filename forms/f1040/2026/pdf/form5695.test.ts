import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { irsForm5695Pdf2026 } from "./forms/f5695.ts";
import { buildForm5695PdfBytes2026 } from "./form5695.ts";

const filer = { name: "Sadie Long", ssn: "400001032" };
const fields = {
  line1_carryforward: 200,
  line2_limit: 120,
  line3_credit: 120,
  line4_to_2027: 80,
};

Deno.test("TY2026 Form 5695 descriptor covers the draft widgets", async () => {
  const source = await PDFDocument.load(
    await Deno.readFile(
      new URL(
        "../../../../docs/ty2026/corpus/draft/f5695.pdf",
        import.meta.url,
      ),
    ),
    { ignoreEncryption: true },
  );
  const names = new Set(
    source.getForm().getFields().map((field) => field.getName()),
  );
  assertEquals(source.getPageCount(), 2);
  assertEquals(irsForm5695Pdf2026.fields.length, 6);
  assertEquals(
    irsForm5695Pdf2026.fields.every((entry) => names.has(entry.pdfField)),
    true,
  );
});

Deno.test("TY2026 Form 5695 prints used and unused prior-year credit", async () => {
  const pdf = await PDFDocument.load(
    await buildForm5695PdfBytes2026(
      fields,
      { line5a_residential_clean_energy: 120 },
      filer,
    ),
  );
  assertEquals(pdf.getPageCount(), 1);
  assertEquals(pdf.getForm().getFields().length, 0);
  const zeroUse = await PDFDocument.load(
    await buildForm5695PdfBytes2026(
      { ...fields, line2_limit: 0, line3_credit: 0, line4_to_2027: 200 },
      undefined,
      filer,
    ),
  );
  assertEquals(zeroUse.getPageCount(), 1);
});

Deno.test("TY2026 Form 5695 refuses credit and attachment mismatches", async () => {
  await assertRejects(
    () => buildForm5695PdfBytes2026(fields, undefined, filer),
    Error,
    "lines do not reconcile",
  );
  await assertRejects(
    () =>
      buildForm5695PdfBytes2026(
        { ...fields, line4_to_2027: 81 },
        { line5a_residential_clean_energy: 120 },
        filer,
      ),
    Error,
    "lines do not reconcile",
  );
});
