import { assertEquals } from "@std/assert";
import { form6251Pdf } from "./f6251.ts";

Deno.test("Form 6251 PDF includes negative-adjustment who-must-file case", () => {
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 0,
      regular_tax: 2_000,
      line11_amt: 0,
      must_file_for_negative_adjustments: true,
    }),
    true,
  );
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 0,
      regular_tax: 2_000,
      line11_amt: 0,
    }),
    false,
  );
});
