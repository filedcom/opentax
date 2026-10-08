import { assertEquals } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

Deno.test("Form 1040 line 38 penalty targets the 2025 canonical AcroForm field", () => {
  const entry = irs1040Pdf.fields.find((field) =>
    field.domainKey === "line38_underpayment_penalty"
  );
  assertEquals(entry?.kind, "text");
  assertEquals(
    entry?.pdfField,
    "topmostSubform[0].Page2[0].f2_36[0]",
  );
});
