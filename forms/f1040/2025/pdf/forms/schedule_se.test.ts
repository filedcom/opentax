import { assertEquals, assertThrows } from "@std/assert";
import { scheduleSePdf } from "./schedule_se.ts";

const byKey = new Map(
  scheduleSePdf.fields.map((field) => [field.domainKey, field.pdfField]),
);

Deno.test("2025 Schedule SE PDF uses printed AcroForm line positions", () => {
  assertEquals(
    byKey.get("net_profit_schedule_f"),
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    byKey.get("net_profit_schedule_c"),
    "topmostSubform[0].Page1[0].f1_5[0]",
  );
  assertEquals(byKey.get("line4b"), "topmostSubform[0].Page1[0].f1_8[0]");
  assertEquals(byKey.get("line6"), "topmostSubform[0].Page1[0].f1_12[0]");
  assertEquals(
    byKey.get("w2_ss_wages"),
    "topmostSubform[0].Page1[0].Line8a_ReadOrder[0].f1_14[0]",
  );
  assertEquals(
    byKey.get("unreported_tips_4137"),
    "topmostSubform[0].Page1[0].f1_15[0]",
  );
  assertEquals(byKey.get("wages_8919"), "topmostSubform[0].Page1[0].f1_16[0]");
  assertEquals(byKey.get("line15"), "topmostSubform[0].Page2[0].f2_2[0]");
  assertEquals(scheduleSePdf.filerFields?.map((field) => field.pdfField), [
    "topmostSubform[0].Page1[0].f1_1[0]",
    "topmostSubform[0].Page1[0].f1_2[0]",
  ]);
});

Deno.test("2025 Schedule SE PDF projects elected farm method without Part I line 1a", () => {
  const projected = scheduleSePdf.projectFields?.({
    farm_optional_method_elected: true,
    gross_farm_income: 9_000,
    net_profit_schedule_f: -2_000,
    net_profit_schedule_c: 1_000,
  }, {});
  assertEquals(projected?.net_profit_schedule_f, undefined);
  assertEquals(projected?.line3, 1_000);
  assertEquals(projected?.line4a, 923.5);
  assertEquals(projected?.line4b, 6_000);
  assertEquals(projected?.line4c, 6_923.5);
  assertEquals(projected?.line6, 6_923.5);
  assertEquals(projected?.line15, 6_000);
});

Deno.test("2025 Schedule SE PDF refuses an unsupported farm election", () => {
  assertThrows(
    () =>
      scheduleSePdf.projectFields?.({
        farm_optional_method_elected: true,
        gross_farm_income: 12_000,
        net_profit_schedule_f: 8_000,
      }, {}),
    Error,
    "unavailable",
  );
});
