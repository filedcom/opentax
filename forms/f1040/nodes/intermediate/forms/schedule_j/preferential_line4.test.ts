import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  calculateScheduleJPreferentialLine4,
  type ScheduleJPreferentialLine4Facts,
} from "./preferential_line4.ts";

const dividends: ScheduleJPreferentialLine4Facts = {
  worksheet: "qualified_dividends",
  filingStatus: FilingStatus.Single,
  scheduleJLine3: 50_000,
  electedFarmNetCapitalGain: 0,
  electedFarmUnrecaptured1250Gain: 0,
  qualifiedDividends: 10_000,
  netCapitalGain: 5_000,
  form4952Line4g: 0,
  unrecaptured1250Gain: 0,
  rate28Gain: 0,
};

Deno.test("2025 Schedule J line 4 computes current-year QDCG tax on line 3", () => {
  // The ordinary $35,000 uses the 2025 Tax Table. Of the $15,000 preferred
  // income, $13,350 is within the 0% ceiling and $1,650 is taxed at 15%.
  assertEquals(calculateScheduleJPreferentialLine4(dividends), 4_213);
});

Deno.test("2025 Schedule J line 4 does not silently omit Form 4952 or special-rate gains", () => {
  assertThrows(
    () => calculateScheduleJPreferentialLine4({
      ...dividends,
      form4952Line4g: 1_000,
    }),
    Error,
    "cannot omit Form 4952",
  );
  assertThrows(
    () => calculateScheduleJPreferentialLine4({
      ...dividends,
      unrecaptured1250Gain: 100,
    }),
    Error,
    "cannot omit Form 4952",
  );
});

Deno.test("2025 Schedule J line 4 preserves the 0% capital-gain band", () => {
  assertEquals(calculateScheduleJPreferentialLine4({
    ...dividends,
    scheduleJLine3: 40_000,
    netCapitalGain: 0,
  }), 3_365);
});

const scheduleD: ScheduleJPreferentialLine4Facts = {
  worksheet: "schedule_d",
  filingStatus: FilingStatus.Single,
  scheduleJLine3: 100_000,
  electedFarmNetCapitalGain: 0,
  electedFarmUnrecaptured1250Gain: 0,
  qualifiedDividends: 0,
  scheduleDLine15: 20_000,
  scheduleDLine16: 20_000,
  scheduleDLine18: 0,
  scheduleDLine19: 10_000,
  form4952Line4g: 0,
  form4952Line4e: 0,
};

Deno.test("2025 Schedule J line 4 computes Schedule D special-rate tax", () => {
  // The 2025 Tax Table gives $14,720 at $90,000, plus $1,500 at 15%.
  assertEquals(calculateScheduleJPreferentialLine4(scheduleD), 16_220);
});

Deno.test("2025 Schedule J line 4 closes elected capital-gain cases without a source rule", () => {
  assertThrows(
    () => calculateScheduleJPreferentialLine4({
      ...dividends,
      electedFarmNetCapitalGain: 1_000,
    }),
    Error,
    "explicit current-year elected-gain worksheet rule",
  );
  assertThrows(
    () => calculateScheduleJPreferentialLine4({
      ...scheduleD,
      electedFarmNetCapitalGain: 1_000,
    }),
    Error,
    "explicit current-year elected-gain worksheet rule",
  );
});
