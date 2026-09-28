import { assertEquals, assertThrows } from "@std/assert";
import { calculateRentedHomeForm8829 } from "../../../nodes/intermediate/forms/form_8829/index.ts";
import { TS } from "../../../nodes/types.ts";
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

Deno.test("2025 Form 8829 maps every bounded rented-home calculated line and identity", () => {
  const byKey = new Map(
    form8829Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(byKey.get("pdf_line3_pct"), `${page}.f1_05[0]`);
  assertEquals(byKey.get("pdf_line7_pct"), `${page}.f1_09[0]`);
  assertEquals(byKey.get("pdf_line15"), `${page}.f1_21[0]`);
  assertEquals(
    byKey.get("line23b"),
    `${page}.Table_Lines16-23[0].Line23[0].f1_37[0]`,
  );
  assertEquals(
    [
      "line24",
      "line26",
      "line27",
      "line28",
      "line32",
      "line33",
      "line34",
      "line35",
      "line36",
      "line43",
      "line44",
    ]
      .map((key) => byKey.get(key)),
    [38, 40, 41, 42, 46, 47, 48, 49, 50, 57, 58]
      .map((number) => `${page}.f1_${number}[0]`),
  );
  assertEquals(
    form8829Pdf.filerFields?.map((entry) => entry.pdfField),
    [`${page}.f1_01[0]`, `${page}.f1_02[0]`],
  );
});

Deno.test("2025 Form 8829 PDF projection checks source and formats percentages", () => {
  const source = {
    business_reference: "C-1",
    home_identifier: "HOME-1",
    recipient: TS.T,
    business_area_sqft: 200,
    total_area_sqft: 1_000,
    schedule_c_line29_tentative_profit: 5_000,
    insurance_indirect: 1_000,
    rent_indirect: 10_000,
    repairs_indirect: 500,
    utilities_indirect: 2_000,
    other_indirect: 500,
    prior_operating_carryover: 100,
    regular_exclusive_use_verified: true,
    actual_expense_method_verified: true,
    rented_home_verified: true,
    sole_home_and_business_verified: true,
    all_schedule_c_gross_income_attributable_to_home_verified: true,
    no_daycare_or_inventory_exception: true,
    no_home_business_gain_or_other_trade_loss: true,
    no_casualty_mortgage_tax_or_depreciation: true,
    home_expenses_excluded_from_schedule_c_verified: true,
  } as const;
  const lines = calculateRentedHomeForm8829(source);
  const fields = { rented_home: source, ...lines };
  const projected = form8829Pdf.projectFields?.(fields, {});
  assertEquals(projected?.pdf_line3_pct, "20");
  assertEquals(projected?.pdf_line7_pct, "20");
  assertEquals(projected?.pdf_line15, 5_000);
  assertEquals(projected?.line36, 2_900);
  assertThrows(
    () => form8829Pdf.projectFields?.({ ...fields, line36: 2_901 }, {}),
    Error,
    "line36 differs",
  );
  const noProfit = { ...source, schedule_c_line29_tentative_profit: 0 };
  const carryover = calculateRentedHomeForm8829(noProfit);
  const carryoverProjected = form8829Pdf.projectFields?.(
    { rented_home: noProfit, ...carryover },
    {},
  );
  assertEquals(carryoverProjected?.pdf_line15, "-0-");
  assertEquals(carryoverProjected?.line36, 0);
  assertEquals(carryoverProjected?.line43, 2_900);
});
