import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  calculateScheduleJBaseYearPreferentialTax,
  type ScheduleJBaseYearPreferentialFacts,
} from "./preferential_tax.ts";

const qualifiedDividends = (
  year: 2022 | 2023 | 2024,
): ScheduleJBaseYearPreferentialFacts => ({
  method: "qualified_dividends",
  year,
  filingStatus: FilingStatus.Single,
  taxableIncomeWithAllocation: 50_000,
  filedForm2555: false,
  qualifiedDividends: 10_000,
  netCapitalGain: 0,
  form4952Line4g: 0,
  electedFarmNetCapitalGain: 0,
});

Deno.test("Schedule J base-year qualified-dividend worksheets use year-specific 0% ceilings and rates", () => {
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax(qualifiedDividends(2022)),
    5_843,
  );
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax(qualifiedDividends(2023)),
    5_386,
  );
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax(qualifiedDividends(2024)),
    5_014,
  );
});

Deno.test("Schedule J QDCG worksheet taxes Form 4952 elected dividends at ordinary rates", () => {
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax({
      ...qualifiedDividends(2024),
      form4952Line4g: 10_000,
    }),
    6_053,
  );
});

Deno.test("Schedule J base-year QDCG cannot silently absorb elected capital gain or Form 2555", () => {
  assertThrows(
    () =>
      calculateScheduleJBaseYearPreferentialTax(
        {
          ...qualifiedDividends(2024),
          electedFarmNetCapitalGain: 1_000,
        } as unknown as Parameters<
          typeof calculateScheduleJBaseYearPreferentialTax
        >[0],
      ),
    Error,
    "requires the Schedule D worksheet",
  );
  assertThrows(
    () =>
      calculateScheduleJBaseYearPreferentialTax({
        ...qualifiedDividends(2024),
        filedForm2555: true,
      }),
    Error,
    "foreign-earned-income worksheet",
  );
});

const scheduleD2024: ScheduleJBaseYearPreferentialFacts = {
  method: "schedule_d",
  year: 2024,
  filingStatus: FilingStatus.Single,
  taxableIncomeWithAllocation: 100_000,
  filedForm2555: false,
  qualifiedDividends: 0,
  scheduleDLine15: 20_000,
  scheduleDLine16: 20_000,
  scheduleDLine18: 0,
  scheduleDLine19: 10_000,
  form4952Line4g: 0,
  form4952Line4e: 0,
  allocatedElectedNetCapitalGain: 0,
  allocatedElectedUnrecaptured1250Gain: 0,
};

Deno.test("2024 Schedule D worksheet computes section 1250 gain and ordinary tax", () => {
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax(scheduleD2024),
    16_353,
  );
});

Deno.test("2024 Schedule D worksheet allocates elected gain onto the prior-year gain lines", () => {
  assertEquals(
    calculateScheduleJBaseYearPreferentialTax({
      ...scheduleD2024,
      scheduleDLine15: 0,
      scheduleDLine16: 0,
      scheduleDLine19: 0,
      allocatedElectedNetCapitalGain: 20_000,
      allocatedElectedUnrecaptured1250Gain: 10_000,
    }),
    16_353,
  );
});

Deno.test("2022 and 2023 Schedule D routes close on conflicting official worksheet line references", () => {
  for (const year of [2022, 2023] as const) {
    assertThrows(
      () =>
        calculateScheduleJBaseYearPreferentialTax({ ...scheduleD2024, year }),
      Error,
      "conflict",
    );
  }
});
