import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleI1Pdf } from "./f5471_schedule_i1.ts";

Deno.test("Schedule I-1 PDF has complete single-CFC line projection", () => {
  const [fields] = form5471ScheduleI1Pdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(fields?.shareholder_name, "Alex Taxpayer");
  assertEquals(fields?.total_exclusions, 10_000);
  assertEquals(fields?.tested_functional, 50_000);
  assertEquals(fields?.tested_usd, 50_000);
  assertEquals(fields?.rate, "1.0000");
  assertEquals(fields?.tested_interest_income_usd, 1_000);
  assertEquals(form5471ScheduleI1Pdf.pageIndices?.(fields ?? {}), [0]);
  assertEquals(
    form5471ScheduleI1Pdf.fields.find((entry) =>
      entry.domainKey === "tested_usd"
    )?.pdfField,
    "form1[0].Page1[0].f1_19[0]",
  );
  assertThrows(
    () =>
      form5471ScheduleI1Pdf.instances?.({}, form8992Filer, {
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
