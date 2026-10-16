import {
  childTaxInput2026Schema,
  resolveChildTax2026,
} from "../inputs/child-tax.ts";
import { calculateForm8615 } from "../../nodes/intermediate/forms/taxes/investments/form8615/calculation.ts";
import { form8615 } from "../../nodes/intermediate/forms/taxes/investments/form8615/index.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { incomeWorksheet2026 } from "../../nodes/config/2026-tax-worksheets.ts";
import { ordinaryTaxWithConfig } from "../../nodes/intermediate/worksheets/taxes/calculation/tax_worksheets.ts";
import {
  foreignEarnedIncomePreferentialTax,
  preferentialTax,
} from "../../nodes/intermediate/worksheets/taxes/calculation/income_tax_calculation/preferential_tax.ts";
import { f1040_2026_node } from "./f1040.ts";
import { form6251_2026 } from "./form6251.ts";
import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import { form_1116 } from "../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { form8978_reporting_year } from "../../nodes/intermediate/worksheets/taxes/passthrough/form8978_reporting_year/index.ts";

const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const accumulated = z.union([money, z.array(money)]);
/** Internal upstream results, never a public input accepting an asserted line 16. */
export const inputSchema = z.object({
  taxable_income: money.int(),
  child_tax_source_2026: childTaxInput2026Schema.optional(),
  form8615_child_deduction: money.int().optional(),
  filing_status: z.nativeEnum(FilingStatus),
  form6251_line1a: money.int().optional(),
  form6251_line1b: z.number().finite().int(),
  form6251_line2a: money.int(),
  taking_standard_deduction: z.boolean(),
  qualified_dividends: accumulated.optional(),
  net_capital_gain: money.optional(),
  unrecaptured_1250_gain: money.optional(),
  rate_28_gain: money.optional(),
  form4952_election: money.optional(),
  form4952_elected_capital_gain: money.optional(),
  form4952_amt_election: money.optional(),
  form4952_amt_elected_capital_gain: money.optional(),
  form4952_amt_line2c_difference: z.number().finite().optional(),
  foreign_earned_income_exclusion: money.optional(),
  foreign_exclusion_disallowed_deductions: money.optional(),
}).strict();
export type IncomeTax2026Input = z.input<typeof inputSchema>;

