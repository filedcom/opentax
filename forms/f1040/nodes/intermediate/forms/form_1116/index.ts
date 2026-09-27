import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

export enum IncomeCategory {
  Passive = "passive",
  General = "general",
  Section951A = "section_951a",
  Branch = "branch",
  Treaty = "treaty",
  Section901j = "section_901j",
}

export enum ForeignTaxKind {
  Interest = "interest",
  Dividends = "dividends",
  RentsRoyalties = "rents_royalties",
  Other = "other",
}

export enum ForeignTaxCreditMethod {
  Paid = "paid",
  Accrued = "accrued",
}

export const foreignTaxItemSchema = z.object({
  foreign_tax_paid: z.number().nonnegative(),
  income_category: z.nativeEnum(IncomeCategory),
  foreign_gross_income: z.number().nonnegative(),
  directly_allocable_deductions: z.number().nonnegative().optional(),
  direct_expense_explanation: z.string().trim().min(1).max(9000).optional(),
  apportioned_deductions: z.number().nonnegative().optional(),
  excluded_income: z.number().nonnegative().optional(),
  irs_country_code: z.string().length(2).optional(),
  tax_paid_or_accrued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tax_kind: z.nativeEnum(ForeignTaxKind).optional(),
  tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod).optional(),
  tax_reported_on_1099: z.boolean().optional(),
});

export const inputSchema = z.object({
  foreign_tax_items: z.array(foreignTaxItemSchema).optional(),
  worldwide_taxable_income: z.number().nonnegative().optional(),
  worldwide_gross_income: z.number().nonnegative().optional(),
  general_deductions: z.number().nonnegative().optional(),
  standard_or_itemized_deduction: z.number().nonnegative().optional(),
  other_deductions: z.number().nonnegative().optional(),
  // Separate expenses on Form 1116 Part I line 3b, required by the 2025
  // instructions and retained for its linked MeF supporting statement.
  other_deductions_explanation: z.string().trim().min(1).max(9000).optional(),
  us_tax_before_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
});

type ForeignTaxItem = z.infer<typeof foreignTaxItemSchema>;
type Form1116Input = z.infer<typeof inputSchema>;

