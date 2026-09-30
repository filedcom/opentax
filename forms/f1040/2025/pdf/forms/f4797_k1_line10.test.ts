import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form4797Pdf } from "./f4797.ts";

const rows = ["111111111", "222222222", "333333333", "444444444"].map(
  (ein, index) => ({
    partnership_name: `Partnership ${index + 1}`,
    partnership_ein: ein,
    source_document_reference: `K-1 ${index + 1}`,
    code: index % 2 === 0 ? "L" as const : "R" as const,
    gain_loss: (index + 1) * 100,
    statement_reference: `Statement ${index + 1}`,
    recipient_tin: "111223333",
    character_workpaper_reference: `Review ${index + 1}`,
  }),
);

Deno.test("Form 4797 PDF fills all four K-1 ordinary line 10 rows", () => {
  const fields = form4797Pdf.projectFields?.(
    { k1_box11_line10_rows: rows },
    {},
  );
  assertEquals(fields?.pdf_sale_description, "K-1 L 111111111");
  assertEquals(fields?.pdf_sale_gain, 100);
  assertEquals(fields?.pdf_k1_line10_2_description, "K-1 R 222222222");
  assertEquals(fields?.pdf_k1_line10_2_gain, 200);
  assertEquals(fields?.pdf_k1_line10_3_description, "K-1 L 333333333");
  assertEquals(fields?.pdf_k1_line10_3_gain, 300);
  assertEquals(fields?.pdf_k1_line10_4_description, "K-1 R 444444444");
  assertEquals(fields?.pdf_k1_line10_4_gain, 400);
  assertEquals(fields?.pdf_line17, 1_000);
  assertEquals(fields?.ordinary_gain, 1_000);
  assertThrows(
    () =>
      form4797Pdf.projectFields?.({
        k1_box11_line10_rows: rows,
        section_1231_gain: 100,
      }, {}),
    Error,
    "cannot overlap",
  );
});

Deno.test("Form 4797 PDF appends and reconciles K-1 line 10 source rows after four", async () => {
  const all = [...rows, {
    ...rows[0],
    partnership_ein: "555555555",
    source_document_reference: "K-1 5",
    statement_reference: "Statement 5",
    gain_loss: -150,
  }];
  const projected = form4797Pdf.projectFields?.(
    { k1_box11_line10_rows: all },
    {},
  ) ?? {};
  assertEquals(projected.pdf_k1_line10_4_description, "See attached");
  assertEquals(projected.pdf_k1_line10_4_gain, 250);
  assertEquals(projected.pdf_line17, 850);
  assertEquals((projected.pdf_line10_overflow_rows as unknown[]).length, 2);
  const document = await PDFDocument.create();
  await form4797Pdf.appendSupplementalPages?.(
    document,
    projected,
    { nameLine1: "Example Taxpayer", primarySSN: "111223333" } as never,
  );
  assertEquals(document.getPageCount(), 1);
  const invalid = { ...projected, pdf_k1_line10_4_gain: 0 };
  await assertRejects(async () =>
    await form4797Pdf.appendSupplementalPages?.(
      await PDFDocument.create(),
      invalid,
      { nameLine1: "Example Taxpayer", primarySSN: "111223333" } as never,
    )
  );
  const many = Array.from({ length: 35 }, (_, index) => ({
    ...rows[0],
    partnership_ein: String(100000001 + index),
    source_document_reference: `K-1 ${index + 1}`,
    statement_reference: `Statement ${index + 1}`,
  }));
  const paginated = form4797Pdf.projectFields?.(
    { k1_box11_line10_rows: many },
    {},
  ) ?? {};
  const multipage = await PDFDocument.create();
  await form4797Pdf.appendSupplementalPages?.(
    multipage,
    paginated,
    { nameLine1: "Example Taxpayer", primarySSN: "111223333" } as never,
  );
  assertEquals(multipage.getPageCount() > 1, true);
});
