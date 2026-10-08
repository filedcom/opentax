import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../domains/international/form8992/form8992.fixture.ts";
import { form5471ScheduleJPdf } from "./f5471_schedule_j.ts";

Deno.test("Schedule J PDF maps general-category E&P and PTEP rows", () => {
  const [fields] = form5471ScheduleJPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471ScheduleJPdf.pageIndices?.(fields ?? {}), [0, 1, 2]);
  assertEquals(fields?.a14, 17_000);
  assertEquals(fields?.eiii14, 53_000);
  assertEquals(fields?.eviii8, 42_000);
  assertEquals(fields?.eviii10, -42_000);
  assertEquals(fields?.ex10, -10_000);
  assertEquals(fields?.eviii14, 0);
  assertEquals(fields?.ex14, 0);
  assertEquals(fields?.f14, 70_000);
  assertEquals(
    form5471ScheduleJPdf.fields.find((entry) => entry.domainKey === "eviii14")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Part1_Table_eviii-f[0].BodyRow14[0].f2_159[0]",
  );
  assertThrows(() =>
    form5471ScheduleJPdf.instances?.(
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
