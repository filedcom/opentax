import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  calculateScheduleJOrdinaryIncome,
  type ScheduleJOrdinaryIncomeInput,
} from "./calculation.ts";
const source = {
  qualified_dividends: 30000,
  net_capital_gain: 0,
  unrecaptured_1250_gain: 0,
  rate_28_gain: 0,
  form4952_line4g: 0,
  form4952_line4e: 0,
  source_reference: "actual issuedDIV and qualified holding source",
};
const flags = {
  has_qualified_dividends: false,
  has_net_capital_gain: false,
  has_unrecaptured_section1250_gain: false,
  has_28_percent_rate_gain: false,
  filed_form2555: false,
};
function input(): ScheduleJOrdinaryIncomeInput {
  const prior = (year: number) => ({
    filing_status: FilingStatus.Single,
    taxable_income_line15: 10000,
    filed_line16_tax: 1000,
    section1_tax_from_line16: 1000,
    filed_return_reference: `retained ${year} Form1040`,
    section1_tax_workpaper_reference: `retained ${year} tax worksheet`,
  });
  return {
    taxable_income_2025: 171111,
    filing_status_2025: FilingStatus.Single,
    elected_farm_income: 15000,
    elected_farm_income_net_capital_gain: 0,
    current_year_tax_source: source,
    base_year_source: {
      latest_averaging_year: "none",
      base_returns: {
        year2022: prior(2022),
        year2023: prior(2023),
        year2024: prior(2024),
      },
    },
    tax_treatment: {
      year2025: { ...flags, has_qualified_dividends: true },
      year2022: { ...flags },
      year2023: { ...flags },
      year2024: { ...flags },
    },
  };
}
Deno.test("ScheduleJ current qualified source uses its worksheet and preserves distinct base rates", () => {
  const p = calculateScheduleJOrdinaryIncome(input());
  // Current ordinary126111:1192.50+4386+12072.50+5462.64;
  // qualified30000 at15%=4500; rounded27614. Base rates1595/1580/1568.
  assertEquals([p.line4, p.line8, p.line12, p.line16, p.line22, p.line23], [
    27614,
    1595,
    1580,
    1568,
    3000,
    29357,
  ]);
});
Deno.test("ScheduleJ all three base qualified worksheets use actual filed treatment and source amounts", () => {
  const s = input();
  for (const year of ["year2022", "year2023", "year2024"] as const) {
    s.base_year_source.base_returns[year].preferential_tax_source = {
      ...source,
      qualified_dividends: 10000,
      source_reference: `retained ${year} 1040 line3a and QDCG worksheet`,
    };
    s.base_year_source.base_returns[year].taxable_income_line15 = 50000;
    s.tax_treatment[year].has_qualified_dividends = true;
  }
  const p = calculateScheduleJOrdinaryIncome(s);
  // Base ordinary45000:2022=5517;2023=5207.50;2024=5168.
  // Firsttwo qualified10000 all15%;2024 qualified2025 at0%,7975 at15%.
  assertEquals([p.line8, p.line12, p.line16], [7017, 6708, 6364]);
});
Deno.test("ScheduleJ rejects omitted or contradictory prior/current worksheet source", () => {
  const s = input();
  delete s.current_year_tax_source;
  assertThrows(() => calculateScheduleJOrdinaryIncome(s));
  const t = input();
  t.tax_treatment.year2025.has_qualified_dividends = false;
  assertThrows(() => calculateScheduleJOrdinaryIncome(t));
  const u = input();
  u.tax_treatment.year2022.has_net_capital_gain = true;
  assertThrows(() => calculateScheduleJOrdinaryIncome(u));
});
