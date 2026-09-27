import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { ordinaryTax2025 } from "../../worksheets/tax_table_2025.ts";

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

const vehicleInterestAssetSchema = z.object({
  asset_id: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  beginning_tax_book_value: z.number().finite().nonnegative(),
  ending_tax_book_value: z.number().finite().nonnegative(),
  income_source: z.enum(["us", "foreign"]),
  income_category: z.nativeEnum(IncomeCategory).optional(),
  irs_country_code: z.string().length(2).optional(),
});

const vehicleInterestAssetMethodSchema = z.object({
  all_assets_included_verified: z.literal(true),
  assets: z.array(vehicleInterestAssetSchema).min(1),
});

export const inputSchema = z.object({
  foreign_tax_items: z.array(foreignTaxItemSchema).optional(),
  // Signed Form 1040 lines 11b minus 14, before the line 15 zero floor.
  worldwide_taxable_income: z.number().optional(),
  enhanced_senior_deduction: z.number().nonnegative().optional(),
  qualified_vehicle_loan_interest_deduction: z.number().nonnegative()
    .optional(),
  vehicle_interest_asset_method: vehicleInterestAssetMethodSchema.optional(),
  worldwide_gross_income: z.number().nonnegative().optional(),
  general_deductions: z.number().nonnegative().optional(),
  standard_or_itemized_deduction: z.number().nonnegative().optional(),
  other_deductions: z.number().nonnegative().optional(),
  // Separate expenses on Form 1116 Part I line 3b, required by the 2025
  // instructions and retained for its linked MeF supporting statement.
  other_deductions_explanation: z.string().trim().min(1).max(9000).optional(),
  us_tax_before_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
  known_foreign_qualified_dividends: z.number().nonnegative().optional(),
  // Deposited by the regular-tax worksheet, not entered as a Form 1116 answer.
  regular_tax_preference_facts: z.object({
    taxable_income: z.number().nonnegative(),
    qualified_dividends: z.number().nonnegative(),
    net_capital_gain: z.number().nonnegative(),
    filing_status: z.nativeEnum(FilingStatus),
    special_rate_gain: z.number().nonnegative(),
    form4952_election: z.number().nonnegative(),
    foreign_earned_income_exclusion: z.number().nonnegative(),
    form8615_applies: z.boolean(),
    regular_tax_before_additional_items: z.number().nonnegative(),
  }).strict().optional(),
  foreign_preferential_income_review: z.object({
    all_foreign_sources_reviewed: z.literal(true),
    foreign_qualified_dividends: z.literal(0),
    foreign_capital_gains_or_losses_present: z.literal(false),
    source_document_references: z.array(z.string().trim().min(1)).min(1),
    no_amt_liability_verified: z.literal(true),
  }).strict().optional(),
});

type ForeignTaxItem = z.infer<typeof foreignTaxItemSchema>;
type Form1116Input = z.infer<typeof inputSchema>;

/** 2025 i1116 Worksheet for Line 18, QDCGT branch, with zero foreign preference. */
export function adjustedQualifiedDividendLine18(
  signedWorldwideIncome: number,
  facts: NonNullable<Form1116Input["regular_tax_preference_facts"]>,
): number {
  const line1 = signedWorldwideIncome;
  const taxable = Math.round(facts.taxable_income);
  const qualifiedDividends = Math.round(facts.qualified_dividends);
  const netCapitalGain = Math.round(facts.net_capital_gain);
  const cfg = CONFIG_BY_YEAR[2025];
  const line4 = qualifiedDividends + netCapitalGain;
  const qdcgtLine5 = Math.max(0, taxable - line4);
  const qdcgtLine7 = Math.min(
    taxable,
    cfg.qdcgtZeroCeiling[facts.filing_status],
  );
  const qdcgtLine8 = Math.min(qdcgtLine5, qdcgtLine7);
  const qdcgtLine9 = qdcgtLine7 - qdcgtLine8;
  const qdcgtLine10 = Math.min(taxable, line4);
  const qdcgtLine12 = Math.max(0, qdcgtLine10 - qdcgtLine9);
  const qdcgtLine14 = Math.min(
    taxable,
    cfg.qdcgtTwentyFloor[facts.filing_status],
  );
  const qdcgtLine16 = Math.max(0, qdcgtLine14 - (qdcgtLine5 + qdcgtLine9));
  const qdcgtLine17 = Math.min(qdcgtLine12, qdcgtLine16);
  const qdcgtLine20 = Math.max(0, qdcgtLine10 - (qdcgtLine9 + qdcgtLine17));
  const preferentialTax = Math.round(
    qdcgtLine17 * 0.15 + qdcgtLine20 * 0.20 +
      ordinaryTax2025(qdcgtLine5, facts.filing_status),
  );
  const ordinaryTax = ordinaryTax2025(taxable, facts.filing_status);
  if (qdcgtLine5 <= 0 || preferentialTax >= ordinaryTax) {
    return Math.max(0, line1);
  }
  if (facts.regular_tax_before_additional_items !== preferentialTax) {
    throw new Error(
      "Form 1116 preferential worksheet does not match the sourced regular-tax calculation",
    );
  }
  // Worksheet lines 2-5 are skipped for the QDCGT route. Lines 6/8/10
  // come from QDCGT lines 20/17/9. With no foreign preferential income,
  // foreign-category line 17 requires no rate-differential adjustment.
  const worksheetLine7 = Math.round(qdcgtLine20 * 0.4595);
  const worksheetLine9 = Math.round(qdcgtLine17 * 0.5946);
  const worksheetLine11 = worksheetLine7 + worksheetLine9 + qdcgtLine9;
  return Math.max(0, Math.round(line1 - worksheetLine11));
}