export function calculateIncomeTax2026(raw: IncomeTax2026Input) {
  const parsed = inputSchema.parse(raw);
  // Sum contributions to the same printed line before rounding its operands.
  const input = {
    ...parsed,
    qualified_dividends: Math.round(
      Array.isArray(parsed.qualified_dividends)
        ? parsed.qualified_dividends.reduce((n, v) => n + v, 0)
        : parsed.qualified_dividends ?? 0,
    ),
  };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number") {
      Object.assign(input, { [key]: Math.round(value) });
    }
  }
  const qualDiv = input.qualified_dividends;
  const netCg = input.net_capital_gain ?? 0;
  const special1250 = input.unrecaptured_1250_gain ?? 0;
  const special28 = input.rate_28_gain ?? 0;
  const election = input.form4952_election ?? 0;
  const electedCapital = input.form4952_elected_capital_gain ?? 0;
  if (
    electedCapital > Math.min(election, netCg) ||
    election - electedCapital > qualDiv
  ) {
    throw new Error(
      "2026 Form 4952 election exceeds qualified dividends or net capital gain",
    );
  }
  if (netCg === 0 && (special1250 > 0 || special28 > 0)) {
    throw new Error(
      "2026 special-rate gains need a reconciled positive net capital gain",
    );
  }
  const foreignExclusion = input.foreign_earned_income_exclusion ?? 0;
  if (
    foreignExclusion > 0 &&
    input.foreign_exclusion_disallowed_deductions === undefined
  ) {
    throw new Error(
      "2026 foreign tax stacking needs explicit allocable disallowed deductions, including zero",
    );
  }
  const excludedTaxable = Math.max(
    0,
    foreignExclusion - (input.foreign_exclusion_disallowed_deductions ?? 0),
  );
  const hasPreference = qualDiv > 0 || netCg > 0;
  const facts = {
    taxableIncome: input.taxable_income,
    qualifiedDividends: qualDiv,
    netCapitalGain: netCg,
    filingStatus: input.filing_status,
    zeroCeiling: incomeWorksheet2026.qdcgtZeroCeiling,
    twentyFloor: incomeWorksheet2026.qdcgtTwentyFloor,
    unrecaptured1250Gain: special1250,
    rate28Gain: special28,
    form4952Election: election,
    electedCapitalGain: electedCapital,
  };
  const ordinary = (income: number) =>
    ordinaryTaxWithConfig(income, input.filing_status, incomeWorksheet2026);
  const method = foreignExclusion > 0
    ? "foreign-earned-income-tax-worksheet"
    : hasPreference
    ? special1250 > 0 || special28 > 0 || election > 0
      ? "schedule-d-tax-worksheet"
      : "qualified-dividends-capital-gain-worksheet"
    : input.taxable_income < 100000
    ? "tax-table"
    : "tax-computation-worksheet";
  let tax: number;
  if (foreignExclusion > 0) {
    tax = input.taxable_income === 0
      ? 0
      : hasPreference
      ? foreignEarnedIncomePreferentialTax(
        facts,
        excludedTaxable,
        incomeWorksheet2026,
      )
      : Math.max(
        0,
        ordinary(input.taxable_income + excludedTaxable) -
          ordinary(excludedTaxable),
      );
  } else {
    tax = hasPreference
      ? preferentialTax(facts, incomeWorksheet2026)
      : ordinary(input.taxable_income);
  }
  const normalTax = tax;
  let childReview = input.child_tax_source_2026
    ? resolveChildTax2026(input.child_tax_source_2026)
    : null;
  if (
    childReview &&
    (childReview.source_input.child_context.filing_status !==
        input.filing_status || input.form8615_child_deduction === undefined)
  ) {
    throw new Error(
      "Child tax needs its actual filing status and selected deduction",
    );
  }
  if (
    childReview?.source && input.taxable_income > 0 &&
    childReview.source.child_unearned_income > 2700
  ) {
    childReview = resolveChildTax2026(input.child_tax_source_2026!, {
      requireFamilyTax: true,
    });
  }
  const childTax = childReview?.source
    ? calculateForm8615({
      ...childReview.source,
      itemized_deductions_directly_connected: input.taking_standard_deduction
        ? 0
        : childReview.source.itemized_deductions_directly_connected,
    }, {
      childTaxableIncome: input.taxable_income,
      childFilingStatus: input.filing_status,
      childRegularTax: normalTax,
      takingStandardDeduction: input.taking_standard_deduction,
      childHasPreferentialIncome: hasPreference,
      childQualifiedDividends: qualDiv,
      childNetCapitalGain: netCg,
      childNeedsScheduleDWorksheet: special1250 > 0 || special28 > 0 ||
        election > 0,
      childAdjustedGrossIncome: childReview.source_input.income_context.agi,
      childDeduction: input.form8615_child_deduction,
      childForeignEarnedIncomeExclusion: foreignExclusion,
      brackets: incomeWorksheet2026,
    })
    : null;
  if (childTax) tax = childTax.line18Tax;
  return {
    source_input: input,
    normal_tax_before_child_tax: normalTax,
    child_tax_review: childReview,
    form8615: childTax,
    method,
    line16IncomeTax: tax,
    ordinaryTaxWithoutPreferences: ordinary(input.taxable_income),
    excludedTaxableIncome: excludedTaxable,
    preferenceFacts: facts,
  };
}

