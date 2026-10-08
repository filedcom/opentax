import { scheduleJTaxSourceSchema } from "../../../../forms/taxes/income-averaging/schedule_j/tax-source.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../../../types.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { form6251 } from "../../../../forms/taxes/amt/form6251/index.ts";
import { form_1116 } from "../../../../forms/credits/foreign/form_1116/index.ts";
import { form8978_reporting_year } from "../../passthrough/form8978_reporting_year/index.ts";
import { form8615 } from "../../../../forms/taxes/investments/form8615/index.ts";
import { calculateForm8615 } from "../../../../forms/taxes/investments/form8615/calculation.ts";
import { inputSchema as form8615SourceSchema } from "../../../../../inputs/taxes/investments/f8615/schema.ts";
import { f8812 } from "../../../../../inputs/credits/child/f8812/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { ordinaryTax2025 } from "../tax_table_2025.ts";
import {
  foreignEarnedIncomePreferentialTax,
  preferentialTax,
} from "./preferential_tax.ts";

// ─── Accumulable helper ───────────────────────────────────────────────────────

// Fields that may arrive from multiple upstream nodes (e.g. f1099div and k1_partnership
// both routing qualified_dividends) accumulate as arrays in the executor pending dict.
// Declaring them accumulable prevents Zod parse failure; sumField collapses to a scalar.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumField(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce((s: number, n: number) => s + n, 0);
  }
  return value;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

// Income Tax Calculation — Form 1040 Line 16
//
// TY2025 Tax Table below $100,000, Tax Computation Worksheet above it.
// Phase 2: Qualified Dividends and Capital Gain Tax Worksheet (QDCGTW).
//   When qualified_dividends or net_capital_gain is provided, applies
//   preferential 0%/15%/20% rates per IRC §1(h). The QDCGT result is
//   always ≤ regular tax (the worksheet yields the minimum).
//
// IRC §1; Rev. Proc. 2024-40, §3.01–§3.02
export const inputSchema = z.object({
  // Form 1040 Line 15 — Taxable income (AGI minus deductions minus QBI deduction).
  taxable_income: z.number().nonnegative(),

  // Signed Form 6251 line 1b, calculated before the Form 1040 line 15 zero
  // floor and after adding back Schedule 1-A's enhanced senior deduction.
  form6251_line1b: z.number(),
  // Form 6251 line 2a chosen after standard-versus-itemized resolution.
  form6251_line2a: z.number().nonnegative(),

  // Determines which bracket table to apply.
  filing_status: z.nativeEnum(FilingStatus),
  taking_standard_deduction: z.boolean().optional(),
  form8615_source: form8615SourceSchema.optional(),
  form8615_reviewed_source: form8615SourceSchema.optional(),
  form8615_computed_unearned_income: z.number().nonnegative().optional(),
  form8615_child_agi: z.number().optional(),
  form8615_child_deduction: z.number().nonnegative().optional(),

  // ── QDCGT Worksheet inputs (optional) ────────────────────────────────────
  // Form 1040 Line 3a — Qualified dividends (from f1099div, k1_partnership, k1_s_corp, etc.).
  // Accumulable: multiple upstream nodes may each deposit their portion; the executor
  // accumulates them as an array which sumField collapses to a single total.
  qualified_dividends: accumulable(z.number().nonnegative()).optional(),
  form4952_election: z.number().nonnegative().optional(),
  form4952_elected_capital_gain: z.number().nonnegative().optional(),
  form4952_amt_election: z.number().nonnegative().optional(),
  form4952_amt_elected_capital_gain: z.number().nonnegative().optional(),
  form4952_amt_line2c_difference: z.number().optional(),
  form8814_tax: z.number().nonnegative().optional(),
  // Internal calculated Schedule J line 23, never a public asserted tax.
  // Form 6251 still receives the tax refigured without this election.
  schedule_j_current_tax_source: scheduleJTaxSourceSchema.optional(),
  schedule_j_election_requested: z.literal(true).optional(),
  schedule_j_calculated_tax: z.number().int().nonnegative().optional(),
  form4972_tax: accumulable(z.number().nonnegative()).optional(),
  form8978_tax: accumulable(z.number().nonnegative()).optional(),
  form8621_tax: accumulable(z.number().nonnegative()).optional(),
  form8621_1294_undistributed_ordinary: z.number().nonnegative().optional(),
  form8621_1294_undistributed_capital: z.number().nonnegative().optional(),
  // Net capital gain for preferential rate purposes (from schedule_d line 19).
  // Equal to min(line15, line16) when both are positive (i.e., line17 = Yes).
  net_capital_gain: z.number().nonnegative().optional(),
  // Unrecaptured §1250 gain (from unrecaptured_1250_worksheet via schedule_d line 19).
  // Taxed at 25% rate per IRC §1(h)(1)(D).
  unrecaptured_1250_gain: z.number().nonnegative().optional(),
  // 28% rate gain (collectibles) from rate_28_gain_worksheet.
  // Taxed at 28% rate per IRC §1(h)(4)/(5).
  rate_28_gain: z.number().nonnegative().optional(),

  // ── §911(f) stacking rule (optional) ─────────────────────────────────────
  // Total foreign earned income exclusion (FEIE + housing) from Form 2555.
  // The worksheet's line 2c subtracts deductions allocable to excluded
  // income from the Form 2555 exclusions before stacking.
  // IRC §911(f); Form 2555 Instructions "Tax on Income Not Excluded".
  foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  foreign_exclusion_disallowed_deductions: z.number().nonnegative().optional(),
});

type IncomeTaxCalcInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// ─── Node class ───────────────────────────────────────────────────────────────

class IncomeTaxCalculationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "income_tax_calculation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    form6251,
    f8812,
    form_1116,
    form8978_reporting_year,
    form8615,
  ]);

  compute(ctx: NodeContext, rawInput: IncomeTaxCalcInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

    const input = inputSchema.parse(rawInput);
    if (
      input.schedule_j_election_requested === true &&
      input.schedule_j_calculated_tax === undefined
    ) {
      throw new Error(
        "Schedule J election requires a reconciled calculated line 23",
      );
    }
    if (
      input.schedule_j_calculated_tax !== undefined &&
      input.schedule_j_election_requested !== true
    ) {
      throw new Error(
        "Calculated Schedule J tax requires its source-backed election",
      );
    }

    const foreignExclusion = input.foreign_earned_income_exclusion ?? 0;
    if (
      foreignExclusion > 0 &&
      input.foreign_exclusion_disallowed_deductions === undefined
    ) {
      throw new Error(
        "Form 2555 Foreign Earned Income Tax Worksheet needs an explicit line 2b disallowed-deductions total, including zero",
      );
    }
    const floor = Math.max(
      0,
      foreignExclusion -
        (input.foreign_exclusion_disallowed_deductions ?? 0),
    );

    // Apply QDCGT / Schedule D Tax Worksheet when preferential income is present.
    // qualified_dividends is accumulable: multiple upstream nodes (f1099div, k1_partnership, etc.)
    // may each deposit their portion; sumField collapses the accumulated array to a scalar.
    const qualDiv = sumField(
      input.qualified_dividends as number | number[] | undefined,
    );
    const netCg = input.net_capital_gain ?? 0;
    const unrecaptured1250 = input.unrecaptured_1250_gain ?? 0;
    const rate28 = input.rate_28_gain ?? 0;
    const form4952Election = input.form4952_election ?? 0;
    const electedCapitalGain = input.form4952_elected_capital_gain ?? 0;
    if (
      electedCapitalGain > Math.min(form4952Election, netCg) ||
      form4952Election - electedCapitalGain > qualDiv
    ) {
      throw new Error(
        "Form 4952 election exceeds the return's qualified dividends or net capital gain",
      );
    }
    const hasPrefIncome = qualDiv > 0 || netCg > 0;
    if (
      input.schedule_j_calculated_tax !== undefined &&
      ((!input.schedule_j_current_tax_source &&
        (hasPrefIncome || unrecaptured1250 > 0 || rate28 > 0 ||
          form4952Election > 0)) ||
        foreignExclusion > 0 ||
        ((input.form8814_tax ?? 0) > 0 &&
          !input.schedule_j_current_tax_source) ||
        sumField(input.form8978_tax) > 0 ||
        sumField(input.form8621_tax) > 0)
    ) {
      throw new Error(
        "Schedule J ordinary-rate route cannot omit a current-year tax worksheet or line 16 add-on",
      );
    }

    if (input.schedule_j_current_tax_source) {
      const s = input.schedule_j_current_tax_source;
      if (
        s.qualified_dividends !== Math.round(qualDiv) ||
        s.net_capital_gain !== Math.round(netCg) ||
        s.unrecaptured_1250_gain !== Math.round(unrecaptured1250) ||
        s.rate_28_gain !== Math.round(rate28) ||
        s.form4952_line4g !== Math.round(form4952Election) ||
        s.form4952_line4e !== Math.round(electedCapitalGain)
      ) {
        throw new Error(
          "Schedule J current worksheet differs from actual return tax sources",
        );
      }
    }

    // Form 2555's Foreign Earned Income Tax Worksheet uses the Tax Table on
    // both the stacked income and excluded-income base below $100,000. A
    // preferential return needs its capital-gain-excess adjustments first.
    let tax: number;
    if (foreignExclusion > 0) {
      if (input.taxable_income <= 0) {
        tax = 0;
      } else {
        if (hasPrefIncome) {
          tax = foreignEarnedIncomePreferentialTax({
            taxableIncome: input.taxable_income,
            qualifiedDividends: qualDiv,
            netCapitalGain: netCg,
            filingStatus: input.filing_status,
            zeroCeiling: cfg.qdcgtZeroCeiling,
            twentyFloor: cfg.qdcgtTwentyFloor,
            unrecaptured1250Gain: unrecaptured1250,
            rate28Gain: rate28,
            form4952Election,
            electedCapitalGain,
          }, floor);
        } else {
          const stackedTax = ordinaryTax2025(
            input.taxable_income + floor,
            input.filing_status,
          );
          const floorTax = ordinaryTax2025(floor, input.filing_status);
          tax = Math.max(0, stackedTax - floorTax);
        }
      }
    } else if (hasPrefIncome) {
      tax = preferentialTax({
        taxableIncome: input.taxable_income,
        qualifiedDividends: qualDiv,
        netCapitalGain: netCg,
        filingStatus: input.filing_status,
        zeroCeiling: cfg.qdcgtZeroCeiling,
        twentyFloor: cfg.qdcgtTwentyFloor,
        unrecaptured1250Gain: unrecaptured1250,
        rate28Gain: rate28,
        form4952Election,
        electedCapitalGain,
      });
    } else {
      tax = ordinaryTax2025(input.taxable_income, input.filing_status);
    }
    let regularTaxBeforeAdditionalItems = tax;

    let form8615Result: ReturnType<typeof calculateForm8615> | undefined;
    if (
      input.form8615_source && input.form8615_reviewed_source &&
      JSON.stringify(input.form8615_source) !==
        JSON.stringify(input.form8615_reviewed_source)
    ) {
      throw new Error(
        "Supplied Form 8615 facts conflict with the actual reviewed parent and child source returns",
      );
    }
    const form8615Source = input.form8615_reviewed_source ??
      input.form8615_source;
    if (form8615Source !== undefined) {
      if (
        input.form8615_computed_unearned_income !== undefined &&
        Math.abs(
            input.form8615_computed_unearned_income -
              form8615Source.child_unearned_income,
          ) > 0.01
      ) {
        throw new Error(
          "Form 8615 child unearned income does not match the return sources",
        );
      }
      if (input.taking_standard_deduction === undefined) {
        throw new Error("Form 8615 needs the selected deduction method");
      }
      form8615Result = calculateForm8615(form8615Source, {
        childTaxableIncome: input.taxable_income,
        childFilingStatus: input.filing_status,
        childRegularTax: tax,
        takingStandardDeduction: input.taking_standard_deduction,
        childHasPreferentialIncome: hasPrefIncome,
        childQualifiedDividends: qualDiv,
        childNetCapitalGain: netCg,
        childNeedsScheduleDWorksheet: unrecaptured1250 > 0 || rate28 > 0 ||
          form4952Election > 0,
        childAdjustedGrossIncome: input.form8615_child_agi,
        childDeduction: input.form8615_child_deduction,
        childForeignEarnedIncomeExclusion: foreignExclusion,
        brackets: cfg,
      });
    }
    if (form8615Result) tax = form8615Result.line18Tax;

    const deferredOrdinary = input.form8621_1294_undistributed_ordinary ?? 0;
    const deferredCapital = input.form8621_1294_undistributed_capital ?? 0;
    let form8621DeferredTaxBeforeCredits = 0;
    if (deferredOrdinary + deferredCapital > 0) {
      if (
        deferredOrdinary + deferredCapital > input.taxable_income ||
        deferredCapital > netCg
      ) {
        throw new Error(
          "Form 8621 section 1294 tax refigure needs a supported taxable-income and capital-gain worksheet",
        );
      }
      const withoutTaxable = input.taxable_income - deferredOrdinary -
        deferredCapital;
      const withoutCapital = netCg - deferredCapital;
      let without: number;
      if (foreignExclusion > 0) {
        without = hasPrefIncome
          ? foreignEarnedIncomePreferentialTax({
            taxableIncome: withoutTaxable,
            qualifiedDividends: qualDiv,
            netCapitalGain: withoutCapital,
            filingStatus: input.filing_status,
            zeroCeiling: cfg.qdcgtZeroCeiling,
            twentyFloor: cfg.qdcgtTwentyFloor,
            unrecaptured1250Gain: unrecaptured1250,
            rate28Gain: rate28,
            form4952Election,
            electedCapitalGain,
          }, floor)
          : Math.max(
            0,
            ordinaryTax2025(withoutTaxable + floor, input.filing_status) -
              ordinaryTax2025(floor, input.filing_status),
          );
      } else if (hasPrefIncome) {
        without = preferentialTax({
          taxableIncome: withoutTaxable,
          qualifiedDividends: qualDiv,
          netCapitalGain: withoutCapital,
          filingStatus: input.filing_status,
          zeroCeiling: cfg.qdcgtZeroCeiling,
          twentyFloor: cfg.qdcgtTwentyFloor,
          unrecaptured1250Gain: unrecaptured1250,
          rate28Gain: rate28,
          form4952Election,
          electedCapitalGain,
        });
      } else {
        without = ordinaryTax2025(withoutTaxable, input.filing_status);
      }
      form8621DeferredTaxBeforeCredits = Math.max(0, tax - without);
    }

    const taxWithoutScheduleJ = tax;
    if (input.schedule_j_calculated_tax !== undefined) {
      if (form8615Result !== undefined) {
        throw new Error(
          "Schedule J with Form 8615 needs a separate reconciled tax worksheet",
        );
      }
      tax = input.schedule_j_calculated_tax;
      regularTaxBeforeAdditionalItems = tax;
    }

    const childElectionTax = input.form8814_tax ?? 0;
    const lumpSumTax = sumField(input.form4972_tax);
    const additionalReportingYearTax = sumField(input.form8978_tax);
    const priorPficYearTax = sumField(input.form8621_tax);
    tax += childElectionTax + lumpSumTax + additionalReportingYearTax +
      priorPficYearTax;
    const amtRefiguredTax = input.schedule_j_calculated_tax === undefined
      ? tax
      : taxWithoutScheduleJ + childElectionTax + lumpSumTax +
        additionalReportingYearTax + priorPficYearTax;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, {
        line16_income_tax: tax,
        ...(input.form8621_1294_undistributed_ordinary !== undefined ||
            input.form8621_1294_undistributed_capital !== undefined
          ? {
            form8621_1294_deferred_tax_before_credits:
              form8621DeferredTaxBeforeCredits,
          }
          : {}),
        ...(lumpSumTax > 0 ? { form4972_tax: lumpSumTax } : {}),
        ...(additionalReportingYearTax > 0
          ? { form8978_tax: additionalReportingYearTax }
          : {}),
        ...(priorPficYearTax > 0 ? { form8621_tax: priorPficYearTax } : {}),
      }),
      this.outputNodes.output(form8978_reporting_year, { regular_tax: tax }),
      // Form 6251 line 10 ordinarily starts from Form 1040 line 16. Schedule J
      // is the exception: IRS instructions require tax refigured without the
      // income-averaging election, including Form 8814, for this line.
      this.outputNodes.output(form6251, {
        regular_tax: amtRefiguredTax,
        ...(lumpSumTax > 0 ? { form4972_tax: lumpSumTax } : {}),
        regular_tax_income: input.form6251_line1b,
        regular_taxable_income: input.taxable_income,
        line2a_taxes_paid: input.form6251_line2a,
        filing_status: input.filing_status,
        ...(qualDiv > 0 ? { qualified_dividends: qualDiv } : {}),
        ...(netCg > 0 ? { net_capital_gain: netCg } : {}),
        ...(unrecaptured1250 > 0
          ? { unrecaptured_1250_gain: unrecaptured1250 }
          : {}),
        ...(rate28 > 0 ? { rate_28_gain: rate28 } : {}),
        ...(input.form4952_election !== undefined
          ? { form4952_regular_election: form4952Election }
          : {}),
        ...(input.form4952_elected_capital_gain !== undefined
          ? {
            form4952_regular_elected_capital_gain: electedCapitalGain,
          }
          : {}),
        ...(input.form4952_amt_election !== undefined
          ? { form4952_amt_election: input.form4952_amt_election }
          : {}),
        ...(input.form4952_amt_elected_capital_gain !== undefined
          ? {
            form4952_amt_elected_capital_gain:
              input.form4952_amt_elected_capital_gain,
          }
          : {}),
        ...(input.form4952_amt_line2c_difference !== undefined
          ? {
            form4952_amt_line2c_difference:
              input.form4952_amt_line2c_difference,
          }
          : {}),
        ...(input.taking_standard_deduction !== undefined
          ? { taking_standard_deduction: input.taking_standard_deduction }
          : {}),
        ...(foreignExclusion > 0
          ? { foreign_earned_income_exclusion: foreignExclusion }
          : {}),
        ...(input.foreign_exclusion_disallowed_deductions !== undefined
          ? {
            foreign_exclusion_disallowed_deductions:
              input.foreign_exclusion_disallowed_deductions,
          }
          : {}),
      }),
      // Feed f8812 the income tax liability for CTC nonrefundable limit calculation.
      this.outputNodes.output(f8812, { auto_income_tax_liability: tax }),
      // Form 1116 Part III line 20 — the base the §904(a) limitation multiplies.
      this.outputNodes.output(form_1116, {
        us_tax_before_credits: tax,
        regular_tax_preference_facts: {
          taxable_income: input.taxable_income,
          qualified_dividends: qualDiv,
          net_capital_gain: netCg,
          filing_status: input.filing_status,
          special_rate_gain: unrecaptured1250 + rate28,
          form4952_election: form4952Election,
          foreign_earned_income_exclusion: foreignExclusion,
          form8615_applies: form8615Result !== undefined,
          regular_tax_before_additional_items: regularTaxBeforeAdditionalItems,
        },
      }),
    ];

    if (form8615Result) {
      outputs.push(this.outputNodes.output(form8615, form8615Result.fields));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const income_tax_calculation = new IncomeTaxCalculationNode();
