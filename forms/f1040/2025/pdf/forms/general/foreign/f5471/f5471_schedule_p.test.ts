import { assertEquals, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471SchedulePPdf } from "./f5471_schedule_p.ts";

Deno.test("Schedule P PDF maps functional PTEP and U.S. dollar basis", () => {
  const [fields] = form5471SchedulePPdf.instances?.(
    {},
    form8992Filer,
    form8992Pending,
  ) ?? [];
  assertEquals(form5471SchedulePPdf.pageIndices?.(fields ?? {}), [0, 1, 2, 3]);
  assertEquals(fields?.fc_c12, 53_000);
  assertEquals(fields?.fc_h9, -42_000);
  assertEquals(fields?.us_c12, 53_000);
  assertEquals(fields?.us_j9, -10_000);
  assertEquals(
    form5471SchedulePPdf.fields.find((entry) => entry.domainKey === "fc_h7")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Pg2Table[0].BodyRow7[0].f2_70[0]",
  );
  assertThrows(() =>
    form5471SchedulePPdf.instances?.(
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
