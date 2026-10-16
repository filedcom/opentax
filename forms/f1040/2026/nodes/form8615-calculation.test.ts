import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { incomeWorksheet2026 } from "../../nodes/config/2026-tax-worksheets.ts";
import type { F8615Input } from "../../nodes/inputs/taxes/investments/f8615/schema.ts";
import {
  calculateForm8615,
  type Form8615CalculationContext,
  line5PreferentialIncome,
} from "../../nodes/intermediate/forms/taxes/investments/form8615/calculation.ts";

// Resolved operands for the shared calculator, not a public 2026 source claim.
// Eligibility, parent selection and source-derived line 1 remain separate work.
const source: F8615Input = {
  eligibility_confirmed: true,
  parent_name: "Jane Parent",
  parent_name_control: "PARE",
  parent_ssn: "987-65-4321",
  parent_filing_status: FilingStatus.MFJ,
  parent_taxable_income: 80000,
  parent_income_tax: 9107,
  parent_tax_method: "ordinary",
  child_unearned_income: 5000,
  parent_qualified_dividends: 0,
  parent_net_capital_gain: 0,
  other_children_line5: [],
  other_children_qualified_dividends_line5: [],
  other_children_net_capital_gain_line5: [],
  other_children_schedule_d_tax_worksheet_used: [],
  other_children_form2555_used: [],
};
const context: Form8615CalculationContext = {
  childTaxableIncome: 3650,
  childFilingStatus: FilingStatus.Single,
  childRegularTax: 368,
  takingStandardDeduction: true,
  childHasPreferentialIncome: false,
  childQualifiedDividends: 0,
  childNetCapitalGain: 0,
  childForeignEarnedIncomeExclusion: 0,
  brackets: incomeWorksheet2026,
};

Deno.test("2026 Form 8615 uses the selected year's parent and child Tax Tables", () => {
  const result = calculateForm8615(source, context);
  assertEquals(result.fields, {
    parent_name: "Jane Parent",
    parent_name_control: "PARE",
    parent_ssn: "987654321",
    parent_filing_status: FilingStatus.MFJ,
    line1_child_unearned_income: 5000,
    line2_kiddie_deduction: 2700,
    line3_adjusted_unearned_income: 2300,
    line4_child_taxable_income: 3650,
    line5_child_net_unearned_income: 2300,
    line6_parent_taxable_income: 80000,
    line8_family_income: 82300,
    line9_family_tax: 9383,
    line10_parent_tax: 9107,
    line11_children_tax: 276,
    line13_allocable_tax: 276,
    line14_child_net_income: 1350,
    line15_child_net_income_tax: 136,
    line16_combined_child_tax: 412,
    line17_child_regular_tax: 368,
    line18_child_tax: 412,
  });
  assertEquals(result.line18Tax, 412);
  const singleParent = calculateForm8615({
    ...source,
    parent_filing_status: FilingStatus.Single,
    parent_income_tax: 12318,
  }, context);
  assertEquals(singleParent.fields.line9_family_tax, 12824);
  assertEquals(singleParent.line18Tax, 642);
});

Deno.test("2026 Form 8615 lines 9, 15 and 17 match every independently extracted Tax Table cell", async () => {
  const csv = await Deno.readTextFile(
    new URL(
      "../../../../docs/ty2026/evidence/tax-table-2026.csv",
      import.meta.url,
    ),
  );
  const rows = csv.trim().split("\n").slice(1).map((r) =>
    r.split(",").map(Number)
  );
  assertEquals(rows.length, 2062);
  // Drive the actual Form 8615 branches with line 5 = $1. The expected cells
  // come from the IRS PDF, not a second invocation of the tax implementation.
  for (const [low, high, single, joint, separate, hoh] of rows) {
    for (
      const [status, expected] of [
        [FilingStatus.Single, single],
        [FilingStatus.MFJ, joint],
        [FilingStatus.MFS, separate],
        [FilingStatus.HOH, hoh],
        [FilingStatus.QSS, joint],
      ] as const
    ) {
      for (const income of [Math.max(1, low), high - 1]) {
        const operands = {
          ...source,
          child_unearned_income: 2701,
          parent_taxable_income: income - 1,
          parent_filing_status: status,
          parent_income_tax: 0,
        };
        const child = {
          ...context,
          childTaxableIncome: income,
          childFilingStatus: status,
        };
        const result = calculateForm8615(operands, child);
        assertEquals(
          result.fields.line9_family_tax,
          expected,
          `${status}: family ${income}`,
        );
        assertEquals(
          result.fields.line17_child_regular_tax,
          expected,
          `${status}: child ${income}`,
        );
        const remaining = calculateForm8615(operands, {
          ...child,
          childTaxableIncome: income + 1,
        });
        assertEquals(
          remaining.fields.line15_child_net_income_tax,
          expected,
          `${status}: remaining ${income}`,
        );
      }
    }
  }
});

