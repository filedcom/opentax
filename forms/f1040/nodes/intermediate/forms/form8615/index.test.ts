import { assertEquals, assertThrows } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { FilingStatus } from "../../../types.ts";
import { type F8615Input } from "../../../inputs/f8615/schema.ts";
import { calculateForm8615, line5PreferentialIncome } from "./calculation.ts";
import { form8615 } from "./index.ts";

const source: F8615Input = {
  eligibility_confirmed: true,
  parent_name: "Jane Parent",
  parent_name_control: "PARE",
  parent_ssn: "987-65-4321",
  parent_filing_status: FilingStatus.MFJ,
  parent_taxable_income: 80_000,
  parent_income_tax: 9_126,
  parent_tax_method: "ordinary",
  child_unearned_income: 5_000,
  other_children_line5: [],
  other_children_qualified_dividends_line5: [],
  other_children_net_capital_gain_line5: [],
  other_children_schedule_d_tax_worksheet_used: [],
  other_children_form2555_used: [],
  parent_qualified_dividends: 0,
  parent_net_capital_gain: 0,
};

const context = {
  childTaxableIncome: 3_650,
  childFilingStatus: FilingStatus.Single,
  childRegularTax: 365,
  takingStandardDeduction: true,
  childHasPreferentialIncome: false,
  childForeignEarnedIncomeExclusion: 0,
  brackets: CONFIG_BY_YEAR[2025]!,
};

const highChild = {
  ...context,
  childTaxableIncome: 220_000,
  childRegularTax: 45_000,
};

Deno.test("Form 8615 applies the TY2025 Tax Table to lines 9, 15, and 17", () => {
  const result = calculateForm8615(source, context);
  assertEquals(result.fields.line9_family_tax, 9_402);
  assertEquals(result.fields.line10_parent_tax, 9_126);
  assertEquals(result.fields.line13_allocable_tax, 276);
  assertEquals(result.fields.line15_child_net_income_tax, 136);
  assertEquals(result.fields.line17_child_regular_tax, 368);
  assertEquals(result.fields.line18_child_tax, 412);
  assertEquals(result.line18Tax, 412);
});

Deno.test("Form 8615 allocates parental-rate tax across other children above the table range", () => {
  const result = calculateForm8615({
    ...source,
    parent_taxable_income: 120_000,
    parent_income_tax: 18_000,
    child_unearned_income: 120_000,
    other_children_line5: [2_700],
    other_children_qualified_dividends_line5: [0],
    other_children_net_capital_gain_line5: [0],
    other_children_schedule_d_tax_worksheet_used: [false],
    other_children_form2555_used: [false],
  }, highChild);
  assertEquals(result.fields.line7_other_children_income, 2_700);
  assertEquals(result.fields.line12a_children_income, 120_000);
  assertEquals(result.fields.line12b_allocation_ratio, 0.978);
  assertEquals((result.fields.line13_allocable_tax ?? 0) > 0, true);
});

Deno.test("Form 8615 still attaches when line 3 is zero or less", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 2_600,
  }, context);
  assertEquals(result.fields.line3_adjusted_unearned_income, -100);
  assertEquals(result.fields.line4_child_taxable_income, undefined);
  assertEquals(result.fields.line5_child_net_unearned_income, undefined);
  assertEquals("line9_family_tax" in result.fields, false);
  assertEquals(result.line18Tax, 365);
});

Deno.test("Form 8615 stop case keeps the child's regular tax without unused special worksheets", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 2_600,
    parent_tax_method: "schedule_d",
  }, {
    ...context,
    childHasPreferentialIncome: true,
    childForeignEarnedIncomeExclusion: 1_000,
  });
  assertEquals(result.fields.line5_child_net_unearned_income, undefined);
  assertEquals(result.line18Tax, 365);
});

Deno.test("Form 8615 stops after line 5 when taxable income is zero", () => {
  const result = calculateForm8615(source, {
    ...context,
    childTaxableIncome: 0,
    childRegularTax: 0,
    childHasPreferentialIncome: true,
  });
  assertEquals(result.fields.line3_adjusted_unearned_income, 2_300);
  assertEquals(result.fields.line4_child_taxable_income, 0);
  assertEquals(result.fields.line5_child_net_unearned_income, 0);
  assertEquals(result.fields.line6_parent_taxable_income, undefined);
  assertEquals(result.line18Tax, 0);
});

Deno.test("Form 8615 line 2 includes directly connected itemized deductions", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 120_000,
    itemized_deductions_directly_connected: 2_000,
  }, {
    ...context,
    childTaxableIncome: 220_000,
    childRegularTax: 45_000,
    takingStandardDeduction: false,
  });
  assertEquals(result.fields.line2_kiddie_deduction, 3_350);
  assertEquals(result.fields.line5_child_net_unearned_income, 116_650);
});

Deno.test("Form 8615 rejects unsupported preferential-rate worksheet paths", () => {
  assertThrows(
    () =>
      calculateForm8615({
        ...source,
        parent_tax_method: "qualified_dividend",
      }, context),
    Error,
    "needs preferential income",
  );
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childHasPreferentialIncome: true,
      }),
    Error,
    "child's qualified dividends",
  );
});

