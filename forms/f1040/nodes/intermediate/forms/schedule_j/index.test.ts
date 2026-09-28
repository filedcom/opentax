import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { schedule_j_calculation } from "./index.ts";

const ordinary = {
  has_qualified_dividends: false,
  has_net_capital_gain: false,
  has_unrecaptured_section1250_gain: false,
  has_28_percent_rate_gain: false,
  filed_form2555: false,
} as const;

function source() {
  const baseReturn = (year: number) => ({
    filing_status: FilingStatus.Single,
    taxable_income_line15: 10_000,
    filed_line16_tax: 1_000,
    section1_tax_from_line16: 1_000,
    filed_return_reference: `Filed ${year} Form 1040`,
    section1_tax_workpaper_reference: `${year} section 1 tax`,
  });
  return schedule_j_calculation.inputSchema.parse({
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
      year2025: ordinary,
      year2022: ordinary,
      year2023: ordinary,
      year2024: ordinary,
    },
    farm_net_profit: 75_000,
    farm_only_income_verified: true,
    se_tax_deduction: 5_000,
    agi: 70_000,
    taxable_income_2025: 50_000,
    filing_status_2025: FilingStatus.Single,
    taking_standard_deduction: true,
    qbi_deduction: 10_000,
    additional_deductions: 0,
    nol_deduction: 0,
  });
}

Deno.test("Schedule J sends calculated line 23 to tax and finalizes the attachment", () => {
  const result = schedule_j_calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    source(),
  );
  assertEquals(result.outputs, [{
    nodeType: "income_tax_calculation",
    fields: { schedule_j_calculated_tax: 5_708 },
  }]);
  assertEquals(result.finalizations?.[0].nodeType, "schedule_j");
  assertEquals(result.finalizations?.[0].fields.line23, 5_708);
});

Deno.test("Schedule J source deposits without an election are a normal no-op", () => {
  const result = schedule_j_calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      farm_net_profit: 75_000.25,
      farm_only_income_verified: true,
      se_tax_deduction: 5_000,
      agi: 70_000.25,
      taxable_income_2025: 50_000.25,
      filing_status_2025: FilingStatus.Single,
      taking_standard_deduction: true,
      qbi_deduction: 10_000,
      additional_deductions: 0,
      nol_deduction: 0,
    },
  );
  assertEquals(result.outputs, []);
  assertEquals(result.finalizations, undefined);
});

Deno.test("Schedule J rejects unverified farm attribution and excess election", () => {
  const unverified = { ...source(), farm_only_income_verified: false };
  assertThrows(() => schedule_j_calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    unverified,
  ));
  const excess = { ...source(), elected_farm_income: 61_000 };
  assertThrows(() => schedule_j_calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    excess,
  ));
});

Deno.test("Schedule J rejects other deduction methods and unreconciled AGI", () => {
  for (const changed of [
    { ...source(), taking_standard_deduction: false },
    { ...source(), additional_deductions: 1 },
    { ...source(), nol_deduction: 1 },
    { ...source(), agi: 69_999 },
    { ...source(), farm_net_profit: 75_000.25 },
  ]) {
    assertThrows(() => schedule_j_calculation.compute(
      { taxYear: 2025, formType: "f1040" },
      changed,
    ));
  }
});