Deno.test("2026 Form 8615 switches all tax lines to the year's Tax Computation Worksheet", () => {
  // Independently transcribed draft Pub. 1040 worksheet sections (b)/(d).
  for (
    const [status, sections] of [
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
    ] as const
  ) {
    for (const [low, high, rate, subtract] of sections) {
      for (const income of [low, high]) {
        const operands = {
          ...source,
          child_unearned_income: 2701,
          parent_filing_status: status,
          parent_taxable_income: income - 1,
          parent_income_tax: 0,
        };
        const child = {
          ...context,
          childTaxableIncome: income,
          childFilingStatus: status,
        };
        const result = calculateForm8615(operands, child);
        const expected = Math.round(income * rate - subtract);
        assertEquals(result.fields.line9_family_tax, expected);
        assertEquals(result.fields.line17_child_regular_tax, expected);
        assertEquals(
          calculateForm8615(operands, {
            ...child,
            childTaxableIncome: income + 1,
          }).fields.line15_child_net_income_tax,
          expected,
        );
      }
    }
  }
});

Deno.test("2026 Form 8615 uses annual zero and twenty-percent gain thresholds for every parent status", () => {
  for (
    const [status, zero, twenty] of [
      [FilingStatus.Single, 49450, 545500],
      [FilingStatus.MFJ, 98900, 613700],
      [FilingStatus.MFS, 49450, 306850],
      [FilingStatus.HOH, 66200, 579600],
      [FilingStatus.QSS, 98900, 613700],
    ] as const
  ) {
    for (
      const [income, parentTax, familyTax] of [
        [zero - 100, 0, 330],
        [
          twenty,
          Math.round((twenty - zero) * .15),
          Math.round((twenty - zero) * .15 + 2300 * .2),
        ],
      ]
    ) {
      const result = calculateForm8615({
        ...source,
        parent_filing_status: status,
        parent_taxable_income: income,
        parent_income_tax: parentTax,
        parent_tax_method: "qualified_dividend",
        parent_qualified_dividends: income,
      }, {
        ...context,
        childHasPreferentialIncome: true,
        childQualifiedDividends: 5000,
      });
      assertEquals(result.fields.line9_family_tax, familyTax);
      assertEquals(result.fields.line15_child_net_income_tax, 0);
      assertEquals(result.fields.line17_child_regular_tax, 0);
      assertEquals(result.line18Tax, familyTax - parentTax);
      assertEquals(result.fields.line9_preferential_tax_used, true);
      assertEquals(result.fields.line10_preferential_tax_used, true);
      assertEquals(result.fields.line15_preferential_tax_used, true);
      assertEquals(result.fields.line17_preferential_tax_used, true);
    }
  }
});

Deno.test("2026 Form 8615 preserves the three Line 5 deduction allocation worksheets", () => {
  const child = {
    ...context,
    childHasPreferentialIncome: true,
    childQualifiedDividends: 1000,
    childNetCapitalGain: 500,
  };
  assertEquals(line5PreferentialIncome(source, child, 5000, 2700, 2300, 2300), {
    qualifiedDividends: 460,
    netCapitalGain: 230,
  });
  assertEquals(
    line5PreferentialIncome(
      {
        ...source,
        itemized_deductions_directly_connected: 2000,
        itemized_deductions_directly_connected_to_preferential_income: 900,
      },
      { ...child, takingStandardDeduction: false },
      5000,
      3350,
      1650,
      1650,
    ),
    { qualifiedDividends: 130, netCapitalGain: 65 },
  );
  assertEquals(
    line5PreferentialIncome(
      source,
      {
        ...child,
        childNetCapitalGain: 0,
        childAdjustedGrossIncome: 5000,
        childDeduction: 3500,
      },
      5000,
      2700,
      2300,
      1500,
    ),
    { qualifiedDividends: 300, netCapitalGain: 0 },
  );
  const result = calculateForm8615(source, {
    ...context,
    childHasPreferentialIncome: true,
    childQualifiedDividends: 1000,
  });
  // Line 5 retains $460; the $540 remainder reduces line 14 ordinary income.
  assertEquals(result.fields.line9_family_tax, 9323);
  assertEquals(result.fields.line15_child_net_income_tax, 81);
  assertEquals(result.fields.line17_child_regular_tax, 266);
  assertEquals(result.line18Tax, 297);
});

