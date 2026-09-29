import { FilingStatus } from "../../../types.ts";
import type { Bracket } from "../../../config/2025.ts";
import type { F8615Input } from "../../../inputs/f8615/schema.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
} from "../../worksheets/tax_table_2025.ts";

export interface Form8615CalculationContext {
  childTaxableIncome: number;
  childFilingStatus: FilingStatus;
  childRegularTax: number;
  takingStandardDeduction: boolean;
  childHasPreferentialIncome: boolean;
  childQualifiedDividends?: number;
  childNetCapitalGain?: number;
  childNeedsScheduleDWorksheet?: boolean;
  childAdjustedGrossIncome?: number;
  childDeduction?: number;
  childForeignEarnedIncomeExclusion: number;
  brackets: {
    bracketsMfj: ReadonlyArray<Bracket>;
    bracketsSingle: ReadonlyArray<Bracket>;
    bracketsHoh: ReadonlyArray<Bracket>;
    bracketsMfs: ReadonlyArray<Bracket>;
    qdcgtZeroCeiling: Record<FilingStatus, number>;
    qdcgtTwentyFloor: Record<FilingStatus, number>;
  };
}

export interface Line5PreferentialIncome {
  qualifiedDividends: number;
  netCapitalGain: number;
}

function roundedRatio(numerator: number, denominator: number): number {
  return Math.min(1, Math.round(numerator / denominator * 1_000) / 1_000);
}

