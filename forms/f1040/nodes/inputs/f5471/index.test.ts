import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCategory5Inclusions,
  f5471,
  type F5471Item,
  FilingCategory,
} from "./index.ts";

const item: F5471Item = {
  foreign_corp_name: "Example Foreign Corp",
  foreign_corp_reference_id: "FC001",
  country_of_incorporation: "Ireland",
  functional_currency: "EUR",
  filing_category: FilingCategory.Category5a,
  shareholder_tin: "111223333",
  ownership_percent: 100,
  section_962_election: false,
  reviewed_form5471_source_reference: "2025 reviewed Form 5471",
  schedule_i: {
    line1a: 2_000,
    line1b: 0,
    line1c: 0,
    line1d: 0,
    line1e: 8_000,
    line1f: 0,
    line1g: 0,
    line1h: 0,
    line2_us_property: 1_000,
    line4_factoring: 0,
    worksheet_a_reference: "2025 Worksheet A",
    worksheet_b_reference: "2025 Worksheet B",
  },
  schedule_i1: {
    separate_category: "GEN",
    average_exchange_rate: "1.0000",
    gross_income_functional: 65_000,
    effectively_connected_income_functional: 0,
    subpart_f_income_functional: 10_000,
    high_tax_exception_income_functional: 0,
    related_party_dividends_functional: 0,
    foreign_oil_gas_income_functional: 0,
    allocable_deductions_functional: 5_000,
    tested_foreign_taxes_functional: 500,
    tested_foreign_taxes_usd: 500,
    qbai_functional: 100_000,
    interest_expense_functional: 3_000,
    qualified_interest_expense_functional: 0,
    tested_loss_qbai_functional: 0,
    tested_interest_expense_functional: 3_000,
    interest_income_functional: 1_000,
    qualified_interest_income_functional: 0,
    tested_interest_income_functional: 1_000,
    tested_income: 50_000,
    pro_rata_tested_income: 50_000,
    pro_rata_qbai: 100_000,
    pro_rata_tested_interest_income: 1_000,
    pro_rata_tested_interest_expense: 3_000,
    schedule_i1_source_reference: "2025 Schedule I-1",
  },
  schedule_h: {
    book_net_income_functional: 50_000,
    adjustments: {
      capital_gain_add: 0,
      capital_gain_subtract: 0,
      depreciation_add: 0,
      depreciation_subtract: 0,
      depletion_add: 0,
      depletion_subtract: 0,
      investment_allowance_add: 0,
      investment_allowance_subtract: 0,
      statutory_reserves_add: 0,
      statutory_reserves_subtract: 0,
      inventory_add: 0,
      inventory_subtract: 0,
      income_taxes_add: 0,
      income_taxes_subtract: 0,
      foreign_currency_add: 0,
      foreign_currency_subtract: 0,
      other_add: 0,
      other_subtract: 0,
    },
    dastm_gain_or_loss: 0,
    passive_category_ep: 0,
    section901j_category_ep: 0,
    current_ep_usd: 50_000,
    average_exchange_rate: "1.0000",
    source_workpaper_reference: "2025 Schedule H workpaper",
  },
};
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("Category 5a source calculates distinct Schedule 1 lines and Form 8992", () => {
  const calculation = calculateCategory5Inclusions(item);
  assertEquals(calculation.section951a, 11_000);
  assertEquals(calculation.form8992.part_ii_line2, 10_000);
  assertEquals(calculation.form8992.part_ii_line3c, 2_000);
  assertEquals(calculation.form8992.part_ii_line4, 8_000);
  assertEquals(calculation.form8992.part_ii_line5, 42_000);
  const outputs = f5471.compute(ctx, { f5471s: [item] }).outputs;
  assertEquals(outputs.length, 2);
  assertEquals(outputs[0].nodeType, "schedule1");
  assertEquals(outputs[0].fields.line8n_section951a_inclusion, 11_000);
  assertEquals(outputs[0].fields.line8o_section951aa_inclusion, 42_000);
  assertEquals(outputs[0].fields.line8z_other, undefined);
  assertEquals(outputs[1].nodeType, "agi_aggregator");
});

Deno.test("Category 5a rejects missing worksheets, wrong pro rata income, and asserted GILTI", () => {
  const invalid = [
    {
      ...item,
      schedule_i: { ...item.schedule_i, worksheet_a_reference: undefined },
    },
    {
      ...item,
      schedule_i: { ...item.schedule_i, worksheet_b_reference: undefined },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, pro_rata_tested_income: 49_999 },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, gross_income_functional: 64_999 },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, average_exchange_rate: "0" },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, qbai_functional: 99_999 },
    },
    {
      ...item,
      schedule_h: {
        ...item.schedule_h,
        adjustments: { ...item.schedule_h.adjustments, other_add: 1 },
      },
    },
    {
      ...item,
      schedule_h: { ...item.schedule_h, current_ep_usd: 49_999 },
    },
    { ...item, gilti_inclusion: 42_000 },
    { ...item, ownership_percent: 80 },
    { ...item, section_962_election: true },
    { ...item, schedule_i: { ...item.schedule_i, line4_factoring: 500 } },
    { ...item, foreign_corp_reference_id: undefined },
    { ...item, foreign_corp_ein: "123456789" },
  ];
  for (const source of invalid) {
    assertThrows(() =>
      f5471.compute(
        ctx,
        { f5471s: [source] } as Parameters<typeof f5471.compute>[1],
      )
    );
  }
});

Deno.test("Category 5a rejects multiple CFCs until multi-CFC Form 8992 is modeled", () => {
  assertThrows(() =>
    f5471.compute(
      ctx,
      { f5471s: [item, item] } as unknown as Parameters<
        typeof f5471.compute
      >[1],
    )
  );
});
