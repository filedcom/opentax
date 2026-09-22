import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
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

export const foreignTaxItemSchema = z.object({
  foreign_tax_paid: z.number().nonnegative(),
  income_category: z.nativeEnum(IncomeCategory),
  foreign_gross_income: z.number().nonnegative(),
  directly_allocable_deductions: z.number().nonnegative().optional(),
  apportioned_deductions: z.number().nonnegative().optional(),
  excluded_income: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  foreign_tax_items: z.array(foreignTaxItemSchema).optional(),
  worldwide_taxable_income: z.number().nonnegative().optional(),
  worldwide_gross_income: z.number().nonnegative().optional(),
  general_deductions: z.number().nonnegative().optional(),
  us_tax_before_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
});

type ForeignTaxItem = z.infer<typeof foreignTaxItemSchema>;
type Form1116Input = z.infer<typeof inputSchema>;

type CategoryTotals = {
  category: IncomeCategory;
  foreignTaxPaid: number;
  foreignGrossIncome: number;
  foreignTaxableIncome: number;
};

function categoryTotals(
  items: ForeignTaxItem[],
  worldwideGrossIncome: number,
  generalDeductions: number,
): CategoryTotals[] {
  const categories = [...new Set(items.map((item) => item.income_category))];
  return categories.map((category) => {
    const matching = items.filter((item) => item.income_category === category);
    const foreignTaxPaid = matching.reduce((sum, item) => sum + item.foreign_tax_paid, 0);
    const foreignGrossIncome = matching.reduce((sum, item) => sum + item.foreign_gross_income, 0);
    const directlyReducedIncome = matching.reduce(
      (sum, item) =>
        sum + Math.max(
          0,
          item.foreign_gross_income -
            (item.directly_allocable_deductions ?? 0) -
            (item.excluded_income ?? 0),
        ),
      0,
    );
    const explicitApportioned = matching.reduce(
      (sum, item) => sum + (item.apportioned_deductions ?? 0),
      0,
    );
    const automaticApportioned = worldwideGrossIncome > 0
      ? generalDeductions * (foreignGrossIncome / worldwideGrossIncome)
      : 0;
    const foreignTaxableIncome = Math.max(
      0,
      directlyReducedIncome - explicitApportioned - automaticApportioned,
    );
    return { category, foreignTaxPaid, foreignGrossIncome, foreignTaxableIncome };
  });
}

function fraction(foreignTaxableIncome: number, worldwideTaxableIncome: number): number {
  if (worldwideTaxableIncome <= 0) return 0;
  return Math.min(1, foreignTaxableIncome / worldwideTaxableIncome);
}

function allowedCredit(category: CategoryTotals, input: Form1116Input): number {
  if (input.us_tax_before_credits === undefined || input.worldwide_taxable_income === undefined) {
    return 0;
  }
  const limit = input.us_tax_before_credits *
    fraction(category.foreignTaxableIncome, input.worldwide_taxable_income);
  return Math.min(category.foreignTaxPaid, limit);
}

function allowedAmtCredit(category: CategoryTotals, input: Form1116Input): number {
  if (input.tentative_minimum_tax === undefined || input.worldwide_taxable_income === undefined) {
    return 0;
  }
  const limit = input.tentative_minimum_tax *
    fraction(category.foreignTaxableIncome, input.worldwide_taxable_income);
  return Math.min(category.foreignTaxPaid, limit);
}

class Form1116Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_1116";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251]);

  compute(_ctx: NodeContext, rawInput: Form1116Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const categories = categoryTotals(
      input.foreign_tax_items ?? [],
      input.worldwide_gross_income ?? 0,
      input.general_deductions ?? 0,
    );
    if (categories.length === 0) return { outputs: [] };

    const credit = categories.reduce((sum, category) => sum + allowedCredit(category, input), 0);
    const amtCredit = categories.reduce(
      (sum, category) => sum + allowedAmtCredit(category, input),
      0,
    );
    const foreignTaxPaid = categories.reduce((sum, category) => sum + category.foreignTaxPaid, 0);
    const foreignIncome = categories.reduce((sum, category) => sum + category.foreignGrossIncome, 0);
    const outputs: NodeOutput[] = [];
    if (credit > 0) outputs.push(output(schedule3, { line1_foreign_tax_credit: credit }));
    if (amtCredit > 0) outputs.push(output(form6251, { amtftc: amtCredit }));
    outputs.push({
      nodeType: this.nodeType,
      fields: {
        foreign_tax_paid: foreignTaxPaid,
        foreign_income: foreignIncome,
        total_income: input.worldwide_taxable_income ?? 0,
        category_summaries: categories,
      },
    });
    return { outputs };
  }
}

export const form1116 = new Form1116Node();
export { form1116 as form_1116 };