class IncomeTax2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "income_tax_calculation";
  readonly inputSchema = inputSchema;
  override get outputNodeTypes() {
    return [
      ...this.outputNodes.nodeTypes,
      "f2441",
      "f8863",
      "form1062",
      "schedule_r",
      "form8880",
    ];
  }
  // These shared identities do not register or execute legacy calculators in 2026.
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    form8615,
    form6251_2026,
    f8812,
    form_1116,
    form8978_reporting_year,
  ]);
  compute(ctx: NodeContext, raw: IncomeTax2026Input): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Income tax requires f1040:2026 context");
    }
    const result = calculateIncomeTax2026(raw);
    const input = result.source_input;
    const tax = result.line16IncomeTax;
    return {
      outputs: [
        {
          nodeType: "form1062",
          fields: {
            income_tax: input,
            line15_taxable_income: input.taxable_income,
            line16_income_tax: tax,
          },
        },
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        ...(result.form8615
          ? [{ nodeType: "form8615", fields: { ...result.form8615.fields } }]
          : []),
        { nodeType: "f1040", fields: { line16_income_tax: tax } },
        { nodeType: "f8812", fields: { auto_income_tax_liability: tax } },
        { nodeType: "f2441", fields: { regular_tax: tax } },
        { nodeType: "form8880", fields: { regular_tax: tax } },
        { nodeType: "schedule_r", fields: { regular_tax: tax } },
        {
          nodeType: "f8863",
          fields: {
            regular_tax: tax,
            ...(input.child_tax_source_2026
              ? { child_tax_source_2026: input.child_tax_source_2026 }
              : {}),
          },
        },
        { nodeType: "form8978_reporting_year", fields: { regular_tax: tax } },
        {
          nodeType: "form6251",
          fields: {
            ...(input.form6251_line1a === undefined
              ? {}
              : { line1a_deductions_without_senior: input.form6251_line1a }),
            regular_tax: tax,
            regular_tax_income: input.form6251_line1b,
            regular_taxable_income: input.taxable_income,
            line2a_taxes_paid: input.form6251_line2a,
            filing_status: input.filing_status,
            taking_standard_deduction: input.taking_standard_deduction,
            qualified_dividends: input.qualified_dividends,
            net_capital_gain: input.net_capital_gain ?? 0,
            unrecaptured_1250_gain: input.unrecaptured_1250_gain ?? 0,
            rate_28_gain: input.rate_28_gain ?? 0,
            form4952_regular_election: input.form4952_election ?? 0,
            form4952_regular_elected_capital_gain:
              input.form4952_elected_capital_gain ?? 0,
            ...(input.form4952_amt_election === undefined
              ? {}
              : { form4952_amt_election: input.form4952_amt_election }),
            ...(input.form4952_amt_elected_capital_gain === undefined ? {} : {
              form4952_amt_elected_capital_gain:
                input.form4952_amt_elected_capital_gain,
            }),
            ...(input.form4952_amt_line2c_difference === undefined ? {} : {
              form4952_amt_line2c_difference:
                input.form4952_amt_line2c_difference,
            }),
            foreign_earned_income_exclusion:
              input.foreign_earned_income_exclusion ?? 0,
            ...(input.foreign_exclusion_disallowed_deductions === undefined
              ? {}
              : {
                foreign_exclusion_disallowed_deductions:
                  input.foreign_exclusion_disallowed_deductions,
              }),
          },
        },
        {
          nodeType: "form_1116",
          fields: {
            us_tax_before_credits: tax,
            regular_tax_preference_facts: {
              taxable_income: input.taxable_income,
              qualified_dividends: input.qualified_dividends,
              net_capital_gain: input.net_capital_gain ?? 0,
              filing_status: input.filing_status,
              special_rate_gain: (input.unrecaptured_1250_gain ?? 0) +
                (input.rate_28_gain ?? 0),
              form4952_election: input.form4952_election ?? 0,
              foreign_earned_income_exclusion:
                input.foreign_earned_income_exclusion ?? 0,
              form8615_applies: result.form8615 !== null,
              regular_tax_before_additional_items: tax,
            },
          },
        },
      ],
    };
  }
}
export const income_tax_2026 = new IncomeTax2026Node();
