import { assertEquals } from "@std/assert";
import { form8829Pdf } from "./f8829.ts";

const page = "topmostSubform[0].Page1[0]";

Deno.test("2025 Form 8829 puts business and total area on lines 1 and 2", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("line1"), `${page}.f1_03[0]`);
  assertEquals(byKey.get("line2"), `${page}.f1_04[0]`);
});

Deno.test("2025 Form 8829 indirect expenses use printed lines 18 through 22", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    ["line18b", "line19b", "line20b", "line21b", "line22b"]
      .map((key) => byKey.get(key)),
    [
      `${page}.Table_Lines16-23[0].Line18[0].f1_27[0]`,
      `${page}.Table_Lines16-23[0].Line19[0].f1_29[0]`,
      `${page}.Table_Lines16-23[0].Line20[0].f1_31[0]`,
      `${page}.Table_Lines16-23[0].Line21[0].f1_33[0]`,
      `${page}.Table_Lines16-23[0].Line22[0].f1_35[0]`,
    ],
  );
});

Deno.test("2025 Form 8829 rented-home PDF omits unsupported owner-home fields", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.has("mortgage_interest"), false);
  assertEquals(byKey.has("home_fmv_or_basis"), false);
});

Deno.test("2025 Form 8829 operating carryover uses printed line 25", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("line25"), `${page}.f1_39[0]`);
  assertEquals(form8829Pdf.includeWhen?.({ line36: 0, line43: 200 }), true);
});
