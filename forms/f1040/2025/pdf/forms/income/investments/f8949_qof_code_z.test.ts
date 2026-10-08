import { assertEquals, assertThrows } from "@std/assert";
import { form8949Pdf } from "./f8949.ts";

const codeZ = {
  part: "C",
  description: "123456789",
  source_transaction_id: "qof-z-1",
  date_acquired: "2025-03-20",
  date_sold: "",
  proceeds: 0,
  cost_basis: 0,
  adjustment_codes: "Z",
  adjustment_amount: -20_000,
  gain_loss: -20_000,
  is_long_term: false,
};

Deno.test("Form 8949 PDF code Z leaves sale date, proceeds and basis blank", () => {
  const page = form8949Pdf.instances?.({ transaction: codeZ })?.[0];
  assertEquals(page?.pdf_part, "C");
  assertEquals(page?.pdf_page1_row1_description, "123456789");
  assertEquals(page?.pdf_page1_row1_date_acquired, "03/20/2025");
  assertEquals(page?.pdf_page1_row1_date_sold, undefined);
  assertEquals(page?.pdf_page1_row1_proceeds, undefined);
  assertEquals(page?.pdf_page1_row1_cost_basis, undefined);
  assertEquals(page?.pdf_page1_row1_adjustment_codes, "Z");
  assertEquals(page?.pdf_page1_row1_adjustment_amount, "(20000)");
  assertEquals(page?.pdf_page1_total_proceeds, undefined);
  assertEquals(page?.pdf_page1_total_cost_basis, undefined);
});

Deno.test("Form 8949 PDF code Z rejects an unsupported reporting box", () => {
  assertThrows(
    () => form8949Pdf.instances?.({ transaction: { ...codeZ, part: "A" } }),
    Error,
    "separate identified QOF EIN row",
  );
});
