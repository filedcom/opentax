import { assertEquals, assertThrows } from "@std/assert";
import { schedule3Pdf } from "./schedule3.ts";

Deno.test("Schedule 3 PDF cannot print a positive elderly credit without Schedule R", () => {
  assertThrows(
    () =>
      schedule3Pdf.projectFields?.(
        { line6d_elderly_disabled_credit: 100 },
        {},
      ),
    Error,
    "needs a filed Schedule R",
  );
  const fields = { line6d_elderly_disabled_credit: 0 };
  assertEquals(schedule3Pdf.projectFields?.(fields, {}), fields);
});

Deno.test("Schedule 3 PDF maps Form 8911 personal-use credit to 2025 line 6j", () => {
  const entry = schedule3Pdf.fields.find((field) =>
    field.domainKey === "line6j_alt_fuel_vehicle_refueling"
  );
  assertEquals(entry?.pdfField, "topmostSubform[0].Page1[0].f1_18[0]");
  assertEquals(entry?.kind, "text");
  const fields = { line6j_alt_fuel_vehicle_refueling: 300 };
  assertEquals(schedule3Pdf.projectFields?.(fields, {}), fields);
});
