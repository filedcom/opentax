import { assertEquals, assertThrows } from "@std/assert";
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
      form4797Pdf.projectFields?.(
        { k1_box11_line10_rows: [...rows, rows[0]] },
        {},
      ),
    Error,
  );
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
