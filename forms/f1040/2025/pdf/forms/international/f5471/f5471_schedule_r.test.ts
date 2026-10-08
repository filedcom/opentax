import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../domains/international/form8992/form8992.fixture.ts";
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
  assertEquals(
    fields?.no_distribution_description,
    "No distributions during the tax year",
  );
  assertEquals(fields?.distribution_total_functional, 0);
  assertEquals(fields?.ep_distribution_total_functional, 0);
  assertEquals(
    form5471ScheduleRPdf.fields.filter((entry) =>
      entry.kind === "text" && entry.printZero
    ).map((entry) => entry.domainKey),
    ["distribution_total_functional", "ep_distribution_total_functional"],
  );
  assertEquals(
    form5471ScheduleRPdf.fields.some((entry) =>
      entry.pdfField.endsWith("Line1[0].f1_7[0]")
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
