import { assertEquals } from "@std/assert";
import { form8829Pdf } from "./f8829.ts";

const page = "topmostSubform[0].Page1[0]";

Deno.test("2025 Form 8829 puts business and total area on lines 1 and 2", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("business_area"), `${page}.f1_03[0]`);
  assertEquals(byKey.get("total_area"), `${page}.f1_04[0]`);
});

Deno.test("2025 Form 8829 indirect expenses use printed lines 18 through 22", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    ["insurance", "rent", "repairs_maintenance", "utilities", "other_expenses"]
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

Deno.test("2025 Form 8829 mortgage interest uses line 10 indirect column", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    byKey.get("mortgage_interest"),
    `${page}.Table_Lines9-12[0].Line10[0].f1_14[0]`,
  );
});

Deno.test("2025 Form 8829 prior carryovers and basis use their source lines", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("prior_year_operating_carryover"), `${page}.f1_39[0]`);
  assertEquals(
    byKey.get("prior_year_depreciation_carryover"),
    `${page}.f1_45[0]`,
  );
  assertEquals(byKey.get("home_fmv_or_basis"), `${page}.f1_51[0]`);
});
