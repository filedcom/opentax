import { assertEquals, assertStringIncludes } from "@std/assert";
import { scheduleA } from "./schedule_a.ts";

const itemized = { line_5a_state_income_tax: 8_000 };

Deno.test("Schedule A XML is omitted when finalized Form 1040 uses standard deduction", () => {
  const xml = scheduleA.build(itemized, {
    pending: { f1040: { line12a_standard_deduction: 15_750 } },
  });
  assertEquals(xml, "");
});

Deno.test("Schedule A XML is present when finalized Form 1040 itemizes", () => {
  const xml = scheduleA.build(itemized, {
    pending: { f1040: { line12e_itemized_deductions: 20_000 } },
  });
  assertStringIncludes(xml, "<IRS1040ScheduleA>");
});

Deno.test("standalone Schedule A descriptor retains its form-level rendering", () => {
  assertStringIncludes(scheduleA.build(itemized), "<IRS1040ScheduleA>");
});
