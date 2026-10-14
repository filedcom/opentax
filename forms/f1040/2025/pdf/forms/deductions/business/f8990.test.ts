import { assertEquals, assertThrows } from "@std/assert";
import { form8990Pdf, PART_I_FIELD_MAP } from "./f8990.ts";

Deno.test("2025 Form 8990 PDF Part I uses canonical 2025 AcroForm fields", () => {
  const byKey = new Map(
    form8990Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(PART_I_FIELD_MAP.length, 31);
  for (let line = 1; line <= 31; line++) {
    const expected = line <= 22
      ? `topmostSubform[0].Page1[0].f1_${line + 5}[0]`
      : `topmostSubform[0].Page2[0].f2_${line - 22}[0]`;
    assertEquals(byKey.get(`line${line}`), expected);
  }
  assertEquals(
    [...byKey.values()].includes("topmostSubform[0].Page1[0].f1_4[0]"),
    false,
  );
  assertEquals(byKey.has("avg_gross_receipts"), false);
  assertEquals(form8990Pdf.pageIndices?.({}), [0, 1]);
});

Deno.test("2025 Form 8990 PDF keeps active calculated-looking payloads blocked", () => {
  assertThrows(
    () =>
      form8990Pdf.projectFields?.({
        line1: 8_000,
        line7: 15_750,
        line30: 5_000,
        line31: 3_000,
      }, {}),
    Error,
  );
  assertThrows(
    () => form8990Pdf.includeWhen?.({ line1: 8_000, line30: 8_000 }),
    Error,
  );
});
