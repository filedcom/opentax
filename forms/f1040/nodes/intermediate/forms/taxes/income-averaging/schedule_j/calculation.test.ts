import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../types.ts";
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
    current_year_taxable_income: 50_000,
    current_year_filing_status: FilingStatus.Single,
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

test("Schedule J ordinary path fills all 2025 form lines and uses each year's rates", () => {
  assertEquals(calculateScheduleJOrdinaryIncome(input(), 2025), {
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

test("Schedule J uses the last filed averaging schedule and floors only line 7", () => {
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
  const lines = calculateScheduleJOrdinaryIncome(source, 2025);
  assertEquals(
    [lines.line5, lines.line7, lines.line8, lines.line9, lines.line11, lines.line12,
      lines.line13, lines.line15, lines.line16, lines.line19, lines.line20,
      lines.line21, lines.line23],
    [-10_000, 0, 0, -20_000, -15_000, 0, -30_000, -25_000, 0, 0, 0, 0, 3_965],
  );
});

test("Schedule J rounds one-third once for every base year", () => {
  const source = input();
  source.elected_farm_income = 1_001;
  const lines = calculateScheduleJOrdinaryIncome(source, 2025);
  assertEquals([lines.line6, lines.line10, lines.line14], [334, 334, 334]);
  assertEquals([lines.line7, lines.line11, lines.line15], [10_334, 10_334, 10_334]);
});

test("Schedule J ordinary branch rejects unsupported tax methods and election excess", () => {
  const excess = input();
  excess.elected_farm_income = 50_001;
  assertThrows(() => calculateScheduleJOrdinaryIncome(excess, 2025));

  const electedGain = input();
  electedGain.elected_farm_income_net_capital_gain = 1;
  assertThrows(() => calculateScheduleJOrdinaryIncome(electedGain, 2025));

  for (const year of ["year2025", "year2022", "year2023", "year2024"] as const) {
    for (const flag of Object.keys(ordinary) as (keyof typeof ordinary)[]) {
      const unsupported = input();
      unsupported.tax_treatment[year][flag] = true;
      assertThrows(() => calculateScheduleJOrdinaryIncome(unsupported, 2025));
    }
  }
});

test("Schedule J rejects negative or non-whole-dollar line 23 sources", () => {
  const source = input();
  source.base_year_source.base_returns.year2022.section1_tax_from_line16 = 9_000;
  source.base_year_source.base_returns.year2022.filed_line16_tax = 9_000;
  assertThrows(() => calculateScheduleJOrdinaryIncome(source, 2025));
});

// Draft 2026 Schedule J (Created 4/30/26): line 4 uses the 2026 rates and
// lines 8, 12 and 16 use the 2023, 2024 and 2025 rates. Line 4 is the Tax
// Table cell for $35,000-$35,050 from the Rev. Proc. 2025-32 §4.01 single
// schedule: $1,240 + 12% of $22,625 = $3,955. Line 16 is the Rev. Proc.
// 2024-40 §3.01 2025 single schedule on $15,000: $1,192.50 + 12% of $3,075 =
// $1,561.50, entered as $1,562.
test("TY2026 Schedule J averages over 2023-2025 with each year's rates", () => {
  const source = input();
  const { year2022: _, ...laterReturns } = source.base_year_source.base_returns;
  const { year2022: __, year2025: current, ...laterTreatment } =
    source.tax_treatment;
  const baseReturn = laterReturns.year2024;
  const lines = calculateScheduleJOrdinaryIncome({
    ...source,
    base_year_source: {
      latest_averaging_year: "none",
      base_returns: {
        ...laterReturns,
        year2025: { ...baseReturn, filed_return_reference: "Filed 2025 Form 1040" },
      },
    },
    tax_treatment: {
      ...laterTreatment,
      year2025: { ...ordinary },
      year2026: { ...current },
    },
  }, 2026);
  assertEquals(
    [lines.line4, lines.line8, lines.line12, lines.line16, lines.line17,
      lines.line22, lines.line23],
    [3_955, 1_580, 1_568, 1_562, 8_665, 3_000, 5_665],
  );
  assertThrows(() => calculateScheduleJOrdinaryIncome(input(), 2026));
});