export const categorySummarySchema = z.object({
  category: z.nativeEnum(IncomeCategory),
  items: z.array(foreignTaxItemSchema).min(1),
  foreignTaxPaid: z.number().nonnegative(),
  foreignGrossIncome: z.number().nonnegative(),
  includedForeignIncome: z.number(),
  directlyAllocableDeductions: z.number().nonnegative(),
  explicitlyApportionedDeductions: z.number().nonnegative(),
  automaticallyApportionedDeductions: z.number().nonnegative(),
  vehicleInterestByCountry: z.array(z.object({
    irsCountryCode: z.string().length(2),
    amount: z.number().nonnegative(),
  })).optional(),
  foreignTaxableIncome: z.number(),
  allowedCredit: z.number().nonnegative(),
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;

function categoryTotals(
  items: ForeignTaxItem[],
  worldwideGrossIncome: number,
  generalDeductions: number,
  vehicleInterestAllocations: Map<string, number>,
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
    const vehicleInterestByCountry = [...vehicleInterestAllocations]
      .filter(([key]) => key.startsWith(`${category}|`))
      .map(([key, amount]) => ({
        irsCountryCode: key.split("|")[1],
        amount,
      }));
    const vehicleInterestDeduction = vehicleInterestByCountry.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const foreignTaxableIncome = includedForeignIncome -
      directlyAllocableDeductions - explicitApportioned - automaticApportioned -
      vehicleInterestDeduction;
    return {
      category,
      items: matching,
      foreignTaxPaid,
      foreignGrossIncome,
      includedForeignIncome,
      directlyAllocableDeductions,
      explicitlyApportionedDeductions: explicitApportioned,
      automaticallyApportionedDeductions: automaticApportioned,
      vehicleInterestByCountry,
      foreignTaxableIncome,
    };
  });
}

