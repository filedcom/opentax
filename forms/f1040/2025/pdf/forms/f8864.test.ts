import { assertEquals, assertThrows } from "@std/assert";
import {
  directAgriBiodieselPending,
  directAgriBiodieselSource,
} from "../../../nodes/inputs/f8864/fixture.ts";
import { form8864Pdf } from "./f8864.ts";

Deno.test("Form 8864 official PDF projects the dated direct producer lines", () => {
  const fields = Object.fromEntries(
    form8864Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    fields.line7_gallons,
    "topmostSubform[0].Page1[0].Table_Lines1-7[0].Line7[0].f1_22[0]",
  );
  assertEquals(
    fields.line8,
    "topmostSubform[0].Page1[0].Table_Lines1-7[0].Line8[0].f1_27[0]",
  );
  assertEquals(fields.line11, "topmostSubform[0].Page1[0].f1_30[0]");
  const projected = form8864Pdf.projectFields?.(
    directAgriBiodieselSource,
    directAgriBiodieselPending,
  );
  assertEquals(projected?.line7_gallons, 1_000);
  assertEquals(projected?.line7_rate, "0.10");
  assertEquals(projected?.line8_gallons, 2_000);
  assertEquals(projected?.line8_rate, "0.20");
  assertEquals(projected?.line11, 500);
});

Deno.test("Form 8864 PDF rejects a missing Schedule C income inclusion", () => {
  const business = directAgriBiodieselPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      form8864Pdf.projectFields?.(
        directAgriBiodieselSource,
        {
          ...directAgriBiodieselPending,
          schedule_c: {
            schedule_cs: [{
              ...business,
              line_6_other_income: 0,
            }],
          },
        },
      ),
    Error,
    "line 6 other-income inclusion",
  );
});