Deno.test("Form 8615 Line 5 Worksheet #1 allocates a child's qualified dividends", () => {
  const result = line5PreferentialIncome(
    source,
    {
      ...context,
      childHasPreferentialIncome: true,
      childQualifiedDividends: 1_000,
      childNetCapitalGain: 0,
    },
    5_000,
    2_700,
    2_300,
    2_300,
  );
  // $1,000 - $2,700 × ($1,000 / $5,000) = $460 on line 5.
  assertEquals(result, { qualifiedDividends: 460, netCapitalGain: 0 });
});

Deno.test("Form 8615 uses the Tax Table inside both preferential worksheets", () => {
  const result = calculateForm8615(source, {
    ...context,
    childHasPreferentialIncome: true,
    childQualifiedDividends: 1_000,
    childNetCapitalGain: 0,
  });
  assertEquals(result.fields.line9_family_tax, 9_342);
  assertEquals(result.fields.line15_child_net_income_tax, 81);
  assertEquals(result.fields.line17_child_regular_tax, 266);
  assertEquals(result.fields.line18_child_tax, 297);
});

Deno.test("Form 8615 Line 5 Worksheet #2 allocates connected itemized costs", () => {
  const worksheetSource = {
    ...source,
    itemized_deductions_directly_connected: 2_000,
    itemized_deductions_directly_connected_to_preferential_income: 900,
  };
  const result = line5PreferentialIncome(
    worksheetSource,
    {
      ...context,
      takingStandardDeduction: false,
      childHasPreferentialIncome: true,
      childQualifiedDividends: 1_000,
      childNetCapitalGain: 500,
    },
    5_000,
    3_350,
    1_650,
    1_650,
  );
  // Worksheet #2 leaves $130 of dividends and $65 of gain on line 5.
  assertEquals(result, { qualifiedDividends: 130, netCapitalGain: 65 });
});

Deno.test("Form 8615 Line 5 Worksheet #3 handles the taxable-income cap", () => {
  const result = line5PreferentialIncome(
    source,
    {
      ...context,
      childAdjustedGrossIncome: 5_000,
      childDeduction: 3_500,
      childHasPreferentialIncome: true,
      childQualifiedDividends: 1_000,
      childNetCapitalGain: 0,
    },
    5_000,
    2_700,
    2_300,
    1_500,
  );
  // $1,000 - $3,500 × ($1,000 / $5,000) = $300 on line 5.
  assertEquals(result, { qualifiedDividends: 300, netCapitalGain: 0 });
});

Deno.test("Form 8615 uses parent and sibling preferential income on family line 9", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 120_000,
    parent_taxable_income: 0,
    parent_income_tax: 0,
    other_children_line5: [1_000],
    other_children_qualified_dividends_line5: [1_000],
    other_children_net_capital_gain_line5: [0],
    other_children_schedule_d_tax_worksheet_used: [false],
    other_children_form2555_used: [false],
  }, highChild);
  assertEquals(result.fields.line8_family_income, 118_300);
  assertEquals(result.fields.line9_preferential_tax_used, true);
});

Deno.test("Form 8615 uses the parent's qualified dividends on family line 9", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 120_000,
    parent_taxable_income: 20_000,
    parent_income_tax: 1_000,
    parent_tax_method: "qualified_dividend",
    parent_qualified_dividends: 10_000,
  }, highChild);
  assertEquals(result.fields.line8_family_income, 137_300);
  assertEquals(result.fields.line9_preferential_tax_used, true);
  assertEquals(result.fields.line10_preferential_tax_used, true);
});

Deno.test("Form 8615 keeps the parent's full dividends even above taxable income", () => {
  const result = calculateForm8615({
    ...source,
    child_unearned_income: 120_000,
    parent_taxable_income: 20_000,
    parent_income_tax: 0,
    parent_tax_method: "qualified_dividend",
    parent_qualified_dividends: 30_000,
  }, highChild);
  assertEquals(result.fields.line9_preferential_tax_used, true);
  assertEquals((result.fields.line9_family_tax ?? 0) > 0, true);
});

Deno.test("Form 8615 selects the Schedule D stop for child special-rate gain", () => {
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childHasPreferentialIncome: true,
        childQualifiedDividends: 0,
        childNetCapitalGain: 1_000,
        childNeedsScheduleDWorksheet: true,
      }),
    Error,
    "Schedule D line 9 and 15 worksheets",
  );
});

Deno.test("Form 8615 rejects incomplete preferential allocations", () => {
  assertThrows(
    () =>
      calculateForm8615({
        ...source,
        other_children_line5: [1_000],
      }, context),
    Error,
    "other-child qualified dividend and net capital gain facts",
  );
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childHasPreferentialIncome: true,
        childQualifiedDividends: 1_000,
        childNetCapitalGain: 0,
        childTaxableIncome: 1_500,
      }),
    Error,
    "Worksheet #3 needs child AGI",
  );
});

Deno.test("Form 8615 filed-form node never posts tax to Schedule 2", () => {
  const fields = calculateForm8615({
    ...source,
    child_unearned_income: 120_000,
  }, highChild).fields;
  const result = form8615.compute(
    { taxYear: 2025, formType: "f1040" },
    fields,
  );
  assertEquals(result.outputs, []);
});
