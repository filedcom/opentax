import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../form8992.fixture.ts";
import { form8992Pdf } from "./f8992.ts";
import { form8992ScheduleAPdf } from "./f8992_schedule_a.ts";

Deno.test("Form 8992 PDF projects Part I, Part II, and shareholder identity", () => {
  const [fields] =
    form8992Pdf.instances?.({}, form8992Filer, form8992Pending) ?? [];
  assertEquals(fields?.part_i_line3, 50_000);
  assertEquals(fields?.part_ii_line1, 50_000);
  assertEquals(fields?.part_ii_line5, 42_000);
  assertEquals(fields?.shareholder_name, "Alex Taxpayer");
  assertEquals(
    form8992Pdf.fields.find((entry) => entry.domainKey === "part_ii_line5")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_14[0]",
  );
});

Deno.test("Schedule A PDF projects CFC row and totals, retaining only form page", () => {
  const [fields] =
    form8992ScheduleAPdf.instances?.({}, form8992Filer, form8992Pending) ?? [];
  assertEquals(fields?.cfc_identifier, "FC001");
  assertEquals(fields?.pro_rata_tested_income, 50_000);
  assertEquals(fields?.total_gilti_allocation_ratio, "1.0000");
  assertEquals(fields?.total_gilti_allocated, 42_000);
  assertEquals(form8992ScheduleAPdf.pageIndices?.(fields ?? {}), [0]);
  assertEquals(
    form8992ScheduleAPdf.fields.find((entry) =>
      entry.domainKey === "pro_rata_tested_income"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_SchA[0].Row1[0].f2_9[0]",
  );
  assertThrows(
    () =>
      form8992ScheduleAPdf.instances?.({}, form8992Filer, {
        ...form8992Pending,
        schedule1: {
          ...form8992Pending.schedule1,
          line8o_section951aa_inclusion: 1,
        },
      }),
    Error,
    "Schedule 1 lines 8n and 8o",
  );
});
