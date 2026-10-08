import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../domains/international/form8992/form8992.fixture.ts";
import { form5471ScheduleQPdf } from "./f5471_schedule_q.ts";

Deno.test("Schedule Q PDF maps general sales, tested, and total rows", () => {
  const [fields] = form5471ScheduleQPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471ScheduleQPdf.pageIndices?.(fields ?? {}), [0, 1, 2, 3]);
  assertEquals(fields?.category, "GEN");
  assertEquals(fields?.sales_gross, 10_000);
  assertEquals(fields?.tested_gross, 55_000);
  assertEquals(fields?.tested_net, 50_000);
  assertEquals(fields?.total_net, 60_000);
  assertEquals(
    form5471ScheduleQPdf.fields.find((entry) =>
      entry.domainKey === "tested_net" &&
      entry.pdfField.includes("BodyRow3\\.1")
    )?.pdfField,
    "topmostSubform[0].Page4[0].Table_ColsVIII-XVI_Lines1h-5[0].BodyRow3\\.1[0].f4_148[0]",
  );
  assertThrows(() =>
    form5471ScheduleQPdf.instances?.(
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
