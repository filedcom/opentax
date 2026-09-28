import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  calculateScheduleJOrdinaryIncome,
  type ScheduleJOrdinaryIncomeInput,
} from "./calculation.ts";

const ordinary = {
  has_qualified_dividends: false,
  has_net_capital_gain: false,
  has_unrecaptured_section1250_gain: false,
  has_28_percent_rate_gain: false,
  filed_form2555: false,
};

function input(): ScheduleJOrdinaryIncomeInput {
  const baseReturn = (year: number) => ({
    filing_status: FilingStatus.Single,
    taxable_income_line15: 10_000,
    filed_line16_tax: 1_000,
    section1_tax_from_line16: 1_000,
    filed_return_reference: `Filed ${year} Form 1040`,
    section1_tax_workpaper_reference: `${year} section 1 tax`,
  });
  return {
    taxable_income_2025: 50_000,
    filing_status_2025: FilingStatus.Single,
    elected_farm_income: 15_000,
    elected_farm_income_net_capital_gain: 0,
    base_year_source: {
      latest_averaging_year: "none",
      base_returns: {
        year2022: baseReturn(2022),
        year2023: baseReturn(2023),
        year2024: baseReturn(2024),
      },
    },
    tax_treatment: {
      year2025: { ...ordinary },
      year2022: { ...ordinary },
      year2023: { ...ordinary },
      year2024: { ...ordinary },
    },
  };
}

Deno.test("Schedule J ordinary path fills all 2025 form lines and uses each year's rates", () => {
  assertEquals(calculateScheduleJOrdinaryIncome(input()), {
    line1: 50_000,
    line2a: 15_000,
    line2b: 0,
    line2c: 0,
    line3: 35_000,
    line4: 3_965,
    line5: 10_000,
    line6: 5_000,
    line7: 15_000,
    line8: 1_595,
    line9: 10_000,
    line10: 5_000,
    line11: 15_000,
    line12: 1_580,
    line13: 10_000,
    line14: 5_000,
    line15: 15_000,
    line16: 1_568,
    line17: 8_708,
    line18: 8_708,
    line19: 1_000,
    line20: 1_000,
    line21: 1_000,
    line22: 3_000,
    line23: 5_708,
  });
});

Deno.test("Schedule J uses the last filed averaging schedule and floors only line 7", () => {
  const source = input();
  source.base_year_source = {
    latest_averaging_year: 2024,
    base_returns: source.base_year_source.base_returns,
    latest_filed_schedule_j: {
      line11: -10_000,
      line15: -20_000,
      line3: -30_000,
      line12: 0,
      line16: 0,
      line4: 0,
      filed_schedule_j_reference: "Filed 2024 Schedule J",
    },
  };
  const lines = calculateScheduleJOrdinaryIncome(source);
  assertEquals(
    [lines.line5, lines.line7, lines.line8, lines.line9, lines.line11, lines.line12,
      lines.line13, lines.line15, lines.line16, lines.line19, lines.line20,
      lines.line21, lines.line23],
    [-10_000, 0, 0, -20_000, -15_000, 0, -30_000, -25_000, 0, 0, 0, 0, 3_965],
  );
});

Deno.test("Schedule J rounds one-third once for every base year", () => {
  const source = input();
  source.elected_farm_income = 1_001;
  const lines = calculateScheduleJOrdinaryIncome(source);
  assertEquals([lines.line6, lines.line10, lines.line14], [334, 334, 334]);
  assertEquals([lines.line7, lines.line11, lines.line15], [10_334, 10_334, 10_334]);
});

Deno.test("Schedule J ordinary branch rejects unsupported tax methods and election excess", () => {
  const excess = input();
  excess.elected_farm_income = 50_001;
  assertThrows(() => calculateScheduleJOrdinaryIncome(excess));

  const electedGain = input();
  electedGain.elected_farm_income_net_capital_gain = 1;
  assertThrows(() => calculateScheduleJOrdinaryIncome(electedGain));

  for (const year of ["year2025", "year2022", "year2023", "year2024"] as const) {
    for (const flag of Object.keys(ordinary) as (keyof typeof ordinary)[]) {
      const unsupported = input();
      unsupported.tax_treatment[year][flag] = true;
      assertThrows(() => calculateScheduleJOrdinaryIncome(unsupported));
    }
  }
});

Deno.test("Schedule J rejects negative or non-whole-dollar line 23 sources", () => {
  const source = input();
  source.base_year_source.base_returns.year2022.section1_tax_from_line16 = 9_000;
  source.base_year_source.base_returns.year2022.filed_line16_tax = 9_000;
  assertThrows(() => calculateScheduleJOrdinaryIncome(source));
});
