import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../types.ts";
import { scheduleJPriorYearRateTax } from "./prior_year_rates.ts";

test("Schedule J 2022 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.Single, 539_900), 162_718);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.MFS, 323_925), 87_126.75);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.MFJ, 647_850), 174_253.50);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.QSS, 647_850), 174_253.50);
  assertEquals(scheduleJPriorYearRateTax(2022, FilingStatus.HOH, 539_900), 161_218.50);
});

test("Schedule J 2023 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.Single, 578_125), 174_238.25);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.MFS, 346_875), 93_300.75);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.MFJ, 693_750), 186_601.50);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.QSS, 693_750), 186_601.50);
  assertEquals(scheduleJPriorYearRateTax(2023, FilingStatus.HOH, 578_100), 172_623.50);
});

test("Schedule J 2024 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.Single, 609_350), 183_647.25);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.MFS, 365_600), 98_334.75);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.MFJ, 731_200), 196_669.50);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.QSS, 731_200), 196_669.50);
  assertEquals(scheduleJPriorYearRateTax(2024, FilingStatus.HOH, 609_350), 181_954.50);
});

// Rev. Proc. 2024-40 §3.01; the 2025 Tax Computation Worksheet (2025 Form
// 1040 instructions, p. 80) gives 0.37 x 626,350 - 42,979.75 = 188,769.75.
test("Schedule J 2025 rate schedules match published breakpoint bases", () => {
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.Single, 626_350), 188_769.75);
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.MFS, 375_800), 101_077.25);
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.MFJ, 751_600), 202_154.50);
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.QSS, 751_600), 202_154.50);
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.HOH, 626_350), 187_031.50);
  // Section A row 2: 0.24 x 150,000 - 7,153 = 28,847.
  assertEquals(scheduleJPriorYearRateTax(2025, FilingStatus.Single, 150_000), 28_847);
});

test("Schedule J prior-year tax rejects negative and nonfinite taxable amounts", () => {
  assertThrows(() => scheduleJPriorYearRateTax(2022, FilingStatus.Single, -1));
  assertThrows(() => scheduleJPriorYearRateTax(2023, FilingStatus.MFJ, Infinity));
});
