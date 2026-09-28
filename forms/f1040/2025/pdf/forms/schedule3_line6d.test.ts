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
