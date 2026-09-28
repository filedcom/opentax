import { assertEquals } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import { schedule_j } from "./index.ts";

const ordinary = {
  has_qualified_dividends: false,
  has_net_capital_gain: false,
  has_unrecaptured_section1250_gain: false,
  has_28_percent_rate_gain: false,
  filed_form2555: false,
} as const;

const base = {
  elected_farm_income: 15_000,
  elected_farm_income_net_capital_gain: 0,
  base_year_source: {
    latest_averaging_year: "none",
    base_returns: {
      year2022: {
        filing_status: FilingStatus.Single,
        taxable_income_line15: 10_000,
        filed_line16_tax: 1_000,
        section1_tax_from_line16: 1_000,
        filed_return_reference: "Filed 2022 Form 1040",
        section1_tax_workpaper_reference: "2022 section 1 tax",
      },
      year2023: {
        filing_status: FilingStatus.Single,
        taxable_income_line15: 10_000,
        filed_line16_tax: 1_000,
        section1_tax_from_line16: 1_000,
        filed_return_reference: "Filed 2023 Form 1040",
        section1_tax_workpaper_reference: "2023 section 1 tax",
      },
      year2024: {
        filing_status: FilingStatus.Single,
        taxable_income_line15: 10_000,
        filed_line16_tax: 1_000,
        section1_tax_from_line16: 1_000,
        filed_return_reference: "Filed 2024 Form 1040",
        section1_tax_workpaper_reference: "2024 section 1 tax",
      },
    },
  },
  tax_treatment: {
    year2025: ordinary,
    year2022: ordinary,
    year2023: ordinary,
    year2024: ordinary,
  },
} as const;

Deno.test("Schedule J election routes filed base-year evidence but no asserted tax", () => {
  const parsed = schedule_j.inputSchema.parse(base);
  const result = schedule_j.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "schedule_j_calculation");
  assertEquals(result.outputs[0].fields.elected_farm_income, 15_000);
  assertEquals("schedule_j_tax" in result.outputs[0].fields, false);
  assertEquals(result.outputs[1].fields, {
    schedule_j_election_requested: true,
  });
});

Deno.test("Schedule J rejects old asserted-tax and incomplete-source shapes", () => {
  assertEquals(schedule_j.inputSchema.safeParse({
    ...base,
    schedule_j_tax: 5_000,
  }).success, false);
  assertEquals(schedule_j.inputSchema.safeParse({
    ...base,
    base_year_source: { latest_averaging_year: "none" },
  }).success, false);
  assertEquals(schedule_j.inputSchema.safeParse({
    ...base,
    elected_farm_income_net_capital_gain: 100,
  }).success, false);
});
