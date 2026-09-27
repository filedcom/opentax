import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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

Deno.test("Schedule A deducts the full Form 8396 line 3 even when the allowed credit is smaller", () => {
  const fields = {
    line_8a_mortgage_interest_1098: 15_000,
    form8396_interest_credit_reduction: 2_000,
    form8396_interest_reporting_line: "8a" as const,
  };
  const pending = {
    f1040: { line12e_itemized_deductions: 13_000 },
    form8396: { line3: 2_000, line9: 1_100, interest_reporting_line: "8a" },
  };
  const xml = scheduleA.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<RptHomeMortgIntAndPointsAmt>13000</RptHomeMortgIntAndPointsAmt>",
  );
  assertThrows(
    () => scheduleA.build(fields, {
      pending: { ...pending, form8396: { line3: 1_100 } },
    }),
    Error,
    "differs from Form 8396 line 3",
  );
});
