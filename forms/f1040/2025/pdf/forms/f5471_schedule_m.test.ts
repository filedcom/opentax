import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../form8992.fixture.ts";
import { form5471ScheduleMPdf } from "./f5471_schedule_m.ts";

Deno.test("Schedule M PDF maps related inventory sale and maximum balances", () => {
  const [fields] = form5471ScheduleMPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471ScheduleMPdf.pageIndices?.(fields ?? {}), [0, 1]);
  assertEquals(fields?.currency_rate, "EUR / 1.0000");
  assertEquals(fields?.inventory_sales, 10_000);
  assertEquals(fields?.total_received, 10_000);
  assertEquals(fields?.max_accounts_receivable, 0);
  assertEquals(
    form5471ScheduleMPdf.fields.find((entry) =>
      entry.domainKey === "inventory_sales"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table[0].BodyRow1[0].f1_7[0]",
  );
  assertThrows(() =>
    form5471ScheduleMPdf.instances?.(
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
