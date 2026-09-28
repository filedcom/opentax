import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import { scheduleJPriorYearRateTax } from "./prior_year_rates.ts";

Deno.test("Schedule J 2022 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.Single, 539_900), 162_718);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.MFS, 323_925), 87_126.75);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.MFJ, 647_850), 174_253.50);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.QSS, 647_850), 174_253.50);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.HOH, 539_900), 161_218.50);
});

Deno.test("Schedule J 2023 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.Single, 578_125), 174_238.25);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.MFS, 346_875), 93_300.75);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.MFJ, 693_750), 186_601.50);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.QSS, 693_750), 186_601.50);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.HOH, 578_100), 172_623.50);
});

Deno.test("Schedule J 2024 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.Single, 609_350), 183_647.25);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.MFS, 365_600), 98_334.75);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.MFJ, 731_200), 196_669.50);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.QSS, 731_200), 196_669.50);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.HOH, 609_350), 181_954.50);
});

Deno.test("Schedule J prior-year tax rejects negative and nonfinite taxable amounts", () => {
  assertThrows(() => scheduleJPriorYearRateTax(2022, FilingStatus.Single, -1));
  assertThrows(() => scheduleJPriorYearRateTax(2023, FilingStatus.MFJ, Infinity));
});
