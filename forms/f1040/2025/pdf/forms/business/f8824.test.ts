import { assertEquals } from "@std/assert";
import { form8824Pdf, form8824PdfFields } from "./f8824.ts";

Deno.test("Form 8824 PDF derives lines and formats four dates", () => {
  const fields = form8824PdfFields({
    relinquished_description: "Austin investment land",
    received_description: "Dallas investment land",
    date_acquired: "2020-01-15",
    date_transferred: "2025-04-01",
    date_identified: "2025-04-20",
    date_received: "2025-06-01",
    related_party: false,
    relinquished_basis: 100_000,
    received_fmv: 200_000,
  });
  assertEquals(fields.line19, 100_000);
  assertEquals(fields.line24, 100_000);
  assertEquals(fields.line25, 100_000);
  assertEquals(fields.date_acquired_pdf, "01/15/2020");
  assertEquals(fields.date_received_pdf, "06/01/2025");
});

Deno.test("Form 8824 PDF line fields match actual 2025 form widgets", () => {
  const map = new Map(form8824Pdf.fields.map((field) => [field.domainKey, field.pdfField]));
  assertEquals(map.get("line15"), "topmostSubform[0].Page2[0].f2_8[0]");
  assertEquals(map.get("line19"), "topmostSubform[0].Page2[0].f2_16[0]");
  assertEquals(map.get("line25"), "topmostSubform[0].Page2[0].f2_22[0]");
  assertEquals(map.get("date_acquired_pdf"), "topmostSubform[0].Page1[0].f1_7[0]");
});