function allocateVehicleInterest(
  input: Form1116Input,
): Map<string, number> {
  const interest = input.qualified_vehicle_loan_interest_deduction ?? 0;
  if (interest === 0) return new Map();
  const source = input.vehicle_interest_asset_method;
  if (!source) {
    throw new Error(
      "Form 1116 vehicle-loan interest needs a complete documented asset-method inventory for line 4b",
    );
  }
  const ids = new Set<string>();
  const eligibleCountries = new Set((input.foreign_tax_items ?? []).map(
    (item) => `${item.income_category}|${item.irs_country_code ?? ""}`,
  ));
  const allocations = new Map<string, number>();
  let worldwideAssetValue = 0;
  for (const asset of source.assets) {
    if (ids.has(asset.asset_id)) {
      throw new Error(
        "Form 1116 vehicle-interest asset inventory has a duplicate asset",
      );
    }
    ids.add(asset.asset_id);
    const averageValue = (asset.beginning_tax_book_value +
      asset.ending_tax_book_value) / 2;
    worldwideAssetValue += averageValue;
    if (asset.income_source === "us") {
      if (asset.income_category || asset.irs_country_code) {
        throw new Error(
          "Form 1116 U.S. asset cannot carry a foreign category or country",
        );
      }
      continue;
    }
    if (!asset.income_category || !asset.irs_country_code) {
      throw new Error("Form 1116 foreign asset needs its category and country");
    }
    const key = `${asset.income_category}|${asset.irs_country_code}`;
    if (!eligibleCountries.has(key)) {
      throw new Error(
        "Form 1116 vehicle-interest asset category and country must match a foreign-tax source",
      );
    }
    allocations.set(key, (allocations.get(key) ?? 0) + averageValue);
  }
  if (worldwideAssetValue <= 0) {
    throw new Error("Form 1116 vehicle-interest asset inventory has no value");
  }
  return new Map([...allocations].map(([key, value]) => [
    key,
    interest * value / worldwideAssetValue,
  ]));
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
  line20UsTax: number,
  line18WorldwideTaxableIncome: number,
): number {
  const limit = line20UsTax *
    fraction(category.foreignTaxableIncome, line18WorldwideTaxableIncome);
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
  readonly outputNodes = new OutputNodes([schedule3, form6251, f1040]);

  compute(_ctx: NodeContext, rawInput: Form1116Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    for (const item of input.foreign_tax_items ?? []) {
      if (
        item.income_category !== IncomeCategory.Passive &&
        item.income_category !== IncomeCategory.General
      ) {
        throw new Error(
          `Form 1116 ${item.income_category} category needs category-specific source facts and calculation before its credit can be claimed`,
        );
      }
    }
    if ((input.foreign_tax_items?.length ?? 0) === 0) {
      return { outputs: [] };
    }
    const vehicleInterestAllocations = allocateVehicleInterest(input);
    const totals = categoryTotals(
      input.foreign_tax_items ?? [],
      input.worldwide_gross_income ?? 0,
      input.general_deductions ?? 0,
      vehicleInterestAllocations,
    );
    if (totals.length === 0) return { outputs: [] };
    if (
      input.worldwide_taxable_income === undefined ||
      input.us_tax_before_credits === undefined
    ) {
      throw new Error(
        "Form 1116 needs the sourced Form 1040 taxable-income and line 16 amounts",
      );
    }
    // The selected deduction path supplies signed Form 1040 lines 11b minus
    // 14. Add Schedule 1-A line 37, then floor the total as line 18 directs.
    const signedLine18Base = input.worldwide_taxable_income +
      (input.enhanced_senior_deduction ?? 0);
    let line18WorldwideTaxableIncome = Math.max(0, signedLine18Base);
    const rateFacts = input.regular_tax_preference_facts;
    if (
      rateFacts &&
      (rateFacts.qualified_dividends > 0 || rateFacts.net_capital_gain > 0)
    ) {
      if ((input.known_foreign_qualified_dividends ?? 0) > 0) {
        throw new Error(
          "Form 1116 foreign qualified dividends need the foreign-source rate-adjustment worksheet",
        );
      }
      if (!input.foreign_preferential_income_review) {
        throw new Error(
          "Form 1116 preferential line 18 needs a documented review of foreign qualified dividends and capital gains",
        );
      }
      if (
        rateFacts.special_rate_gain > 0 ||
        rateFacts.form4952_election > 0
      ) {
        throw new Error(
          "Form 1116 Schedule D Tax Worksheet preferential adjustment is not yet supported",
        );
      }
      if (
        rateFacts.foreign_earned_income_exclusion > 0 ||
        rateFacts.form8615_applies ||
        (input.tentative_minimum_tax ?? 0) > 0
      ) {
        throw new Error(
          "Form 1116 preferential line 18 with AMT, Form 2555, or Form 8615 needs separate limitation rules",
        );
      }
      line18WorldwideTaxableIncome = adjustedQualifiedDividendLine18(
        signedLine18Base,
        rateFacts,
      );
    }

    const categories: CategorySummary[] = totals.map((category) => ({
      ...category,
      allowedCredit: allowedCredit(
        category,
        input.us_tax_before_credits,
        line18WorldwideTaxableIncome,
      ),
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
    outputs.push(output(f1040, {
      form1116_line18_worldwide_taxable_income: line18WorldwideTaxableIncome,
      form1116_line18_preferential_adjustment: Math.max(
        0,
        Math.round(signedLine18Base) - line18WorldwideTaxableIncome,
      ),
      form1116_line20_us_tax: input.us_tax_before_credits,
    }));
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
        total_income: line18WorldwideTaxableIncome,
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
