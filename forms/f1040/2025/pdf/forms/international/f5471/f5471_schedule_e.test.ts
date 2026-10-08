import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../domains/international/form8992/form8992.fixture.ts";
import { form5471ScheduleEPdf } from "./f5471_schedule_e.ts";

Deno.test("Schedule E/E-1 PDF maps all three pages and reviewed direct tax", () => {
  const [fields] = form5471ScheduleEPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471ScheduleEPdf.pageIndices?.(fields ?? {}), [0, 1, 2]);
  assertEquals(fields?.category, "GEN");
  assertEquals(fields?.payor_id, "FC001");
  assertEquals(fields?.tax_usd, 500);
  assertEquals(fields?.e1_reduction, -500);
  assertEquals(
    form5471ScheduleEPdf.fields.find((entry) =>
      entry.domainKey === "e1_reduction"
    )?.pdfField,
    "topmostSubform[0].Page2[0].Table_SchE-1_a-d[0].BodyRow15[0].f2_91[0]",
  );
  assertThrows(() =>
    form5471ScheduleEPdf.instances?.(
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
