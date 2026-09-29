import { assertEquals } from "@std/assert";
import { schedule1Pdf } from "./schedule1.ts";

Deno.test("Schedule 1 PDF maps the Form 7203-adjusted loss to printed line 5", () => {
  const line5 = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line5_schedule_e"
  );
  assertEquals(line5?.pdfField, "topmostSubform[0].Page1[0].f1_09[0]");
});
