import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleHPdf } from "./f5471_schedule_h.ts";

Deno.test("Schedule H PDF maps one reviewed general-category CFC page", () => {
  const [fields] = form5471ScheduleHPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(fields?.line1, 60_000);
  assertEquals(fields?.line3, 0);
  assertEquals(fields?.line5c_general, 60_000);
  assertEquals(fields?.line5d, 60_000);
  assertEquals(fields?.line5e_rate, "1.0000");
  assertEquals(form5471ScheduleHPdf.pageIndices?.(fields ?? {}), [0]);
  assertEquals(
    form5471ScheduleHPdf.fields.find((entry) => entry.domainKey === "line5d")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_40[0]",
  );
  assertThrows(
    () =>
      form5471ScheduleHPdf.instances?.({}, form8992Filer, {
        ...form8992Pending,
        schedule1: {
          ...form8992Pending.schedule1,
          line8o_section951aa_inclusion: 41_999,
        },
      }),
    Error,
    "Schedule 1 lines 8n and 8o",
  );
});