Deno.test("2026 Form 8615 uses child-year rates inside both child preferential worksheets", () => {
  const result = calculateForm8615(
    { ...source, child_unearned_income: 100000 },
    {
      ...context,
      childTaxableIncome: 200000,
      childRegularTax: 35198,
      childHasPreferentialIncome: true,
      childQualifiedDividends: 60000,
    },
  );
  // Worksheet #1 puts $58,380 of dividends on line 5 and $1,620 on line 14.
  // Line 15: ($101,080 × 22% − $5,288) + ($1,620 × 15%) = $17,193.
  // Line 17: ($140,000 × 24% − $7,402) + ($60,000 × 15%) = $35,198.
  assertEquals(result.fields.line9_family_tax, 24343);
  assertEquals(result.fields.line15_child_net_income_tax, 17193);
  assertEquals(result.fields.line17_child_regular_tax, 35198);
  assertEquals(result.line18Tax, 35198);
});

Deno.test("2026 Form 8615 allocates siblings' tax with the printed three-place ratio", () => {
  const result = calculateForm8615({
    ...source,
    parent_filing_status: FilingStatus.Single,
    parent_taxable_income: 100000,
    parent_income_tax: 16712,
    other_children_line5: [700, 1700],
    other_children_qualified_dividends_line5: [0, 0],
    other_children_net_capital_gain_line5: [0, 0],
    other_children_schedule_d_tax_worksheet_used: [false, false],
    other_children_form2555_used: [false, false],
  }, context);
  assertEquals(result.fields.line9_family_tax, 17746);
  assertEquals(result.fields.line12a_children_income, 4700);
  assertEquals(result.fields.line12b_allocation_ratio, .489);
  assertEquals(result.fields.line13_allocable_tax, 506);
  assertEquals(result.line18Tax, 642);
});

Deno.test("2026 Form 8615 cannot reduce the child's independently computed regular tax", () => {
  const result = calculateForm8615({
    ...source,
    parent_taxable_income: 0,
    parent_income_tax: 0,
  }, {
    ...context,
    childTaxableIncome: 220000,
    childRegularTax: 46856,
  });
  assertEquals(result.fields.line16_combined_child_tax, 46351);
  assertEquals(result.fields.line17_child_regular_tax, 46856);
  assertEquals(result.line18Tax, 46856);
});

Deno.test("2026 Form 8615 retains stop forms and does not evaluate unused parent worksheets", () => {
  const stopped = calculateForm8615({
    ...source,
    parent_tax_method: "schedule_j",
    itemized_deductions_directly_connected: 4000,
  }, {
    ...context,
    takingStandardDeduction: false,
  });
  assertEquals(stopped.fields.line3_adjusted_unearned_income, -350);
  assertEquals(stopped.fields.line4_child_taxable_income, undefined);
  assertEquals(stopped.line18Tax, 368);
  const zero = calculateForm8615({
    ...source,
    parent_tax_method: "foreign_earned_income",
  }, { ...context, childTaxableIncome: 0, childRegularTax: 0 });
  assertEquals(zero.fields.line5_child_net_unearned_income, 0);
  assertEquals(zero.fields.line6_parent_taxable_income, undefined);
  assertEquals(zero.line18Tax, 0);
});

Deno.test("2026 Form 8615 continues to reject unimplemented family tax worksheets", () => {
  for (
    const method of [
      "schedule_d",
      "schedule_j",
      "foreign_earned_income",
    ] as const
  ) {
    assertThrows(
      () =>
        calculateForm8615({ ...source, parent_tax_method: method }, context),
      Error,
      "corresponding line 9 worksheet",
    );
  }
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childNeedsScheduleDWorksheet: true,
      }),
    Error,
    "Schedule D line 9 and 15 worksheets",
  );
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childForeignEarnedIncomeExclusion: 1,
      }),
    Error,
    "foreign earned income tax worksheet",
  );
  assertThrows(
    () =>
      calculateForm8615({
        ...source,
        other_children_line5: [1000],
        other_children_qualified_dividends_line5: [0],
        other_children_net_capital_gain_line5: [0],
        other_children_schedule_d_tax_worksheet_used: [true],
        other_children_form2555_used: [false],
      }, context),
    Error,
    "other child Schedule D or Form 2555",
  );
});
