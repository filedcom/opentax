import { assertEquals } from "@std/assert";
import { form8990Pdf } from "./f8990.ts";

Deno.test("2025 Form 8990 PDF maps only known bounded source lines", () => {
  const byKey = new Map(
    form8990Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("line1"), "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(byKey.get("line2"), "topmostSubform[0].Page1[0].f1_5[0]");
  assertEquals(byKey.get("line6"), "topmostSubform[0].Page1[0].f1_9[0]");
  assertEquals(byKey.has("avg_gross_receipts"), false);
  assertEquals(form8990Pdf.includeWhen?.({ line30: 8_000 }), true);
});
