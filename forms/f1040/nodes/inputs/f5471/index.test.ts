import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCategory5Inclusions,
  f5471,
  type F5471Item,
  FilingCategory,
} from "./index.ts";

const item: F5471Item = {
  foreign_corp_name: "Example Foreign Corp",
  foreign_corp_ein_or_reference_id: "FC-001",
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
    tested_income: 50_000,
    pro_rata_tested_income: 50_000,
    pro_rata_qbai: 100_000,
    pro_rata_tested_interest_income: 1_000,
    pro_rata_tested_interest_expense: 3_000,
    schedule_i1_source_reference: "2025 Schedule I-1",
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
    { ...item, gilti_inclusion: 42_000 },
    { ...item, ownership_percent: 80 },
    { ...item, section_962_election: true },
    { ...item, schedule_i: { ...item.schedule_i, line4_factoring: 500 } },
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
