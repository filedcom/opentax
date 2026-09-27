import { FilingStatus } from "../../../types.ts";
import type { Bracket } from "../../../config/types.ts";
import type { F8615Input } from "../../../inputs/f8615/schema.ts";
import {
  bracketsForStatus,
  taxFromBrackets,
} from "../../worksheets/tax_brackets.ts";

export interface Form8615CalculationContext {
  childTaxableIncome: number;
  childFilingStatus: FilingStatus;
  childRegularTax: number;
  takingStandardDeduction: boolean;
  childHasPreferentialIncome: boolean;
  childForeignEarnedIncomeExclusion: number;
  brackets: {
    bracketsMfj: ReadonlyArray<Bracket>;
    bracketsSingle: ReadonlyArray<Bracket>;
    bracketsHoh: ReadonlyArray<Bracket>;
    bracketsMfs: ReadonlyArray<Bracket>;
  };
}

export interface Form8615CalculatedFields {
  parent_name: string;
  parent_name_control: string;
  parent_ssn: string;
  parent_filing_status: FilingStatus;
  line1_child_unearned_income: number;
  line2_kiddie_deduction: number;
  line3_adjusted_unearned_income: number;
  line4_child_taxable_income?: number;
  line5_child_net_unearned_income?: number;
  line6_parent_taxable_income?: number;
  line7_other_children_income?: number;
  line8_family_income?: number;
  line9_family_tax?: number;
  line10_parent_tax?: number;
  line11_children_tax?: number;
  line12a_children_income?: number;
  line12b_allocation_ratio?: number;
  line13_allocable_tax?: number;
  line14_child_net_income?: number;
  line15_child_net_income_tax?: number;
  line16_combined_child_tax?: number;
  line17_child_regular_tax?: number;
  line18_child_tax?: number;
}

export interface Form8615CalculationResult {
  fields: Form8615CalculatedFields;
  line18Tax: number;
}

export function calculateForm8615(
  source: F8615Input,
  context: Form8615CalculationContext,
): Form8615CalculationResult {
  if (
    context.takingStandardDeduction &&
    (source.itemized_deductions_directly_connected ?? 0) > 0
  ) {
    throw new Error(
      "Form 8615 directly connected itemized deductions require itemizing",
    );
  }

  const line1 = Math.round(source.child_unearned_income);
  const line2 = context.takingStandardDeduction ? 2_700 : Math.max(
    2_700,
    1_350 + Math.round(source.itemized_deductions_directly_connected ?? 0),
  );
  const line3 = line1 - line2;
  const base = {
    parent_name: source.parent_name,
    parent_name_control: source.parent_name_control,
    parent_ssn: source.parent_ssn.replaceAll("-", ""),
    parent_filing_status: source.parent_filing_status,
    line1_child_unearned_income: line1,
    line2_kiddie_deduction: line2,
    line3_adjusted_unearned_income: line3,
  };
  if (line3 <= 0) {
    return { fields: base, line18Tax: Math.round(context.childRegularTax) };
  }

  const line4 = Math.round(context.childTaxableIncome);
  const line5 = Math.min(line3, line4);
  const throughLine5 = {
    ...base,
    line4_child_taxable_income: line4,
    line5_child_net_unearned_income: line5,
  };
  if (line5 === 0) {
    return {
      fields: throughLine5,
      line18Tax: Math.round(context.childRegularTax),
    };
  }

  // The 2025 form stops before the family-tax worksheets when line 5 is zero.
  // A preferential-rate or Form 2555 calculation is only needed if those
  // worksheets actually affect the child's Form 8615 tax.
  if (source.parent_tax_method !== "ordinary") {
    throw new Error(
      "Form 8615 parent preferential-rate, Schedule J, or foreign-income tax needs the corresponding line 9 worksheet",
    );
  }
  if (context.childHasPreferentialIncome) {
    throw new Error(
      "Form 8615 child preferential-rate tax needs line 5 and Part III gain worksheets",
    );
  }
  if (context.childForeignEarnedIncomeExclusion > 0) {
    throw new Error(
      "Form 8615 with Form 2555 needs the foreign earned income tax worksheet",
    );
  }

  const line6 = Math.round(source.parent_taxable_income);
  const line7 = source.other_children_line5.reduce(
    (sum, value) => sum + Math.round(value),
    0,
  );
  const line8 = line5 + line6 + line7;
  const line9 = Math.round(taxFromBrackets(
    line8,
    bracketsForStatus(source.parent_filing_status, context.brackets),
  ));
  const line10 = Math.round(source.parent_income_tax);
  if (line10 > line9) {
    throw new Error("Form 8615 parent line 10 tax exceeds family line 9 tax");
  }
  const line11 = line9 - line10;
  const line12a = line7 > 0 ? line5 + line7 : undefined;
  const line12b = line12a === undefined
    ? undefined
    : Math.round((line5 / line12a) * 1_000) / 1_000;
  const line13 = Math.round(
    line12b === undefined ? line11 : line11 * line12b,
  );
  const line14 = line4 - line5;
  const line15 = line14 > 0
    ? Math.round(taxFromBrackets(
      line14,
      bracketsForStatus(context.childFilingStatus, context.brackets),
    ))
    : 0;
  const line16 = line13 + line15;
  const line17 = Math.round(context.childRegularTax);
  const line18 = Math.max(line16, line17);
  return {
    fields: {
      ...throughLine5,
      line6_parent_taxable_income: line6,
      ...(line7 > 0 ? { line7_other_children_income: line7 } : {}),
      line8_family_income: line8,
      line9_family_tax: line9,
      line10_parent_tax: line10,
      line11_children_tax: line11,
      ...(line12a !== undefined ? { line12a_children_income: line12a } : {}),
      ...(line12b !== undefined ? { line12b_allocation_ratio: line12b } : {}),
      line13_allocable_tax: line13,
      line14_child_net_income: line14,
      line15_child_net_income_tax: line15,
      line16_combined_child_tax: line16,
      line17_child_regular_tax: line17,
      line18_child_tax: line18,
    },
    line18Tax: line18,
  };
}
