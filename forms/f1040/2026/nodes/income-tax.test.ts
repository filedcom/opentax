import { buildStartNode } from "../../start.ts";
import { inputNodes } from "../inputs.ts";
import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { incomeWorksheet2026 } from "../../nodes/config/2026-tax-worksheets.ts";
import {
  ordinaryTaxWithConfig,
  taxTableWithConfig,
} from "../../nodes/intermediate/worksheets/taxes/calculation/tax_worksheets.ts";
import {
  calculateIncomeTax2026,
  income_tax_2026,
  type IncomeTax2026Input,
} from "./income-tax.ts";
const base: IncomeTax2026Input = {
  taxable_income: 133401,
  filing_status: FilingStatus.Single,
  form6251_line1b: 133401,
  form6251_line2a: 0,
  taking_standard_deduction: true,
};

Deno.test("2026 ordinary tax matches all 8,248 independently extracted IRS draft cells", async () => {
  const csv = await Deno.readTextFile(
    new URL(
      "../../../../docs/ty2026/evidence/tax-table-2026.csv",
      import.meta.url,
    ),
  );
  const rows = csv.trim().split("\n").slice(1).map((row) =>
    row.split(",").map(Number)
  );
  assertEquals(rows.length, 2062);
  let next = 0;
  for (const [low, high, single, joint, separate, hoh, page] of rows) {
    assertEquals(low, next);
    next = high;
    assertEquals(page >= 3 && page <= 14, true);
    for (
      const [status, expected] of [
        [FilingStatus.Single, single],
        [FilingStatus.MFJ, joint],
        [FilingStatus.MFS, separate],
        [FilingStatus.HOH, hoh],
        [FilingStatus.QSS, joint],
      ] as const
    ) {
      assertEquals(
        taxTableWithConfig(low, status, incomeWorksheet2026),
        expected,
        `${status}: ${low}`,
      );
      assertEquals(
        ordinaryTaxWithConfig(high - 1, status, incomeWorksheet2026),
        expected,
        `${status}: ${high - 1}`,
      );
    }
  }
  assertEquals(next, 100000);
});
Deno.test("2026 Tax Computation Worksheet matches every published section and boundary", () => {
  // Columns (b)/(d), draft Publication 1040 printed pages 14–15.
  const sections = [
    [FilingStatus.Single, [
      [100000, 105700, .22, 5288],
      [105701, 201775, .24, 7402],
      [201776, 256225, .32, 23544],
      [256226, 640600, .35, 31230.75],
      [640601, 1000000, .37, 44042.75],
    ]],
    [FilingStatus.MFJ, [
      [100000, 100800, .12, 496],
      [100801, 211400, .22, 10576],
      [211401, 403550, .24, 14804],
      [403551, 512450, .32, 47088],
      [512451, 768700, .35, 62461.5],
      [768701, 1000000, .37, 77835.5],
    ]],
    [FilingStatus.MFS, [
      [100000, 105700, .22, 5288],
      [105701, 201775, .24, 7402],
      [201776, 256225, .32, 23544],
      [256226, 384350, .35, 31230.75],
      [384351, 1000000, .37, 38917.75],
    ]],
    [FilingStatus.HOH, [
      [100000, 105700, .22, 7099],
      [105701, 201750, .24, 9213],
      [201751, 256200, .32, 25353],
      [256201, 640600, .35, 33039],
      [640601, 1000000, .37, 45851],
    ]],
  ] as const;
  for (const [status, rows] of sections) {
    for (const [low, high, rate, subtract] of rows) {
      for (const income of [low, high]) {
        assertEquals(
          ordinaryTaxWithConfig(income, status, incomeWorksheet2026),
          Math.round(income * rate - subtract),
        );
        if (status === FilingStatus.MFJ) {
          assertEquals(
            ordinaryTaxWithConfig(
              income,
              FilingStatus.QSS,
              incomeWorksheet2026,
            ),
            Math.round(income * rate - subtract),
          );
        }
      }
    }
  }
  assertEquals(
    calculateIncomeTax2026({ ...base, taxable_income: 59201 }).line16IncomeTax,
    7742,
  );
  assertEquals(
    calculateIncomeTax2026({ ...base, taxable_income: 0 }).line16IncomeTax,
    0,
  );
  assertThrows(() =>
    taxTableWithConfig(99999.5, FilingStatus.Single, incomeWorksheet2026)
  );
});
Deno.test("2026 qualified-dividend worksheet uses annual gain thresholds and ordinary Tax Table", () => {
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      taxable_income: 120000,
      filing_status: FilingStatus.MFJ,
      qualified_dividends: 30000,
    }).line16IncomeTax,
    13472,
  );
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      taxable_income: 100000,
      qualified_dividends: 60000,
    }).line16IncomeTax,
    12138,
  );
  for (
    const [status, zero, fifteen, taxAbove] of [
      [FilingStatus.Single, 49450, 545500, 76408],
      [FilingStatus.MFJ, 98900, 613700, 79220],
      [FilingStatus.MFS, 49450, 306850, 40610],
      [FilingStatus.HOH, 66200, 579600, 79010],
      [FilingStatus.QSS, 98900, 613700, 79220],
    ] as const
  ) {
    assertEquals(
      calculateIncomeTax2026({
        ...base,
        filing_status: status,
        taxable_income: zero,
        qualified_dividends: zero,
      }).line16IncomeTax,
      0,
    );
    assertEquals(
      calculateIncomeTax2026({
        ...base,
        filing_status: status,
        taxable_income: fifteen + 10000,
        qualified_dividends: fifteen + 10000,
      }).line16IncomeTax,
      taxAbove,
    );
  }
  const r = calculateIncomeTax2026({
    ...base,
    qualified_dividends: [10000.25, 10000.25],
  });
  assertEquals(r.source_input.qualified_dividends, 20001);
  assertEquals(r.method, "qualified-dividends-capital-gain-worksheet");
});
Deno.test("2026 Schedule D tax uses the status-specific 24 percent ceiling", () => {
  for (
    const [status, income, expected] of [[FilingStatus.MFJ, 500000, 106161], [
      FilingStatus.HOH,
      250000,
      51270,
    ]] as const
  ) {
    const r = calculateIncomeTax2026({
      ...base,
      filing_status: status,
      taxable_income: income,
      net_capital_gain: income,
      unrecaptured_1250_gain: income,
    });
    assertEquals(r.line16IncomeTax, expected);
    assertEquals(r.method, "schedule-d-tax-worksheet");
  }
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      taxable_income: 250000,
      net_capital_gain: 250000,
      rate_28_gain: 250000,
    }).line16IncomeTax,
    54527,
  );
  // Electing all qualified dividends into investment income restores ordinary tax.
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      qualified_dividends: 10000,
      form4952_election: 10000,
    }).line16IncomeTax,
    24614,
  );
});
Deno.test("2026 foreign tax stacking uses the same annual tables on both worksheet operands", () => {
  const ordinary = calculateIncomeTax2026({
    ...base,
    taxable_income: 50000,
    foreign_earned_income_exclusion: 100000,
    foreign_exclusion_disallowed_deductions: 0,
  });
  assertEquals([ordinary.line16IncomeTax, ordinary.method], [
    11886,
    "foreign-earned-income-tax-worksheet",
  ]);
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      taxable_income: 50000,
      qualified_dividends: 80000,
      foreign_earned_income_exclusion: 100000,
      foreign_exclusion_disallowed_deductions: 0,
    }).line16IncomeTax,
    7500,
  );
  assertEquals(
    calculateIncomeTax2026({
      ...base,
      taxable_income: 0,
      foreign_earned_income_exclusion: 100000,
      foreign_exclusion_disallowed_deductions: 0,
    }).line16IncomeTax,
    0,
  );
  assertThrows(
    () =>
      calculateIncomeTax2026({
        ...base,
        foreign_earned_income_exclusion: 100000,
      }),
    Error,
    "disallowed deductions",
  );
});
Deno.test("2026 income tax rejects unsupported specialist results and inconsistent elections", () => {
  assertThrows(
    () => calculateIncomeTax2026({ ...base, form4952_election: 1 }),
    Error,
    "exceeds",
  );
  assertThrows(
    () => calculateIncomeTax2026({ ...base, unrecaptured_1250_gain: 1 }),
    Error,
    "net capital gain",
  );
  for (
    const field of [
      "form8615_source",
      "form8814_tax",
      "form4972_tax",
      "form8621_tax",
      "schedule_j_calculated_tax",
      "form8978_tax",
    ]
  ) {
    assertThrows(() => calculateIncomeTax2026({ ...base, [field]: 100 }));
  }
  assertThrows(() => calculateIncomeTax2026({ ...base, taxable_income: NaN }));
  assertThrows(() =>
    income_tax_2026.compute({ taxYear: 2025, formType: "f1040" }, base)
  );
});
Deno.test("2026 income tax forwards calculated tax and preference facts to downstream owners", () => {
  const out = income_tax_2026.compute({ taxYear: 2026, formType: "f1040" }, {
    ...base,
    form6251_line1b: 139401,
    form6251_line2a: 16100,
  }).outputs;
  assertEquals(
    out.find((o) => o.nodeType === "f1040")!.fields.line16_income_tax,
    24614,
  );
  assertEquals(
    out.find((o) => o.nodeType === "form6251")!.fields.regular_tax_income,
    139401,
  );
  assertEquals(
    out.find((o) => o.nodeType === "form6251")!.fields.line2a_taxes_paid,
    16100,
  );
  assertEquals(
    out.find((o) => o.nodeType === "f8812")!.fields.auto_income_tax_liability,
    24614,
  );
});

Deno.test("2026 public sources cannot inject a calculated line 16 or tax worksheet", () => {
  const schema = buildStartNode(inputNodes).inputSchema;
  assertThrows(() => schema.parse({ f1040: { line16_income_tax: 1 } }));
  assertThrows(() => schema.parse({ income_tax_calculation: base }));
});