// The three TY2025 Form 8615 Line 5 Worksheets allocate the child's
// qualified dividends and net capital gain between lines 5 and 14.
export function line5PreferentialIncome(
  source: F8615Input,
  context: Form8615CalculationContext,
  line1: number,
  line2: number,
  line3: number,
  line5: number,
): Line5PreferentialIncome {
  const qualifiedDividends = context.childQualifiedDividends;
  const netCapitalGain = context.childNetCapitalGain;
  if (qualifiedDividends === undefined || netCapitalGain === undefined) {
    throw new Error(
      "Form 8615 needs the child's qualified dividends and net capital gain",
    );
  }
  if (
    qualifiedDividends < 0 || netCapitalGain < 0
  ) {
    throw new Error("Form 8615 child preferential income cannot be negative");
  }
  if (qualifiedDividends + netCapitalGain === 0) {
    return { qualifiedDividends: 0, netCapitalGain: 0 };
  }

  let allocatedQualified: number;
  let allocatedGain: number;
  if (line5 < line3) {
    // Line 5 Worksheet #3: line 5 is capped by taxable income.
    const connected = context.takingStandardDeduction
      ? 0
      : source.itemized_deductions_directly_connected_to_preferential_income;
    const deduction = context.childDeduction;
    const agi = context.childAdjustedGrossIncome;
    if (
      connected === undefined || deduction === undefined || agi === undefined ||
      agi <= 0 || connected > deduction
    ) {
      throw new Error(
        "Form 8615 Line 5 Worksheet #3 needs child AGI and deduction allocation",
      );
    }
    const shareQualified = roundedRatio(
      qualifiedDividends,
      qualifiedDividends + netCapitalGain,
    );
    const connectedQualified = Math.round(connected * shareQualified);
    const connectedGain = connected - connectedQualified;
    const remainingQualified = Math.max(
      0,
      qualifiedDividends - connectedQualified,
    );
    const remainingGain = Math.max(0, netCapitalGain - connectedGain);
    const allocatedOtherDeduction = Math.round(
      (deduction - connected) *
        roundedRatio(qualifiedDividends + netCapitalGain, agi),
    );
    const otherQualified = Math.round(allocatedOtherDeduction * shareQualified);
    const otherGain = allocatedOtherDeduction - otherQualified;
    allocatedQualified = Math.max(
      0,
      Math.min(line5, remainingQualified - otherQualified),
    );
    allocatedGain = Math.max(
      0,
      Math.min(
        line5 - allocatedQualified,
        remainingGain - otherGain,
      ),
    );
  } else if (line2 > 2_700) {
    // Line 5 Worksheet #2: itemized line 2 includes directly connected costs.
    const connected =
      source.itemized_deductions_directly_connected_to_preferential_income;
    if (
      connected === undefined ||
      connected > (source.itemized_deductions_directly_connected ?? 0)
    ) {
      throw new Error(
        "Form 8615 Line 5 Worksheet #2 needs directly connected gain deductions",
      );
    }
    const shareQualified = roundedRatio(
      qualifiedDividends,
      qualifiedDividends + netCapitalGain,
    );
    const connectedQualified = Math.round(connected * shareQualified);
    const connectedGain = connected - connectedQualified;
    const baseQualified = Math.min(1, roundedRatio(qualifiedDividends, line1));
    const baseGain = Math.min(
      1 - baseQualified,
      roundedRatio(netCapitalGain, line1),
    );
    allocatedQualified = Math.max(
      0,
      Math.min(
        line5,
        qualifiedDividends - connectedQualified -
          Math.round(1_350 * baseQualified),
      ),
    );
    allocatedGain = Math.max(
      0,
      Math.min(
        line5 - allocatedQualified,
        netCapitalGain - connectedGain - Math.round(1_350 * baseGain),
      ),
    );
  } else {
    // Line 5 Worksheet #1: $2,700 deduction and uncapped line 5.
    allocatedQualified = Math.max(
      0,
      Math.min(
        line5,
        qualifiedDividends -
          Math.round(2_700 * roundedRatio(qualifiedDividends, line1)),
      ),
    );
    allocatedGain = Math.max(
      0,
      Math.min(
        line5 - allocatedQualified,
        netCapitalGain -
          Math.round(2_700 * roundedRatio(netCapitalGain, line1)),
      ),
    );
  }
  return {
    qualifiedDividends: allocatedQualified,
    netCapitalGain: allocatedGain,
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
  line9_preferential_tax_used?: boolean;
  line10_parent_tax?: number;
  line10_preferential_tax_used?: boolean;
  line11_children_tax?: number;
  line12a_children_income?: number;
  line12b_allocation_ratio?: number;
  line13_allocable_tax?: number;
  line14_child_net_income?: number;
  line15_child_net_income_tax?: number;
  line15_preferential_tax_used?: boolean;
  line16_combined_child_tax?: number;
  line17_child_regular_tax?: number;
  line17_preferential_tax_used?: boolean;
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
  if (
    source.parent_tax_method === "schedule_d" ||
    source.parent_tax_method === "schedule_j" ||
    source.parent_tax_method === "foreign_earned_income"
  ) {
    throw new Error(
      "Form 8615 parent Schedule D, Schedule J, or foreign-income tax needs the corresponding line 9 worksheet",
    );
  }
  if (context.childForeignEarnedIncomeExclusion > 0) {
    throw new Error(
      "Form 8615 with Form 2555 needs the foreign earned income tax worksheet",
    );
  }
  if (context.childNeedsScheduleDWorksheet) {
    throw new Error(
      "Form 8615 child 25%/28% gain or Form 4952 election needs the Schedule D line 9 and 15 worksheets",
    );
  }
  if (
    source.other_children_schedule_d_tax_worksheet_used.some(Boolean) ||
    source.other_children_form2555_used.some(Boolean)
  ) {
    throw new Error(
      "Form 8615 other child Schedule D or Form 2555 needs the corresponding line 9 worksheet",
    );
  }

  const line6 = Math.round(source.parent_taxable_income);
  const line7 = source.other_children_line5.reduce(
    (sum, value) => sum + Math.round(value),
    0,
  );
  const line8 = line5 + line6 + line7;
  const parentQualified = source.parent_qualified_dividends;
  const parentGain = source.parent_net_capital_gain;
  const siblingQualified = source.other_children_qualified_dividends_line5;
  const siblingGain = source.other_children_net_capital_gain_line5;
  if (
    parentQualified === undefined || parentGain === undefined ||
    siblingQualified === undefined || siblingGain === undefined ||
    siblingQualified.length !== source.other_children_line5.length ||
    siblingGain.length !== source.other_children_line5.length ||
    source.other_children_schedule_d_tax_worksheet_used.length !==
      source.other_children_line5.length ||
    source.other_children_form2555_used.length !==
      source.other_children_line5.length
  ) {
    throw new Error(
      "Form 8615 line 9 needs parent and other-child qualified dividend and net capital gain facts",
    );
  }
  if (
    siblingQualified.some((value, index) =>
      value + siblingGain[index]! > source.other_children_line5[index]!
    )
  ) {
    throw new Error(
      "Form 8615 other-child preferential income exceeds that child's line 5",
    );
  }
  if (
    source.parent_tax_method === "ordinary" &&
    parentQualified + parentGain > 0
  ) {
    throw new Error(
      "Form 8615 parent tax method conflicts with preferential income",
    );
  }
  if (
    source.parent_tax_method === "qualified_dividend" &&
    parentQualified + parentGain === 0
  ) {
    throw new Error(
      "Form 8615 parent qualified-dividend method needs preferential income",
    );
  }
  const childPreferential = context.childHasPreferentialIncome
    ? line5PreferentialIncome(source, context, line1, line2, line3, line5)
    : { qualifiedDividends: 0, netCapitalGain: 0 };
  const line8Qualified = childPreferential.qualifiedDividends +
    parentQualified + siblingQualified.reduce((sum, amount) => sum + amount, 0);
  const line8Gain = childPreferential.netCapitalGain + parentGain +
    siblingGain.reduce((sum, amount) => sum + amount, 0);
  const line14 = line4 - line5;
  const childQualifiedOnLine14 = Math.max(
    0,
    (context.childQualifiedDividends ?? 0) -
      childPreferential.qualifiedDividends,
  );
  const childGainOnLine14 = Math.max(
    0,
    (context.childNetCapitalGain ?? 0) - childPreferential.netCapitalGain,
  );
  const line9 = line8Qualified + line8Gain > 0
    ? qualifiedDividendTax2025(
      line8,
      line8Qualified,
      line8Gain,
      source.parent_filing_status,
    )
    : ordinaryTax2025(line8, source.parent_filing_status);
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
  const line15 = line14 > 0
    ? childQualifiedOnLine14 + childGainOnLine14 > 0
      ? qualifiedDividendTax2025(
        line14,
        childQualifiedOnLine14,
        childGainOnLine14,
        context.childFilingStatus,
      )
      : ordinaryTax2025(line14, context.childFilingStatus)
    : 0;
  const line16 = line13 + line15;
  const childQualified = context.childQualifiedDividends ?? 0;
  const childGain = context.childNetCapitalGain ?? 0;
  const line17 = childQualified + childGain > 0
    ? qualifiedDividendTax2025(
      line4,
      childQualified,
      childGain,
      context.childFilingStatus,
    )
    : ordinaryTax2025(line4, context.childFilingStatus);
  const line18 = Math.max(line16, line17);
  return {
    fields: {
      ...throughLine5,
      line6_parent_taxable_income: line6,
      ...(line7 > 0 ? { line7_other_children_income: line7 } : {}),
      line8_family_income: line8,
      line9_family_tax: line9,
      ...(line8Qualified + line8Gain > 0
        ? { line9_preferential_tax_used: true }
        : {}),
      line10_parent_tax: line10,
      ...(source.parent_tax_method === "qualified_dividend"
        ? { line10_preferential_tax_used: true }
        : {}),
      line11_children_tax: line11,
      ...(line12a !== undefined ? { line12a_children_income: line12a } : {}),
      ...(line12b !== undefined ? { line12b_allocation_ratio: line12b } : {}),
      line13_allocable_tax: line13,
      line14_child_net_income: line14,
      line15_child_net_income_tax: line15,
      ...(line14 > 0 && childQualifiedOnLine14 + childGainOnLine14 > 0
        ? { line15_preferential_tax_used: true }
        : {}),
      line16_combined_child_tax: line16,
      line17_child_regular_tax: line17,
      ...(context.childHasPreferentialIncome
        ? { line17_preferential_tax_used: true }
        : {}),
      line18_child_tax: line18,
    },
    line18Tax: line18,
  };
}
