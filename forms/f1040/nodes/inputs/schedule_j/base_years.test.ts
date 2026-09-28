import { assertEquals, assertThrows } from "@std/assert";
import {
  baseYearSourceSchema,
  selectScheduleJBaseYearLines,
} from "./base_years.ts";
import { FilingStatus } from "../../types.ts";

const base_returns = {
  year2022: {
    filing_status: FilingStatus.Single,
    taxable_income_line15: 10_000,
    filed_line16_tax: 1_000,
    section1_tax_from_line16: 1_000,
    filed_return_reference: "Filed 2022 Form 1040",
    section1_tax_workpaper_reference: "2022 line 16 section 1 review",
  },
  year2023: {
    filing_status: FilingStatus.MFJ,
    taxable_income_line15: 20_000,
    filed_line16_tax: 2_000,
    section1_tax_from_line16: 2_000,
    filed_return_reference: "Filed 2023 Form 1040",
    section1_tax_workpaper_reference: "2023 line 16 section 1 review",
  },
  year2024: {
    filing_status: FilingStatus.HOH,
    taxable_income_line15: 30_000,
    filed_line16_tax: 3_000,
    section1_tax_from_line16: 3_000,
    filed_return_reference: "Filed 2024 Form 1040",
    section1_tax_workpaper_reference: "2024 line 16 section 1 review",
  },
};

Deno.test("Schedule J selects direct filed-return base lines with no prior averaging", () => {
  assertEquals(selectScheduleJBaseYearLines({
    latest_averaging_year: "none",
    base_returns,
  }), {
    line5: 10_000,
    line9: 20_000,
    line13: 30_000,
    line19: 1_000,
    line20: 2_000,
    line21: 3_000,
  });
});

Deno.test("Schedule J selects only the latest prior Schedule J worksheet lines", () => {
  assertEquals(selectScheduleJBaseYearLines({
    latest_averaging_year: 2022,
    base_returns,
    latest_filed_schedule_j: {
      line3: 4_000,
      line4: 400,
      filed_schedule_j_reference: "Filed 2022 Schedule J",
    },
  }), {
    line5: 4_000,
    line9: 20_000,
    line13: 30_000,
    line19: 400,
    line20: 2_000,
    line21: 3_000,
  });
  assertEquals(selectScheduleJBaseYearLines({
    latest_averaging_year: 2023,
    base_returns,
    latest_filed_schedule_j: {
      line15: 5_000,
      line3: 6_000,
      line16: 500,
      line4: 600,
      filed_schedule_j_reference: "Filed 2023 Schedule J",
    },
  }), {
    line5: 5_000,
    line9: 6_000,
    line13: 30_000,
    line19: 500,
    line20: 600,
    line21: 3_000,
  });
  assertEquals(selectScheduleJBaseYearLines({
    latest_averaging_year: 2024,
    base_returns,
    latest_filed_schedule_j: {
      line11: 7_000,
      line15: 8_000,
      line3: 9_000,
      line12: 700,
      line16: 800,
      line4: 900,
      filed_schedule_j_reference: "Filed 2024 Schedule J",
    },
  }), {
    line5: 7_000,
    line9: 8_000,
    line13: 9_000,
    line19: 700,
    line20: 800,
    line21: 900,
  });
});

Deno.test("Schedule J prior averaging cannot be asserted without its filed schedule", () => {
  assertEquals(baseYearSourceSchema.safeParse({
    latest_averaging_year: 2024,
    base_returns,
  }).success, false);
  assertEquals(baseYearSourceSchema.safeParse({
    latest_averaging_year: "none",
    base_returns,
    latest_filed_schedule_j: { line3: 1, line4: 1 },
  }).success, false);
  assertEquals(baseYearSourceSchema.safeParse({
    latest_averaging_year: "none",
    base_returns: {
      ...base_returns,
      year2022: {
        ...base_returns.year2022,
        section1_tax_from_line16: 1_001,
      },
    },
  }).success, false);
});

Deno.test("Schedule J does not treat zero filed taxable income as a completed base-year worksheet", () => {
  assertThrows(() => selectScheduleJBaseYearLines({
    latest_averaging_year: "none",
    base_returns: {
      ...base_returns,
      year2022: { ...base_returns.year2022, taxable_income_line15: 0 },
    },
  }), Error, "sourced worksheet");
});

function zeroYear(
  year: 2022 | 2023 | 2024,
  line1: number,
  carryover: number,
  nol: number,
) {
  return {
    ...base_returns[`year${year}`],
    taxable_income_line15: 0,
    zero_income_worksheet: {
      unfloored_taxable_income: -line1,
      unfloored_income_workpaper_reference: `${year} unfloored return workpaper`,
      schedule_d_line21_loss: 3_000,
      schedule_d_line16_loss: 7_000,
      capital_loss_carryover_to_next_year: carryover,
      schedule_d_and_carryover_reference: `${year} Schedule D and carryover`,
      nol_remaining_after_base_year: nol,
      nol_reference: `${year} Form 1045 and NOL rollforward`,
    },
  };
}

Deno.test("Schedule J reproduces the IRS 2022 through 2024 negative-income worksheet examples", () => {
  assertEquals(selectScheduleJBaseYearLines({
    latest_averaging_year: "none",
    base_returns: {
      year2022: {
        ...zeroYear(2022, 8_150, 7_000, 5_150),
        taxable_income_line15: 850,
        adjusted_taxable_income: -8_150,
        adjustment_reference: "2023 NOL carryback to filed 2022 return",
      },
      year2023: zeroYear(2023, 29_900, 7_000, 14_500),
      year2024: zeroYear(2024, 1_000, 5_000, 0),
    },
  }), {
    line5: 0,
    line9: -12_400,
    line13: 0,
    line19: 1_000,
    line20: 2_000,
    line21: 3_000,
  });
});

Deno.test("Schedule J requires evidence when a positive filed base year becomes negative", () => {
  const withUnreferencedAdjustment = {
    latest_averaging_year: "none",
    base_returns: {
      ...base_returns,
      year2022: {
        ...zeroYear(2022, 8_150, 7_000, 5_150),
        taxable_income_line15: 850,
        adjusted_taxable_income: -8_150,
      },
    },
  };
  assertEquals(baseYearSourceSchema.safeParse(withUnreferencedAdjustment).success, false);
});

Deno.test("Schedule J refuses an irreconcilable zero-income worksheet", () => {
  const source = {
    latest_averaging_year: "none",
    base_returns: {
      ...base_returns,
      year2024: zeroYear(2024, 1_000, 7_000, 0),
    },
  };
  assertEquals(baseYearSourceSchema.safeParse(source).success, false);
});
