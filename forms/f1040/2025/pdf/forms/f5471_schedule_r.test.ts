import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../form8992.fixture.ts";
import { form5471ScheduleRPdf } from "./f5471_schedule_r.ts";

Deno.test("Schedule R PDF has reviewed identity and no invented distribution", () => {
  const [fields] = form5471ScheduleRPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471ScheduleRPdf.pageIndices?.(fields ?? {}), [0]);
  assertEquals(fields?.filer_name, "Alex Taxpayer");
  assertEquals(fields?.cfc_reference_id, "FC001");
  assertEquals(Object.values(fields ?? {}).includes("0"), false);
  assertEquals(
    form5471ScheduleRPdf.fields.some((entry) =>
      entry.pdfField.includes("Table_Lines1-24")
    ),
    false,
  );
  assertThrows(() =>
    form5471ScheduleRPdf.instances?.(
      {},
      form8992Filer,
      {
        ...form8992Pending,
        schedule1: {
          ...form8992Pending.schedule1,
          line8o_section951aa_inclusion: 41_999,
        },
      },
    ), Error);
});
