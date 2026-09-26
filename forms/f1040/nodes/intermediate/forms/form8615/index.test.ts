import { assertEquals, assertThrows } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";
import { FilingStatus } from "../../../types.ts";
import { type F8615Input } from "../../../inputs/f8615/schema.ts";
import { calculateForm8615 } from "./calculation.ts";
import { form8615 } from "./index.ts";

const source: F8615Input = {
  eligibility_confirmed: true,
  parent_name: "Jane Parent",
  parent_name_control: "PARE",
  parent_ssn: "987-65-4321",
  parent_filing_status: FilingStatus.MFJ,
  parent_taxable_income: 80_000,
  parent_income_tax: 9_123,
  parent_tax_method: "ordinary",
  child_unearned_income: 5_000,
  other_children_line5: [],
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

Deno.test("Form 8615 uses the 2025 line 2 deduction and replaces child line 16", () => {
  const result = calculateForm8615(source, context);
  assertEquals(result.fields.line1_child_unearned_income, 5_000);
  assertEquals(result.fields.line2_kiddie_deduction, 2_700);
  assertEquals(result.fields.line3_adjusted_unearned_income, 2_300);
  assertEquals(result.fields.line5_child_net_unearned_income, 2_300);
  assertEquals(result.fields.line9_family_tax, 9_399);
  assertEquals(result.fields.line13_allocable_tax, 276);
  assertEquals(result.fields.line15_child_net_income_tax, 135);
  assertEquals(result.fields.line17_child_regular_tax, 365);
  assertEquals(result.fields.line18_child_tax, 411);
  assertEquals(result.line18Tax, 411);
});

Deno.test("Form 8615 allocates parental-rate tax across other children", () => {
  const result = calculateForm8615({
    ...source,
    other_children_line5: [2_700],
  }, context);
  assertEquals(result.fields.line7_other_children_income, 2_700);
  assertEquals(result.fields.line12a_children_income, 5_000);
  assertEquals(result.fields.line12b_allocation_ratio, 0.46);
  assertEquals(result.fields.line13_allocable_tax, 276);
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
    itemized_deductions_directly_connected: 2_000,
  }, { ...context, takingStandardDeduction: false });
  assertEquals(result.fields.line2_kiddie_deduction, 3_350);
  assertEquals(result.fields.line5_child_net_unearned_income, 1_650);
});

Deno.test("Form 8615 rejects unsupported preferential-rate worksheet paths", () => {
  assertThrows(
    () =>
      calculateForm8615({
        ...source,
        parent_tax_method: "qualified_dividend",
      }, context),
    Error,
    "line 9 worksheet",
  );
  assertThrows(
    () =>
      calculateForm8615(source, {
        ...context,
        childHasPreferentialIncome: true,
      }),
    Error,
    "gain worksheets",
  );
});

Deno.test("Form 8615 filed-form node never posts tax to Schedule 2", () => {
  const fields = calculateForm8615(source, context).fields;
  const result = form8615.compute(
    { taxYear: 2025, formType: "f1040" },
    fields,
  );
  assertEquals(result.outputs, []);
});