export const categorySummarySchema = z.object({
  category: z.nativeEnum(IncomeCategory),
  items: z.array(foreignTaxItemSchema).min(1),
  foreignTaxPaid: z.number().nonnegative(),
  foreignGrossIncome: z.number().nonnegative(),
  includedForeignIncome: z.number(),
  directlyAllocableDeductions: z.number().nonnegative(),
  explicitlyApportionedDeductions: z.number().nonnegative(),
  automaticallyApportionedDeductions: z.number().nonnegative(),
  foreignTaxableIncome: z.number(),
  allowedCredit: z.number().nonnegative(),
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;

function categoryTotals(
  items: ForeignTaxItem[],
  worldwideGrossIncome: number,
  generalDeductions: number,
): Omit<CategorySummary, "allowedCredit">[] {
  const categories = [...new Set(items.map((item) => item.income_category))];
  return categories.map((category) => {
    const matching = items.filter((item) => item.income_category === category);
    const foreignTaxPaid = matching.reduce(
      (sum, item) => sum + item.foreign_tax_paid,
      0,
    );
    const foreignGrossIncome = matching.reduce(
      (sum, item) => sum + item.foreign_gross_income,
      0,
    );
    for (const item of matching) {
      if ((item.excluded_income ?? 0) > item.foreign_gross_income) {
        throw new Error("Form 1116 excluded income exceeds foreign income");
      }
    }
    const excludedIncome = matching.reduce(
      (sum, item) => sum + (item.excluded_income ?? 0),
      0,
    );
    const includedForeignIncome = foreignGrossIncome - excludedIncome;
    const directlyAllocableDeductions = matching.reduce(
      (sum, item) => sum + (item.directly_allocable_deductions ?? 0),
      0,
    );
    const explicitApportioned = matching.reduce(
      (sum, item) => sum + (item.apportioned_deductions ?? 0),
      0,
    );
    if (generalDeductions > 0 && worldwideGrossIncome <= 0) {
      throw new Error(
        "Form 1116 needs worldwide gross income to apportion deductions",
      );
    }
    const automaticApportioned = worldwideGrossIncome > 0
      ? matching.reduce(
        (sum, item) =>
          sum +
          generalDeductions *
            fraction(item.foreign_gross_income, worldwideGrossIncome),
        0,
      )
      : 0;
    const foreignTaxableIncome = includedForeignIncome -
      directlyAllocableDeductions - explicitApportioned - automaticApportioned;
    return {
      category,
      items: matching,
      foreignTaxPaid,
      foreignGrossIncome,
      includedForeignIncome,
      directlyAllocableDeductions,
      explicitlyApportionedDeductions: explicitApportioned,
      automaticallyApportionedDeductions: automaticApportioned,
      foreignTaxableIncome,
    };
  });
}

function fraction(
  foreignTaxableIncome: number,
  worldwideTaxableIncome: number,
): number {
  if (worldwideTaxableIncome <= 0) return 0;
  return Math.round(
    Math.min(1, Math.max(0, foreignTaxableIncome / worldwideTaxableIncome)) *
      100_000,
  ) / 100_000;
}

function allowedCredit(
  category: Omit<CategorySummary, "allowedCredit">,
  input: Form1116Input,
): number {
  if (
    input.us_tax_before_credits === undefined ||
    input.worldwide_taxable_income === undefined
  ) {
    return 0;
  }
  const limit = input.us_tax_before_credits *
    fraction(category.foreignTaxableIncome, input.worldwide_taxable_income);
  return Math.min(Math.round(category.foreignTaxPaid), Math.round(limit));
}

function allowedAmtCredit(
  category: Omit<CategorySummary, "allowedCredit">,
  input: Form1116Input,
): number {
  if (
    input.tentative_minimum_tax === undefined ||
    input.worldwide_taxable_income === undefined
  ) {
    return 0;
  }
  const limit = input.tentative_minimum_tax *
    fraction(category.foreignTaxableIncome, input.worldwide_taxable_income);
  return Math.min(Math.round(category.foreignTaxPaid), Math.round(limit));
}

class Form1116Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_1116";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251]);

  compute(_ctx: NodeContext, rawInput: Form1116Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const totals = categoryTotals(
      input.foreign_tax_items ?? [],
      input.worldwide_gross_income ?? 0,
      input.general_deductions ?? 0,
    );
    if (totals.length === 0) return { outputs: [] };

    const categories: CategorySummary[] = totals.map((category) => ({
      ...category,
      allowedCredit: allowedCredit(category, input),
    }));

    const summedCredit = categories.reduce(
      (sum, category) => sum + category.allowedCredit,
      0,
    );
    const credit = Math.min(summedCredit, input.us_tax_before_credits ?? 0);
    const amtCredit = categories.reduce(
      (sum, category) => sum + allowedAmtCredit(category, input),
      0,
    );
    const foreignTaxPaid = categories.reduce(
      (sum, category) => sum + category.foreignTaxPaid,
      0,
    );
    const foreignIncome = categories.reduce(
      (sum, category) => sum + category.foreignGrossIncome,
      0,
    );
    const outputs: NodeOutput[] = [];
    if (credit > 0) {
      outputs.push(output(schedule3, { line1_foreign_tax_credit: credit }));
      outputs.push(output(form6251, {
        schedule3_line1_foreign_tax_credit: credit,
      }));
    }
    if (amtCredit > 0) outputs.push(output(form6251, { amtftc: amtCredit }));
    outputs.push({
      nodeType: this.nodeType,
      fields: {
        foreign_tax_paid: foreignTaxPaid,
        foreign_income: foreignIncome,
        total_income: input.worldwide_taxable_income ?? 0,
        worldwide_gross_income: input.worldwide_gross_income,
        general_deductions: input.general_deductions,
        standard_or_itemized_deduction: input.standard_or_itemized_deduction,
        other_deductions: input.other_deductions,
        other_deductions_explanation: input.other_deductions_explanation,
        us_tax_before_credits: input.us_tax_before_credits,
        category_summaries: categories,
      },
    });
    return { outputs };
  }
}

export const form1116 = new Form1116Node();
export { form1116 as form_1116 };
